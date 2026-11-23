import { getStagingReleaseReadiness } from "@/lib/stagingSafety";

export function StagingDeploymentBadge() {
  const release = getStagingReleaseReadiness();
  if (!release?.commitSha) return null;

  return (
    <aside
      aria-label="Staging deployment"
      hidden
      data-staging-build="current"
      data-staging-commit={release.commitSha}
    >
      <strong className="block font-bold">Kurioticket staging</strong>
      <span className="sr-only">Staging build</span>
      <span className="font-mono">{release.commitSha.slice(0, 12)}</span>
      <span className="mx-1" aria-hidden="true">&middot;</span>
      <span>{release.applicationVersion ?? "unversioned"}</span>
    </aside>
  );
}
