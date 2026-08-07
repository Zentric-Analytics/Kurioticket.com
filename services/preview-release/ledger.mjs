import pg from "pg";
import { assertExactSha } from "./config.mjs";

export class PreviewLedger {
  constructor(connectionString, { pool } = {}) {
    this.pool = pool ?? new pg.Pool({ connectionString, max: 5, ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false } });
  }

  async migrate(sql) { await this.pool.query(sql); }

  async healthCheck() {
    const result = await this.pool.query("SELECT current_database() AS database_name, 1 AS ok");
    if (result.rows[0]?.ok !== 1) throw new Error("Preview ledger database health check failed.");
    return { connected: true };
  }

  async claim({ sourceSha, previousSha, workerId, leaseMs, mode }) {
    assertExactSha(sourceSha);
    if (previousSha) assertExactSha(previousSha, "Previous SHA");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO preview_release (source_sha, previous_sha, mode, state)
         VALUES ($1, $2, $3, 'DETECTED') ON CONFLICT (source_sha) DO NOTHING`,
        [sourceSha, previousSha, mode],
      );
      const result = await client.query(
        `UPDATE preview_release
         SET lock_owner=$2, lock_expires_at=now()+($3::int * interval '1 millisecond'),
             started_at=coalesce(started_at, now()), updated_at=now()
         WHERE source_sha=$1
           AND state NOT IN ('COMPLETE','SUPERSEDED')
           AND (lock_expires_at IS NULL OR lock_expires_at < now() OR lock_owner=$2)
         RETURNING *`,
        [sourceSha, workerId, leaseMs],
      );
      await client.query("COMMIT");
      return result.rows[0] ?? null;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async claimIosNativeBackfill({ sourceSha, previousSha, workerId, leaseMs, mode, identityKey }) {
    assertExactSha(sourceSha);
    if (previousSha) assertExactSha(previousSha, "Previous SHA");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        "SELECT remote_id FROM preview_release_action WHERE kind='IOS_BUILD' AND identity_key=$1 LIMIT 2",
        [identityKey],
      );
      if (existing.rowCount > 1) throw new Error("Ambiguous existing iOS native backfill action.");
      if (existing.rowCount === 1) {
        await client.query("COMMIT");
        return null;
      }
      await client.query(
        `INSERT INTO preview_release (source_sha, previous_sha, mode, state)
         VALUES ($1, $2, $3, 'DETECTED') ON CONFLICT (source_sha) DO NOTHING`,
        [sourceSha, previousSha, mode],
      );
      const result = await client.query(
        `UPDATE preview_release
         SET state=CASE WHEN state IN ('COMPLETE','SUPERSEDED') THEN 'DETECTED' ELSE state END,
             completed_at=CASE WHEN state IN ('COMPLETE','SUPERSEDED') THEN NULL ELSE completed_at END,
             lock_owner=$2, lock_expires_at=now()+($3::int * interval '1 millisecond'),
             started_at=coalesce(started_at, now()), updated_at=now()
         WHERE source_sha=$1
           AND NOT EXISTS (
             SELECT 1 FROM preview_release_action
             WHERE kind='IOS_BUILD' AND identity_key=$4
           )
           AND (lock_expires_at IS NULL OR lock_expires_at < now() OR lock_owner=$2)
         RETURNING *`,
        [sourceSha, workerId, leaseMs, identityKey],
      );
      await client.query("COMMIT");
      return result.rows[0] ?? null;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async transition(sourceSha, workerId, fromStates, state, patch = {}) {
    assertExactSha(sourceSha);
    const allowed = Object.fromEntries(Object.entries(patch).filter(([key]) => [
      "classification", "validation_state", "render_deploy_id", "render_deployed_sha", "render_health",
      "eas_update_id", "eas_build_id", "ios_build_number", "eas_submission_id", "failure_reason",
      "recovery_action", "report_url", "evidence",
    ].includes(key)));
    const keys = Object.keys(allowed);
    const values = Object.values(allowed);
    const assignments = keys.map((key, index) => `${key}=$${index + 5}`);
    const result = await this.pool.query(
      `UPDATE preview_release SET state=$4, ${assignments.length ? `${assignments.join(", ")},` : ""}
         updated_at=now(), completed_at=CASE WHEN $4='COMPLETE' THEN now() ELSE completed_at END
       WHERE source_sha=$1 AND lock_owner=$2 AND state = ANY($3::text[]) RETURNING *`,
      [sourceSha, workerId, fromStates, state, ...values],
    );
    if (result.rowCount !== 1) throw new Error(`Atomic Preview release transition to ${state} was rejected.`);
    return result.rows[0];
  }

  async heartbeat(sourceSha, workerId, leaseMs) {
    const result = await this.pool.query(
      `UPDATE preview_release SET lock_expires_at=now()+($3::int * interval '1 millisecond'), updated_at=now()
       WHERE source_sha=$1 AND lock_owner=$2 AND state NOT IN ('COMPLETE','SUPERSEDED')`,
      [sourceSha, workerId, leaseMs],
    );
    if (result.rowCount !== 1) throw new Error("Preview release lease was lost.");
  }

  async lastSuccessful() {
    const result = await this.pool.query("SELECT * FROM preview_release WHERE state='COMPLETE' ORDER BY completed_at DESC LIMIT 1");
    return result.rows[0] ?? null;
  }

  async recordAction({ sourceSha, kind, identityKey, remoteId, state, evidence = {} }) {
    const result = await this.pool.query(
      `INSERT INTO preview_release_action (source_sha, kind, identity_key, remote_id, state, evidence)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)
       ON CONFLICT (kind, identity_key) DO UPDATE SET
         remote_id=coalesce(preview_release_action.remote_id, excluded.remote_id),
         state=excluded.state, evidence=excluded.evidence, updated_at=now()
       WHERE preview_release_action.source_sha=excluded.source_sha
         AND (preview_release_action.remote_id IS NULL OR excluded.remote_id IS NULL OR preview_release_action.remote_id=excluded.remote_id)
       RETURNING *`,
      [sourceSha, kind, identityKey, remoteId, state, JSON.stringify(evidence)],
    );
    if (result.rowCount !== 1) throw new Error(`Conflicting remote identity for ${kind}:${identityKey}.`);
    return result.rows[0];
  }

  async getAction(kind, identityKey) {
    const result = await this.pool.query(
      `SELECT * FROM preview_release_action WHERE kind=$1 AND identity_key=$2 LIMIT 2`,
      [kind, identityKey],
    );
    if (result.rowCount > 1) throw new Error(`Ambiguous remote identity for ${kind}:${identityKey}.`);
    return result.rows[0] ?? null;
  }

  async replaceTerminalAction({ sourceSha, kind, identityKey, expectedRemoteId, remoteId, state, evidence = {} }) {
    const result = await this.pool.query(
      `UPDATE preview_release_action
       SET remote_id=$5, state=$6, evidence=$7::jsonb, updated_at=now()
       WHERE source_sha=$1 AND kind=$2 AND identity_key=$3 AND remote_id=$4
         AND state IN ('BUILD_FAILED','UPDATE_FAILED','CANCELED','DEACTIVATED')
       RETURNING *`,
      [sourceSha, kind, identityKey, expectedRemoteId, remoteId, state, JSON.stringify(evidence)],
    );
    if (result.rowCount !== 1) throw new Error(`Terminal remote replacement for ${kind}:${identityKey} was rejected.`);
    return result.rows[0];
  }

  async close() { await this.pool.end(); }
}
