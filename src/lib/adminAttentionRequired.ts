import type { ProviderOperationalStatus } from "@/services/providerOperationalStatusCore";

type Provider = Pick<ProviderOperationalStatus, "operationalState">;
type Support = { open: number; waitingOnTeam: number; waitingOnUser: number };
type Deletions = { pending: number; readyForReview: number };

/** Actionable queues are not interchangeable with waiting states or provider setup. */
export function summarizeAttentionRequired(input: {
  providers: readonly Provider[];
  support: Support;
  deletions: Deletions;
}) {
  return {
    // Health problems are observed over the provider snapshot's own 24-hour window.
    providerHealthIssues: input.providers.filter(provider =>
      provider.operationalState === "FAILING" || provider.operationalState === "DEGRADED",
    ).length,
    // A not-ready integration needs setup work; it is not evidence of failed traffic.
    providerSetupIssues: input.providers.filter(provider =>
      provider.operationalState === "NOT_READY",
    ).length,
    // OPEN tickets need triage; WAITING_ON_TEAM requires internal follow-up.
    supportNeedsAction: input.support.open + input.support.waitingOnTeam,
    supportWaitingOnUser: input.support.waitingOnUser,
    // PENDING requests are not automatically ready for administrator review.
    deletionReviews: input.deletions.readyForReview,
    deletionPending: input.deletions.pending,
  };
}

/** Global incident counts complement the dedicated provider and support queues.
 * Acknowledged incidents remain active until their underlying condition clears.
 * Source exclusions avoid counting the same provider/support problem twice.
 */
export function summarizePlatformIncidents(
  alerts: readonly { source: string; severity: "CRITICAL" | "WARNING" }[],
) {
  const incidents = alerts.filter(alert => alert.source !== "PROVIDER" && alert.source !== "SUPPORT");
  return {
    total: incidents.length,
    critical: incidents.filter(alert => alert.severity === "CRITICAL").length,
    warning: incidents.filter(alert => alert.severity === "WARNING").length,
  };
}
