import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyChangeSet } from "./classifier.mjs";
import { PREVIEW_IDENTITY, assertExactSha, assertPreviewIdentity, requirePreviewEnvironment } from "./config.mjs";
import { reconcileBuilds, reconcileSubmission } from "./eas-state.mjs";
import { retry } from "./orchestrator.mjs";
import { PreviewOrchestrator } from "./orchestrator.mjs";
import { EasClient, RenderClient, gitAuthEnvironment } from "./remote-clients.mjs";
import { redactPreflightError, runPreviewPreflight } from "./preflight.mjs";

const sha = "a".repeat(40);
const repositoryRoot = resolve(import.meta.dirname, "../..");
const build = (overrides = {}) => ({ id: "build-1", status: "IN_PROGRESS", gitCommitHash: sha, project: { id: PREVIEW_IDENTITY.easProjectId }, platform: "IOS", buildProfile: "preview", appIdentifier: PREVIEW_IDENTITY.bundleIdentifier, ...overrides });

test("Preview identity is immutable", () => {
  assert.equal(assertPreviewIdentity({ appName: "Kurioticket Preview", bundleIdentifier: "com.kurioticket.app.preview", scheme: "kurioticket-preview", projectId: PREVIEW_IDENTITY.easProjectId, profile: "preview", channel: "preview", runtime: "preview-0.3.0", apiOrigin: "https://staging.kurioticket.com" }), true);
  for (const [key, value] of [["bundleIdentifier", "com.kurioticket.app"], ["profile", "production"], ["channel", "production"], ["runtime", "production-0.3.0"], ["apiOrigin", "https://kurioticket.com"]]) {
    const valid = { appName: "Kurioticket Preview", bundleIdentifier: "com.kurioticket.app.preview", scheme: "kurioticket-preview", projectId: PREVIEW_IDENTITY.easProjectId, profile: "preview", channel: "preview", runtime: "preview-0.3.0", apiOrigin: "https://staging.kurioticket.com", [key]: value };
    assert.throws(() => assertPreviewIdentity(valid), /mismatch|forbidden/i);
  }
});

test("environment defaults to non-mutating dry-run and rejects missing secrets", () => {
  assert.throws(() => requirePreviewEnvironment({}), /Missing/);
  const config = requirePreviewEnvironment({ DATABASE_URL: "postgres://localhost/x", GITHUB_READ_TOKEN: "x", RENDER_API_KEY: "y", RENDER_STAGING_SERVICE_ID: PREVIEW_IDENTITY.renderStagingServiceId, EXPO_TOKEN: "z" });
  assert.equal(config.mode, "dry-run");
  assert.equal(config.pollIntervalMs, 60_000);
  assert.throws(() => requirePreviewEnvironment({ DATABASE_URL: "postgres://localhost/x", GITHUB_READ_TOKEN: "x", RENDER_API_KEY: "y", RENDER_STAGING_SERVICE_ID: "srv-other", EXPO_TOKEN: "z" }), /approved Preview staging service/);
});

test("Render preflight reads only the approved staging service", async () => {
  const requests = [];
  const client = new RenderClient({
    apiKey: "render-secret",
    serviceId: PREVIEW_IDENTITY.renderStagingServiceId,
    fetchImpl: async (url, options) => {
      requests.push({ url, method: options.method });
      const body = url.includes("deploys") ? [{ deploy: { id: "dep-stage", status: "live" } }] : { id: PREVIEW_IDENTITY.renderStagingServiceId, name: "Kurioticket.com-staging" };
      return { ok: true, json: async () => body };
    },
  });
  assert.equal((await client.getService()).id, PREVIEW_IDENTITY.renderStagingServiceId);
  assert.equal((await client.latestDeploy()).id, "dep-stage");
  assert.deepEqual(requests.map(({ method }) => method), ["GET", "GET"]);
  assert.equal(requests.every(({ url }) => url.includes(PREVIEW_IDENTITY.renderStagingServiceId)), true);
});

