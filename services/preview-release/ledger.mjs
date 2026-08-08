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
        const submissions = await client.query(
          "SELECT state FROM preview_release_action WHERE kind='IOS_SUBMISSION' AND identity_key=$1 LIMIT 2",
          [`ios-submission:${existing.rows[0].remote_id}`],
        );
        if (submissions.rowCount > 1) throw new Error("Ambiguous existing iOS native submission action.");
        if (submissions.rowCount === 1 && submissions.rows[0].state === "FINISHED") {
          const distributions = await client.query(
            "SELECT state FROM preview_release_action WHERE source_sha=$1 AND kind='IOS_TESTFLIGHT_DISTRIBUTION' LIMIT 2",
            [sourceSha],
          );
          if (distributions.rowCount > 1) throw new Error("Ambiguous existing TestFlight distribution action.");
          if (distributions.rowCount === 1 && distributions.rows[0].state === "FINISHED") {
            await client.query("COMMIT");
            return null;
          }
        }
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
         updated_at=now(), completed_at=CASE WHEN $4='COMPLETE' THEN now() ELSE completed_at END,
         progression_order=CASE WHEN $4='COMPLETE' THEN coalesce(progression_order, nextval('preview_release_progression_order_seq')) ELSE progression_order END
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
    const result = await this.pool.query("SELECT * FROM preview_release WHERE state='COMPLETE' AND progression_order IS NOT NULL ORDER BY progression_order DESC LIMIT 1");
    return result.rows[0] ?? null;
  }

  async completedCurrentDevProgressionCandidate(sourceSha) {
    assertExactSha(sourceSha);
    const result = await this.pool.query(
      `SELECT * FROM preview_release release
       WHERE release.source_sha=$1 AND release.state='COMPLETE'
         AND release.progression_order IS NULL AND release.completed_at IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM preview_release_action distribution
           WHERE distribution.source_sha=release.source_sha
             AND distribution.kind='IOS_TESTFLIGHT_DISTRIBUTION' AND distribution.state='FINISHED'
         )
       LIMIT 1`,
      [sourceSha],
    );
    return result.rows[0] ?? null;
  }

  async reconcileCompletedCurrentDevProgression({ sourceSha, storedPreviousSha, latestProgressionSha }) {
    assertExactSha(sourceSha);
    assertExactSha(storedPreviousSha, "Stored previous SHA");
    assertExactSha(latestProgressionSha, "Latest progression SHA");
    const result = await this.pool.query(
      `UPDATE preview_release release
       SET progression_order=nextval('preview_release_progression_order_seq'), updated_at=now()
       WHERE release.source_sha=$1 AND release.state='COMPLETE' AND release.progression_order IS NULL
         AND release.completed_at IS NOT NULL AND release.previous_sha=$2
         AND $3=(
           SELECT latest.source_sha FROM preview_release latest
           WHERE latest.state='COMPLETE' AND latest.progression_order IS NOT NULL
           ORDER BY latest.progression_order DESC LIMIT 1
         )
         AND NOT EXISTS (
           SELECT 1 FROM preview_release_action distribution
           WHERE distribution.source_sha=release.source_sha
             AND distribution.kind='IOS_TESTFLIGHT_DISTRIBUTION' AND distribution.state='FINISHED'
         )
       RETURNING *`,
      [sourceSha, storedPreviousSha, latestProgressionSha],
    );
    return result.rows[0] ?? null;
  }

  async lastSuccessfulNative(platform) {
    if (platform !== "ios" && platform !== "android") throw new Error("Native platform is invalid.");
    const buildKind = platform === "ios" ? "IOS_BUILD" : "ANDROID_BUILD";
    const result = await this.pool.query(
      `SELECT release.*,
              release.evidence->'fingerprints'->>$1 AS native_fingerprint,
              build.remote_id AS native_build_id
       FROM preview_release release
       JOIN preview_release_action build
         ON build.source_sha=release.source_sha AND build.kind=$2 AND build.state='FINISHED'
       LEFT JOIN preview_release_action distribution
         ON distribution.source_sha=release.source_sha
        AND distribution.kind='IOS_TESTFLIGHT_DISTRIBUTION' AND distribution.state='FINISHED'
       WHERE release.evidence->'fingerprints'->>$1 ~ '^[0-9a-f]{40,128}$'
         AND build.evidence->>'appBuildVersion' ~ '^[0-9]+$'
         AND ($1 <> 'ios' OR EXISTS (
           SELECT 1 FROM preview_release_action submission
           WHERE submission.source_sha=release.source_sha
             AND submission.kind='IOS_SUBMISSION' AND submission.state='FINISHED'
         ))
         AND ($1 <> 'ios' OR distribution.remote_id IS NOT NULL)
       ORDER BY (build.evidence->>'appBuildVersion')::bigint DESC,
                CASE WHEN $1='ios' THEN distribution.updated_at ELSE build.updated_at END DESC
       LIMIT 1`,
      [platform, buildKind],
    );
    return result.rows[0] ?? null;
  }

  async claimNativeDrift({ sourceSha, workerId, leaseMs, mode }) {
    assertExactSha(sourceSha);
    const result = await this.pool.query(
      `UPDATE preview_release
       SET state='DETECTED', mode=$4, completed_at=NULL,
           lock_owner=$2, lock_expires_at=now()+($3::int * interval '1 millisecond'),
           updated_at=now()
       WHERE source_sha=$1 AND state='COMPLETE'
         AND (lock_expires_at IS NULL OR lock_expires_at < now() OR lock_owner=$2)
       RETURNING *`,
      [sourceSha, workerId, leaseMs, mode],
    );
    return result.rows[0] ?? null;
  }

  async requiresIosDistribution(sourceSha) {
    assertExactSha(sourceSha);
    const result = await this.pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM preview_release_action build
         JOIN preview_release_action submission ON submission.source_sha=build.source_sha
         WHERE build.source_sha=$1 AND build.kind='IOS_BUILD' AND build.state='FINISHED'
           AND submission.kind='IOS_SUBMISSION' AND submission.state='FINISHED'
       ) AS submitted,
       EXISTS (
         SELECT 1 FROM preview_release_action distribution
         WHERE distribution.source_sha=$1 AND distribution.kind='IOS_TESTFLIGHT_DISTRIBUTION' AND distribution.state='FINISHED'
       ) AS distributed`,
      [sourceSha],
    );
    return result.rows[0]?.submitted === true && result.rows[0]?.distributed !== true;
  }

  async pendingIosDistribution() {
    const result = await this.pool.query(
      `SELECT release.*, build.remote_id AS ios_build_id
       FROM preview_release release
       JOIN preview_release_action build
         ON build.source_sha=release.source_sha AND build.kind='IOS_BUILD' AND build.state='FINISHED'
       JOIN preview_release_action submission
         ON submission.source_sha=release.source_sha AND submission.kind='IOS_SUBMISSION' AND submission.state='FINISHED'
       WHERE NOT EXISTS (
         SELECT 1 FROM preview_release_action distribution
         WHERE distribution.source_sha=release.source_sha
           AND distribution.kind='IOS_TESTFLIGHT_DISTRIBUTION' AND distribution.state='FINISHED'
       )
       ORDER BY build.updated_at DESC LIMIT 1`,
    );
    return result.rows[0] ?? null;
  }

  async claimIosDistribution({ sourceSha, workerId, leaseMs, mode }) {
    assertExactSha(sourceSha);
    const result = await this.pool.query(
      `UPDATE preview_release release
       SET state='DETECTED', mode=$4,
           lock_owner=$2, lock_expires_at=now()+($3::int * interval '1 millisecond'),
           updated_at=now()
       WHERE release.source_sha=$1
         AND release.state IN ('COMPLETE','FAILED','DETECTED','VALIDATING','PLANNED','DELIVERING')
         AND (release.lock_expires_at IS NULL OR release.lock_expires_at < now() OR release.lock_owner=$2)
         AND EXISTS (
           SELECT 1 FROM preview_release_action build
           JOIN preview_release_action submission ON submission.source_sha=build.source_sha
           WHERE build.source_sha=release.source_sha
             AND build.kind='IOS_BUILD' AND build.state='FINISHED'
             AND submission.kind='IOS_SUBMISSION' AND submission.state='FINISHED'
         )
         AND NOT EXISTS (
           SELECT 1 FROM preview_release_action distribution
           WHERE distribution.source_sha=release.source_sha
             AND distribution.kind='IOS_TESTFLIGHT_DISTRIBUTION' AND distribution.state='FINISHED'
         )
       RETURNING release.*`,
      [sourceSha, workerId, leaseMs, mode],
    );
    return result.rows[0] ?? null;
  }

  async completeIosDistribution({ sourceSha, workerId }) {
    assertExactSha(sourceSha);
    const result = await this.pool.query(
      `UPDATE preview_release release
       SET state='COMPLETE', updated_at=now(), lock_owner=NULL, lock_expires_at=NULL,
           failure_reason=NULL, recovery_action=NULL
       WHERE release.source_sha=$1 AND release.lock_owner=$2
         AND release.state IN ('DETECTED','VALIDATING','PLANNED','DELIVERING')
         AND EXISTS (
           SELECT 1 FROM preview_release_action distribution
           WHERE distribution.source_sha=release.source_sha
             AND distribution.kind='IOS_TESTFLIGHT_DISTRIBUTION' AND distribution.state='FINISHED'
         )
       RETURNING release.*`,
      [sourceSha, workerId],
    );
    if (result.rowCount !== 1) throw new Error("Historical TestFlight distribution completion was rejected.");
    return result.rows[0];
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
