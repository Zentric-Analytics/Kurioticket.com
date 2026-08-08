import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPairSync } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { classifyChangeSet } from "./classifier.mjs";
import { PREVIEW_IDENTITY, assertExactSha, assertPreviewIdentity, requirePreviewEnvironment } from "./config.mjs";
import { reconcileBuilds, reconcileSubmission, reconcileSubmissionHistory } from "./eas-state.mjs";
import { PreviewOrchestrator, applyCutoverBaseline, applyIosNativeBackfill, enforceDeliveredNativeBaseline, maintainLease, nativeDriftTargets, retry } from "./orchestrator.mjs";
import { createExactCheckoutDirectory, EasClient, RenderClient, gitAuthEnvironment, prepareCheckout } from "./remote-clients.mjs";
import { redactPreflightError, runPreviewPreflight } from "./preflight.mjs";
import { AppStoreConnectClient } from "./app-store-connect.mjs";
import { PreviewLedger } from "./ledger.mjs";

const sha = "a".repeat(40);
const appleEnv = { APP_STORE_CONNECT_ISSUER_ID: "issuer", APP_STORE_CONNECT_KEY_ID: "key", APP_STORE_CONNECT_PRIVATE_KEY: "private-key", APP_STORE_CONNECT_PREVIEW_APP_ID: "6797447471", APP_STORE_CONNECT_PREVIEW_BETA_GROUP_ID: "group-preview" };
const repositoryRoot = resolve(import.meta.dirname, "../..");
const build = (overrides = {}) => ({ id: "build-1", status: "IN_PROGRESS", gitCommitHash: sha, project: { id: PREVIEW_IDENTITY.easProjectId }, platform: "IOS", buildProfile: "preview", appIdentifier: PREVIEW_IDENTITY.bundleIdentifier, runtimeVersion: PREVIEW_IDENTITY.runtime, channel: PREVIEW_IDENTITY.channel, ...overrides });
const appleContext = { app: { type: "apps", id: "6797447471", attributes: { bundleId: PREVIEW_IDENTITY.bundleIdentifier } }, group: { type: "betaGroups", id: "group-preview", attributes: { name: "Kurioticket Preview Internal", isInternalGroup: true } } };
const finishedApple = (overrides = {}) => ({ previewContext: async () => appleContext, resolveBuild: async () => ({ state: "VALID", build: { id: "apple-build-9", attributes: { version: "9", processingState: "VALID" } } }), isAssociated: async () => true, associate: async () => {}, ...overrides });
const applePrivateKey = generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({ type: "pkcs8", format: "pem" });
const appleClient = (fetchImpl) => new AppStoreConnectClient({ issuerId: "issuer", keyId: "key", privateKey: applePrivateKey, appId: "6797447471", betaGroupId: "group-preview", betaGroupName: "Kurioticket Preview Internal", fetchImpl });

test("Preview identity is immutable", () => {
  assert.equal(assertPreviewIdentity({ appName: "Kurioticket Preview", bundleIdentifier: "com.kurioticket.app.preview", scheme: "kurioticket-preview", projectId: PREVIEW_IDENTITY.easProjectId, profile: "preview", channel: "preview", runtime: "preview-0.3.0", apiOrigin: "https://staging.kurioticket.com" }), true);
  for (const [key, value] of [["bundleIdentifier", "com.kurioticket.app"], ["profile", "production"], ["channel", "production"], ["runtime", "production-0.3.0"], ["apiOrigin", "https://kurioticket.com"]]) {
    const valid = { appName: "Kurioticket Preview", bundleIdentifier: "com.kurioticket.app.preview", scheme: "kurioticket-preview", projectId: PREVIEW_IDENTITY.easProjectId, profile: "preview", channel: "preview", runtime: "preview-0.3.0", apiOrigin: "https://staging.kurioticket.com", [key]: value };
    assert.throws(() => assertPreviewIdentity(valid), /mismatch|forbidden/i);
  }
});

test("environment defaults to non-mutating dry-run and rejects missing secrets", () => {
  assert.throws(() => requirePreviewEnvironment({}), /Missing/);
  const config = requirePreviewEnvironment({ DATABASE_URL: "postgres://localhost/x", GITHUB_READ_TOKEN: "x", RENDER_API_KEY: "y", RENDER_STAGING_SERVICE_ID: PREVIEW_IDENTITY.renderStagingServiceId, EXPO_TOKEN: "z", ...appleEnv });
  assert.equal(config.mode, "dry-run");
  assert.equal(config.cutoverBaselineSha, null);
  assert.equal(config.iosNativeBackfillSha, null);
  assert.equal(config.pollIntervalMs, 60_000);
  assert.throws(() => requirePreviewEnvironment({ DATABASE_URL: "postgres://localhost/x", GITHUB_READ_TOKEN: "x", RENDER_API_KEY: "y", RENDER_STAGING_SERVICE_ID: "srv-other", EXPO_TOKEN: "z", ...appleEnv }), /approved Preview staging service/);
});

test("iOS native backfill is exact-SHA, active-only, and iOS-only", () => {
  const target = "c".repeat(40);
  const baseEnv = { DATABASE_URL: "postgres://localhost/x", GITHUB_READ_TOKEN: "token-read", RENDER_API_KEY: "render-key", RENDER_STAGING_SERVICE_ID: PREVIEW_IDENTITY.renderStagingServiceId, EXPO_TOKEN: "expo-token", PREVIEW_RELEASE_MODE: "active", PREVIEW_IOS_NATIVE_BACKFILL_SHA: target, ...appleEnv };
  const config = requirePreviewEnvironment(baseEnv);
  assert.equal(config.iosNativeBackfillSha, target);
  assert.throws(() => requirePreviewEnvironment({ ...baseEnv, PREVIEW_IOS_NATIVE_BACKFILL_SHA: "dev" }), /iOS native backfill SHA/);
  const ordinary = { classification: "NO_DELIVERY", reason: "repository-only", files: [] };
  assert.deepEqual(applyIosNativeBackfill({ classification: ordinary, files: [], sha, config }), ordinary);
  assert.deepEqual(applyIosNativeBackfill({ classification: ordinary, files: [], sha: target, config }), { classification: "IOS_NATIVE", reason: "approved-ios-native-backfill", files: [] });
  assert.throws(() => applyIosNativeBackfill({ classification: ordinary, files: [], sha: target, config: { ...config, mode: "dry-run" } }), /requires active Preview release mode/);
});

