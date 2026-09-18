import test from "node:test";
import assert from "node:assert/strict";
import { PREVIEW_IDENTITY } from "./config.mjs";
import { PreviewOrchestrator } from "./orchestrator.mjs";

const sourceSha = "1".repeat(40);
const iosFingerprint = "2".repeat(40);
const androidFingerprint = "3".repeat(40);

function makeOrchestrator({ currentSha = sourceSha, currentFingerprints = { ios: iosFingerprint, android: androidFingerprint } } = {}) {
  let cleanupCalls = 0;
  const exactEas = { marker: "exact-current-eas" };
  const orchestrator = new PreviewOrchestrator({
    config: {
      repository: "Zentric-Analytics/Kurioticket.com",
      githubReadToken: "read-token",
      expoToken: "expo-token",
    },
    ledger: {},
    github: { latestDevSha: async () => currentSha },
    render: {},
    easFactory: (cwd) => {
      assert.equal(cwd, "/tmp/exact-current/apps/mobile");
      return exactEas;
    },
    checkoutFactory: async ({ repository, token, sha }) => {
      assert.equal(repository, "Zentric-Analytics/Kurioticket.com");
      assert.equal(token, "read-token");
      assert.equal(sha, sourceSha);
      return {
        directory: "/tmp/exact-current",
        cleanup: async () => { cleanupCalls += 1; },
      };
    },
    prepareCheckoutFactory: async (directory, options) => {
      assert.equal(directory, "/tmp/exact-current");
      assert.deepEqual(options, { allowRootScriptDrift: true });
    },
    identityFactory: async () => ({ ...PREVIEW_IDENTITY }),
    fingerprintsFactory: async (directory) => {
      assert.equal(directory, "/tmp/exact-current");
      return currentFingerprints;
    },
  });
  return { orchestrator, exactEas, cleanupCalls: () => cleanupCalls };
}

test("exact-current native context fingerprints the exact dev checkout before recovery work", async () => {
  const { orchestrator, exactEas, cleanupCalls } = makeOrchestrator();
  let operations = 0;
  const result = await orchestrator.withExactCurrentNativeContext({
    sourceSha,
    platform: "ios",
    expectedFingerprint: iosFingerprint,
  }, async ({ directory, eas, fingerprint }) => {
    operations += 1;
    assert.equal(directory, "/tmp/exact-current");
    assert.equal(eas, exactEas);
    assert.equal(fingerprint, iosFingerprint);
    return { ok: true };
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(operations, 1);
  assert.equal(cleanupCalls(), 1);
});

test("exact-current native context fails closed before recovery work on a fingerprint mismatch", async () => {
  const { orchestrator, cleanupCalls } = makeOrchestrator({
    currentFingerprints: { ios: "4".repeat(40), android: androidFingerprint },
  });
  let operations = 0;
  await assert.rejects(
    orchestrator.withExactCurrentNativeContext({
      sourceSha,
      platform: "ios",
      expectedFingerprint: iosFingerprint,
    }, async () => { operations += 1; }),
    /Current dev iOS fingerprint no longer matches the abandoned reservation/,
  );
  assert.equal(operations, 0);
  assert.equal(cleanupCalls(), 1);
});