test("Render preflight rejects wrong identity, authentication failure, and malformed responses", async () => {
  const wrong = new RenderClient({ apiKey: "x", serviceId: "srv-other", fetchImpl: async () => ({ ok: true, json: async () => ({}) }) });
  await assert.rejects(wrong.getService(), /Unapproved/);
  const unauthorized = new RenderClient({ apiKey: "x", serviceId: PREVIEW_IDENTITY.renderStagingServiceId, fetchImpl: async () => ({ ok: false, status: 401 }) });
  await assert.rejects(unauthorized.getService(), /HTTP 401/);
  const malformed = new RenderClient({ apiKey: "x", serviceId: PREVIEW_IDENTITY.renderStagingServiceId, fetchImpl: async () => ({ ok: true, json: async () => ({ id: "wrong" }) }) });
  await assert.rejects(malformed.getService(), /malformed or mismatched/);
});

test("EAS preflight accepts only the exact Preview project and readable history", async () => {
  const client = new EasClient({ expoToken: "expo-secret", cwd: repositoryRoot, command: "unused" });
  const calls = [];
  client.run = async (args) => { calls.push(args); return args[1] === "project:info" ? { projectId: PREVIEW_IDENTITY.easProjectId } : []; };
  assert.equal((await client.projectInfo()).projectId, PREVIEW_IDENTITY.easProjectId);
  assert.deepEqual(await client.previewBuildHistory(), []);
  assert.deepEqual(calls[0], ["eas-cli@16.17.4", "project:info", "--json"]);
  assert.equal(calls.every((args) => !args.includes("build") && !args.includes("update")), true);
});

test("EAS preflight rejects wrong projects, authentication errors, and malformed history", async () => {
  const client = new EasClient({ expoToken: "x", cwd: repositoryRoot, command: "unused" });
  client.run = async () => ({ projectId: "wrong" });
  await assert.rejects(client.projectInfo(), /mismatched/);
  client.run = async () => { throw new Error("Expo authentication failed"); };
  await assert.rejects(client.projectInfo(), /authentication failed/);
  client.run = async () => ({ unexpected: true });
  await assert.rejects(client.previewBuildHistory(), /malformed/);
});

test("provider preflight validates all read-only identities without mutation", async () => {
  let mutations = 0;
  const result = await runPreviewPreflight({
    config: { mode: "dry-run" },
    ledger: { healthCheck: async () => ({ connected: true }) },
    github: { latestDevSha: async () => sha },
    render: { getService: async () => ({ id: PREVIEW_IDENTITY.renderStagingServiceId, name: "Kurioticket.com-staging" }), latestDeploy: async () => ({ id: "dep-stage", status: "live" }), createDeploy: async () => { mutations += 1; } },
    eas: { projectInfo: async () => ({ projectId: PREVIEW_IDENTITY.easProjectId }), previewBuildHistory: async () => [], listUpdates: async () => [], createIosBuild: async () => { mutations += 1; }, publishUpdate: async () => { mutations += 1; } },
  });
  assert.equal(result.status, "PASS");
  assert.equal(result.submissionPerformed, false);
  assert.equal(mutations, 0);
});

