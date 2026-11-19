import type { ProviderOperationalStatus } from "@/services/providerOperationalStatusCore";

type OutcomeCounts = Pick<
  ProviderOperationalStatus,
  "attemptedCalls" | "successCalls" | "failedCalls" | "degradedCalls"
>;

/**
 * Visual proportions use attempted provider calls only. Disabled calls did not
 * reach the provider; they must never appear in the success/failure bar.
 * Keeping all three attempted outcomes makes the proportions reconcile to 100%.
 */
export function getProviderOutcomeWidths(counts: OutcomeCounts) {
  const values = [
    counts.attemptedCalls,
    counts.successCalls,
    counts.failedCalls,
    counts.degradedCalls,
  ];
  if (
    values.some(value => !Number.isSafeInteger(value) || value < 0) ||
    counts.successCalls + counts.failedCalls + counts.degradedCalls !== counts.attemptedCalls
  ) {
    throw new Error("Provider outcome counts must reconcile before visualizing.");
  }

  if (counts.attemptedCalls === 0) {
    return {
      hasAttempts: false,
      successPct: 0,
      failurePct: 0,
      degradedPct: 0,
    };
  }
  return {
    hasAttempts: true,
    successPct: (counts.successCalls / counts.attemptedCalls) * 100,
    failurePct: (counts.failedCalls / counts.attemptedCalls) * 100,
    degradedPct: (counts.degradedCalls / counts.attemptedCalls) * 100,
  };
}
