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