test("cutover baseline is immutable and dry-run only", async () => {
  const baselineSha = "b".repeat(40);
  const config = requirePreviewEnvironment({ DATABASE_URL: "postgres://localhost/x", GITHUB_READ_TOKEN: "token-read", RENDER_API_KEY: "render-key", RENDER_STAGING_SERVICE_ID: PREVIEW_IDENTITY.renderStagingServiceId, EXPO_TOKEN: "expo-token", PREVIEW_CUTOVER_BASELINE_SHA: baselineSha, ...appleEnv });
  assert.equal(config.cutoverBaselineSha, baselineSha);
  assert.throws(() => requirePreviewEnvironment({ DATABASE_URL: "postgres://localhost/x", GITHUB_READ_TOKEN: "token-read", RENDER_API_KEY: "render-key", RENDER_STAGING_SERVICE_ID: PREVIEW_IDENTITY.renderStagingServiceId, EXPO_TOKEN: "expo-token", PREVIEW_CUTOVER_BASELINE_SHA: "dev", ...appleEnv }), /Cutover baseline SHA/);
  const ordinary = { classification: "OTA", reason: "classified", files: ["apps/mobile/src/a.ts"] };
  assert.deepEqual(applyCutoverBaseline({ classification: ordinary, files: ordinary.files, sha, config: { mode: "dry-run", cutoverBaselineSha: null } }), ordinary);
  assert.deepEqual(applyCutoverBaseline({ classification: ordinary, files: ordinary.files, sha, config: { mode: "dry-run", cutoverBaselineSha: sha } }), { classification: "NO_DELIVERY", reason: "approved-cutover-baseline", files: ordinary.files });
  assert.throws(() => applyCutoverBaseline({ classification: ordinary, files: ordinary.files, sha, config: { mode: "active", cutoverBaselineSha: sha } }), /Cutover baseline may only be established in dry-run mode/);
});

test("Render preflight reads only the approved staging service", async () => {
  const requests = [];
  const client = new RenderClient({
    apiKey: "render-secret",
    serviceId: PREVIEW_IDENTITY.renderStagingServiceId,
    fetchImpl: async (url, options) => {
      requests.push({ url, method: options.method });
      const body = url.includes("deploys") ? [{ deploy: { id: "dep-stage", status: "live" } }] : { id: PREVIEW_IDENTITY.renderStagingServiceId, name: "Kurioticket.com-staging" };
      return { ok: true, text: async () => JSON.stringify(body) };
    },
  });
  assert.equal((await client.getService()).id, PREVIEW_IDENTITY.renderStagingServiceId);
  assert.equal((await client.latestDeploy()).id, "dep-stage");
  assert.deepEqual(requests.map(({ method }) => method), ["GET", "GET"]);
  assert.equal(requests.every(({ url }) => url.includes(PREVIEW_IDENTITY.renderStagingServiceId)), true);
});

test("Render preflight rejects wrong identity, authentication failure, and malformed responses", async () => {
  const wrong = new RenderClient({ apiKey: "x", serviceId: "srv-other", fetchImpl: async () => ({ ok: true, text: async () => "{}" }) });
  await assert.rejects(wrong.getService(), /Unapproved/);
  const unauthorized = new RenderClient({ apiKey: "x", serviceId: PREVIEW_IDENTITY.renderStagingServiceId, fetchImpl: async () => ({ ok: false, status: 401 }) });
  await assert.rejects(unauthorized.getService(), /HTTP 401/);
  const malformed = new RenderClient({ apiKey: "x", serviceId: PREVIEW_IDENTITY.renderStagingServiceId, fetchImpl: async () => ({ ok: true, text: async () => JSON.stringify({ id: "wrong" }) }) });
  await assert.rejects(malformed.getService(), /malformed or mismatched/);
});

test("Render deploy creation reconciles an accepted mutation after an empty response", async () => {
  let requests = 0;
  let historyReads = 0;
  const deploy = { id: "dep-reconciled", status: "build_in_progress", commit: { id: sha } };
  const client = new RenderClient({
    apiKey: "render-secret",
    serviceId: PREVIEW_IDENTITY.renderStagingServiceId,
    fetchImpl: async (_url, options) => {
      requests += 1;
      if (options.method === "POST") return { ok: true, text: async () => "" };
      historyReads += 1;
      return { ok: true, text: async () => JSON.stringify(historyReads === 1 ? [] : [{ deploy }]) };
    },
  });
  assert.equal((await client.createDeploy(sha, { sleep: async () => {} })).id, deploy.id);
  assert.equal(requests, 3);
});

test("Render deploy reconciliation excludes every deployment that existed before the POST", async () => {
  const terminal = { id: "dep-terminal", status: "build_failed", commit: { id: sha } };
  const replacement = { id: "dep-replacement", status: "build_in_progress", commit: { id: sha } };
  let historyReads = 0;
  const client = new RenderClient({
    apiKey: "render-secret",
    serviceId: PREVIEW_IDENTITY.renderStagingServiceId,
    fetchImpl: async (_url, options) => {
      if (options.method === "POST") return { ok: true, text: async () => "" };
      historyReads += 1;
      const deploys = historyReads === 1 ? [terminal] : [replacement, terminal];
      return { ok: true, text: async () => JSON.stringify(deploys.map((deploy) => ({ deploy }))) };
    },
  });
  assert.equal((await client.createDeploy(sha, { excludeIds: [terminal.id], sleep: async () => {} })).id, replacement.id);
});

test("EAS preflight accepts only the exact Preview project and readable history", async () => {
  const client = new EasClient({ expoToken: "expo-secret", cwd: repositoryRoot, command: "unused" });
  const calls = [];
  client.runText = async (args) => { calls.push(args); return `fullName  ${PREVIEW_IDENTITY.easProjectFullName}
ID        ${PREVIEW_IDENTITY.easProjectId}
`; };
  client.run = async (args) => { calls.push(args); return []; };
  assert.equal((await client.projectInfo()).projectId, PREVIEW_IDENTITY.easProjectId);
  assert.deepEqual(await client.previewBuildHistory(), []);
  assert.deepEqual(calls[0], ["eas-cli@16.17.4", "project:info"]);
  assert.equal(calls.every((args) => !args.includes("build") && !args.includes("update")), true);
});

test("EAS preflight rejects wrong projects, authentication errors, and malformed history", async () => {
  const client = new EasClient({ expoToken: "x", cwd: repositoryRoot, command: "unused" });
  client.runText = async () => `fullName  @other/project
ID        ${PREVIEW_IDENTITY.easProjectId}
`;
  await assert.rejects(client.projectInfo(), /mismatched/);
  client.runText = async () => { throw new Error("Expo authentication failed"); };
  await assert.rejects(client.projectInfo(), /authentication failed/);
  client.run = async () => ({ unexpected: true });
  await assert.rejects(client.previewBuildHistory(), /malformed/);
});