test("provider preflight rejects non-dry-run mode and redacts credentials", async () => {
  await assert.rejects(runPreviewPreflight({ config: { mode: "active" } }), /dry-run/);
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
test("classification is deterministic and rejects malformed paths", () => {
  assert.deepEqual(classifyChangeSet(["src/a.ts", "src/a.ts"]), classifyChangeSet(["src/a.ts"]));
  assert.equal(classifyChangeSet(["apps\\mobile\\a.ts"]).classification, "UNSAFE");
});

for (const [status, expected] of [["IN_QUEUE", "ACTIVE_MATCH"], ["IN_PROGRESS", "ACTIVE_MATCH"], ["FINISHED", "FINISHED_MATCH"], ["ERRORED", "FAILED_MATCH"], ["CANCELED", "CANCELED_MATCH"]]) {
  test(`EAS reconciliation maps ${status}`, () => assert.equal(reconcileBuilds([build({ status })], sha).decision, expected));
}
test("EAS reconciliation returns NONE for unrelated SHAs", () => assert.equal(reconcileBuilds([build({ gitCommitHash: "b".repeat(40) })], sha).decision, "NONE"));
test("EAS reconciliation fails closed on identity conflict", () => assert.equal(reconcileBuilds([build({ buildProfile: "production" })], sha).decision, "CONFLICT"));
test("EAS reconciliation fails closed on duplicate exact matches", () => assert.equal(reconcileBuilds([build(), build({ id: "build-2" })], sha).decision, "CONFLICT"));
test("EAS reconciliation fails closed on malformed history", () => assert.equal(reconcileBuilds([{ nope: true }], sha).decision, "MALFORMED_RESPONSE"));
test("EAS reconciliation supports exact Android Preview identity", () => {
  assert.equal(reconcileBuilds([build({ platform: "ANDROID" })], sha, "android").decision, "ACTIVE_MATCH");
  assert.equal(reconcileBuilds([build({ platform: "IOS" })], sha, "android").decision, "CONFLICT");
});

for (const [status, expected] of [["CREATED", "CREATED"], ["IN_PROGRESS", "IN_PROGRESS"], ["FINISHED", "FINISHED"], ["ERRORED", "FAILED"]]) {
  test(`submission reconciliation maps ${status}`, () => assert.equal(reconcileSubmission({ status: "FINISHED", submission: { id: "sub-1", status } }).state, expected));
}
test("finished build without submission is explicit NOT_CREATED", () => assert.equal(reconcileSubmission({ status: "FINISHED" }).state, "NOT_CREATED"));
test("duplicate submissions fail closed", () => assert.equal(reconcileSubmission({ submissions: [{ id: "1" }, { id: "2" }] }).state, "CONFLICT"));

test("bounded retry succeeds without infinite looping", async () => {
  let attempts = 0;
  const result = await retry(async () => { attempts += 1; if (attempts < 3) throw new Error("temporary"); return "ok"; }, { attempts: 3, sleep: async () => {}, baseMs: 1 });
  assert.equal(result, "ok"); assert.equal(attempts, 3);
});
test("bounded retry preserves the final error", async () => {
  await assert.rejects(retry(async () => { throw new Error("authoritative"); }, { attempts: 2, sleep: async () => {}, baseMs: 1 }), /authoritative/);
});
test("full SHA validation rejects branch names and short SHAs", () => {
  assert.equal(assertExactSha(sha), sha);
  assert.throws(() => assertExactSha("dev"), /40-character/);
  assert.throws(() => assertExactSha("a".repeat(7)), /40-character/);
});

test("authenticated git fetch uses GitHub-supported Basic credentials without exposing the token in arguments", () => {
  const token = "github_pat_example_read_only";
  const environment = gitAuthEnvironment(token, { PATH: "test" });
  assert.equal(environment.GIT_CONFIG_COUNT, "1");
  assert.equal(environment.GIT_CONFIG_KEY_0, "http.extraHeader");
  assert.match(environment.GIT_CONFIG_VALUE_0, /^Authorization: Basic [A-Za-z0-9+/=]+$/);
  assert.equal(Buffer.from(environment.GIT_CONFIG_VALUE_0.replace("Authorization: Basic ", ""), "base64").toString("utf8"), `x-access-token:${token}`);
  assert.equal(JSON.stringify(["fetch", "--quiet", "origin"]).includes(token), false);
});

test("dry-run detects exact SHA and crosses no mutation boundary", async () => {
  const transitions = [];
  const reports = [];
  const ledger = {
    lastSuccessful: async () => ({ source_sha: "b".repeat(40) }),
    claim: async () => ({ source_sha: sha, previous_sha: "b".repeat(40), state: "DETECTED" }),
    transition: async (sourceSha, worker, from, state, patch = {}) => { transitions.push({ sourceSha, state, patch }); return { source_sha: sourceSha, state, ...patch }; },
  };
  const github = {
    latestDevSha: async () => sha,
    compare: async () => ["docs/preview.md"],
    report: async (...args) => reports.push(args),
  };
  let mutations = 0;
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "dry-run", workerId: "test", leaseMs: 60_000, repository: PREVIEW_IDENTITY.repository, githubReadToken: "token" },
    ledger,
    github,
    render: { createDeploy: async () => { mutations += 1; } },
    easFactory: () => ({ publishUpdate: async () => { mutations += 1; }, createIosBuild: async () => { mutations += 1; } }),
    sleep: async () => {},
  });
  orchestrator.process = async (record) => {
    await ledger.transition(record.source_sha, "test", ["DETECTED"], "VALIDATING");
    await ledger.transition(record.source_sha, "test", ["VALIDATING"], "COMPLETE", { evidence: { submissionPerformed: false } });
    return { source_sha: record.source_sha, state: "COMPLETE" };
  };
  const result = await orchestrator.cycle();
  assert.equal(result.state, "COMPLETE");
  assert.equal(mutations, 0);
  assert.equal(reports[0][0], sha);
  assert.deepEqual(transitions.map(({ state }) => state), ["VALIDATING", "COMPLETE"]);
});

