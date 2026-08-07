import { PREVIEW_IDENTITY, assertExactSha } from "./config.mjs";

const ACTIVE = new Set(["NEW", "IN_QUEUE", "IN_PROGRESS", "PENDING_CANCEL"]);

export function reconcileBuilds(builds, targetSha, platform = "ios") {
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
      projectId: build.project?.id,
      platform: String(build.platform ?? "").toUpperCase(),
      profile: build.buildProfile,
      bundleIdentifier: build.appIdentifier,
    };
    if (identity.projectId !== PREVIEW_IDENTITY.easProjectId || identity.platform !== platform.toUpperCase() || identity.profile !== "preview" || identity.bundleIdentifier !== PREVIEW_IDENTITY.bundleIdentifier) {
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
