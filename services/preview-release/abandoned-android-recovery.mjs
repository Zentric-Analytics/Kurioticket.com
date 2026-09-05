import { PREVIEW_IDENTITY } from "./config.mjs";
import { inspectHistoricalAndroidBuilds, reconcileBuilds } from "./eas-state.mjs";

const EXACT_SHA = /^[0-9a-f]{40}$/;
const EXACT_FINGERPRINT = /^[0-9a-f]{40}$/;
const MINIMUM_ABANDONED_AGE_MS = 30 * 60_000;
const FINAL_HISTORY_RECHECK_DELAY_MS = 5_000;

export function parseAuthorizedAbandonedAndroidRecovery(env = process.env) {
  const keys = [
    "PREVIEW_ANDROID_RECOVERY_ACTION_ID",
    "PREVIEW_ANDROID_RECOVERY_SOURCE_SHA",
    "PREVIEW_ANDROID_RECOVERY_FINGERPRINT",
    "PREVIEW_ANDROID_RECOVERY_APPROVED",
  ];
  const present = keys.filter((key) => String(env[key] ?? "").trim() !== "");
  if (!present.length) return null;
  if (present.length !== keys.length) throw new Error("Android abandoned-reservation recovery authorization is incomplete.");

  const actionId = String(env.PREVIEW_ANDROID_RECOVERY_ACTION_ID).trim();
  const sourceSha = String(env.PREVIEW_ANDROID_RECOVERY_SOURCE_SHA).trim();
  const fingerprint = String(env.PREVIEW_ANDROID_RECOVERY_FINGERPRINT).trim();
  if (!/^\d+$/.test(actionId)) throw new Error("Android recovery action ID is malformed.");
  if (!EXACT_SHA.test(sourceSha)) throw new Error("Android recovery source SHA is malformed.");
  if (!EXACT_FINGERPRINT.test(fingerprint)) throw new Error("Android recovery fingerprint is malformed.");
  if (String(env.PREVIEW_ANDROID_RECOVERY_APPROVED).trim() !== "true") {
    throw new Error("Android abandoned-reservation recovery requires explicit PREVIEW_ANDROID_RECOVERY_APPROVED=true authorization.");
  }
  return Object.freeze({ actionId, sourceSha, fingerprint });
}

