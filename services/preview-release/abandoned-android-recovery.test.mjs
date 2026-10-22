import test from "node:test";
import assert from "node:assert/strict";
import {
  claimAuthorizedAndroidRecoveryCreation,
  parseAuthorizedAbandonedAndroidRecovery,
  runAuthorizedAbandonedAndroidRecovery,
} from "./abandoned-android-recovery.mjs";

const sourceSha = "f8cf3a18a8b31defe82953fba5d1d95f9357dd68";
const fingerprint = "0a082f2685713cea16a553eccfcaa687b36a340e";
const recovery = {
  id: 70001,
  kind: "ANDROID_BUILD",
  source_sha: sourceSha,
  identity_key: `native-build-recovery:android:89f6fd88-c0d7-495a-9e2b-8301b09f407d:${fingerprint}:1`,
  remote_id: null,
  state: "RESERVED",
  evidence: { nativeFingerprint: fingerprint },
};

test("recovery authorization is disabled when no recovery env is present", () => {
  assert.equal(parseAuthorizedAbandonedAndroidRecovery({}), null);
});

test("recovery authorization requires all exact fields and explicit approval", () => {
  assert.throws(() => parseAuthorizedAbandonedAndroidRecovery({
    PREVIEW_ANDROID_RECOVERY_ACTION_ID: "59139",
  }), /incomplete/);
  assert.throws(() => parseAuthorizedAbandonedAndroidRecovery({
    PREVIEW_ANDROID_RECOVERY_ACTION_ID: "59139",
    PREVIEW_ANDROID_RECOVERY_SOURCE_SHA: sourceSha,
    PREVIEW_ANDROID_RECOVERY_FINGERPRINT: fingerprint,
    PREVIEW_ANDROID_RECOVERY_APPROVED: "false",
  }), /explicit/);
});

test("recovery authorization accepts only the exact approved Android reservation", () => {
  assert.deepEqual(parseAuthorizedAbandonedAndroidRecovery({
    PREVIEW_ANDROID_RECOVERY_ACTION_ID: "59139",
    PREVIEW_ANDROID_RECOVERY_SOURCE_SHA: sourceSha,
    PREVIEW_ANDROID_RECOVERY_FINGERPRINT: fingerprint,
    PREVIEW_ANDROID_RECOVERY_APPROVED: "true",
  }), {
    actionId: "59139",
    sourceSha,
    fingerprint,
  });
});

test("authorized abandoned recovery is non-mutating outside active mode", async () => {
  let touched = false;
  const ledger = new Proxy({}, { get() { touched = true; throw new Error("ledger must not be touched"); } });
  await assert.rejects(
    runAuthorizedAbandonedAndroidRecovery({
      authorization: { actionId: "59139", sourceSha, fingerprint },
      mode: "dry-run",
      ledger,
      github: {},
      eas: {},
      orchestrator: {},
    }),
    /forbidden unless Preview release mode is active/,
  );
  assert.equal(touched, false);
});

test("atomic CREATING claim allows only one overlapping worker to win", async () => {
  let row = structuredClone(recovery);
  let locked = Promise.resolve();
  const clients = [];
  const pool = {
    async connect() {
      let releaseLock;
      const client = {
        async query(sql, params = []) {
          if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return { rowCount: 0, rows: [] };
          if (sql.includes("pg_advisory_xact_lock")) {
            const previous = locked;
            locked = new Promise((resolve) => { releaseLock = resolve; });
            await previous;
            return { rowCount: 1, rows: [] };
          }
          if (sql.includes("SET state='CREATING'")) {
            if (row.id === params[0] && row.source_sha === params[1] && row.identity_key === params[2]
              && row.state === "RESERVED" && row.remote_id == null) {
              row = { ...row, state: "CREATING", evidence: JSON.parse(params[3]) };
              return { rowCount: 1, rows: [structuredClone(row)] };
            }
            return { rowCount: 0, rows: [] };
          }
          if (sql.startsWith("SELECT * FROM preview_release_action WHERE id=$1")) {
            return { rowCount: 1, rows: [structuredClone(row)] };
          }
          throw new Error(`Unexpected SQL in atomic claim test: ${sql}`);
        },
        release() { releaseLock?.(); },
      };
      clients.push(client);
      return client;
    },
  };
  const ledger = { pool };
  const args = { ledger, recovery, sourceSha, fingerprint, actionId: "59139", now: Date.parse("2026-09-06T00:00:00Z") };
  const [first, second] = await Promise.all([
    claimAuthorizedAndroidRecoveryCreation(args),
    claimAuthorizedAndroidRecoveryCreation(args),
  ]);
  assert.equal([first.claimed, second.claimed].filter(Boolean).length, 1);
  assert.equal(row.state, "CREATING");
  assert.equal(row.evidence.providerCreationAttempt, "STARTED");
  assert.equal(clients.length, 2);
});
