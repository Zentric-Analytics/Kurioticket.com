export type HomepageFareRefreshOutcomeKind = "success" | "warning" | "error";

export type HomepageFareRefreshOutcome = {
  kind: HomepageFareRefreshOutcomeKind;
  primaryMessage: string;
  details: string[];
  explanation?: string;
};

export type HomepageFareRefreshOutcomeInput = {
  refreshed: number;
  failed: number;
  unavailable: number;
  retained: number;
  stoppedReason: string;
  globalReadinessStatus: "ready" | "partial" | "not_ready";
  marketsNeedingAnotherRun: Array<{ market: string; needed: boolean }>;
};

export const HOMEPAGE_FARE_REFRESH_OUTCOME_PRESENTATION = {
  success: {
    className: "bg-emerald-50 text-emerald-700",
    role: "status" as const,
  },
  warning: {
    className: "bg-amber-50 text-amber-700",
    role: "status" as const,
  },
  error: {
    className: "bg-rose-50 text-rose-700",
    role: "alert" as const,
  },
};

export function classifyHomepageFareRefreshOutcome(
  counts: HomepageFareRefreshOutcomeInput,
): HomepageFareRefreshOutcome {
  const incompleteStoppedReason =
    counts.stoppedReason !== "completed" && counts.stoppedReason !== "target_met";
  const marketsNeedingAnotherRun = counts.marketsNeedingAnotherRun.filter(
    (market) => market.needed,
  );
  const completedWithIssues =
    counts.failed > 0 ||
    counts.unavailable > 0 ||
    incompleteStoppedReason ||
    counts.globalReadinessStatus !== "ready" ||
    marketsNeedingAnotherRun.length > 0;
  const details = [
    `${counts.refreshed} refreshed`,
    `${counts.failed} failed`,
    `${counts.unavailable} unavailable`,
    `${counts.retained} retained as last-known-good`,
  ];

  if (!completedWithIssues) {
    return {
      kind: "success",
      primaryMessage: "Refresh completed successfully",
      details,
    };
  }

  const explanations: string[] = [];
  if (incompleteStoppedReason) {
    explanations.push(`Stopped: ${formatRefreshStoppedReason(counts.stoppedReason)}`);
  }
  if (counts.globalReadinessStatus !== "ready") {
    explanations.push(
      `Coverage: ${formatGlobalReadinessStatus(counts.globalReadinessStatus)}`,
    );
  }
  if (marketsNeedingAnotherRun.length > 0) {
    explanations.push(
      `Markets needing another run: ${marketsNeedingAnotherRun
        .map((market) => market.market)
        .join(", ")}`,
    );
  }

  return {
    kind: "warning",
    primaryMessage: "Refresh completed with issues",
    details,
    ...(explanations.length ? { explanation: explanations.join(" · ") } : {}),
  };
}

export function createHomepageFareRefreshFailureOutcome(
  safeDetail: string,
): HomepageFareRefreshOutcome {
  return {
    kind: "error",
    primaryMessage: "Refresh failed",
    details: [safeDetail],
  };
}

function formatRefreshStoppedReason(reason: string) {
  switch (reason) {
    case "route_budget_exhausted":
      return "Route budget exhausted";
    case "provider_budget_exhausted":
      return "Provider budget exhausted";
    case "candidate_pool_exhausted":
      return "Candidate pool exhausted";
    case "provider_unavailable_no_offers":
      return "Provider unavailable / no offers";
    case "all_remaining_cooldown_or_unavailable":
      return "Cooldown / unavailable";
    default:
      return "Incomplete run";
  }
}

function formatGlobalReadinessStatus(
  status: HomepageFareRefreshOutcomeInput["globalReadinessStatus"],
) {
  if (status === "partial") return "Partially ready";
  if (status === "not_ready") return "Not ready";
  return "Ready";
}
