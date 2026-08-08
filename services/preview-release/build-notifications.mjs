import { PREVIEW_IDENTITY } from "./config.mjs";

const TERMINAL_FAILURES = new Set(["ERRORED", "FAILED", "CANCELED", "CANCELLED"]);

export async function notifySuccessfulNativeBuilds({ sourceSha, ledger, eas, secret = process.env.PREVIEW_BUILD_NOTIFICATION_SECRET, fetchImpl = fetch }) {
  if (!secret) {
    console.warn(JSON.stringify({ event: "preview-build-notification-skipped", reason: "secret-not-configured", sourceSha }));
    return [];
  }
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
  const results = [];
  for (const platform of ["android", "ios"]) {
    const kind = platform === "android" ? "ANDROID_BUILD" : "IOS_BUILD";
    const identityKey = `${sourceSha}:${PREVIEW_IDENTITY.easProjectId}:${platform}:preview`;
    const action = await ledger.getAction(kind, identityKey).catch(() => null);
    if (!action?.remote_id || !TERMINAL_FAILURES.has(String(action.state).toUpperCase())) continue;
    const build = await eas.viewBuild(action.remote_id).catch(() => ({ id: action.remote_id }));
    results.push(await postNotification({
      platform,
      status: "FAILED",
      sourceSha,
      buildId: build.id ?? action.remote_id,
      buildNumber: build.appBuildVersion ?? null,
      appVersion: build.appVersion ?? null,
      runtimeVersion: PREVIEW_IDENTITY.runtime,
      buildDetailsUrl: build.buildDetailsPageUrl ?? null,
      failureReason: String(failureReason ?? `EAS ${platform} build failed`).slice(0, 500),
      completedAt: build.completedAt ?? new Date().toISOString(),
    }, { secret, fetchImpl }));
  }
  return results;
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
  if (!response.ok && response.status !== 207) {
    throw new Error(`Preview build notification endpoint failed with HTTP ${response.status}: ${body.slice(0, 200)}`);
  }
  console.log(JSON.stringify({ event: "preview-build-notification", platform: payload.platform, status: payload.status, buildId: payload.buildId, responseStatus: response.status }));
  return { platform: payload.platform, status: payload.status, buildId: payload.buildId, responseStatus: response.status };
}
