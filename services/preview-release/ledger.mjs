import pg from "pg";
import { assertExactSha, PREVIEW_IDENTITY } from "./config.mjs";

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
    return this.currentDeliveredNative(platform);
  }

  async currentDeliveredNative(platform) {
    if (platform !== "ios" && platform !== "android") throw new Error("Native platform is invalid.");
    const result = await this.pool.query(
      `SELECT source_sha, fingerprint AS native_fingerprint, eas_build_id AS native_build_id,
              app_version, build_number, submission_id, apple_build_id,
              testflight_distribution_id, delivered_at
       FROM preview_delivered_native_state WHERE platform=$1`,
      [platform],
    );
    return result.rows[0] ?? null;
  }

  async advanceDeliveredNative({ platform, sourceSha, fingerprint, buildId, appVersion, buildNumber, submissionId = null, appleBuildId = null, distributionId = null, deliveredAt = new Date() }) {
    if (platform !== "ios" && platform !== "android") throw new Error("Native platform is invalid.");
    assertExactSha(sourceSha);
    if (!/^[0-9a-f]{40,128}$/.test(String(fingerprint ?? ""))) throw new Error("Delivered native fingerprint is malformed.");
    if (!buildId || !/^\d+$/.test(String(buildNumber ?? "")) || BigInt(buildNumber) <= 0n) throw new Error("Delivered native build identity is malformed.");
    if (!/^\d+(\.\d+){1,3}$/.test(String(appVersion ?? ""))) throw new Error("Delivered native app version is malformed.");
    if (platform === "ios" && (!submissionId || !appleBuildId || !distributionId)) throw new Error("Delivered iOS state requires verified submission and TestFlight membership identities.");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const currentResult = await client.query("SELECT * FROM preview_delivered_native_state WHERE platform=$1 FOR UPDATE", [platform]);
      const current = currentResult.rows[0] ?? null;
      const incoming = BigInt(buildNumber);
      if (current && BigInt(current.build_number) === incoming && current.eas_build_id !== buildId) throw new Error(`Ambiguous ${platform} delivery: build number ${buildNumber} has conflicting build identities.`);
      if (!current || incoming > BigInt(current.build_number)) {
        await client.query(
          `INSERT INTO preview_delivered_native_state
             (platform,source_sha,fingerprint,eas_build_id,app_version,build_number,submission_id,apple_build_id,testflight_distribution_id,delivered_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (platform) DO UPDATE SET
             source_sha=excluded.source_sha, fingerprint=excluded.fingerprint, eas_build_id=excluded.eas_build_id,
             app_version=excluded.app_version, build_number=excluded.build_number, submission_id=excluded.submission_id,
             apple_build_id=excluded.apple_build_id, testflight_distribution_id=excluded.testflight_distribution_id,
             delivered_at=excluded.delivered_at, updated_at=now()`,
          [platform, sourceSha, fingerprint, buildId, appVersion, String(buildNumber), submissionId, appleBuildId, distributionId, deliveredAt],
        );
      }
      const finalResult = await client.query("SELECT * FROM preview_delivered_native_state WHERE platform=$1", [platform]);
      await client.query("COMMIT");
      return { ...finalResult.rows[0], advanced: !current || incoming > BigInt(current.build_number) };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async releaseBySha(sourceSha) {
    assertExactSha(sourceSha);
    const result = await this.pool.query("SELECT * FROM preview_release WHERE source_sha=$1", [sourceSha]);
    return result.rows[0] ?? null;
  }

  async claimEligibility(sourceSha, operation) {
    assertExactSha(sourceSha);
    const result = await this.pool.query(
      `SELECT state, lock_owner, lock_expires_at,
              (lock_expires_at IS NULL OR lock_expires_at < now()) AS lease_available
       FROM preview_release WHERE source_sha=$1`,
      [sourceSha],
    );
    const row = result.rows[0] ?? null;
    if (!row) return { eligible: operation === "CURRENT_RELEASE_EVALUATION", reason: "row-not-created" };
    const stateEligible = operation === "CURRENT_NATIVE_RECONCILIATION"
      ? row.state === "COMPLETE"
      : operation === "IOS_DISTRIBUTION_RECONCILIATION"
        ? ["COMPLETE","FAILED","DETECTED","VALIDATING","PLANNED","DELIVERING"].includes(row.state)
        : !["COMPLETE","SUPERSEDED"].includes(row.state);
    return { eligible: stateEligible && row.lease_available, reason: !stateEligible ? `state-${row.state}` : row.lease_available ? "eligible" : "active-lease", state: row.state, lockOwner: row.lock_owner, lockExpiresAt: row.lock_expires_at };
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

  async nativeBuildRemoteIdsForSource(sourceSha) {
    assertExactSha(sourceSha);
    const result = await this.pool.query(
      `SELECT remote_id FROM preview_release_action
       WHERE source_sha=$1 AND kind IN ('IOS_BUILD','ANDROID_BUILD') AND remote_id IS NOT NULL`,
      [sourceSha],
    );
    return result.rows.map((row) => row.remote_id);
  }

  async recordNativeOwnershipIncident({ platform, buildId, sourceSha, state, reason = null, evidence = {} }) {
    assertExactSha(sourceSha);
    const result = await this.pool.query(
      `INSERT INTO preview_native_ownership_incident (platform,build_id,source_sha,state,reason,evidence)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)
       ON CONFLICT (platform,build_id) DO UPDATE SET
         state=excluded.state, reason=excluded.reason, evidence=excluded.evidence, updated_at=now()
       WHERE preview_native_ownership_incident.source_sha=excluded.source_sha
       RETURNING *`,
      [platform, buildId, sourceSha, state, reason, JSON.stringify(evidence)],
    );
    if (result.rowCount !== 1) throw new Error(`Conflicting ownership incident for ${platform}:${buildId}.`);
    return result.rows[0];
  }

  async rejectedNativeOwnershipIncidents({ platform, sourceSha }) {
    assertExactSha(sourceSha);
    const result = await this.pool.query(
      `SELECT * FROM preview_native_ownership_incident
       WHERE platform=$1 AND source_sha=$2 AND state='REJECTED'
       ORDER BY detected_at ASC`,
      [platform, sourceSha],
    );
    return result.rows;
  }

  async correctPlannedNativeFingerprint({ platform, sourceSha, expectedFingerprint, canonicalFingerprint }) {
    assertExactSha(sourceSha);
    if (!['ios', 'android'].includes(platform) || !/^[0-9a-f]{40,128}$/.test(expectedFingerprint) || !/^[0-9a-f]{40,128}$/.test(canonicalFingerprint)) throw new Error("Canonical fingerprint correction identity is invalid.");
    const kind = platform === "ios" ? "IOS_BUILD" : "ANDROID_BUILD";
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))", ["canonical-fingerprint-correction", `${sourceSha}:${platform}`]);
      const incident = await client.query("SELECT 1 FROM preview_native_ownership_incident WHERE platform=$1 AND source_sha=$2 AND state='REJECTED' LIMIT 1", [platform, sourceSha]);
      if (!incident.rowCount) throw new Error("Canonical fingerprint correction requires a rejected ownership incident.");
      const owned = await client.query("SELECT 1 FROM preview_release_action WHERE kind=$1 AND remote_id IS NOT NULL AND source_sha=$2 LIMIT 1", [kind, sourceSha]);
      if (owned.rowCount) throw new Error("Canonical fingerprint correction is forbidden after an owned remote build exists.");
      const updated = await client.query(
        `UPDATE preview_release SET evidence=jsonb_set(
           jsonb_set(evidence, ARRAY['fingerprints',$2], to_jsonb($4::text), true),
           ARRAY['fingerprintCorrections',$2], jsonb_build_object('previous',$3::text,'canonical',$4::text,'correctedAt',now()), true)
         WHERE source_sha=$1 AND evidence->'fingerprints'->>$2=$3 RETURNING *`,
        [sourceSha, platform, expectedFingerprint, canonicalFingerprint],
      );
      if (updated.rowCount !== 1) throw new Error("Durable fingerprint changed concurrently; correction rejected.");
      await client.query("COMMIT");
      return updated.rows[0];
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  async adoptNativeBuild({ platform, sourceSha, fingerprint, build }) {
    assertExactSha(sourceSha);
    const kind = platform === "ios" ? "IOS_BUILD" : platform === "android" ? "ANDROID_BUILD" : null;
    if (!kind) throw new Error("Native build platform is invalid.");
    const identityKey = `native-build:${platform}:${PREVIEW_IDENTITY.easProjectId}:${fingerprint}`;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", [kind, identityKey]);
      const conflict = await client.query(
        `SELECT 1 FROM preview_release_action
         WHERE kind=$1 AND (identity_key=$2 OR remote_id=$3) AND (source_sha<>$4 OR coalesce(remote_id,$3)<>$3)
         LIMIT 1`, [kind, identityKey, build.id, sourceSha],
      );
      if (conflict.rowCount) throw new Error(`Conflicting durable identity prevents ${platform} build adoption.`);
      const delivered = await client.query(
        `SELECT 1 FROM preview_delivered_native_state
         WHERE platform=$1 AND build_number=$2::bigint AND eas_build_id<>$3 LIMIT 1`,
        [platform, build.appBuildVersion, build.id],
      );
      if (delivered.rowCount) throw new Error(`Conflicting delivered ${platform} build number prevents adoption.`);
      const action = await client.query(
        `INSERT INTO preview_release_action (source_sha,kind,identity_key,remote_id,state,evidence)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)
         ON CONFLICT (kind,identity_key) DO UPDATE SET
           remote_id=excluded.remote_id,state=excluded.state,evidence=excluded.evidence,updated_at=now()
         WHERE preview_release_action.source_sha=excluded.source_sha
           AND (preview_release_action.remote_id IS NULL OR preview_release_action.remote_id=excluded.remote_id)
         RETURNING *`,
        [sourceSha, kind, identityKey, build.id, String(build.status).toUpperCase(), JSON.stringify({ ...build, nativeFingerprint: fingerprint, nativeArtifactSourceSha: sourceSha, latestCompatibleSourceSha: sourceSha, ownershipSource: "SAFE_VERIFIED_ADOPTION" })],
      );
      if (action.rowCount !== 1) throw new Error(`Conflicting remote identity prevents ${platform} build adoption.`);
      await client.query(
        `INSERT INTO preview_native_ownership_incident (platform,build_id,source_sha,state,evidence)
         VALUES ($1,$2,$3,'ADOPTED',$4::jsonb)
         ON CONFLICT (platform,build_id) DO UPDATE SET state='ADOPTED',evidence=excluded.evidence,updated_at=now()`,
        [platform, build.id, sourceSha, JSON.stringify({ buildNumber: build.appBuildVersion, fingerprint })],
      );
      await client.query("COMMIT");
      return action.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async reserveNativeBuild({ sourceSha, platform, identityKey }) {
    assertExactSha(sourceSha);
    const kind = platform === "ios" ? "IOS_BUILD" : platform === "android" ? "ANDROID_BUILD" : null;
    if (!kind) throw new Error("Native build platform is invalid.");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", [kind, identityKey]);
      let result = await client.query("SELECT * FROM preview_release_action WHERE kind=$1 AND identity_key=$2", [kind, identityKey]);
      let created = false;
      if (!result.rowCount) {
        const fingerprint = identityKey.split(":").at(-1);
        const legacy = await client.query(
          `SELECT action.* FROM preview_release_action action
           JOIN preview_release release ON release.source_sha=action.source_sha
           WHERE action.kind=$1 AND release.evidence->'fingerprints'->>$2=$3
             AND action.state NOT IN ('ERRORED','FAILED','CANCELED','CANCELLED')
           ORDER BY action.created_at ASC LIMIT 2`,
          [kind, platform, fingerprint],
        );
        if (legacy.rowCount > 1) throw new Error(`Multiple active legacy ${platform} builds share one native fingerprint.`);
        if (legacy.rowCount === 1) {
          result = await client.query(
            `UPDATE preview_release_action SET identity_key=$2,
               evidence=evidence || $3::jsonb, updated_at=now()
             WHERE id=$1 RETURNING *`,
            [legacy.rows[0].id, identityKey, JSON.stringify({ nativeArtifactSourceSha: legacy.rows[0].source_sha, latestCompatibleSourceSha: sourceSha })],
          );
        }
      }
      if (!result.rowCount) {
        result = await client.query(
          `INSERT INTO preview_release_action (source_sha,kind,identity_key,state,evidence)
           VALUES ($1,$2,$3,'RESERVED',$4::jsonb) RETURNING *`,
          [sourceSha, kind, identityKey, JSON.stringify({ nativeArtifactSourceSha: sourceSha, latestCompatibleSourceSha: sourceSha })],
        );
        created = true;
      } else if (result.rows[0].source_sha !== sourceSha) {
        result = await client.query(
          `UPDATE preview_release_action SET evidence=evidence || $3::jsonb, updated_at=now()
           WHERE kind=$1 AND identity_key=$2 RETURNING *`,
          [kind, identityKey, JSON.stringify({ latestCompatibleSourceSha: sourceSha })],
        );
      }
      await client.query("COMMIT");
      return { action: result.rows[0], created };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async recordDeliveryEvidence({ sourceSha, workerId, evidence }) {
    assertExactSha(sourceSha);
    const result = await this.pool.query(
      `UPDATE preview_release SET evidence=$3::jsonb, updated_at=now()
       WHERE source_sha=$1 AND lock_owner=$2 AND state='DELIVERING' RETURNING *`,
      [sourceSha, workerId, JSON.stringify(evidence)],
    );
    if (result.rowCount !== 1) throw new Error("Partial Preview platform delivery evidence was rejected.");
    return result.rows[0];
  }

  async latestNativeBuildRecovery({ platform, fingerprint }) {
    const kind = platform === "ios" ? "IOS_BUILD" : platform === "android" ? "ANDROID_BUILD" : null;
    if (!kind || !/^[a-z0-9._-]{3,128}$/i.test(String(fingerprint ?? ""))) throw new Error("Native recovery identity is invalid.");
    const prefix = `native-build-recovery:${platform}:${PREVIEW_IDENTITY.easProjectId}:${fingerprint}:`;
    const result = await this.pool.query(
      `SELECT * FROM preview_release_action
       WHERE kind=$1 AND left(identity_key,length($2))=$2
       ORDER BY created_at DESC, id DESC LIMIT 1`,
      [kind, prefix],
    );
    return result.rows[0] ?? null;
  }

  async nativeRecoveryState({ platform, fingerprint }) {
    const kind = platform === "ios" ? "IOS_BUILD" : platform === "android" ? "ANDROID_BUILD" : null;
    if (!kind || !/^[a-z0-9._-]{3,128}$/i.test(String(fingerprint ?? ""))) throw new Error("Native recovery identity is invalid.");
    const canonicalIdentity = `native-build:${platform}:${PREVIEW_IDENTITY.easProjectId}:${fingerprint}`;
    const recoveryPrefix = `native-build-recovery:${platform}:${PREVIEW_IDENTITY.easProjectId}:${fingerprint}:`;
    const result = await this.pool.query(
      `SELECT source_sha,state,identity_key FROM preview_release_action
       WHERE kind=$1 AND (identity_key=$2 OR left(identity_key,length($3))=$3)
       ORDER BY created_at DESC,id DESC`,
      [kind, canonicalIdentity, recoveryPrefix],
    );
    const latestRecovery = result.rows.find(({ identity_key }) => identity_key.startsWith(recoveryPrefix)) ?? null;
    const terminal = result.rows.find(({ state }) => ["ERRORED", "FAILED", "CANCELED", "CANCELLED"].includes(state)) ?? null;
    return {
      required: Boolean(terminal) && !result.rows.some(({ state }) => state === "FINISHED"),
      previousAttemptState: terminal?.state ?? null,
      recoveryAttemptState: latestRecovery?.state ?? null,
      recoverySourceSha: latestRecovery?.source_sha ?? null,
    };
  }

  async reserveNativeBuildRecovery({ sourceSha, platform, fingerprint }) {
    assertExactSha(sourceSha);
    const kind = platform === "ios" ? "IOS_BUILD" : platform === "android" ? "ANDROID_BUILD" : null;
    if (!kind || !/^[a-z0-9._-]{3,128}$/i.test(String(fingerprint ?? ""))) throw new Error("Native recovery identity is invalid.");
    const canonicalIdentity = `native-build:${platform}:${PREVIEW_IDENTITY.easProjectId}:${fingerprint}`;
    const recoveryPrefix = `native-build-recovery:${platform}:${PREVIEW_IDENTITY.easProjectId}:${fingerprint}:`;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", [kind, canonicalIdentity]);
      const delivered = await client.query(
        "SELECT 1 FROM preview_delivered_native_state WHERE platform=$1 AND fingerprint=$2 LIMIT 1",
        [platform, fingerprint],
      );
      if (delivered.rowCount) throw new Error(`A compatible delivered ${platform} native baseline already exists; replacement is forbidden.`);
      const failed = await client.query(
        `SELECT id,remote_id,state FROM preview_release_action
         WHERE kind=$1 AND (identity_key=$2 OR left(identity_key,length($3))=$3)
           AND state IN ('ERRORED','FAILED','CANCELED','CANCELLED')
         ORDER BY created_at DESC,id DESC LIMIT 1`,
        [kind, canonicalIdentity, recoveryPrefix],
      );
      if (!failed.rowCount) throw new Error(`Owner-authorized ${platform} recovery requires a durable terminal failed native action.`);
      const active = await client.query(
        `SELECT * FROM preview_release_action
         WHERE kind=$1 AND left(identity_key,length($2))=$2
           AND state NOT IN ('ERRORED','FAILED','CANCELED','CANCELLED')
         ORDER BY created_at DESC,id DESC LIMIT 2`,
        [kind, recoveryPrefix],
      );
      if (active.rowCount > 1) throw new Error(`Multiple active ${platform} native recovery attempts exist.`);
      if (active.rowCount === 1) {
        await client.query("COMMIT");
        return { action: active.rows[0], created: false };
      }
      const attempts = await client.query(
        "SELECT count(*)::int AS count FROM preview_release_action WHERE kind=$1 AND left(identity_key,length($2))=$2",
        [kind, recoveryPrefix],
      );
      const recoveryAttempt = Number(attempts.rows[0]?.count ?? 0) + 1;
      const identityKey = `${recoveryPrefix}${recoveryAttempt}`;
      const inserted = await client.query(
        `INSERT INTO preview_release_action (source_sha,kind,identity_key,state,evidence)
         VALUES ($1,$2,$3,'RESERVED',$4::jsonb) RETURNING *`,
        [sourceSha, kind, identityKey, JSON.stringify({ nativeFingerprint: fingerprint, nativeArtifactSourceSha: sourceSha, latestCompatibleSourceSha: sourceSha, ownershipSource: "OWNER_AUTHORIZED_TERMINAL_REPLACEMENT", recoveryAttempt, replacesTerminalActionId: failed.rows[0].id })],
      );
      await client.query("COMMIT");
      return { action: inserted.rows[0], created: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async getFinishedIosDistributionForBuild(buildId) {
    const result = await this.pool.query(
      `SELECT * FROM preview_release_action
       WHERE kind='IOS_TESTFLIGHT_DISTRIBUTION' AND state='FINISHED'
         AND evidence->>'easBuildId'=$1 AND evidence->>'associated'='true'
       LIMIT 2`, [buildId],
    );
    if (result.rowCount > 1) throw new Error("Ambiguous TestFlight distribution identity.");
    return result.rows[0] ?? null;
  }

  async syncNativeNotificationCandidates() {
    await this.pool.query(
      `INSERT INTO preview_native_notification (platform,build_id,source_sha,outcome)
       SELECT CASE build.kind WHEN 'IOS_BUILD' THEN 'ios' ELSE 'android' END,
              build.remote_id, build.source_sha,
              CASE WHEN build.state='FINISHED' THEN 'SUCCESS' ELSE 'FAILED' END
       FROM preview_release_action build
       WHERE build.remote_id IS NOT NULL AND build.kind IN ('IOS_BUILD','ANDROID_BUILD')
         AND (build.state IN ('ERRORED','FAILED','CANCELED','CANCELLED')
           OR build.kind='ANDROID_BUILD' AND build.state='FINISHED'
           OR build.kind='IOS_BUILD' AND build.state='FINISHED' AND EXISTS (
           SELECT 1 FROM preview_release_action distribution
           WHERE distribution.kind='IOS_TESTFLIGHT_DISTRIBUTION' AND distribution.state='FINISHED'
             AND distribution.evidence->>'easBuildId'=build.remote_id
             AND distribution.evidence->>'associated'='true'))
       ON CONFLICT (platform,build_id) DO NOTHING`,
    );
  }

  async unresolvedNativeNotificationCandidates() {
    const result = await this.pool.query(
      `SELECT * FROM preview_native_notification
       WHERE state IN ('PENDING','RETRYABLE_FAILURE') AND next_attempt_at <= now()
       ORDER BY created_at ASC LIMIT 100`,
    );
    return result.rows;
  }

  async recordNativeNotificationAttempt(candidate, response) {
    const outcomes = Array.isArray(response?.recipientOutcomes) ? response.recipientOutcomes : [];
    const recipientIds = candidate.recipient_ids ?? outcomes.map((item) => item.memberId);
    const retryable = outcomes.some((item) => item.state === 'retryable-failure');
    await this.pool.query(
      `UPDATE preview_native_notification SET state=$3, recipient_ids=$4::jsonb,
         attempt_count=attempt_count+1,
         next_attempt_at=now() + (LEAST(3600, 30 * power(2, LEAST(attempt_count,7)))::text || ' seconds')::interval,
         last_response=$5::jsonb, updated_at=now()
       WHERE platform=$1 AND build_id=$2`,
      [candidate.platform, candidate.build_id, retryable ? 'RETRYABLE_FAILURE' : 'COMPLETE', JSON.stringify(recipientIds), JSON.stringify(response ?? {})],
    );
  }

  async markNativeNotificationTerminalUnavailable(candidate, reason) {
    await this.pool.query(
      `UPDATE preview_native_notification
       SET state='TERMINAL_UNAVAILABLE', attempt_count=attempt_count+1,
           last_response=$3::jsonb, updated_at=now()
       WHERE platform=$1 AND build_id=$2
         AND state IN ('PENDING','RETRYABLE_FAILURE')`,
      [candidate.platform, candidate.build_id, JSON.stringify({ terminal: true, reason: String(reason ?? "Provider object is permanently unavailable.").slice(0, 500) })],
    );
  }

  async getNativeBuildActionForRelease(sourceSha, platform, fingerprint = null) {
    assertExactSha(sourceSha);
    const kind = platform === "ios" ? "IOS_BUILD" : platform === "android" ? "ANDROID_BUILD" : null;
    if (!kind) throw new Error("Native build platform is invalid.");
    const result = await this.pool.query(
      `SELECT * FROM preview_release_action
       WHERE source_sha=$1 AND kind=$2
         AND ($3::text IS NULL OR evidence->>'nativeFingerprint'=$3 OR identity_key LIKE $4)
       ORDER BY created_at DESC LIMIT 2`,
      [sourceSha, kind, fingerprint, `%:${platform}:preview`],
    );
    if (result.rowCount > 1) throw new Error(`Ambiguous ${platform} build action for release ${sourceSha}.`);
    return result.rows[0] ?? null;
  }

  async getAction(kind, identityKey) {
    const result = await this.pool.query(
      `SELECT * FROM preview_release_action WHERE kind=$1 AND identity_key=$2 LIMIT 2`,
      [kind, identityKey],
    );
    if (result.rowCount > 1) throw new Error(`Ambiguous remote identity for ${kind}:${identityKey}.`);
    return result.rows[0] ?? null;
  }

  async markRemoteObjectUnavailable({ kind, identityKey, remoteId, reason }) {
    const result = await this.pool.query(
      `UPDATE preview_release_action
       SET state='REMOTE_OBJECT_UNAVAILABLE',
           evidence=evidence || $4::jsonb, updated_at=now()
       WHERE kind=$1 AND identity_key=$2 AND remote_id=$3
         AND state NOT IN ('REMOTE_OBJECT_UNAVAILABLE','FINISHED')
       RETURNING *`,
      [kind, identityKey, remoteId, JSON.stringify({ remoteObjectUnavailable: true, reason, operatorAction: "Verify provider retention and use strict adoption or an owner-approved replacement; never delete ledger evidence." })],
    );
    if (result.rowCount !== 1) {
      const finished = await this.pool.query(
        `UPDATE preview_release_action
         SET state='REMOTE_OBJECT_UNAVAILABLE', evidence=evidence || $4::jsonb, updated_at=now()
         WHERE kind=$1 AND identity_key=$2 AND remote_id=$3 AND state='FINISHED' RETURNING *`,
        [kind, identityKey, remoteId, JSON.stringify({ remoteObjectUnavailable: true, reason, formerState: "FINISHED", operatorAction: "Verify provider retention and use strict adoption or an owner-approved replacement; never delete ledger evidence." })],
      );
      if (finished.rowCount !== 1) throw new Error(`Remote-object-unavailable transition for ${kind}:${identityKey} was rejected.`);
      return finished.rows[0];
    }
    return result.rows[0];
  }

  async replaceTerminalAction({ sourceSha, kind, identityKey, expectedRemoteId, remoteId, state, evidence = {} }) {
    const result = await this.pool.query(
      `UPDATE preview_release_action
       SET remote_id=$5, state=$6, evidence=$7::jsonb, updated_at=now()
       WHERE source_sha=$1 AND kind=$2 AND identity_key=$3 AND remote_id=$4
         AND state IN ('BUILD_FAILED','UPDATE_FAILED','ERRORED','FAILED','CANCELED','CANCELLED','DEACTIVATED','RUNTIME_MISMATCH')
       RETURNING *`,
      [sourceSha, kind, identityKey, expectedRemoteId, remoteId, state, JSON.stringify(evidence)],
    );
    if (result.rowCount !== 1) throw new Error(`Terminal remote replacement for ${kind}:${identityKey} was rejected.`);
    return result.rows[0];
  }

  async close() { await this.pool.end(); }
}
