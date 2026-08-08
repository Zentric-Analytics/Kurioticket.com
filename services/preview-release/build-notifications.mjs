import { PREVIEW_IDENTITY } from "./config.mjs";

const TERMINAL_FAILURES = new Set(["ERRORED", "FAILED", "CANCELED", "CANCELLED"]);

export async function notifySuccessfulNativeBuilds({ sourceSha, ledger, eas, secret = process.env.PREVIEW_BUILD_NOTIFICATION_SECRET, fetchImpl = fetch }) {
  if (!secret) {
    console.warn(JSON.stringify({ event: "preview-build-notification-skipped", reason: "secret-not-configured", sourceSha }));
    return [];
  }
  const release = typeof ledger.releaseBySha === "function" ? await ledger.releaseBySha(sourceSha).catch(() => null) : null;
  const classification = release?.classification ?? release?.evidence?.classification?.classification ?? null;
  const results = [];
  for (const platform of ["android", "ios"]) {
    const kind = platform === "android" ? "ANDROID_BUILD" : "IOS_BUILD";
    const identityKey = `${sourceSha}:${PREVIEW_IDENTITY.easProjectId}:${platform}:preview`;
    const action = await ledger.getAction(kind, identityKey);
    if (!action?.remote_id || String(action.state).toUpperCase() !== "FINISHED") continue;
    const build = await eas.viewBuild(action.remote_id);
    let submissionId = null;
    if (platform === "ios") {
      const submission = await ledger.getAction("IOS_SUBMISSION", `ios-submission:${build.id}`);
      if (!submission?.remote_id || String(submission.state).toUpperCase() !== "FINISHED") continue;
      submissionId = submission.remote_id;
    }
    const payload = {
      platform,
      status: "SUCCESS",
      sourceSha,
      buildId: build.id,
      buildNumber: build.appBuildVersion ?? null,
      appVersion: build.appVersion ?? null,
      runtimeVersion: PREVIEW_IDENTITY.runtime,
      classification,
      buildUrl: platform === "android" ? build.artifacts?.buildUrl ?? null : null,
      buildDetailsUrl: build.buildDetailsPageUrl ?? null,
      submissionId,
      completedAt: build.completedAt ?? new Date().toISOString(),
    };
    if (platform === "android" && !payload.buildUrl) {
      console.warn(JSON.stringify({ event: "preview-build-notification-skipped", platform, buildId: build.id, reason: "android-build-url-missing" }));
      continue;
    }
    results.push(await postNotification(payload, { secret, fetchImpl }));
  }
  return results;
}

export async function notifyFailedNativeBuilds({ sourceSha, ledger, eas, failureReason, secret = process.env.PREVIEW_BUILD_NOTIFICATION_SECRET, fetchImpl = fetch }) {
  if (!secret) return [];
  const release = typeof ledger.releaseBySha === "function" ? await ledger.releaseBySha(sourceSha).catch(() => null) : null;
  const reason = String(failureReason ?? release?.failure_reason ?? "Preview native delivery failed").slice(0, 500);
  const classification = release?.classification ?? release?.evidence?.classification?.classification ?? null;
  const results = [];
  for (const platform of ["android", "ios"]) {
    const kind = platform === "android" ? "ANDROID_BUILD" : "IOS_BUILD";
    const identityKey = `${sourceSha}:${PREVIEW_IDENTITY.easProjectId}:${platform}:preview`;
    const action = await ledger.getAction(kind, identityKey).catch(() => null);
    if (!action?.remote_id) continue;
    const terminalBuildFailure = TERMINAL_FAILURES.has(String(action.state).toUpperCase());
    const platformFailure = failureMentionsPlatform(reason, platform);
    if (!terminalBuildFailure && !platformFailure) continue;
    const build = await eas.viewBuild(action.remote_id).catch(() => ({ id: action.remote_id }));
    const submission = platform === "ios"
      ? await ledger.getAction("IOS_SUBMISSION", `ios-submission:${build.id ?? action.remote_id}`).catch(() => null)
      : null;
    results.push(await postNotification({
      platform,
      status: "FAILED",
      sourceSha,
      buildId: build.id ?? action.remote_id,
      buildNumber: build.appBuildVersion ?? null,
      appVersion: build.appVersion ?? null,
      runtimeVersion: PREVIEW_IDENTITY.runtime,
      classification,
      buildDetailsUrl: build.buildDetailsPageUrl ?? null,
      submissionId: submission?.remote_id ?? null,
      failureReason: reason,
      completedAt: build.completedAt ?? new Date().toISOString(),
    }, { secret, fetchImpl }));
  }
  return results;
}

export function failureMentionsPlatform(reason, platform) {
  const value = String(reason).toLowerCase();
  if (platform === "android") return /android|\.apk\b|android_native/.test(value);
  return /\bios\b|testflight|app store|apple|submission|ios_native/.test(value);
}

async function postNotification(payload, { secret, fetchImpl }) {
  const endpoint = new URL("/api/internal/preview-build-notifications", PREVIEW_IDENTITY.apiOrigin);
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-kurioticket-preview-build-secret": secret,
    },
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  let result = null;
  try { result = body ? JSON.parse(body) : null; } catch { result = null; }
  if (!response.ok || response.status === 207 || Number(result?.failed || 0) > 0) {
    throw new Error(`Preview build notification endpoint remains retryable after HTTP ${response.status}: ${body.slice(0, 200)}`);
  }
  if (Number(result?.terminal || 0) > 0) {
    console.warn(JSON.stringify({ event: "preview-build-notification-terminal-recipient", platform: payload.platform, status: payload.status, buildId: payload.buildId, terminalRecipients: result.terminal }));
  }
  console.log(JSON.stringify({ event: "preview-build-notification", platform: payload.platform, status: payload.status, buildId: payload.buildId, responseStatus: response.status, recipients: result?.recipients ?? null, alreadyAccepted: result?.alreadyAccepted ?? null }));
  return { platform: payload.platform, status: payload.status, buildId: payload.buildId, responseStatus: response.status };
}