test("provider preflight validates all read-only identities without mutation in dry-run and active modes", async () => {
  for (const mode of ["dry-run", "active"]) {
    let mutations = 0;
    const result = await runPreviewPreflight({
      config: { mode },
      ledger: { healthCheck: async () => ({ connected: true }) },
      github: { latestDevSha: async () => sha },
      render: { getService: async () => ({ id: PREVIEW_IDENTITY.renderStagingServiceId, name: "Kurioticket.com-staging" }), latestDeploy: async () => ({ id: "dep-stage", status: "live" }), createDeploy: async () => { mutations += 1; } },
      eas: { projectInfo: async () => ({ projectId: PREVIEW_IDENTITY.easProjectId }), previewBuildHistory: async () => [], listUpdates: async () => [], createIosBuild: async () => { mutations += 1; }, publishUpdate: async () => { mutations += 1; } },
      apple: { previewContext: async () => ({ app: { id: "6797447471" }, group: { id: "group-preview", attributes: { isInternalGroup: true } } }) },
    });
    assert.equal(result.status, "PASS");
    assert.equal(result.mode, mode);
    assert.equal(result.submissionPerformed, false);
    assert.equal(mutations, 0);
  }
});

test("provider preflight rejects invalid mode and redacts credentials", async () => {
  await assert.rejects(runPreviewPreflight({ config: { mode: "invalid" } }), /mode is invalid/);
  assert.equal(redactPreflightError(new Error("failed token-secret database-secret"), ["token-secret", "database-secret"]), "failed [REDACTED] [REDACTED]");
});

test("worker preflight failure redacts secrets and exits before the polling loop", () => {
  const worker = readFileSync(resolve(repositoryRoot, "services/preview-release/worker.mjs"), "utf8");
  assert.match(worker, /preview-release-preflight-failed/);
  assert.match(worker, /redactPreflightError/);
  assert.match(worker, /process\.exit\(1\)/);
  assert.ok(worker.indexOf("runPreviewPreflight") < worker.indexOf("while (!stopping)"));
});