export async function runAuthorizedAbandonedAndroidRecovery({
  authorization,
  ledger,
  github,
  eas,
  orchestrator,
  now = () => Date.now(),
  sleep = delay,
}) {
  if (!authorization) return { state: "DISABLED" };
  const { actionId, sourceSha, fingerprint } = authorization;
  const canonicalIdentity = `native-build:android:${PREVIEW_IDENTITY.easProjectId}:${fingerprint}`;

  let original = await actionById(ledger, actionId);
  assertOriginalReservation(original, { actionId, sourceSha, fingerprint, canonicalIdentity, now: now() });

  const abandonment = actionEvidence(original)?.abandonedReservationRecovery;
  if (original.state === "RESERVED") {
    const firstReport = await inspectOriginalHistory(eas, original);
    if (firstReport.outcome !== "NO_MATCH") {
      throw new Error(`Abandoned Android recovery requires NO_MATCH; first provider check returned ${firstReport.outcome}.`);
    }
    await sleep(FINAL_HISTORY_RECHECK_DELAY_MS);
    original = await actionById(ledger, actionId);
    assertOriginalReservation(original, { actionId, sourceSha, fingerprint, canonicalIdentity, now: now() });
    const secondReport = await inspectOriginalHistory(eas, original);
    if (secondReport.outcome !== "NO_MATCH") {
      throw new Error(`Abandoned Android recovery requires two NO_MATCH checks; final provider check returned ${secondReport.outcome}.`);
    }
    original = await finalizeAbandonedReservation({ ledger, original, authorization, now: now() });
    console.log(JSON.stringify({
      event: "abandoned-android-reservation-finalized",
      actionId,
      sourceSha,
      fingerprint,
      providerOutcome: "NO_MATCH",
    }));
  } else if (original.state === "FAILED" && abandonment?.providerOutcome === "NO_MATCH"
    && abandonment?.actionId === actionId && abandonment?.sourceSha === sourceSha
    && abandonment?.fingerprint === fingerprint) {
    // Idempotent restart after the abandoned reservation was already finalized.
  } else {
    throw new Error("Android recovery authorization does not match a finalized abandoned reservation.");
  }

  const currentDevSha = await github.latestDevSha();
  if (!EXACT_SHA.test(currentDevSha)) throw new Error("Current dev SHA is malformed during Android recovery.");
  const currentRelease = await ledger.releaseBySha(currentDevSha);
  const currentFingerprint = actionEvidence(currentRelease)?.fingerprints?.android;
  if (currentFingerprint !== fingerprint) {
    throw new Error("Current dev Android fingerprint no longer matches the abandoned reservation; replacement build is blocked.");
  }

  const delivered = typeof ledger.currentDeliveredNative === "function"
    ? await ledger.currentDeliveredNative("android")
    : null;
  if (delivered?.native_fingerprint === fingerprint || delivered?.fingerprint === fingerprint) {
    return { state: "ALREADY_DELIVERED", sourceSha: currentDevSha, fingerprint, buildId: delivered.eas_build_id ?? delivered.native_build_id ?? delivered.buildId ?? null };
  }

  const reservation = await ledger.reserveNativeBuildRecovery({
    sourceSha: currentDevSha,
    platform: "android",
    fingerprint,
  });
  let recovery = reservation.action;
  const easHistory = reconcileBuilds(await eas.listAndroidBuilds(currentDevSha), currentDevSha, "android", fingerprint);
  if (["CONFLICT", "MALFORMED_RESPONSE", "FAILED_MATCH", "CANCELED_MATCH"].includes(easHistory.decision)) {
    throw new Error(`Authorized Android recovery history failed closed: ${easHistory.decision}.`);
  }

  if (!recovery.remote_id && ["ACTIVE_MATCH", "FINISHED_MATCH"].includes(easHistory.decision)) {
    const build = easHistory.build;
    recovery = await ledger.recordAction({
      sourceSha: currentDevSha,
      kind: "ANDROID_BUILD",
      identityKey: recovery.identity_key,
      remoteId: build.id,
      state: String(build.status).toUpperCase(),
      evidence: {
        ...build,
        nativeFingerprint: fingerprint,
        nativeArtifactSourceSha: currentDevSha,
        latestCompatibleSourceSha: currentDevSha,
        ownershipSource: "OWNER_AUTHORIZED_ABANDONED_RESERVATION_HISTORY_RECONCILIATION",
        replacesAbandonedActionId: actionId,
      },
    });
    console.log(JSON.stringify({
      event: "authorized-android-recovery-existing-build-attached",
      actionId,
      sourceSha: currentDevSha,
      fingerprint,
      buildId: build.id,
      status: String(build.status).toUpperCase(),
    }));
  }

  if (!recovery.remote_id) {
    const recoveryEvidence = actionEvidence(recovery);
    if (String(recovery.state).toUpperCase() === "CREATING" || recoveryEvidence?.providerCreationAttempt === "STARTED") {
      throw new Error("An authorized Android replacement creation attempt already started without a durable EAS build ID; a second paid build is blocked pending separate operator review.");
    }
    if (!reservation.created && String(recovery.state).toUpperCase() !== "RESERVED") {
      throw new Error("Existing Android recovery action is not safe for a first provider creation attempt.");
    }

    recovery = await ledger.recordAction({
      sourceSha: currentDevSha,
      kind: "ANDROID_BUILD",
      identityKey: recovery.identity_key,
      remoteId: null,
      state: "CREATING",
      evidence: {
        ...recoveryEvidence,
        nativeFingerprint: fingerprint,
        nativeArtifactSourceSha: currentDevSha,
        latestCompatibleSourceSha: currentDevSha,
        ownershipSource: "OWNER_AUTHORIZED_ABANDONED_RESERVATION_REPLACEMENT",
        replacesAbandonedActionId: actionId,
        providerCreationAttempt: "STARTED",
        providerCreationAttemptStartedAt: new Date(now()).toISOString(),
      },
    });
    console.log(JSON.stringify({
      event: "authorized-android-recovery-create-started",
      actionId,
      sourceSha: currentDevSha,
      fingerprint,
      recoveryIdentity: recovery.identity_key,
    }));

    const created = await eas.createAndroidBuild();
    if (!created?.id) throw new Error("EAS accepted Android recovery creation without returning a durable build ID.");
    recovery = await ledger.recordAction({
      sourceSha: currentDevSha,
      kind: "ANDROID_BUILD",
      identityKey: recovery.identity_key,
      remoteId: created.id,
      state: "CREATED",
      evidence: {
        ...created,
        nativeFingerprint: fingerprint,
        nativeArtifactSourceSha: currentDevSha,
        latestCompatibleSourceSha: currentDevSha,
        ownershipSource: "OWNER_AUTHORIZED_ABANDONED_RESERVATION_REPLACEMENT",
        replacesAbandonedActionId: actionId,
        providerCreationAttempt: "ACCEPTED",
      },
    });
    console.log(JSON.stringify({
      event: "authorized-android-recovery-create-accepted",
      actionId,
      sourceSha: currentDevSha,
      fingerprint,
      buildId: recovery.remote_id,
    }));
  }

  const result = await orchestrator.recoverCanonicalNativeBuild({
    sourceSha: currentDevSha,
    platform: "android",
  });
  return { state: "RECOVERY_COMPLETE", sourceSha: currentDevSha, fingerprint, ...result };
}

