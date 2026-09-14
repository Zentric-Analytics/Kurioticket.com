import test from "node:test";
import assert from "node:assert/strict";
import { PREVIEW_IDENTITY } from "./config.mjs";
import {
  claimAuthorizedIosRecoveryCreation,
  parseAuthorizedAbandonedIosRecovery,
  runAuthorizedAbandonedIosRecovery,
} from "./abandoned-ios-recovery.mjs";

const sourceSha = "aeb683a1eb0e3bc1908110793e710d5dcff22b10";
const currentDevSha = "39e2eb51b3a8a7acdc8f49c2d4fde294d5b6eca9";
const fingerprint = "d2887634ae4bfabe9931aa8bebefadb0183b5704";
const actionId = "66810";
const canonicalIdentity = `native-build:ios:${PREVIEW_IDENTITY.easProjectId}:${fingerprint}`;
const recoveryIdentity = `native-build-recovery:ios:${PREVIEW_IDENTITY.easProjectId}:${fingerprint}:1`;
const oldEnough = Date.parse("2026-09-14T20:30:00Z");

const originalReservation = () => ({
  id: Number(actionId),
  kind: "IOS_BUILD",
  source_sha: sourceSha,
  identity_key: canonicalIdentity,
  remote_id: null,
  state: "RESERVED",
  evidence: { nativeFingerprint: fingerprint, nativeArtifactSourceSha: sourceSha },
  created_at: "2026-09-14T19:22:44.655882Z",
  updated_at: "2026-09-14T19:22:44.655882Z",
});

const recoveryReservation = () => ({
  id: 70002,
  kind: "IOS_BUILD",
  source_sha: currentDevSha,
  identity_key: recoveryIdentity,
  remote_id: null,
  state: "RESERVED",
  evidence: { nativeFingerprint: fingerprint, nativeArtifactSourceSha: currentDevSha },
  created_at: "2026-09-14T20:00:00Z",
  updated_at: "2026-09-14T20:00:00Z",
});

const exactIosBuild = (overrides = {}) => ({
  id: "11111111-2222-4333-8444-555555555555",
  status: "IN_PROGRESS",
  gitCommitHash: sourceSha,
  project: { id: PREVIEW_IDENTITY.easProjectId },
  platform: "IOS",
  buildProfile: "preview",
  appIdentifier: PREVIEW_IDENTITY.bundleIdentifier,
  runtimeVersion: fingerprint,
  channel: PREVIEW_IDENTITY.channel,
  appVersion: "0.3.0",
  appBuildVersion: "58",
  ...overrides,
});

test("iOS orphan recovery authorization is disabled when no recovery env is present", () => {
  assert.equal(parseAuthorizedAbandonedIosRecovery({}), null);
});

test("iOS orphan recovery requires all exact fields and explicit approval", () => {
  assert.throws(() => parseAuthorizedAbandonedIosRecovery({
    PREVIEW_IOS_RECOVERY_ACTION_ID: actionId,
  }), /incomplete/);
  assert.throws(() => parseAuthorizedAbandonedIosRecovery({
    PREVIEW_IOS_RECOVERY_ACTION_ID: actionId,
    PREVIEW_IOS_RECOVERY_SOURCE_SHA: sourceSha,
    PREVIEW_IOS_RECOVERY_FINGERPRINT: fingerprint,
    PREVIEW_IOS_RECOVERY_APPROVED: "false",
  }), /explicit/);
  assert.deepEqual(parseAuthorizedAbandonedIosRecovery({
    PREVIEW_IOS_RECOVERY_ACTION_ID: actionId,
    PREVIEW_IOS_RECOVERY_SOURCE_SHA: sourceSha,
    PREVIEW_IOS_RECOVERY_FINGERPRINT: fingerprint,
    PREVIEW_IOS_RECOVERY_APPROVED: "true",
  }), { actionId, sourceSha, fingerprint });
});