test("polling API failure never becomes a no-change result", async () => {
  const orchestrator = new PreviewOrchestrator({
    config: { mode: "dry-run" }, ledger: {},
    github: { latestDevSha: async () => { throw new Error("GitHub unavailable"); } }, render: {}, sleep: async () => {},
  });
  await assert.rejects(orchestrator.cycle(), /GitHub unavailable/);
});

test("legacy Preview deployment workflows are absent and Production delivery is preserved", () => {
  const removed = ["preview-dev-delivery.yml", "ios-preview-build.yml", "ios-preview-testflight-submit.yml", "mobile-preview-update.yml", "android-preview-build.yml", "android-preview-ota.yml"];
  for (const file of removed) assert.equal(existsSync(resolve(repositoryRoot, ".github/workflows", file)), false, file);
  assert.equal(existsSync(resolve(repositoryRoot, ".github/workflows/pr-required-gates.yml")), true);
  assert.equal(existsSync(resolve(repositoryRoot, ".github/workflows/android-production-delivery.yml")), true);
  assert.equal(existsSync(resolve(repositoryRoot, ".github/workflows/mobile-production-update.yml")), true);
});

test("Render blueprint has one independent dry-run worker, durable database, and disables staging autodeploy", () => {
  const render = readFileSync(resolve(repositoryRoot, "render.yaml"), "utf8");
  assert.match(render, /name: kurioticket-preview-release\s+[\s\S]*?type: worker|type: worker\s+[\s\S]*?name: kurioticket-preview-release/);
  assert.match(render, /PREVIEW_RELEASE_MODE\s+value: dry-run/);
  assert.match(render, /name: kurioticket-preview-release-postgres/);
  assert.match(render, /name: kurioticket-web-staging[\s\S]*?autoDeploy: false/);
});

test("ledger schema enforces per-SHA and per-remote-operation uniqueness", () => {
  const sql = readFileSync(resolve(repositoryRoot, "services/preview-release/sql/001_init.sql"), "utf8");
  assert.match(sql, /source_sha text PRIMARY KEY/);
  assert.match(sql, /UNIQUE \(kind, identity_key\)/);
  assert.match(sql, /one_render_per_sha/);
  assert.match(sql, /one_ota_per_sha/);
  assert.match(sql, /one_ios_build_per_sha/);
  assert.match(sql, /one_submission_per_build/);
});

test("new release service pins supported no-wait auto-submit and exact-SHA reconciliation commands", () => {
  const client = readFileSync(resolve(repositoryRoot, "services/preview-release/remote-clients.mjs"), "utf8");
  assert.match(client, /eas-cli@16\.17\.4/);
  assert.match(client, /"--git-commit-hash", targetSha/);
  assert.match(client, /"--freeze-credentials", "--no-wait", "--auto-submit-with-profile", "preview"/);
  assert.match(client, /"--platform", "android"[\s\S]*?"--freeze-credentials", "--no-wait"/);
  assert.match(client, /"update:list", "--branch", "preview"/);
  assert.match(client, /APP_VARIANT: "preview"/);
  assert.match(client, /APP_BUILD_MODE: "release"/);
  assert.match(client, /EXPO_PUBLIC_API_BASE_URL: PREVIEW_IDENTITY\.apiOrigin/);
  assert.doesNotMatch(client, /production-0\.3\.0|com\.kurioticket\.app["']/);
});
