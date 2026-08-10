import { PREVIEW_IDENTITY } from "./config.mjs";

const TERMINAL_FAILURES = new Set(["ERRORED", "FAILED", "CANCELED", "CANCELLED"]);
const EXPO_ORIGIN = "https://expo.dev";

export function canonicalExpoBuildPageUrl(buildId) {
  const id = String(buildId ?? "").trim();
  if (!/^[A-Za-z0-9-]{8,200}$/.test(id)) throw new Error("EAS build ID is malformed for Expo build-page resolution.");
  const match = /^@([^/]+)\/([^/]+)$/.exec(PREVIEW_IDENTITY.easProjectFullName);
  if (!match) throw new Error("Preview EAS project full name is malformed.");
  const [, account, project] = match;
  return `${EXPO_ORIGIN}/accounts/${encodeURIComponent(account)}/projects/${encodeURIComponent(project)}/builds/${encodeURIComponent(id)}`;
}

function exactExpoBuildPageUrl(build) {
  const canonical = canonicalExpoBuildPageUrl(build?.id);
  const reported = typeof build?.buildDetailsPageUrl === "string" ? build.buildDetailsPageUrl.trim() : "";
  if (!reported) return canonical;

  let actual;
  let expected;
  try {
    actual = new URL(reported);
    expected = new URL(canonical);
  } catch {
    throw new Error("EAS build details page URL is malformed.");
  }
  const actualPath = actual.pathname.replace(/\/$/, "");
  const expectedPath = expected.pathname.replace(/\/$/, "");
  if (actual.origin !== expected.origin || actualPath !== expectedPath || actual.search || actual.hash) {
    throw new Error(`EAS build details page URL does not match exact Preview build ${build.id}.`);
  }
  return canonical;
}

export async function notifySuccessfulNativeBuilds({ sourceSha, ledger, eas, onlyBuildId = null, recipientMemberIds = null, secret = process.env.PREVIEW_BUILD_NOTIFICATION_SECRET, fetchImpl = fetch }) {
  if (!secret) {
    console.warn(JSON.stringify({ event: "preview-build-notification-skipped", reason: "secret-not-configured", sourceSha }));
    return [];
  }
  const release = typeof ledger.releaseBySha === "function" ? await ledger.releaseBySha(sourceSha).catch(() => null) : null;
  const classification = release?.classification ?? release?.evidence?.classification?.classification ?? null;
  const results = [];
  for (const platform of ["android", "ios"]) {
    const kind = platform === "android" ? "ANDROID_BUILD" : "IOS_BUILD";
    const fingerprint = release?.evidence?.fingerprints?.[platform];
    const identityKey = fingerprint
      ? nativeBuildIdentityKey(platform, fingerprint)
      : `${sourceSha}:${PREVIEW_IDENTITY.easProjectId}:${platform}:preview`;
    let action = typeof ledger.getNativeBuildActionForRelease === "function"
      ? await ledger.getNativeBuildActionForRelease(sourceSha, platform, fingerprint ?? null)
      : await ledger.getAction(kind, identityKey);
    if (!action?.remote_id || (onlyBuildId && action.remote_id !== onlyBuildId)) continue;

    // The release ledger owns the exact build ID for this source SHA. Resolve that
    // build from EAS immediately before notification rather than selecting a generic
    // "latest" build, which could point developers at an unrelated manual build.
    const build = await eas.viewBuild(action.remote_id);
    if (build?.id !== action.remote_id) {
      throw new Error(`EAS build:view returned a different build than the durable ${platform} ledger action.`);
    }
    const buildState = String(build.status ?? action.state ?? "").toUpperCase();
    if (buildState !== "FINISHED") continue;
    if (String(action.state).toUpperCase() !== "FINISHED" && typeof ledger.recordAction === "function") {
      action = await ledger.recordAction({ sourceSha: action.source_sha ?? sourceSha, kind, identityKey: action.identity_key ?? identityKey, remoteId: action.remote_id, state: "FINISHED", evidence: build });
    }
    const buildPageUrl = exactExpoBuildPageUrl(build);

    let submissionId = null;
    if (platform === "ios") {
      const submission = await ledger.getAction("IOS_SUBMISSION", `ios-submission:${build.id}`);
      if (!submission?.remote_id || String(submission.state).toUpperCase() !== "FINISHED") continue;
      submissionId = submission.remote_id;
      const distribution = typeof ledger.getFinishedIosDistributionForBuild === "function"
        ? await ledger.getFinishedIosDistributionForBuild(build.id)
        : null;
      if (!distribution) continue;
    }

    if (platform === "android" && !build.artifacts?.buildUrl) {
      console.warn(JSON.stringify({ event: "preview-build-notification-skipped", platform, buildId: build.id, reason: "android-apk-artifact-missing" }));
      continue;
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
      // Expo's exact build page is the install source of truth. The raw artifact
      // URL is intentionally not sent to the email service.
      installUrl: platform === "android" ? buildPageUrl : null,
      buildDetailsUrl: buildPageUrl,
      submissionId,
      completedAt: build.completedAt ?? new Date().toISOString(),
      recipientMemberIds: Array.isArray(recipientMemberIds) ? recipientMemberIds : undefined,
    };
    results.push(await postNotification(payload, { secret, fetchImpl }));
  }
  return results;
}

