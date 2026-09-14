import { PREVIEW_IDENTITY } from "./config.mjs";
import { reconcileBuilds } from "./eas-state.mjs";

const EXACT_SHA = /^[0-9a-f]{40}$/;
const EXACT_FINGERPRINT = /^[0-9a-f]{40}$/;
const MINIMUM_ABANDONED_AGE_MS = 30 * 60_000;
const FINAL_HISTORY_RECHECK_DELAY_MS = 5_000;
const ACTIVE_OR_FINISHED = new Set(["ACTIVE_MATCH", "FINISHED_MATCH"]);
const TERMINAL_MATCH = new Set(["FAILED_MATCH", "CANCELED_MATCH"]);

export function parseAuthorizedAbandonedIosRecovery(env = process.env) {
  const keys = [
    "PREVIEW_IOS_RECOVERY_ACTION_ID",
    "PREVIEW_IOS_RECOVERY_SOURCE_SHA",
    "PREVIEW_IOS_RECOVERY_FINGERPRINT",
    "PREVIEW_IOS_RECOVERY_APPROVED",
  ];
  const present = keys.filter((key) => String(env[key] ?? "").trim() !== "");
  if (!present.length) return null;
  if (present.length !== keys.length) throw new Error("iOS abandoned-reservation recovery authorization is incomplete.");

  const actionId = String(env.PREVIEW_IOS_RECOVERY_ACTION_ID).trim();
  const sourceSha = String(env.PREVIEW_IOS_RECOVERY_SOURCE_SHA).trim();
  const fingerprint = String(env.PREVIEW_IOS_RECOVERY_FINGERPRINT).trim();
  if (!/^\d+$/.test(actionId)) throw new Error("iOS recovery action ID is malformed.");
  if (!EXACT_SHA.test(sourceSha)) throw new Error("iOS recovery source SHA is malformed.");
  if (!EXACT_FINGERPRINT.test(fingerprint)) throw new Error("iOS recovery fingerprint is malformed.");
  if (String(env.PREVIEW_IOS_RECOVERY_APPROVED).trim() !== "true") {
    throw new Error("iOS abandoned-reservation recovery requires explicit PREVIEW_IOS_RECOVERY_APPROVED=true authorization.");
  }
  return Object.freeze({ actionId, sourceSha, fingerprint });
}