const classifications = [
  [["src/app/page.tsx"], "WEB"],
  [["apps/mobile/src/screens/Explore.tsx"], "OTA"],
  [["apps/mobile/assets/kurioticket-icon-ios.png"], "ANDROID_NATIVE+IOS_NATIVE"],
  [["apps/mobile/app.config.ts"], "ANDROID_NATIVE+IOS_NATIVE"],
  [["apps/mobile/ios/Podfile"], "IOS_NATIVE"],
  [["apps/mobile/android/app/build.gradle"], "ANDROID_NATIVE"],
  [["package-lock.json"], "ANDROID_NATIVE+IOS_NATIVE+WEB"],
  [["src/app/page.tsx", "apps/mobile/src/a.ts"], "OTA+WEB"],
  [["src/app/page.tsx", "apps/mobile/ios/a.swift"], "IOS_NATIVE+WEB"],
  [["docs/readme.md"], "NO_DELIVERY"],
  [["apps/mobile/unknown.bin"], "UNSAFE"],
];
for (const [files, expected] of classifications) test(`classifies ${files.join(",")}`, () => assert.equal(classifyChangeSet(files).classification, expected));
test("classifi×ýæÚ$z{-®éÜj×ÒÂv—F‡V#¢·ÒÂ&VæFW#¢·ÒÂ6ÆVW¢7–æ2‚’Óâ·ÒÂÆTf7F÷'“¢‚’Óâf–æ—6†VDÆR‡²76ö6–FS¢7–æ2‚’Óâ²÷7G2³Ò²ÒÒ’Ò“°Ð¢v—B÷&6†W7G&F÷"æF—7G&–'WFT–÷5Fô–çFW&æÄw&÷W‡²6†Â'V–ÆC¢²–C¢&'V–ÆBÓ"ÂfW'6–öã¢#ã2ã"Â'V–ÆEfW'6–öã¢#’"ÒÂ7W'&VçC¢²fW'6–öã¢#ã2ã"Â'V–ÆEfW'6–öã¢#’"ÒÂ7V&Ö—76–öã¢²–C¢'7V"Ó"ÒÂÆV6S¢²6†V6·ö–çC¢7–æ2‚’Óâ·ÒÒÒ“°Ð¢76W'BæWVÂ‡÷7G2Â“°Ð¢76W'BæFVWWVÂ†7F–öç2æÖ‚‡²7FFRÒ’Óâ7FFR’Â²$d”ä•4„TB%Ò“°Ð§Ò“°Ð Ð§FW7B‚&66WFVBÆR76ö6–F–öâv—F‚Æ÷7B&W7öç6R—2&V6öæ6–ÆVBöâ&VF&6²"Â7–æ2‚’Óâ°Ð¢ÆWB&VG2Ò°Ð¢6öç7B÷&6†W7G&F÷"ÒæWr&Wf–Wt÷&6†W7G&F÷"‡²6öæf–s¢·ÒÂÆVFvW#¢²&V6÷&D7F–öã¢7–æ2†7F–öâ’Óâ7F–öâÒÂv—F‡V#¢·ÒÂ&VæFW#¢·ÒÂ6ÆVW¢7–æ2‚’Óâ·ÒÂÆTf7F÷'“¢‚’Óâf–æ—6†VDÆR‡²—476ö6–FVC¢7–æ2‚’Óâ²·&VG2âÂ76ö6–FS¢7–æ2‚’Óâ²F‡&÷ræWrW'&÷"‚&6öææV7F–öâ&W6WB"“²ÒÒ’Ò“°Ð¢6öç7B&W7VÇBÒv—B÷&6†W7G&F÷"æF—7G&–'WFT–÷5Fô–çFW&æÄw&÷W‡²6†Â'V–ÆC¢²–C¢&'V–ÆBÓ"ÂfW'6–öã¢#ã2ã"Â'V–ÆEfW'6–öã¢#’"ÒÂ7W'&VçC¢²fW'6–öã¢#ã2ã"Â'V–ÆEfW'6–öã¢#’"ÒÂ7V&Ö—76–öã¢²–C¢'7V"Ó"ÒÂÆV6S¢²6†V6·ö–çC¢7–æ2‚’Óâ·ÒÒÒ“°Ð¢76W'BæWVÂ‡&W7VÇBç7FFRÂ$d”ä•4„TB"“°Ð§Ò“°Ð Ð§FW7B‚&F—7G&–'WF–öâ&WG'’¶VW2öæRGW&&ÆR7F–öâæBF÷G2ÖVÖ&W'6†—&Vf÷&Rw&—F–ærv–â"Â7–æ2‚’Óâ°Ð¢ÆWB76ö6–FVBÒfÇ6S°Ð¢ÆWB÷7G2Ò°Ð¢6öç7BGW&&ÆT7F–öç2ÒæWrÖ‚“°Ð¢6öç7BÆVFvW"Ò²&V6÷&D7F–öã¢7–æ2†7F–öâ’Óâ²GW&&ÆT7F–öç2ç6WB†G¶7F–öâæ¶–æGÓ¢G¶7F–öâæ–FVçF—G”¶W—ÖÂ7F–öâ“²&WGW&â7F–öã²ÒÓ°Ð¢6öç7B÷&6†W7G&F÷"ÒæWr&Wf–Wt÷&6†W7G&F÷"‡°Ð¢6öæf–s¢·ÒÂÆVFvW"Âv—F‡V#¢·ÒÂ&VæFW#¢·ÒÂ6ÆVW¢7–æ2‚’Óâ·ÒÀÐ¢ÆTf7F÷'“¢‚’Óâf–æ—6†VDÆR‡°Ð¢—476ö6–FVC¢7–æ2‚’Óâ76ö6–FVBÀÐ¢76ö6–FS¢7–æ2‚’Óâ°Ð¢÷7G2³Ò°Ð¢–b‡÷7G2ÓÓÒ’F‡&÷ræWrW'&÷"‚$ÆR…EES2"“°Ð¢76ö6–FVBÒG'VS°Ð¢ÒÀÐ¢Ò’ÀÐ¢Ò“°Ð¢6öç7B–çWBÒ²6†Â'V–ÆC¢²–C¢&'V–ÆBÓ"ÂfW'6–öã¢#ã2ã"Â'V–ÆEfW'6–öã¢#’"ÒÂ7W'&VçC¢²fW'6–öã¢#ã2ã"Â'V–ÆEfW'6–öã¢#’"ÒÂ7V&Ö—76–öã¢²–C¢'7V"Ó"ÒÂÆV6S¢²6†V6·ö–çC¢7–æ2‚’Óâ·ÒÒÓ°Ð¢v—B76W'Bç&V¦V7G2†÷&6†W7G&F÷"æF—7G&–'WFT–÷5Fô–çFW&æÄw&÷W†–çWB’ÂôÆR…EES2ò“°Ð¢v—B÷&6†W7G&F÷"æF—7G&–'WFT–÷5Fô–çFW&æÄw&÷W†–çWB“°Ð¢76W'BæWVÂ‡÷7G2Â"“°Ð¢76W'BæWVÂ†GW&&ÆT7F–öç2ç6—¦RÂ“°Ð¢76W'BæWVÂ…²ââæGW&&ÆT7F–öç2çfÇVW2‚•Õ³Òç7FFRÂ$d”ä•4„TB"“°Ð¢v—B÷&6†W7G&F÷"æF—7G&–'WFT–÷5Fô–çFW&æÄw&÷W†–çWB“°Ð¢76W'BæWVÂ‡÷7G2Â"“°Ð¢76W'BæWVÂ†GW&&ÆT7F–öç2ç6—¦RÂ“°Ð§Ò“°Ð Ð§FW7B‚'7V&Ö—76–öâ6ö×ÆWF–öâÆöæR6ææ÷B6F—6g’F†R”õ2æF—fR&6VÆ–æR"Â‚’Óâ°Ð¢6öç7B7ÂÒ&VDf–ÆU7–æ2‡&W6öÇfR‡&W÷6—F÷'•&ö÷BÂ'6W'f–6W2÷&Wf–Wr×&VÆV6RöÆVFvW"æÖ§2"’Â'WFc‚"“°Ð¢76W'BæÖF6‚‡7ÂÂô”õ5õDU5DdÄ”t…EôD•5E$”%UD”ôâuµÇ5Å5Ò£÷7FFSÒtd”ä•4„TBrò“°Ð§Ò“°Ð Ð§FW7B‚&W†7BÖ6†V6¶÷WB&W&F–öâ&WW6W2F†R–Ö×WF&ÆR'V–ÆBFWVæFVæ7’G&VW2"Â7–æ2‚’Óâ°Ð¢6öç7B6÷–W2ÒµÓ°Ð¢v—B&W&T6†V6¶÷WB‡&W÷6—F÷'•&ö÷BÂ°Ð¢FWVæFVæ7•&ö÷C¢&W÷6—F÷'•&ö÷BÀÐ¢6öÖÖæE'VææW#¢7–æ2‚ââæ&w2’Óâ²6÷–W2çW6‚†&w2“²ÒÀÐ¢Ò“°Ð¢76W'BæFVWWVÂ†6÷–W2æÖ‚…¶6öÖÖæBÂ&w5Ò’Óâ¶6öÖÖæBÂ&w5Ò’Â°Ð¢²&7"Â²"ÖÂ"Â"ÒÒ"Â&W6öÇfR‡&W÷6—F÷'•&ö÷BÂ&2öÖö&–ÆRöæöFUöÖöGVÆW2"’Â&W6öÇfR‡&W÷6—F÷'•&ö÷BÂ&2öÖö&–ÆRöæöFUöÖöGVÆW2"•ÕÒÀÐ¢Ò“°Ð§Ò“°Ð Ð§FW7B‚&W†7B6†V6¶÷WG2&R7&VFVBöâF†R6VÆV7FVBv÷&¶W"'F–f7Bf–ÆW7—7FVÒ"Â7–æ2‚’Óâ°Ð¢6öç7Bv÷&·76RÒv—BÖ¶GFV×‡&W6öÇfR‡F×F—"‚’Â'&Wf–Wr×v÷&·76RÒ"’“°Ð¢G'’°Ð¢6öç7B6†V6¶÷WBÒv—B7&VFTW†7D6†V6¶÷WDF—&V7F÷'’‡v÷&·76R“°Ð¢76W'BæWVÂ‡&W6öÇfR†6†V6¶÷WBÂ"ââ"’Â&W6öÇfR‡v÷&·76R’“°Ð¢76W'BæÖF6‚†6†V6¶÷WBÂõÂæ·W&–÷F–6¶WB×&Wf–WrÒò“°Ð¢Òf–æÆÇ’°Ð¢v—B&Ò‡v÷&·76RÂ²&V7W'6—fS¢G'VRÂf÷&6S¢G'VRÒ“°Ð¢ÐÐ§Ò“°Ð Ð§FW7B‚&W†7BÖ6†V6¶÷WB&W&F–öâf–Ç26Æ÷6VBv†VâFWVæFVæ7’Öæ–fW7G2F–ffW""Â7–æ2‚’Óâ°Ð¢6öç7BFV×÷&'’Òv—BÖ¶GFV×‡&W6öÇfR‡F×F—"‚’Â'&Wf–WrÖFWVæFVæ6–W2Ò"’“°Ð¢G'’°Ð¢v—BÖ¶F—"‡&W6öÇfR‡FV×÷&'’Â&2öÖö&–ÆR"’Â²&V7W'6—fS¢G'VRÒ“°Ð¢f÷"†6öç7BÖæ–fW7Böb²'6¶vRæ§6öâ"Â'6¶vRÖÆö6²æ§6öâ"Â&2öÖö&–ÆR÷6¶vRæ§6öâ"Â&2öÖö&–ÆR÷6¶vRÖÆö6²æ§6öâ%Ò’°Ð¢v—B6÷”f–ÆR‡&W6öÇfR‡&W÷6—F÷'•&ö÷BÂÖæ–fW7B’Â&W6öÇfR‡FV×÷&'’ÂÖæ–fW7B’“°Ð¢ÐÐ¢v—Bw&—FTf–ÆR‡&W6öÇfR‡FV×÷&'’Â&2öÖö&–ÆR÷6¶vRæ§6öâ"’Â'·ÕÆâ"“°Ð¢v—B76W'Bç&V¦V7G2€Ð¢&W&T6†V6¶÷WB‡FV×÷&'’Â²FWVæFVæ7•&ö÷C¢&W÷6—F÷'•&ö÷BÂ6öÖÖæE'VææW#¢7–æ2‚’Óâ·ÒÒ’ÀÐ¢öFWVæFVæ7’Öæ–fW7BF–ffW'2â¦5ÂöÖö&–ÆUÂ÷6¶vUÂæ§6öâòÀÐ¢“°Ð¢Òf–æÆÇ’°Ð¢v—B&Ò‡FV×÷&'’Â²&V7W'6—fS¢G'VRÂf÷&6S¢G'VRÒ“°Ð¢ÐÐ§Ò“°Ð Ð§FW7B‚'vV"&V6÷fW'’F÷G2F†R&V6÷&FVB&VæFW"FWÆ÷’v—F†÷WB7&VF–ærGWÆ–6FR"Â7–æ2‚’Óâ°Ð¢ÆWB7&VFW2Ò°Ð¢6öç7B7F–öç2ÒµÓ°Ð¢6öç7BFWÆ÷’Ò²–C¢&FWÖW†—7F–ær"Â7FGW3¢&Æ—fR"Â6öÖÖ—C¢²–C¢6†ÒÓ°Ð¢6öç7B÷&6†W7G&F÷"ÒæWr&Wf–Wt÷&6†W7G&F÷"‡°Ð¢6öæf–s¢·ÒÀÐ¢ÆVFvW#¢°Ð¢vWD7F–öã¢7–æ2‚’Óâ‡²&VÖ÷FUö–C¢FWÆ÷’æ–BÒ’ÀÐ¢&V6÷&D7F–öã¢7–æ2†7F–öâ’Óâ²7F–öç2çW6‚†7F–öâ“²&WGW&â7F–öã²ÒÀÐ¢ÒÀÐ¢v—F‡V#¢·ÒÀÐ¢&VæFW#¢°Ð¢7&VFTFWÆ÷“¢7–æ2‚’Óâ²7&VFW2³Ò²&WGW&âFWÆ÷“²ÒÀÐ¢vWDFWÆ÷“¢7–æ2†–B’Óâ‡²ââæFWÆ÷’Â–BÒ’ÀÐ¢ÒÀÐ¢7Fv–æuv—C¢7–æ2‡²F&vWE6†Ò’Óâ‡²&VG“¢G'VRÂ6öÖÖ—E6†¢F&vWE6†Ò’ÀÐ¢6ÆVW¢7–æ2‚’Óâ·ÒÀÐ¢Ò“°Ð¢6öç7B&W7VÇBÒv—B÷&6†W7G&F÷"æFVÆ—fW%vV"‡6†Â²6†V6·ö–çC¢7–æ2‚’Óâ·ÒÒ“°Ð¢76W'BæWVÂ†7&VFW2Â“°Ð¢76W'BæWVÂ‡&W7VÇBæFWÆ÷”–BÂFWÆ÷’æ–B“°Ð¢76W'BæWVÂ‡&W7VÇBæFWÆ÷–VE6†Â6†“°Ð¢76W'BæFVWWVÂ†7F–öç2æÖ‚‡²&VÖ÷FT–BÒ’Óâ&VÖ÷FT–B’Â¶FWÆ÷’æ–BÂFWÆ÷’æ–EÒ“°Ð¢76W'BæWVÂ†7F–öç2æB‚Ó’ç7FFRÂ$Ä•dR"“°Ð§Ò“°Ð Ð§FW7B‚'vV"&V6÷fW'’&WÆ6W2öæRFW&Ö–æÂ&V6÷&FVBFWÆ÷’F‡&÷Vv‚âFöÖ–2ÆVFvW"&öÆÆ÷fW""Â7–æ2‚’Óâ°Ð¢ÆWB7&VFW2Ò°Ð¢6öç7B&V6÷&FVBÒ²–C¢&FWÖf–ÆVB"Â7FGW3¢&'V–ÆEöf–ÆVB"Â6öÖÖ—C¢²–C¢6†ÒÓ°Ð¢6öç7B&WÆ6VÖVçBÒ²–C¢&FW×&WÆ6VÖVçB"Â7FGW3¢&Æ—fR"Â6öÖÖ—C¢²–C¢6†ÒÓ°Ð¢6öç7B7F–öç2ÒµÓ°Ð¢6öç7B&WÆ6VÖVçG2ÒµÓ°Ð¢6öç7B÷&6†W7G&F÷"ÒæWr&Wf–Wt÷&6†W7G&F÷"‡°Ð¢6öæf–s¢·ÒÀÐ¢ÆVFvW#¢°Ð¢vWD7F–öã¢7–æ2‚’Óâ‡²&VÖ÷FUö–C¢&V6÷&FVBæ–BÒ’ÀÐ¢&V6÷&D7F–öã¢7–æ2†7F–öâ’Óâ²7F–öç2çW6‚†7F–öâ“²&WGW&â7F–öã²ÒÀÐ¢&WÆ6UFW&Ö–æÄ7F–öã¢7–æ2†7F–öâ’Óâ²&WÆ6VÖVçG2çW6‚†7F–öâ“²&WGW&â7F–öã²ÒÀÐ¢ÒÀÐ¢v—F‡V#¢·ÒÀÐ¢&VæFW#¢°Ð¢7&VFTFWÆ÷“¢7–æ2‚’Óâ²7&VFW2³Ò²&WGW&â&WÆ6VÖVçC²ÒÀÐ¢f–æDFWÆ÷—4'•6†¢7–æ2‚’Óâ·&V6÷&FVEÒÀÐ¢vWDFWÆ÷“¢7–æ2†–B’Óâ–BÓÓÒ&V6÷&FVBæ–Bò&V6÷&FVB¢&WÆ6VÖVçBÀÐ¢ÒÀÐ¢7Fv–æuv—C¢7–æ2‡²F&vWE6†Ò’Óâ‡²&VG“¢G'VRÂ6öÖÖ—E6†¢F&vWE6†Ò’ÀÐ¢6ÆVW¢7–æ2‚’Óâ·ÒÀÐ¢Ò“°Ð¢6öç7B&W7VÇBÒv—B÷&6†W7G&F÷"æFVÆ—fW%vV"‡6†Â²6†V6·ö–çC¢7–æ2‚’Óâ·ÒÒ“°Ð¢76W'BæWVÂ†7&VFW2Â“°Ð¢76W'BæWVÂ†7F–öç5³Òç7FFRÂ$%T”ÄEôd”ÄTB"“°Ð¢76W'BæWVÂ‡&WÆ6VÖVçG2æÆVæwF‚Â“°Ð¢76W'BæWVÂ‡&WÆ6VÖVçG5³ÒæW‡V7FVE&VÖ÷FT–BÂ&V6÷&FVBæ–B“°Ð¢76W'BæWVÂ‡&WÆ6VÖVçG5³Òç&VÖ÷FT–BÂ&WÆ6VÖVçBæ–B“°Ð¢76W'BæWVÂ‡&W7VÇBæFWÆ÷”–BÂ&WÆ6VÖVçBæ–B“°Ð§Ò“°Ð Ð§FW7B‚&ÆVv7’&Wf–WrFWÆ÷–ÖVçBv÷&¶fÆ÷w2&R'6VçBæB&öGV7F–öâFVÆ—fW'’—2&W6W'fVB"Â‚’Óâ°Ð¢6öç7B&VÖ÷fVBÒ²'&Wf–WrÖFWbÖFVÆ—fW'’ç–ÖÂ"Â&–÷2×&Wf–WrÖ'V–ÆBç–ÖÂ"Â&–÷2×&Wf–Wr×FW7FfÆ–v‡B×7V&Ö—Bç–ÖÂ"Â&Öö&–ÆR×&Wf–Wr×WFFRç–ÖÂ"Â&æG&ö–B×&Wf–WrÖ'V–ÆBç–ÖÂ"Â&æG&ö–B×&Wf–WrÖ÷Fç–ÖÂ%Ó°Ð¢f÷"†6öç7Bf–ÆRöb&VÖ÷fVB’76W'BæWVÂ†W†—7G57–æ2‡&W6öÇfR‡&W÷6—F÷'•&ö÷BÂ"æv—F‡V"÷v÷&¶fÆ÷w2"Âf–ÆR’’ÂfÇ6RÂf–ÆR“°Ð¢76W'BæWVÂ†W†—7G57–æ2‡&W6öÇfR‡&W÷6—F÷'•&ö÷BÂ"æv—F‡V"÷v÷&¶fÆ÷w2÷"×&WV—&VBÖvFW2ç–ÖÂ"’’ÂG'VR“°Ð¢76W'BæWVÂ†W†—7G57–æ2‡&W6öÇfR‡&W÷6—F÷'•&ö÷BÂ"æv—F‡V"÷v÷&¶fÆ÷w2öæG&ö–B×&öGV7F–öâÖFVÆ—fW'’ç–ÖÂ"’’ÂG'VR“°Ð¢76W'BæWVÂ†W†—7G57–æ2‡&W6öÇfR‡&W÷6—F÷'•&ö÷BÂ"æv—F‡V"÷v÷&¶fÆ÷w2öÖö&–ÆR×&öGV7F–öâ×WFFRç–ÖÂ"’’ÂG'VR“°Ð§Ò“°Ð Ð§FW7B‚%&VæFW"&ÇVW&–çB†2öæR–æFWVæFVçBG'’×'Vâv÷&¶W"ÂGW&&ÆRFF&6RÂæBF—6&ÆW27Fv–ærWFöFWÆ÷’"Â‚’Óâ°Ð¢6öç7B&VæFW"Ò&VDf–ÆU7–æ2‡&W6öÇfR‡&W÷6—F÷'•&ö÷BÂ'&VæFW"ç–ÖÂ"’Â'WFc‚"“°Ð¢76W'BæÖF6‚‡&VæFW"ÂöæÖS¢·W&–÷F–6¶WB×&Wf–Wr×&VÆV6UÇ2µµÇ5Å5Ò£÷G—S¢v÷&¶W'ÇG—S¢v÷&¶W%Ç2µµÇ5Å5Ò£öæÖS¢·W&–÷F–6¶WB×&Wf–Wr×&VÆV6Rò“°Ð¢76W'BæÖF6‚‡&VæFW"Âõ$Ud”Uuõ$TÄT4UôÔôDUÇ2·fÇVS¢G'’×'Vâò“°Ð¢76W'BæÖF6‚‡&VæFW"ÂöæÖS¢·W&–÷F–6¶WB×&Wf–Wr×&VÆV6R×÷7Fw&W2ò“°Ð¢76W'BæÖF6‚‡&VæFW"ÂöæÖS¢·W&–÷F–6¶WB×vV"×7Fv–æuµÇ5Å5Ò£öWFôFWÆ÷“¢fÇ6Rò“°Ð§Ò“°Ð Ð§FW7B‚&ÆVFvW"66†VÖVæf÷&6W2W"Õ4„æBW"×&VÖ÷FRÖ÷W&F–öâVæ—VVæW72"Â‚’Óâ°Ð¢6öç7B7ÂÒ&VDf–ÆU7–æ2‡&W6öÇfR‡&W÷6—F÷'•&ö÷BÂ'6W'f–6W2÷&Wf–Wr×&VÆV6R÷7Âóö–æ—Bç7Â"’Â'WFc‚"“°Ð¢76W'BæÖF6‚‡7ÂÂ÷6÷W&6U÷6†FW‡B$”Ô%’´U’ò“°Ð¢76W'BæÖF6‚‡7ÂÂõTä•TRÂ†¶–æBÂ–FVçF—G•ö¶W•Â’ò“°Ð¢76W'BæÖF6‚‡7ÂÂööæU÷&VæFW%÷W%÷6†ò“°Ð¢76W'BæÖF6‚‡7ÂÂööæUö÷F÷W%÷6†ò“°Ð¢76W'BæÖF6‚‡7ÂÂööæUö–÷5ö'V–ÆE÷W%÷6†ò“°¢76W'BæÖF6‚‡7ÂÂööæU÷7V&Ö—76–öå÷W%ö'V–ÆBò“°¢76W'BæÖF6‚‡7ÂÂ÷&Wf–Wu÷&VÆV6U÷&öw&W76–öåö÷&FW%÷6Wò“°¢76W'BæÖF6‚‡7ÂÂ÷&öw&W76–öåö÷&FW%÷Væ—VRò“°§Ò“° Ð§FW7B‚&æWr&VÆV6R6W'f–6R–ç27W÷'FVBæò×v—BWFò×7V&Ö—BæBW†7BÕ4„&V6öæ6–Æ–F–öâ6öÖÖæG2"Â‚’Óâ°Ð¢6öç7B6Æ–VçBÒ&VDf–ÆU7–æ2‡&W6öÇfR‡&W÷6—F÷'•&ö÷BÂ'6W'f–6W2÷&Wf–Wr×&VÆV6R÷&VÖ÷FRÖ6Æ–VçG2æÖ§2"’Â'WFc‚"“°Ð¢76W'BæÖF6‚†6Æ–VçBÂöV2Ö6Æ”eÂãuÂãBò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂò"ÒÖv—BÖ6öÖÖ—BÖ†6‚"ÂF&vWE6†ò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂò"ÒÖg&VW¦RÖ7&VFVçF–Ç2"Â"ÒÖæò×v—B"Â"ÒÖWFò×7V&Ö—B×v—F‚×&öf–ÆR"Â'&Wf–Wr"ò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂò"Ò×ÆFf÷&Ò"Â&æG&ö–B%µÇ5Å5Ò£ò"ÒÖg&VW¦RÖ7&VFVçF–Ç2"Â"ÒÖæò×v—B"ò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂò'WFFS¦Æ—7B"Â"ÒÖ'&æ6‚"Â'&Wf–Wr"ò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂôõd$”åC¢'&Wf–Wr"ò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂôô%T”ÄEôÔôDS¢'&VÆV6R"ò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂôU…õõT$Ä”5ô•ô$4UõU$Ã¢$Ud”Uuô”DTåD•E•Âæ”÷&–v–âò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂöæöFUöÖöGVÆW2"Â%Âæ&–â"ò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂõÅ²&f–ævW'&–çC¦vVæW&FR"Â"Ò×ÆFf÷&Ò"ÂÆFf÷&ÒÂ"ÒÖ6öæ7W'&VçBÖ–òÖÆ–Ö—B"Â#%ÅÒò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂôäôDUôõD”ôå3¢"ÒÖÖ‚ÖöÆB×76R×6—¦SÓ“b"ÂÔÄÄô5ô$TäôÔƒ¢#""ò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂ÷&Wf–Wr×&VÆV6RÖf–ævW'&–çB×7F'FVBò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂ÷&Wf–Wr×&VÆV6RÖf–ævW'&–çBÖ6ö×ÆWFRò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂö6öç7B—5WFFUV&Æ—6‚Ò&w5Å³ÅÒÓÓÒ'WFFR"ò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂòÒÖÖ‚ÖöÆB×76R×6—¦SÕÂEÇ¶—5WFFUV&Æ—6‚ÃòS"¢#…ÇÒò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂ÷F–ÖV÷WC¢—5WFFUV&Æ—6‚Ãò#Â¢cÂ¢¢RÂ¢cÂ¢ò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂôÔÄÄô5ô$TäôÔƒ¢#""ò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂ÷&Wf–Wr×&VÆV6RÖV2Ö6öÖÖæB×7F'FVBò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂ÷&Wf–Wr×&VÆV6RÖV2Ö6öÖÖæBÖ6ö×ÆWFRò“°Ð¢76W'BæÖF6‚†6Æ–VçBÂ÷F–ÖV÷WC¢RÂ¢cÂ¢ò“°Ð¢76W'BæFöW4æ÷DÖF6‚†6Æ–VçBÂöW†V5Â†6öÖÖæBÂÅ²&f–ævW'&–çB"Â&f–ævW'&–çC¦vVæW&FR"ò“°Ð¢76W'BæFöW4æ÷DÖF6‚†6Æ–VçBÂ÷&öGV7F–öâÓÂã5ÂãÆ6öÕÂæ·W&–÷F–6¶WEÂæ²"uÒò“°Ð§Ò“°Ð Ð§FW7B‚$õDFVÆ—fW'’V&Æ—6†W2ÆFf÷&×26WVVçF–ÆÇ’æB&W7VÖW2öæÇ’Ö—76–ærÆFf÷&Ò"Â7–æ2‚’Óâ°Ð¢6öç7BV&Æ—6†VBÒµÓ°Ð¢6öç7B7F–öç2ÒµÓ°Ð¢6öç7B–÷4†—7F÷'’Ò²'&æ6ƒ¢'&Wf–Wr"Â'VçF–ÖUfW'6–öã¢'&Wf–WrÓã2ã"Âw&÷W¢&–÷2ÖW†—7F–ær"ÂÆFf÷&×3¢²&–÷2%ÒÂÖW76vS¢WFöÖF–2&Wf–Wr”õ2õDf÷"G·6†Ó²VF—B'VâÓ°Ð¢6öç7B÷&6†W7G&F÷"ÒæWr&Wf–Wt÷&6†W7G&F÷"‡°Ð¢6öæf–s¢·ÒÀÐ¢ÆVFvW#¢²&V6÷&D7F–öã¢7–æ2†7F–öâ’Óâ²7F–öç2çW6‚†7F–öâ“²&WGW&â7F–öã²ÒÒÀÐ¢v—F‡V#¢·ÒÂ&VæFW#¢·ÒÀÐ¢V4f7F÷'“¢‚’Óâ‡°Ð¢Æ—7EWFFW3¢7–æ2‚’Óâ¶–÷4†—7F÷'•ÒÀÐ¢V&Æ—6…WFFS¢7–æ2†ÖW76vRÂÆFf÷&Ò’Óâ°Ð¢V&Æ—6†VBçW6‚‡ÆFf÷&Ò“°Ð¢&WGW&â·²–C¢G·ÆFf÷&×ÒÖæWvÂ'&æ6ƒ¢'&Wf–Wr"Â'VçF–ÖUfW'6–öã¢'&Wf–WrÓã2ã"ÂÆFf÷&×3¢·ÆFf÷&ÕÒÂÖW76vRÕÓ°Ð¢ÒÀÐ¢Ò’ÀÐ¢Ò“°Ð¢6öç7B&W7VÇBÒv—B÷&6†W7G&F÷"æFVÆ—fW$÷F‡6†Â&W÷6—F÷'•&ö÷BÂ²6†V6·ö–çC¢7–æ2‚’Óâ·ÒÒ“°Ð¢76W'BæFVWWVÂ‡V&Æ—6†VBÂ²&æG&ö–B%Ò“°Ð¢76W'BæFVWWVÂ‡&W7VÇBçWFFT–G2Â²&–÷2ÖW†—7F–ær"Â&æG&ö–BÖæWr%Ò“°Ð¢76W'BæWVÂ†7F–öç5³Òç7FFRÂ%T$Ä•4„TB"“°Ð§Ò“°Ð Ð§FW7B‚$õD6Æ–VçB&V¦V7G2ÆÂ×ÆFf÷&ÒV&Æ–6F–öâæBW6W2&÷VæFVB6WVVçF–ÂW‡÷'BÖVÖ÷'’"Â7–æ2‚’Óâ°Ð¢6öç7B6Æ–VçBÒæWrV46Æ–VçB‡²W‡õFö¶Vã¢'‚"Â7vC¢&W÷6—F÷'•&ö÷BÂ6öÖÖæC¢'VçW6VB"Ò“°Ð¢6öç7B6ÆÇ2ÒµÓ°Ð¢6Æ–VçBç'VâÒ7–æ2†&w2’Óâ²6ÆÇ2çW6‚†&w2“²&WGW&â·²–C¢'WFFRÖ–B"ÕÓ²Ó°Ð¢v—B6Æ–VçBçV&Æ—6…WFFR‚&ÖW76vR"Â&–÷2"“°Ð¢76W'BæWVÂ†6ÆÇ5³Õ¶6ÆÇ5³Òæ–æFW„öb‚"Ò×ÆFf÷&Ò"’²ÒÂ&–÷2"“°Ð¢v—B76W'Bç&V¦V7G2†6Æ–VçBçV&Æ—6…WFFR‚&ÖW76vR"Â&ÆÂ"’Â÷ÆFf÷&Ò—2–çfÆ–Bò“°Ð¢6öç7B6÷W&6RÒ&VDf–ÆU7–æ2‡&W6öÇfR‡&W÷6—F÷'•&ö÷BÂ'6W'f–6W2÷&Wf–Wr×&VÆV6R÷&VÖ÷FRÖ6Æ–VçG2æÖ§2"’Â'WFc‚"“°Ð¢76W'BæÖF6‚‡6÷W&6RÂö—5WFFUV&Æ—6‚ÃòS"¢#‚ò“°Ð§Ò“°Ð Ð§FW7B‚'vV"&V6÷fW'’&WÆ6W2FW&Ö–æÂW†7BÕ4„FWÆ÷’F—66÷fW&VB&Vf÷&RF†RÆVFvW"7F–öâW†—7G2"Â7–æ2‚’Óâ°Ð¢ÆWB7&VFW2Ò°Ð¢6öç7BFV7F—fFVBÒ²–C¢&FWÖFV7F—fFVB"Â7FGW3¢&FV7F—fFVB"Â6öÖÖ—C¢²–C¢6†ÒÓ°Ð¢6öç7B&WÆ6VÖVçBÒ²–C¢&FW×&WÆ6VÖVçB"Â7FGW3¢&Æ—fR"Â6öÖÖ—C¢²–C¢6†ÒÓ°Ð¢6öç7B7F–öç2ÒµÓ°Ð¢6öç7B&WÆ6VÖVçG2ÒµÓ°Ð¢6öç7B÷&6†W7G&F÷"ÒæWr&Wf–Wt÷&6†W7G&F÷"‡°Ð¢6öæf–s¢·ÒÀÐ¢ÆVFvW#¢°Ð¢vWD7F–öã¢7–æ2‚’ÓâçVÆÂÀÐ¢&V6÷&D7F–öã¢7–æ2†7F–öâ’Óâ²7F–öç2çW6‚†7F–öâ“²&WGW&â7F–öã²ÒÀÐ¢&WÆ6UFW&Ö–æÄ7F–öã¢7–æ2†7F–öâ’Óâ²&WÆ6VÖVçG2çW6‚†7F–öâ“²&WGW&â7F–öã²ÒÀÐ¢ÒÀÐ¢v—F‡V#¢·ÒÀÐ¢&VæFW#¢°Ð¢7&VFTFWÆ÷“¢7–æ2‚’Óâ²7&VFW2³Ò²&WGW&â&WÆ6VÖVçC²ÒÀÐ¢f–æDFWÆ÷—4'•6†¢7–æ2‚’Óâ¶FV7F—fFVEÒÀÐ¢vWDFWÆ÷“¢7–æ2†–B’Óâ–BÓÓÒFV7F—fFVBæ–BòFV7F—fFVB¢&WÆ6VÖVçBÀÐ¢ÒÀÐ¢7Fv–æuv—C¢7–æ2‡²F&vWE6†Ò’Óâ‡²&VG“¢G'VRÂ6öÖÖ—E6†¢F&vWE6†Ò’ÀÐ¢6ÆVW¢7–æ2‚’Óâ·ÒÀÐ¢Ò“°Ð¢6öç7B&W7VÇBÒv—B÷&6†W7G&F÷"æFVÆ—fW%vV"‡6†Â²6†V6·ö–çC¢7–æ2‚’Óâ·ÒÒ“°Ð¢76W'BæWVÂ†7&VFW2Â“°Ð¢76W'BæWVÂ†7F–öç5³Òç7FFRÂ$DT5D•dDTB"“°Ð¢76W'BæWVÂ‡&WÆ6VÖVçG2æÆVæwF‚Â“°Ð¢76W'BæWVÂ‡&WÆ6VÖVçG5³ÒæW‡V7FVE&VÖ÷FT–BÂFV7F—fFVBæ–B“°Ð¢76W'BæWVÂ‡&W7VÇBæFWÆ÷”–BÂ&WÆ6VÖVçBæ–B“°Ð§Ò“°Ð Ð§FW7B‚'vV"FVÆ—fW'’F÷G2W†7BÕ4„&VæFW"†—7F÷'’&Vf÷&R7&VF–ærGWÆ–6FR"Â7–æ2‚’Óâ°Ð¢ÆWB7&VFW2Ò°Ð¢6öç7B7F–öç2ÒµÓ°Ð¢6öç7BFWÆ÷’Ò²–C¢&FW×&VÖ÷FR"Â7FGW3¢&Æ—fR"Â6öÖÖ—C¢²–C¢6†ÒÓ°Ð¢6öç7B÷&6†W7G&F÷"ÒæWr&Wf–Wt÷&6†W7G&F÷"‡°Ð¢6öæf–s¢·ÒÀÐ¢ÆVFvW#¢°Ð¢vWD7F–öã¢7–æ2‚’ÓâçVÆÂÀÐ¢&V6÷&D7F–öã¢7–æ2†7F–öâ’Óâ²7F–öç2çW6‚†7F–öâ“²&WGW&â7F–öã²ÒÀÐ¢ÒÀÐ¢v—F‡V#¢·ÒÀÐ¢&VæFW#¢°Ð¢f–æDFWÆ÷—4'•6†¢7–æ2‚’Óâ¶FWÆ÷•ÒÀÐ¢7&VFTFWÆ÷“¢7–æ2‚’Óâ²7&VFW2³Ò²&WGW&âFWÆ÷“²ÒÀÐ¢vWDFWÆ÷“¢7–æ2‚’ÓâFWÆ÷’ÀÐ¢ÒÀÐ¢7Fv–æuv—C¢7–æ2‡²F&vWE6†Ò’Óâ‡²&VG“¢G'VRÂ6öÖÖ—E6†¢F&vWE6†Ò’ÀÐ¢6ÆVW¢7–æ2‚’Óâ·ÒÀÐ¢Ò“°Ð¢6öç7B&W7VÇBÒv—B÷&6†W7G&F÷"æFVÆ—fW%vV"‡6†Â²6†V6·ö–çC¢7–æ2‚’Óâ·ÒÒ“°Ð¢76W'BæWVÂ†7&VFW2Â“°Ð¢76W'BæWVÂ‡&W7VÇBæFWÆ÷”–BÂFWÆ÷’æ–B“°Ð¢76W'BæWVÂ†7F–öç2æB‚Ó’ç&VÖ÷FT–BÂFWÆ÷’æ–B“°Ð§Ò“°Ð Ð