async function inspectOriginalHistory(eas, action) {
  const history = await eas.historicalAndroidHistory(action);
  return inspectHistoricalAndroidBuilds(history.builds, action, history.projectId);
}

async function actionById(ledger, actionId) {
  const result = await ledger.pool.query("SELECT * FROM preview_release_action WHERE id=$1 LIMIT 2", [actionId]);
  if (result.rowCount !== 1) throw new Error("Authorized Android recovery action ID was not found uniquely.");
  return result.rows[0];
}

function assertOriginalReservation(action, { actionId, sourceSha, fingerprint, canonicalIdentity, now }) {
  if (String(action?.id) !== actionId || action?.kind !== "ANDROID_BUILD" || action?.source_sha !== sourceSha
    || action?.identity_key !== canonicalIdentity || action?.remote_id != null) {
    throw new Error("Authorized Android recovery does not match the exact unresolved canonical reservation.");
  }
  if (!["RESERVED", "FAILED"].includes(String(action.state).toUpperCase())) {
    throw new Error("Authorized Android recovery reservation is not in an eligible state.");
  }
  const createdAt = Date.parse(action.created_at);
  if (!Number.isFinite(createdAt) || now - createdAt < MINIMUM_ABANDONED_AGE_MS) {
    throw new Error("Android reservation is too recent to be treated as abandoned.");
  }
  const evidence = actionEvidence(action);
  const evidenceFingerprint = evidence?.nativeFingerprint ?? action.identity_key.split(":").at(-1);
  if (evidenceFingerprint !== fingerprint) throw new Error("Android abandoned reservation fingerprint evidence is inconsistent.");
}

async function finalizeAbandonedReservation({ ledger, original, authorization, now }) {
  const client = await ledger.pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", ["ANDROID_BUILD", original.identity_key]);
    const selected = await client.query("SELECT * FROM preview_release_action WHERE id=$1 FOR UPDATE", [authorization.actionId]);
    if (selected.rowCount !== 1) throw new Error("Abandoned Android reservation disappeared during finalization.");
    const action = selected.rows[0];
    assertOriginalReservation(action, {
      actionId: authorization.actionId,
      sourceSha: authorization.sourceSha,
      fingerprint: authorization.fingerprint,
      canonicalIdentity: original.identity_key,
      now,
    });
    if (String(action.state).toUpperCase() !== "RESERVED") throw new Error("Abandoned Android reservation changed state before finalization.");
    const evidence = actionEvidence(action);
    const updated = await client.query(
      `UPDATE preview_release_action
       SET state='FAILED', evidence=$2::jsonb, updated_at=now()
       WHERE id=$1 AND state='RESERVED' AND remote_id IS NULL RETURNING *`,
      [authorization.actionId, JSON.stringify({
        ...evidence,
        abandonedReservationRecovery: {
          actionId: authorization.actionId,
          sourceSha: authorization.sourceSha,
          fingerprint: authorization.fingerprint,
          providerOutcome: "NO_MATCH",
          finalizedAt: new Date(now).toISOString(),
          ownershipSource: "EXPLICIT_OPERATOR_AUTHORIZATION",
        },
      })],
    );
    if (updated.rowCount !== 1) throw new Error("Abandoned Android reservation finalization lost its compare-and-set guard.");
    await client.query("COMMIT");
    return updated.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function actionEvidence(row) {
  const evidence = row?.evidence;
  if (!evidence || typeof evidence === "object") return evidence ?? {};
  try { return JSON.parse(evidence); } catch { return {}; }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
