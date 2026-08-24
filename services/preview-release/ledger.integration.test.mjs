import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { PreviewLedger } from "./ledger.mjs";

const connectionString = process.env.PREVIEW_RELEASE_TEST_DATABASE_URL;

async function resetLedger(ledger) {
  await ledger.pool.query("DROP TABLE IF EXISTS preview_native_ownership_incident, preview_native_notification, preview_delivered_native_state, preview_release_action, preview_release CASCADE; DROP SEQUENCE IF EXISTS preview_release_progression_order_seq CASCADE");
  for (const file of (await readdir(resolve(import.meta.dirname, "sql"))).filter((name) => /^\d+_.+\.sql$/.test(name)).sort()) {
    await ledger.migrate(await readFile(resolve(import.meta.dirname, "sql", file), "utf8"));
  }
}

test("PostgreSQL canonical native projection is numeric, monotonic, and platform-independent", { skip: !connectionString }, async () => {
  const ledger = new PreviewLedger(connectionString);
  try {
    await resetLedger(ledger);
    for (const source of ["9".repeat(40), "a".repeat(40), "b".repeat(40)]) {
      await ledger.pool.query("INSERT INTO preview_release(source_sha,mode,state) VALUES($1,'active','COMPLETE')", [source]);
    }
    await ledger.advanceDeliveredNative({ platform: "ios", sourceSha: "a".repeat(40), fingerprint: "1".repeat(40), buildId: "ios-10", appVersion: "0.3.0", buildNumber: "10", submissionId: "sub-10", appleBuildId: "apple-10", distributionId: "apple-10:group" });
    await ledger.advanceDeliveredNative({ platform: "android", sourceSha: "b".repeat(40), fingerprint: "2".repeat(40), buildId: "android-11", appVersion: "0.3.0", buildNumber: "11" });
    const historical = await ledger.advanceDeliveredNative({ platform: "ios", sourceSha: "9".repeat(40), fingerprint: "3".repeat(40), buildId: "ios-9", appVersion: "0.3.0", buildNumber: "9", submissionId: "sub-9", appleBuildId: "apple-9", distributionId: "apple-9:group" });
    assert.equal(historical.advanced, false);
    assert.equal((await ledger.currentDeliveredNative("ios")).native_build_id, "ios-10");
    assert.equal((await ledger.currentDeliveredNative("android")).native_build_id, "android-11");
    await assert.rejects(
      ledger.advanceDeliveredNative({ platform: "ios", sourceSha: "b".repeat(40), fingerprint: "4".repeat(40), buildId: "ios-conflict", appVersion: "0.3.0", buildNumber: "10", submissionId: "sub-x", appleBuildId: "apple-x", distributionId: "apple-x:group" }),
      /conflicting build identities/,
    );
  } finally {
    await ledger.close();
  }
});

test("PostgreSQL atomically replaces one legacy OTA mismatch and preserves its audit evidence", { skip: !connectionString }, async () => {
  const ledger = new PreviewLedger(connectionString);
  const sourceSha = "c".repeat(40);
  const identityKey = `${sourceSha}:android=${"a".repeat(40)}:preview`;
  try {
    await resetLedger(ledger);
    await ledger.pool.query("INSERT INTO preview_release(source_sha,mode,state) VALUES($1,'active','DELIVERING')", [sourceSha]);
    await ledger.recordAction({
      sourceSha, kind: "OTA", identityKey, remoteId: "android=legacy-group", state: "RUNTIME_MISMATCH",
      evidence: { expectedRuntime: "a".repeat(40), mismatchPlatform: "android" },
    });
    const replaced = await ledger.replaceTerminalAction({
      sourceSha, kind: "OTA", identityKey, expectedRemoteId: "android=legacy-group",
      remoteId: "android=corrected-group", state: "PUBLISHED",
      evidence: {
        runtimeContextVersion: "native-platform-v1", previousRemoteId: "android=legacy-group",
        previousState: "RUNTIME_MISMATCH", previousEvidence: { expectedRuntime: "a".repeat(40), mismatchPlatform: "android" },
        replacementReason: "corrected-native-platform-runtime-context",
      },
    });
    assert.equal(replaced.remote_id, "android=corrected-group");
    assert.equal(replaced.state, "PUBLISHED");
    assert.equal(replaced.evidence.previousState, "RUNTIME_MISMATCH");
    assert.equal(replaced.evidence.previousRemoteId, "android=legacy-group");
    assert.equal(replaced.evidence.replacementReason, "corrected-native-platform-runtime-context");
    await assert.rejects(ledger.replaceTerminalAction({
      sourceSha, kind: "OTA", identityKey, expectedRemoteId: "android=legacy-group",
      remoteId: "android=duplicate-group", state: "PUBLISHED", evidence: {},
    }), /rejected/);
    const authoritative = await ledger.getAction("OTA", identityKey);
    assert.equal(authoritative.remote_id, "android=corrected-group");
  } finally {
    await ledger.close();
  }
});
