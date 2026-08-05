import { getStagingReleaseReadiness } from "@/lib/stagingSafety";

export function StagingDeploymentBadge() {
  const release = getStagingReleaseReadiness();
  if (!release?.commitSha) return null;

  return (
    <aside
      aria-label="Staging deployment"
      className="fixed bottom-3 right-3 z-50 max-w-[calc(100vw-1.5rem)] rounded-lg border border-violet-300 bg-violet-950/95 px-3 py-2 text-[11px] leading-4 text-violet-50 shadow-lg backdrop-blur"
      data-staging-build="current"
      data-staging-commit={release.commitSha}
    >
      <strong className="block font-bold">Staging build</strong>
      <span className="font-mono">{release.commitSha.slice(0, 12)}</span>
      <span className="mx-1" aria-hidden="true">·</span>
      <span>{release.applicationVersion ?? "unversioned"}</span>
      <span className="mt-1 block font-semibold">WEB DELIVERY VERIFY — WDV-20260805-1</span>
    </aside>
  );
}
