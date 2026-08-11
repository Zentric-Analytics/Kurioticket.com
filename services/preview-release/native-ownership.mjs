import { PREVIEW_IDENTITY } from "./config.mjs";

export class NativeOwnershipViolation extends Error {
  constructor(message, evidence = {}) {
    super(message);
    this.name = "NativeOwnershipViolation";
    this.evidence = evidence;
  }
}

export function validateAdoptableBuild({ build, platform, sourceSha, fingerprint, existingAction = null, delivered = null }) {
  const problems = [];
  const actualPlatform = String(build?.platform ?? "").toLowerCase();
  const projectId = build?.project?.id ?? build?.projectId;
  const profile = build?.buildProfile;
  const applicationId = build?.applicationIdentifier ?? build?.appIdentifier ?? build?.sourceAttestedAppIdentifier;
  const actualFingerprint = build?.fingerprint?.hash ?? build?.fingerprintHash;
  const buildNumber = String(build?.appBuildVersion ?? "");
  const artifactUrl = build?.artifacts?.buildUrl ?? build?.artifacts?.applicationArchiveUrl;

  if (projectId !== PREVIEW_IDENTITY.easProjectId) problems.push("project");
  if (actualPlatform !== platform) problems.push("platform");
  if (profile !== "preview") problems.push("profile");
  if (applicationId !== PREVIEW_IDENTITY.bundleIdentifier) problems.push("application-identifier");
  if (build?.gitCommitHash !== sourceSha) problems.push("source-sha");
  if (actualFingerprint !== fingerprint) problems.push("native-fingerprint");
  if (!/^\d+(?:\.\d+){1,3}$/.test(String(build?.appVersion ?? ""))) problems.push("app-version");
  if (!/^\d+$/.test(buildNumber)) problems.push("build-number");
  if (!["IN_QUEUE", "IN_PROGRESS", "FINISHED"].includes(String(build?.status ?? "").toUpperCase())) problems.push("status");
  if (!isExactBuildArtifact(artifactUrl, platform)) problems.push("artifact");
  if (existingAction?.remote_id && existingAction.remote_id !== build?.id) problems.push("durable-remote-id-conflict");
  if (delivered && String(delivered.build_number) === buildNumber && delivered.eas_build_id !== build?.id) problems.push("delivered-build-number-conflict");

  if (problems.length) {
    throw new NativeOwnershipViolation(`Unowned ${platform} Preview build failed strict adoption: ${problems.join(", ")}.`, {
      platform, sourceSha, buildId: build?.id ?? null, buildNumber: buildNumber || null, problems,
    });
  }
  return Object.freeze({
    platform, sourceSha, fingerprint, buildId: build.id, buildNumber,
    state: String(build.status).toUpperCase(), evidence: build,
  });
}

export function validateAdoptableIosSubmission({ submission, buildId }) {
  const problems = [];
  if (submission?.platform !== "IOS") problems.push("platform");
  if (submission?.app?.id !== PREVIEW_IDENTITY.easProjectId) problems.push("project");
  if (submission?.submittedBuild?.id !== buildId) problems.push("submitted-build");
  if (!["AWAITING_BUILD", "IN_QUEUE", "IN_PROGRESS", "FINISHED"].includes(String(submission?.status ?? "").toUpperCase())) problems.push("status");
  if (problems.length) throw new NativeOwnershipViolation(`Unowned iOS submission failed strict adoption: ${problems.join(", ")}.`, { buildId, submissionId: submission?.id ?? null, problems });
  return submission;
}

export function unexpectedBuilds(builds, ownedRemoteIds) {
  const owned = new Set(ownedRemoteIds.filter(Boolean));
  return builds.filter((build) => build?.id && !owned.has(build.id));
}

function isExactBuildArtifact(value, platform) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return platform === "android" ? url.pathname.endsWith(".apk") : url.pathname.endsWith(".ipa");
  } catch { return false; }
}
