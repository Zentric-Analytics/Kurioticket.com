import { PREVIEW_IDENTITY, assertExactSha } from "./config.mjs";

const ACTIVE = new Set(["NEW", "IN_QUEUE", "IN_PROGRESS", "PENDING_CANCEL"]);

export function reconcileBuilds(builds, targetSha, platform = "ios", expectedRuntime = PREVIEW_IDENTITY.runtime) {
  assertExactSha(targetSha, "EAS target SHA");
  if (!Array.isArray(builds)) return { decision: "MALFORMED_RESPONSE", matches: [] };
  const exact = [];
  for (const build of builds) {
    if (!build || typeof build !== "object" || typeof build.id !== "string" || typeof build.status !== "string") {
      return { decision: "MALFORMED_RESPONSE", matches: [] };
    }
    const sha = build.gitCommitHash ?? build.gitCommit?.hash;
    if (sha !== targetSha) continue;
    const identity = {
      projectId: build.project?.id ?? build.sourceAttestedProjectId,
      platform: String(build.platform ?? build.sourceAttestedPlatform ?? "").toUpperCase(),
      profile: build.buildProfile ?? build.sourceAttestedBuildProfile,
      bundleIdentifier: build.appIdentifier ?? build.sourceAttestedAppIdentifier,
      runtimeVersion: build.runtimeVersion ?? build.sourceAttestedRuntimeVersion,
      channel: build.channel ?? build.sourceAttestedChannel,
    };
    if (identity.projectId !== PREVIEW_IDENTITY.easProjectId || identity.platform !== platform.toUpperCase() || identity.profile !== "preview" || identity.bundleIdentifier !== PREVIEW_IDENTITY.bundleIdentifier || identity.runtimeVersion !== expectedRuntime || identity.channel !== PREVIEW_IDENTITY.channel) {
      return { decision: "CONFLICT", matches: [build.id], identity };
    }
    exact.push(build);
  }
  if (!exact.length) return { decision: "NONE", matches: [] };
  if (exact.length > 1) return { decision: "CONFLICT", matches: exact.map(({ id }) => id).sort() };
  const [build] = exact;
  const status = build.status.toUpperCase().replaceAll("-", "_");
  if (ACTIVE.has(status)) return { decision: "ACTIVE_MATCH", build };
  if (status === "FINISHED") return { decision: "FINISHED_MATCH", build };
  if (["ERRORED", "FAILED"].includes(status)) return { decision: "FAILED_MATCH", build };
  if (status === "CANCELED") return { decision: "CANCELED_MATCH", build };
  return { decision: "MALFORMED_RESPONSE", matches: [build.id] };
}

export function reconcileSubmission(build) {
  if (!build || typeof build !== "object") return { state: "UNKNOWN" };
  const values = [build.submission, ...(Array.isArray(build.submissions) ? build.submissions : [])].filter(Boolean);
  if (values.length > 1) return { state: "CONFLICT", ids: values.map((item) => item.id).filter(Boolean) };
  if (!values.length) return { state: build.status === "FINISHED" ? "NOT_CREATED" : "UNKNOWN" };
  const [submission] = values;
  const raw = String(submission.status ?? "").toUpperCase().replaceAll("-", "_");
  if (["NEW", "CREATED"].includes(raw)) return { state: "CREATED", submission };
  if (["IN_QUEUE", "IN_PROGRESS"].includes(raw)) return { state: "IN_PROGRESS", submission };
  if (raw === "FINISHED") return { state: "FINISHED", submission };
  if (["ERRORED", "FAILED", "CANCELED"].includes(raw)) return { state: "FAILED", submission };
  return { state: "UNKNOWN", submission };
}

export function reconcileSubmissionHistory(submissions, buildId) {
  if (!Array.isArray(submissions) || typeof buildId !== "string" || !buildId) return { state: "UNKNOWN" };
  const exact = [];
  for (const submission of submissions) {
    if (!submission || typeof submission !== "object" || typeof submission.id !== "string" || typeof submission.status !== "string") return { state: "UNKNOWN" };
    if (String(submission.platform ?? "").toUpperCase() !== "IOS") return { state: "UNKNOWN" };
    if (submission.app?.id !== PREVIEW_IDENTITY.easProjectId) return { state: "UNKNOWN" };
    if (submission.submittedBuild == null) continue;
    if (typeof submission.submittedBuild !== "object" || typeof submission.submittedBuild.id !== "string") return { state: "UNKNOWN" };
    if (submission.submittedBuild.id === buildId) exact.push(submission);
  }
  if (exact.length > 1) return { state: "CONFLICT", ids: exact.map(({ id }) => id).sort() };
  if (!exact.length) return { state: "NOT_CREATED" };
  return reconcileSubmission({ status: "FINISHED", submission: exact[0] });
}

