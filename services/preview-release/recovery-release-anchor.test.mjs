import test from "node:test";
import assert from "node:assert/strict";
import { PreviewLedger } from "./ledger.mjs";

const sourceSha = "c".repeat(40);
const previousSha = "b".repeat(40);

test("recovery release anchor creates only a DETECTED parent row before native actions", async () => {
  const queries = [];
  const pool = {
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (sql.includes("INSERT INTO preview_release")) return { rowCount: 1, rows: [] };
      if (sql.startsWith("SELECT * FROM preview_release WHERE source_sha=$1")) {
        return {
          rowCount: 1,
          rows: [{
            source_sha: sourceSha,
            previous_sha: previousSha,
            mode: "active",
            state: "DETECTED",
            lock_owner: null,
            lock_expires_at: null,
          }],
        };
      }
      throw new Error(`Unexpected recovery anchor SQL: ${sql}`);
    },
  };
  const ledger = new PreviewLedger("postgres://localhost/unused", { pool });
  const row = await ledger.ensureDetectedRelease({ sourceSha, mode: "active" });

  assert.equal(row.source_sha, sourceSha);
  assert.equal(row.previous_sha, previousSha);
  assert.equal(row.state, "DETECTED");
  assert.equal(queries.length, 2);
  assert.match(queries[0].sql, /state='COMPLETE'/);
  assert.match(queries[0].sql, /progression_order IS NOT NULL/);
  assert.match(queries[0].sql, /ON CONFLICT \(source_sha\) DO NOTHING/);
  assert.doesNotMatch(queries[0].sql, /lock_owner|lock_expires_at/);
  assert.deepEqual(queries[0].params, [sourceSha, "active"]);
});

test("recovery release anchor rejects a conflicting existing mode", async () => {
  const pool = {
    async query(sql) {
      if (sql.includes("INSERT INTO preview_release")) return { rowCount: 0, rows: [] };
      if (sql.startsWith("SELECT * FROM preview_release WHERE source_sha=$1")) {
        return { rowCount: 1, rows: [{ source_sha: sourceSha, mode: "dry-run", state: "DETECTED" }] };
      }
      throw new Error(`Unexpected recovery anchor SQL: ${sql}`);
    },
  };
  const ledger = new PreviewLedger("postgres://localhost/unused", { pool });
  await assert.rejects(
    ledger.ensureDetectedRelease({ sourceSha, mode: "active" }),
    /release anchor mode mismatch/,
  );
});
