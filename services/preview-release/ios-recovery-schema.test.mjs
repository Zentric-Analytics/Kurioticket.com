import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PreviewLedger } from "./ledger.mjs";

const initSql = readFileSync(new URL("./sql/001_init.sql", import.meta.url), "utf8");
const recoverySql = readFileSync(new URL("./sql/006_ios_recovery_build_index.sql", import.meta.url), "utf8");

test("iOS recovery schema keeps one canonical build per SHA while allowing recovery rows", () => {
  assert.doesNotMatch(initSql, /preview_release_one_ios_build_per_sha/);
  assert.match(initSql, /preview_release_one_canonical_ios_build_per_sha/);
  assert.match(initSql, /identity_key NOT LIKE 'native-build-recovery:ios:%'/);

  assert.match(recoverySql, /DROP INDEX IF EXISTS preview_release_one_ios_build_per_sha/);
  assert.match(recoverySql, /preview_release_one_canonical_ios_build_per_sha/);
  assert.match(recoverySql, /identity_key NOT LIKE 'native-build-recovery:ios:%'/);
});

test("release iOS build lookup prefers an active recovery over the terminal canonical action", async () => {
  const sourceSha = "8".repeat(40);
  const fingerprint = "d".repeat(40);
  const canonical = {
    id: 1,
    source_sha: sourceSha,
    kind: "IOS_BUILD",
    identity_key: `native-build:ios:project:${fingerprint}`,
    remote_id: null,
    state: "FAILED",
    evidence: { nativeFingerprint: fingerprint },
    created_at: "2026-09-18T18:47:00.000Z",
  };
  const recovery = {
    id: 2,
    source_sha: sourceSha,
    kind: "IOS_BUILD",
    identity_key: `native-build-recovery:ios:project:${fingerprint}:1`,
    remote_id: "eas-build-id",
    state: "IN_PROGRESS",
    evidence: { nativeFingerprint: fingerprint },
    created_at: "2026-09-18T20:00:00.000Z",
  };
  const ledger = new PreviewLedger("postgres://localhost/unused", {
    pool: {
      query: async () => ({ rowCount: 2, rows: [canonical, recovery] }),
    },
  });

  assert.equal(
    (await ledger.getNativeBuildActionForRelease(sourceSha, "ios", fingerprint)).identity_key,
    recovery.identity_key,
  );
});

test("release iOS build lookup fails closed when more than one active owner exists", async () => {
  const sourceSha = "9".repeat(40);
  const fingerprint = "e".repeat(40);
  const ledger = new PreviewLedger("postgres://localhost/unused", {
    pool: {
      query: async () => ({
        rowCount: 2,
        rows: [
          { state: "IN_PROGRESS", identity_key: "first" },
          { state: "CREATING", identity_key: "second" },
        ],
      }),
    },
  });

  await assert.rejects(
    ledger.getNativeBuildActionForRelease(sourceSha, "ios", fingerprint),
    /Ambiguous active ios build action/,
  );
});