export async function runAuthorizedAbandonedIosRecovery({
  authorization,
  mode,
  ledger,
  github,
  eas,
  orchestrator,
  now = () => Date.now(),
  sleep = delay,
}) {
  if (!authorization) return { state: "DISABLED" };
  if (mode !== "active") {
    throw new Error("iOS abandoned-reservation recovery is forbidden unless Preview release mode is active.");
  }

  const { actionId, sourceSha, fingerprint } = authorization;
  const canonicalIdentity = `native-build:ios:${PREVIEW_IDENTITY.easProjectId}:${fingerprint}`;
  let original = await actionById(ledger, actionId);
  let originalEvidence = actionEvidence(original);
  let authorizationEvidence = originalEvidence?.abandonedReservationRecovery;

  if (authorizedRecoveryEvidenceMatches(authorizationEvidence, authorization)) {
    const state = normalizeState(original.state);
    if (original.remote_id && isActiveOrFinishedState(state)) {
      return { state: "EXISTING_BUILD_RECONCILED", sourceSha, fingerprint, buildId: original.remote_id };
    }
    if (!(isTerminalState(state) || (state === "FAILED" && original.remote_id == null))) {
      throw new Error("Authorized iOS recovery is already recorded in an unexpected state.");
    }
  } else {
    assertOriginalReservation(original, { actionId, sourceSha, fingerprint, canonicalIdentity, now: now() });

    const firstDecision = await inspectIosHistory(eas, sourceSha, fingerprint);
    if (ACTIVE_OR_FINISHED.has(firstDecision.decision)) {
      original = await attachOriginalIosBuild({ ledger, original, authorization, fingerprint, build: firstDecision.build, providerOutcome: firstDecision.decision, now: now() });
      return { state: "EXISTING_BUILD_RECONCILED", sourceSha, fingerprint, buildId: original.remote_id };
    }
    if (TERMINAL_MATCH.has(firstDecision.decision)) {
      original = await attachOriginalIosBuild({ ledger, original, authorization, fingerprint, build: firstDecision.build, providerOutcome: firstDecision.decision, now: now() });
    } else if (firstDecision.decision === "NONE") {
      await sleep(FINAL_HISTORY_RECHECK_DELAY_MS);
      original = await actionById(ledger, actionId);
      assertOriginalReservation(original, { actionId, sourceSha, fingerprint, canonicalIdentity, now: now() });
      const finalDecision = await inspectIosHistory(eas, sourceSha, fingerprint);
      if (ACTIVE_OR_FINISHED.has(finalDecision.decision)) {
        original = await attachOriginalIosBuild({ ledger, original, authorization, fingerprint, build: finalDecision.build, providerOutcome: finalDecision.decision, now: now() });
        return { state: "EXISTING_BUILD_RECONCILED", sourceSha, fingerprint, buildId: original.remote_id };
      }
      if (TERMINAL_MATCH.has(finalDecision.decision)) {
        original = await attachOriginalIosBuild({ ledger, original, authorization, fingerprint, build: finalDecision.build, providerOutcome: finalDecision.decision, now: now() });
      } else if (finalDecision.decision === "NONE") {
        original = await finalizeAbandonedReservation({ ledger, original, authorization, now: now() });
        console.log(JSON.stringify({
          event: "abandoned-ios-reservation-finalized",
          actionId,
          sourceSha,
          fingerprint,
          providerOutcome: "NO_MATCH",
        }));
      } else {
        throw new Error(`Abandoned iOS recovery final provider check failed closed: ${finalDecision.decision}.`);
      }
    } else {
      throw new Error(`Abandoned iOS recovery provider check failed closed: ${firstDecision.decision}.`);
    }
  }

  originalEvidence = actionEvidence(original);
  authorizationEvidence = originalEvidence?.abandonedReservationRecovery;
  if (!authorizedRecoveryEvidenceMatches(authorizationEvidence, authorization) || !isTerminalState(normalizeState(original.state))) {
    throw new Error("iOS abandoned reservation was not durably finalized before replacement planning.");
  }

  const currentDevSha = await github.latestDevSha();
  if (!EXACT_SHA.test(currentDevSha)) throw new Error("Current dev SHA is malformed during iOS recovery.");
  const currentRelease = await ledger.releaseBySha(currentDevSha);
  const currentFingerprint = actionEvidence(currentRelease)?.fingerprints?.ios;
  if (currentFingerprint !== fingerprint) {
    throw new Error("Current dev iOS fingerprint no longer matches the abandoned reservation; replacement build is blocked.");
  }

  const delivered = typeof ledger.currentDeliveredNative === "function"
    ? await ledger.currentDeliveredNative("ios")
    : null;
  if (delivered?.native_fingerprint === fingerprint || delivered?.fingerprint === fingerprint) {
    return { state: "ALREADY_DELIVERED", sourceSha: currentDevSha, fingerprint, buildId: delivered.eas_build_id ?? delivered.native_build_id ?? delivered.buildId ?? null };
  }

  if (typeof ledger.latestNativeBuildRecovery === "function") {
    const prior = await ledger.latestNativeBuildRecovery({ platform: "ios", fingerprint });
    if (prior && isTerminalState(normalizeState(prior.state))) {
      throw new Error("A prior iOS replacement attempt is terminal; a fresh operator authorization is required before another paid build can be created.");
    }
  }

  const reservation = await ledger.reserveNativeBuildRecovery({
    sourceSha: currentDevSha,
    platform: "ios",
    fingerprint,
  });
  let recovery = reservation.action;
  let easHistory = await inspectIosHistory(eas, currentDevSha, fingerprint);
  if (["CONFLICT", "MALFORMED_RESPONSE", "FAILED_MATCH", "CANCELED_MATCH"].includes(easHistory.decision)) {
    throw new Error(`Authorized iOS recovery history failed closed: ${easHistory.decision}.`);
  }

  if (!recovery.remote_id && ACTIVE_OR_FINISHED.has(easHistory.decision)) {
    const attached = await attachAuthorizedIosRecoveryBuild({
      ledger,
      recovery,
      sourceSha: currentDevSha,
      fingerprint,
      actionId,
      build: easHistory.build,
    });
    if (!attached.claimed && attached.action?.remote_id !== easHistory.build.id) {
      throw new Error("iOS recovery action changed while attaching an existing provider build; automatic replacement creation is blocked.");
    }
    recovery = attached.action;
    console.log(JSON.stringify({
      event: "authorized-ios-recovery-existing-build-attached",
      actionId,
      sourceSha: currentDevSha,
      fingerprint,
      buildId: recovery.remote_id,
      status: normalizeState(recovery.state),
    }));
  }

  if (!recovery.remote_id) {
    const recoveryEvidence = actionEvidence(recovery);
    if (normalizeState(recovery.state) === "CREATING" || recoveryEvidence?.providerCreationAttempt === "STARTED") {
      throw new Error("An authorized iOS replacement creation attempt already started without a durable EAS build ID; a second paid build is blocked pending separate operator review.");
    }

    const claimed = await claimAuthorizedIosRecoveryCreation({
      ledger,
      recovery,
      sourceSha: currentDevSha,
      fingerprint,
      actionId,
      now: now(),
    });
    if (!claimed.claimed) {
      const state = normalizeState(claimed.action?.state);
      if (state === "CREATING" || actionEvidence(claimed.action)?.providerCreationAttempt === "STARTED") {
        throw new Error("An authorized iOS replacement creation attempt already started without a durable EAS build ID; a second paid build is blocked pending separate operator review.");
      }
      throw new Error("Another worker changed the iOS recovery reservation before provider creation; automatic creation is blocked.");
    }
    recovery = claimed.action;
    console.log(JSON.stringify({
      event: "authorized-ios-recovery-create-started",
      actionId,
      sourceSha: currentDevSha,
      fingerprint,
      recoveryIdentity: recovery.identity_key,
    }));

    easHistory = await inspectIosHistory(eas, currentDevSha, fingerprint);
    if (["CONFLICT", "MALFORMED_RESPONSE", "FAILED_MATCH", "CANCELED_MATCH"].includes(easHistory.decision)) {
      throw new Error(`Authorized iOS recovery final history check failed closed: ${easHistory.decision}.`);
    }
    if (ACTIVE_OR_FINISHED.has(easHistory.decision)) {
      const attached = await attachAuthorizedIosRecoveryBuild({
        ledger,
        recovery,
        sourceSha: currentDevSha,
        fingerprint,
        actionId,
        build: easHistory.build,
      });
      if (!attached.claimed && attached.action?.remote_id !== easHistory.build.id) {
        throw new Error("iOS recovery action changed during the final provider-history check; replacement creation is blocked.");
      }
      recovery = attached.action;
      console.log(JSON.stringify({
        event: "authorized-ios-recovery-existing-build-attached-after-claim",
        actionId,
        sourceSha: currentDevSha,
        fingerprint,
        buildId: recovery.remote_id,
        status: normalizeState(recovery.state),
      }));
    } else {
      const created = await eas.createIosBuild();
      if (!created?.id) throw new Error("EAS accepted iOS recovery creation without returning a durable build ID.");
      recovery = await ledger.recordAction({
        sourceSha: currentDevSha,
        kind: "IOS_BUILD",
        identityKey: recovery.identity_key,
        remoteId: created.id,
        state: "CREATED",
        evidence: {
          ...created,
          ...actionEvidence(recovery),
          nativeFingerprint: fingerprint,
          nativeArtifactSourceSha: currentDevSha,
          latestCompatibleSourceSha: currentDevSha,
          ownershipSource: "OWNER_AUTHORIZED_ABANDONED_RESERVATION_REPLACEMENT",
          replacesAbandonedActionId: actionId,
          providerCreationAttempt: "ACCEPTED",
        },
      });
      console.log(JSON.stringify({
        event: "authorized-ios-recovery-create-accepted",
        actionId,
        sourceSha: currentDevSha,
        fingerprint,
        buildId: recovery.remote_id,
      }));
    }
  }

  const result = await orchestrator.recoverCanonicalNativeBuild({
    sourceSha: currentDevSha,
    platform: "ios",
  });
  return { state: "RECOVERY_COMPLETE", sourceSha: currentDevSha, fingerprint, ...result };
}