test("authorized iOS orphan recovery is non-mutating outside active mode", async () => {
  let touched = false;
  const ledger = new Proxy({}, { get() { touched = true; throw new Error("ledger must not be touched"); } });
  await assert.rejects(
    runAuthorizedAbandonedIosRecovery({
      authorization: { actionId, sourceSha, fingerprint },
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

test("orphaned iOS reservation adopts one exact EAS history match instead of creating another build", async () => {
  let row = originalReservation();
  let creates = 0;
  let fingerprintChecks = 0;
  const build = exactIosBuild();
  const pool = {
    async query(sql, params = []) {
      if (sql.startsWith("SELECT * FROM preview_release_action WHERE id=$1 LIMIT 2")) {
        return { rowCount: 1, rows: [structuredClone(row)] };
      }
      throw new Error(`Unexpected pool query: ${sql}`);
    },
    async connect() {
      return {
        async query(sql, params = []) {
          if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) return { rowCount: 0, rows: [] };
          if (sql.includes("pg_advisory_xact_lock")) return { rowCount: 1, rows: [] };
          if (sql.includes("SET remote_id=$4")) {
            assert.equal(params[0], row.id);
            assert.equal(params[1], sourceSha);
            assert.equal(params[2], canonicalIdentity);
            assert.equal(params[3], build.id);
            row = { ...row, remote_id: params[3], state: params[4], evidence: JSON.parse(params[5]) };
            return { rowCount: 1, rows: [structuredClone(row)] };
          }
          throw new Error(`Unexpected client query: ${sql}`);
        },
        release() {},
      };
    },
  };
  const result = await runAuthorizedAbandonedIosRecovery({
    authorization: { actionId, sourceSha, fingerprint },
    mode: "active",
    ledger: { pool },
    github: {},
    eas: {
      listIosBuilds: async (sha) => { assert.equal(sha, sourceSha); return [build]; },
      compareBuildFingerprint: async (id, expected) => {
        fingerprintChecks += 1;
        assert.equal(id, build.id);
        assert.equal(expected, fingerprint);
        return { expectedHash: fingerprint, buildHash: fingerprint };
      },
      createIosBuild: async () => { creates += 1; throw new Error("duplicate build creation"); },
    },
    orchestrator: { recoverCanonicalNativeBuild: async () => { throw new Error("replacement recovery should not run"); } },
    now: () => oldEnough,
    sleep: async () => {},
  });
  assert.equal(result.state, "EXISTING_BUILD_RECONCILED");
  assert.equal(result.buildId, build.id);
  assert.equal(creates, 0);
  assert.equal(fingerprintChecks, 1);
  assert.equal(row.remote_id, build.id);
  assert.equal(row.evidence.abandonedReservationRecovery.ownershipSource, "EXPLICIT_OPERATOR_AUTHORIZATION");
});

test("two provider NO_MATCH checks permit exactly one authorized replacement creation", async () => {
  let original = originalReservation();
  let recovery = recoveryReservation();
  let creates = 0;
  let historyReads = 0;
  let recoveryCalls = 0;
  const pool = {
    async query(sql) {
      if (sql.startsWith("SELECT * FROM preview_release_action WHERE id=$1 LIMIT 2")) {
        return { rowCount: 1, rows: [structuredClone(original)] };
      }
      throw new Error(`Unexpected pool query: ${sql}`);
    },
    async connect() {
      return {
        async query(sql, params = []) {
          if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) return { rowCount: 0, rows: [] };
          if (sql.includes("pg_advisory_xact_lock")) return { rowCount: 1, rows: [] };
          if (sql.includes("SELECT * FROM preview_release_action WHERE id=$1 FOR UPDATE")) {
            return { rowCount: 1, rows: [structuredClone(original)] };
          }
          if (sql.includes("SET state='FAILED'")) {
            original = { ...original, state: "FAILED", evidence: JSON.parse(params[1]) };
            return { rowCount: 1, rows: [structuredClone(original)] };
          }
          if (sql.includes("SET state='CREATING'")) {
            if (recovery.state === "RESERVED" && recovery.remote_id == null) {
              recovery = { ...recovery, state: "CREATING", evidence: JSON.parse(params[3]) };
              return { rowCount: 1, rows: [structuredClone(recovery)] };
            }
            return { rowCount: 0, rows: [] };
          }
          if (sql.startsWith("SELECT * FROM preview_release_action WHERE id=$1 AND kind='IOS_BUILD'")) {
            return { rowCount: 1, rows: [structuredClone(recovery)] };
          }
          throw new Error(`Unexpected client query: ${sql}`);
        },
        release() {},
      };
    },
  };
  const ledger = {
    pool,
    releaseBySha: async (sha) => {
      assert.equal(sha, currentDevSha);
      return { source_sha: sha, evidence: { fingerprints: { ios: fingerprint } } };
    },
    currentDeliveredNative: async () => null,
    latestNativeBuildRecovery: async () => null,
    reserveNativeBuildRecovery: async ({ sourceSha: sha, platform, fingerprint: requested }) => {
      assert.equal(sha, currentDevSha);
      assert.equal(platform, "ios");
      assert.equal(requested, fingerprint);
      return { created: true, action: structuredClone(recovery) };
    },
    recordAction: async (action) => {
      assert.equal(action.kind, "IOS_BUILD");
      assert.equal(action.identityKey, recoveryIdentity);
      recovery = { ...recovery, remote_id: action.remoteId, state: action.state, evidence: action.evidence };
      return structuredClone(recovery);
    },
  };
  const result = await runAuthorizedAbandonedIosRecovery({
    authorization: { actionId, sourceSha, fingerprint },
    mode: "active",
    ledger,
    github: { latestDevSha: async () => currentDevSha },
    eas: {
      listIosBuilds: async () => { historyReads += 1; return []; },
      createIosBuild: async () => {
        creates += 1;
        return exactIosBuild({ id: "66666666-7777-4888-8999-000000000000", status: "NEW", gitCommitHash: currentDevSha });
      },
    },
    orchestrator: {
      recoverCanonicalNativeBuild: async ({ sourceSha: sha, platform }) => {
        recoveryCalls += 1;
        assert.equal(sha, currentDevSha);
        assert.equal(platform, "ios");
        return { buildId: recovery.remote_id, buildNumber: "58", submissionState: "FINISHED" };
      },
    },
    now: () => oldEnough,
    sleep: async () => {},
  });
  assert.equal(result.state, "RECOVERY_COMPLETE");
  assert.equal(creates, 1);
  assert.equal(historyReads, 4);
  assert.equal(recoveryCalls, 1);
  assert.equal(original.state, "FAILED");
  assert.equal(original.evidence.abandonedReservationRecovery.providerOutcome, "NO_MATCH");
  assert.equal(recovery.state, "CREATED");
  assert.equal(recovery.evidence.providerCreationAttempt, "ACCEPTED");
});

test("atomic iOS CREATING claim allows only one overlapping worker to win", async () => {
  let row = recoveryReservation();
  let locked = Promise.resolve();
  const clients = [];
  const pool = {
    async connect() {
      let releaseLock;
      const client = {
        async query(sql, params = []) {
          if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) return { rowCount: 0, rows: [] };
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
          throw new Error(`Unexpected SQL in atomic iOS claim test: ${sql}`);
        },
        release() { releaseLock?.(); },
      };
      clients.push(client);
      return client;
    },
  };
  const ledger = { pool };
  const args = { ledger, recovery: recoveryReservation(), sourceSha: currentDevSha, fingerprint, actionId, now: oldEnough };
  const [first, second] = await Promise.all([
    claimAuthorizedIosRecoveryCreation(args),
    claimAuthorizedIosRecoveryCreation(args),
  ]);
  assert.equal([first.claimed, second.claimed].filter(Boolean).length, 1);
  assert.equal(row.state, "CREATING");
  assert.equal(row.evidence.providerCreationAttempt, "STARTED");
  assert.equal(clients.length, 2);
});