export function nativeBuildIdentityKey(platform, fingerprint) {
  if (!['ios', 'android'].includes(platform) || !/^[a-z0-9._-]{3,128}$/i.test(String(fingerprint ?? ''))) {
    throw new Error('Native build fingerprint identity is malformed.');
  }
  return `native-build:${platform}:${PREVIEW_IDENTITY.easProjectId}:${fingerprint}`;
}

export async function notifyFailedNativeBuilds({ sourceSha, ledger, eas, failureReason, onlyBuildId = null, recipientMemberIds = null, secret = process.env.PREVIEW_BUILD_NOTIFICATION_SECRET, fetchImpl = fetch }) {
  if (!secret) return [];
  const release = typeof ledger.releaseBySha === "function" ? await ledger.releaseBySha(sourceSha).catch(() => null) : null;
  const reason = String(failureReason ?? release?.failure_reason ?? "Preview native delivery failed").slice(0, 500);
  const classification = release?.classification ?? release?.evidence?.classification?.classification ?? null;
  const results = [];
  for (const platform of ["android", "ios"]) {
    const kind = platform === "android" ? "ANDROID_BUILD" : "IOS_BUILD";
    const identityKey = `${sourceSha}:${PREVIEW_IDENTITY.easProjectId}:${platform}:preview`;
    const action = typeof ledger.getNativeBuildActionForRelease === "function"
      ? await ledger.getNativeBuildActionForRelease(sourceSha, platform, release?.evidence?.fingerprints?.[platform] ?? null).catch(() => null)
      : await ledger.getAction(kind, identityKey).catch(() => null);
    if (!action?.remote_id || (onlyBuildId && action.remote_id !== onlyBuildId)) continue;
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
      recipientMemberIds: Array.isArray(recipientMemberIds) ? recipientMemberIds : undefined,
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
  if (!response.ok && response.status !== 207) {
    throw new Error(`Preview build notification endpoint remains retryable after HTTP ${response.status}: ${body.slice(0, 200)}`);
  }
  if (Number(result?.terminal || 0) > 0) {
    console.warn(JSON.stringify({ event: "preview-build-notification-terminal-recipient", platform: payload.platform, status: payload.status, buildId: payload.buildId, terminalRecipients: result.terminal }));
  }
  console.log(JSON.stringify({ event: "preview-build-notification", platform: payload.platform, status: payload.status, buildId: payload.buildId, responseStatus: response.status, recipients: result?.recipients ?? null, alreadyAccepted: result?.alreadyAccepted ?? null }));
  return { platform: payload.platform, status: payload.status, buildId: payload.buildId, responseStatus: response.status, ...result };
}