export async function claimAuthorizedIosRecoveryCreation({ ledger, recovery, sourceSha, fingerprint, actionId, now = Date.now() }) {
  assertExactRecoveryIdentity({ recovery, sourceSha, fingerprint });
  const kind = "IOS_BUILD";
  const canonicalIdentity = `native-build:ios:${PREVIEW_IDENTITY.easProjectId}:${fingerprint}`;
  const client = await ledger.pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", [kind, canonicalIdentity]);
    const evidence = {
      ...actionEvidence(recovery),
      nativeFingerprint: fingerprint,
      nativeArtifactSourceSha: sourceSha,
      latestCompatibleSourceSha: sourceSha,
      ownershipSource: "OWNER_AUTHORIZED_ABANDONED_RESERVATION_REPLACEMENT",
      replacesAbandonedActionId: actionId,
      providerCreationAttempt: "STARTED",
      providerCreationAttemptStartedAt: new Date(now).toISOString(),
    };
    const updated = await client.query(
      `UPDATE preview_release_action
       SET state='CREATING', evidence=$4::jsonb, updated_at=now()
       WHERE id=$1 AND source_sha=$2 AND identity_key=$3
         AND kind='IOS_BUILD' AND state='RESERVED' AND remote_id IS NULL
       RETURNING *`,
      [recovery.id, sourceSha, recovery.identity_key, JSON.stringify(evidence)],
    );
    if (updated.rowCount === 1) {
      await client.query("COMMIT");
      return { claimed: true, action: updated.rows[0] };
    }
    const current = await client.query(
      "SELECT * FROM preview_release_action WHERE id=$1 AND kind='IOS_BUILD' AND identity_key=$2 LIMIT 2",
      [recovery.id, recovery.identity_key],
    );
    if (current.rowCount !== 1) throw new Error("iOS recovery creation claim lost its durable action identity.");
    await client.query("COMMIT");
    return { claimed: false, action: current.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function attachAuthorizedIosRecoveryBuild({ ledger, recovery, sourceSha, fingerprint, actionId, build }) {
  assertExactRecoveryIdentity({ recovery, sourceSha, fingerprint, allowCreating: true });
  if (!build?.id) throw new Error("Existing iOS provider build has no durable ID.");
  const kind = "IOS_BUILD";
  const canonicalIdentity = `native-build:ios:${PREVIEW_IDENTITY.easProjectId}:${fingerprint}`;
  const client = await ledger.pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", [kind, canonicalIdentity]);
    const evidence = {
      ...build,
      ...actionEvidence(recovery),
      nativeFingerprint: fingerprint,
      nativeArtifactSourceSha: sourceSha,
      latestCompatibleSourceSha: sourceSha,
      ownershipSource: "OWNER_AUTHORIZED_ABANDONED_RESERVATION_HISTORY_RECONCILIATION",
      replacesAbandonedActionId: actionId,
      providerCreationAttempt: "AVOIDED_EXISTING_MATCH",
    };
    const updated = await client.query(
      `UPDATE preview_release_action
       SET remote_id=$4, state=$5, evidence=$6::jsonb, updated_at=now()
       WHERE id=$1 AND source_sha=$2 AND identity_key=$3
         AND kind='IOS_BUILD' AND state IN ('RESERVED','CREATING') AND remote_id IS NULL
       RETURNING *`,
      [recovery.id, sourceSha, recovery.identity_key, build.id, normalizeState(build.status), JSON.stringify(evidence)],
    );
    if (updated.rowCount === 1) {
      await client.query("COMMIT");
      return { claimed: true, action: updated.rows[0] };
    }
    const current = await client.query(
      "SELECT * FROM preview_release_action WHERE id=$1 AND kind='IOS_BUILD' AND identity_key=$2 LIMIT 2",
      [recovery.id, recovery.identity_key],
    );
    if (current.rowCount !== 1) throw new Error("iOS recovery attachment lost its durable action identity.");
    await client.query("COMMIT");
    return { claimed: false, action: current.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function attachOriginalIosBuild({ ledger, original, authorization, fingerprint, build, providerOutcome, now }) {
  if (!build?.id) throw new Error("Existing iOS provider build has no durable ID.");
  const client = await ledger.pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", ["IOS_BUILD", original.identity_key]);
    const evidence = {
      ...build,
      ...actionEvidence(original),
      nativeFingerprint: fingerprint,
      nativeArtifactSourceSha: authorization.sourceSha,
      latestCompatibleSourceSha: authorization.sourceSha,
      ownershipSource: "OWNER_AUTHORIZED_ABANDONED_RESERVATION_HISTORY_RECONCILIATION",
      abandonedReservationRecovery: recoveryEvidence(authorization, providerOutcome, now),
    };
    const updated = await client.query(
      `UPDATE preview_release_action
       SET remote_id=$4, state=$5, evidence=$6::jsonb, updated_at=now()
       WHERE id=$1 AND source_sha=$2 AND identity_key=$3
         AND kind='IOS_BUILD' AND state='RESERVED' AND remote_id IS NULL
       RETURNING *`,
      [original.id, authorization.sourceSha, original.identity_key, build.id, normalizeState(build.status), JSON.stringify(evidence)],
    );
    if (updated.rowCount === 1) {
      await client.query("COMMIT");
      return updated.rows[0];
    }
    const current = await client.query("SELECT * FROM preview_release_action WHERE id=$1 AND kind='IOS_BUILD' LIMIT 2", [original.id]);
    if (current.rowCount !== 1) throw new Error("Original iOS reservation attachment lost its durable action identity.");
    const row = current.rows[0];
    if (row.remote_id !== build.id || !authorizedRecoveryEvidenceMatches(actionEvidence(row)?.abandonedReservationRecovery, authorization)) {
      throw new Error("Original iOS reservation changed while provider history was being attached.");
    }
    await client.query("COMMIT");
    return row;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function inspectIosHistory(eas, sourceSha, fingerprint) {
  const decision = reconcileBuilds(await eas.listIosBuilds(sourceSha), sourceSha, "ios", fingerprint);
  if (ACTIVE_OR_FINISHED.has(decision.decision) || TERMINAL_MATCH.has(decision.decision)) {
    await eas.compareBuildFingerprint(decision.build.id, fingerprint);
  }
  return decision;
}

async function actionById(ledger, actionId) {
  const result = await ledger.pool.query("SELECT * FROM preview_release_action WHERE id=$1 LIMIT 2", [actionId]);
  if (result.rowCount !== 1) throw new Error("Authorized iOS recovery action ID was not found uniquely.");
  return result.rows[0];
}

function assertOriginalReservation(action, { actionId, sourceSha, fingerprint, canonicalIdentity, now }) {
  if (String(action?.id) !== actionId || action?.kind !== "IOS_BUILD" || action?.source_sha !== sourceSha
    || action?.identity_key !== canonicalIdentity || action?.remote_id != null) {
    throw new Error("Authorized iOS recovery does not match the exact unresolved canonical reservation.");
  }
  if (normalizeState(action.state) !== "RESERVED") {
    throw new Error("Authorized iOS recovery reservation is not in the unresolved RESERVED state.");
  }
  const createdAt = Date.parse(action.created_at);
  if (!Number.isFinite(createdAt) || now - createdAt < MINIMUM_ABANDONED_AGE_MS) {
    throw new Error("iOS reservation is too recent to be treated as abandoned.");
  }
  const evidence = actionEvidence(action);
  const evidenceFingerprint = evidence?.nativeFingerprint ?? action.identity_key.split(":").at(-1);
  if (evidenceFingerprint !== fingerprint) throw new Error("iOS abandoned reservation fingerprint evidence is inconsistent.");
}

function assertExactRecoveryIdentity({ recovery, sourceSha, fingerprint, allowCreating = false }) {
  if (!EXACT_SHA.test(sourceSha) || !EXACT_FINGERPRINT.test(fingerprint)) {
    throw new Error("iOS recovery creation identity is malformed.");
  }
  const prefix = `native-build-recovery:ios:${PREVIEW_IDENTITY.easProjectId}:${fingerprint}:`;
  const allowedStates = allowCreating ? new Set(["RESERVED", "CREATING"]) : new Set(["RESERVED"]);
  if (!recovery?.id || recovery?.kind !== "IOS_BUILD" || recovery?.source_sha !== sourceSha
    || !String(recovery?.identity_key ?? "").startsWith(prefix) || recovery?.remote_id != null
    || !allowedStates.has(normalizeState(recovery.state))) {
    throw new Error("iOS recovery creation claim does not match the exact reserved recovery action.");
  }
}

async function finalizeAbandonedReservation({ ledger, original, authorization, now }) {
  const client = await ledger.pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", ["IOS_BUILD", original.identity_key]);
    const selected = await client.query("SELECT * FROM preview_release_action WHERE id=$1 FOR UPDATE", [authorization.actionId]);
    if (selected.rowCount !== 1) throw new Error("Abandoned iOS reservation disappeared during finalization.");
    const action = selected.rows[0];
    assertOriginalReservation(action, {
      actionId: authorization.actionId,
      sourceSha: authorization.sourceSha,
      fingerprint: authorization.fingerprint,
      canonicalIdentity: original.identity_key,
      now,
    });
    const evidence = actionEvidence(action);
    const updated = await client.query(
      `UPDATE preview_release_action
       SET state='FAILED', evidence=$2::jsonb, updated_at=now()
       WHERE id=$1 AND state='RESERVED' AND remote_id IS NULL RETURNING *`,
      [authorization.actionId, JSON.stringify({
        ...evidence,
        abandonedReservationRecovery: recoveryEvidence(authorization, "NO_MATCH", now),
      })],
    );
    if (updated.rowCount !== 1) throw new Error("Abandoned iOS reservation finalization lost its compare-and-set guard.");
    await client.query("COMMIT");
    return updated.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function recoveryEvidence(authorization, providerOutcome, now) {
  return {
    actionId: authorization.actionId,
    sourceSha: authorization.sourceSha,
    fingerprint: authorization.fingerprint,
    providerOutcome,
    finalizedAt: new Date(now).toISOString(),
    ownershipSource: "EXPLICIT_OPERATOR_AUTHORIZATION",
  };
}

function authorizedRecoveryEvidenceMatches(evidence, authorization) {
  return evidence?.actionId === authorization.actionId
    && evidence?.sourceSha === authorization.sourceSha
    && evidence?.fingerprint === authorization.fingerprint
    && evidence?.ownershipSource === "EXPLICIT_OPERATOR_AUTHORIZATION";
}

function actionEvidence(row) {
  const evidence = row?.evidence;
  if (!evidence || typeof evidence === "object") return evidence ?? {};
  try { return JSON.parse(evidence); } catch { return {}; }
}

function normalizeState(value) {
  return String(value ?? "").toUpperCase().replaceAll("-", "_");
}

function isActiveOrFinishedState(state) {
  return ["NEW", "CREATED", "IN_QUEUE", "IN_PROGRESS", "PENDING_CANCEL", "ACTIVE_MATCH", "FINISHED", "FINISHED_MATCH"].includes(state);
}

function isTerminalState(state) {
  return ["FAILED", "ERRORED", "CANCELED", "CANCELLED", "FAILED_MATCH", "CANCELED_MATCH"].includes(state);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
