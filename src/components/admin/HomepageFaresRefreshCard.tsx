"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  buildAdminHomepageFareAllRoutesGroup,
  buildAdminHomepageFareRouteGroups,
  type AdminHomepageFareRouteGroupFilter,
  type AdminHomepageFareMarketRouteGroup,
} from "@/lib/admin/homepageFareRouteGrouping";

const DEFAULT_REFRESH_BUDGET: RefreshBudget = {
  popularVisibleTarget: 8,
  discoverVisibleTarget: 16,
  discoverBackupFreshTarget: 3,
  maxRouteAttemptsPerRun: 288,
  maxProviderCallsPerRun: 288,
  maxRouteAttemptsPerMarket: 36,
  maxDateCandidatesPerRoute: 3,
  lastKnownGoodTtlHours: 168,
};

const DEFAULT_READINESS_COUNTS: RefreshReadinessCounts = {
  freshPopular: 0,
  freshDiscover: 0,
  freshDiscoverDisplayed: 0,
  freshDiscoverBackup: 0,
  publicFreshTarget: 24,
  operationalFreshTarget: 27,
};

const DEFAULT_COUNTS: RefreshCounts = {
  refreshed: 0,
  unavailable: 0,
  failed: 0,
  skipped: 0,
  retained: 0,
  routeAttempts: 0,
  providerCalls: 0,
  stoppedReason: "completed",
  globalReadinessStatus: "not_ready",
  requiredMarkets: [],
  readyMarkets: [],
  underfilledMarkets: [],
  marketReadinessSummary: [],
  marketTargets: {},
  marketTargetMet: {},
  popularFreshByMarket: {},
  discoveryFreshByMarket: {},
  backupFreshByMarket: {},
  candidatePoolSizeByMarket: {},
  routeAttemptsByMarket: {},
  providerCallsByMarket: {},
  failedByMarket: {},
  unavailableByMarket: {},
  skippedCooldownByMarket: {},
  replacementCandidatesUsedByMarket: {},
  timeoutByMarket: {},
  lastKnownGoodByMarket: {},
  targetedMarkets: [],
  visibleGapsAttempted: [],
  replacementsUsed: [],
  marketsNeedingAnotherRun: [],
  underfillCauseByMarket: {},
  readinessBefore: DEFAULT_READINESS_COUNTS,
  readinessAfter: DEFAULT_READINESS_COUNTS,
  refreshBudget: DEFAULT_REFRESH_BUDGET,
};

const DEFAULT_STATUS_SUMMARY: HomepageFareStatusSummary = {
  fresh: 0,
  last_known_good: 0,
  expired: 0,
  unavailable: 0,
  failed: 0,
  missing: 0,
  total: 0,
};

const DEFAULT_HEALTH: HomepageFareHealth = {
  status: "attention",
  label: "Needs attention",
  message:
    "Homepage fares are missing or stale. Refresh fares before relying on homepage prices.",
};

const DEFAULT_DISPLAY_READINESS: DisplayReadiness = {
  ...DEFAULT_HEALTH,
  globalReadinessStatus: "not_ready",
  popularFresh: 0,
  popularTarget: 8,
  discoverFresh: 0,
  discoverVisibleTarget: 16,
  discoverDisplayedFresh: 0,
  discoverBackupFresh: 0,
  publicFreshTarget: 24,
};


const DEFAULT_MARKET_STATUS_FIELDS = {
  globalReadinessStatus: "not_ready" as const,
  requiredMarkets: [],
  marketTargets: {},
  marketTargetMet: {},
  underfilledMarkets: [],
  readyMarkets: [],
  marketReadinessSummary: [],
  popularFreshByMarket: {},
  discoveryFreshByMarket: {},
  backupFreshByMarket: {},
  candidatePoolSizeByMarket: {},
  routeAttemptsByMarket: {},
  providerCallsByMarket: {},
  failedByMarket: {},
  unavailableByMarket: {},
  skippedCooldownByMarket: {},
  replacementCandidatesUsedByMarket: {},
  timeoutByMarket: {},
  lastKnownGoodByMarket: {},
  lastRefreshAt: undefined,
  cronConfigured: false,
  nextExpectedCronRefresh: undefined,
  targetedMarkets: [],
  visibleGapsAttempted: [],
  replacementsUsed: [],
  marketsNeedingAnotherRun: [],
  underfillCauseByMarket: {},
};

const SAFE_HOMEPAGE_FARE_ERROR_CATEGORIES = {
  provider_no_inventory: "no_inventory",
  provider_route_unavailable: "route_unavailable",
  provider_timeout: "timeout",
  provider_network_error: "network",
  provider_auth_error: "auth",
  provider_server_error: "server",
  provider_invalid_response: "invalid_response",
  provider_failed: "failed",
  provider_skipped: "skipped",
  no_fare_returned: "unavailable",
  refresh_error: "failed",
} as const;

type SafeHomepageFareErrorReason =
  keyof typeof SAFE_HOMEPAGE_FARE_ERROR_CATEGORIES;

type SafeHomepageFareErrorCategory =
  (typeof SAFE_HOMEPAGE_FARE_ERROR_CATEGORIES)[SafeHomepageFareErrorReason];

type RefreshStoppedReason =
  | "target_met"
  | "route_budget_exhausted"
  | "provider_budget_exhausted"
  | "completed"
  | "candidate_pool_exhausted"
  | "provider_unavailable_no_offers"
  | "all_remaining_cooldown_or_unavailable";

type GlobalReadinessStatus = "ready" | "partial" | "not_ready";

type MarketReadinessStatus =
  | "ready"
  | "underfilled"
  | "provider_exhausted"
  | "budget_exhausted"
  | "candidate_exhausted"
  | "failed"
  | "cooldown";

type RefreshReadinessCounts = {
  freshPopular: number;
  freshDiscover: number;
  freshDiscoverDisplayed: number;
  freshDiscoverBackup: number;
  publicFreshTarget: number;
  operationalFreshTarget: number;
};

type RefreshBudget = {
  popularVisibleTarget: number;
  discoverVisibleTarget: number;
  discoverBackupFreshTarget: number;
  maxRouteAttemptsPerRun: number;
  maxProviderCallsPerRun: number;
  maxRouteAttemptsPerMarket: number;
  maxDateCandidatesPerRoute: number;
  lastKnownGoodTtlHours: number;
};

type MarketReadiness = {
  market: string;
  marketCode: string;
  marketLabel: string;
  marketGroup: string;
  marketVisibility: "country" | "regional" | "global";
  popularVisibleTarget: number;
  popularVisibleFresh: number;
  discoveryVisibleTarget: number;
  discoveryVisibleFresh: number;
  backupTarget: number;
  backupFresh: number;
  targetMet: boolean;
  status: MarketReadinessStatus;
  underfillReason?: string;
  reason?: string;
  routeAttempts: number;
  providerCalls: number;
  failed: number;
  unavailable: number;
  skippedCooldown: number;
  candidatePoolSize: number;
  freshCount?: number;
  lastKnownGoodCount?: number;
  missingCount?: number;
  timeoutCount?: number;
  replacementCandidatesUsed?: number;
};

type UnderfillCause =
  | "none"
  | "budget_exhausted"
  | "candidate_pool_exhausted"
  | "provider_unavailable_no_offers"
  | "provider_failure"
  | "cooldown"
  | "underfilled";

type VisibleGapAttempt = {
  market: string;
  routeId: string;
  origin: string;
  destination: string;
  section: "popular" | "discovery" | "backup" | "fallback";
  result: RefreshStoppedReason | string;
  replacementForRouteId?: string;
};

type ReplacementUsage = {
  market: string;
  failedRouteId: string;
  replacementRouteId: string;
  origin: string;
  destination: string;
  result: string;
};

type MarketNextRunNeed = {
  market: string;
  needed: boolean;
  reason: UnderfillCause;
};

type RefreshCounts = {
  refreshed: number;
  unavailable: number;
  failed: number;
  skipped: number;
  retained: number;
  routeAttempts: number;
  providerCalls: number;
  stoppedReason: RefreshStoppedReason;
  globalReadinessStatus: GlobalReadinessStatus;
  requiredMarkets: string[];
  readyMarkets: string[];
  underfilledMarkets: MarketReadiness[];
  marketReadinessSummary: MarketReadiness[];
  readinessBefore: RefreshReadinessCounts;
  readinessAfter: RefreshReadinessCounts;
  refreshBudget: RefreshBudget;
  marketTargets: Record<string, MarketReadiness>;
  marketTargetMet: Record<string, boolean>;
  popularFreshByMarket: Record<string, number>;
  discoveryFreshByMarket: Record<string, number>;
  backupFreshByMarket: Record<string, number>;
  candidatePoolSizeByMarket: Record<string, number>;
  routeAttemptsByMarket: Record<string, number>;
  providerCallsByMarket: Record<string, number>;
  failedByMarket: Record<string, number>;
  unavailableByMarket: Record<string, number>;
  skippedCooldownByMarket: Record<string, number>;
  replacementCandidatesUsedByMarket: Record<string, number>;
  timeoutByMarket: Record<string, number>;
  lastKnownGoodByMarket: Record<string, number>;
  targetedMarkets: string[];
  visibleGapsAttempted: VisibleGapAttempt[];
  replacementsUsed: ReplacementUsage[];
  marketsNeedingAnotherRun: MarketNextRunNeed[];
  underfillCauseByMarket: Record<string, UnderfillCause>;
};

type RefreshState = {
  counts: RefreshCounts | null;
  message: string;
  status: "idle" | "success" | "error";
};

type HomepageFareSnapshotStatus =
  | "fresh"
  | "last_known_good"
  | "expired"
  | "unavailable"
  | "failed"
  | "missing";

type HomepageFareRouteSection = "popular" | "discovery" | "backup" | "fallback";

type HomepageFareStatusRoute = {
  id: string;
  market: string;
  label: string;
  origin: string;
  destination: string;
  originCity?: string;
  destinationCity?: string;
  section: HomepageFareRouteSection;
  price?: number;
  currency?: string;
  providerNativePrice?: number;
  providerNativeCurrency?: string;
  provider?: string;
  status: HomepageFareSnapshotStatus;
  providerBacked: boolean;
  cachedProviderBacked?: boolean;
  searchedAt?: string;
  expiresAt?: string;
  errorReason?: SafeHomepageFareErrorReason;
  errorCategory?: SafeHomepageFareErrorCategory;
  replacementCandidateUsed?: string;
};

type HomepageFareStatusSummary = Record<HomepageFareSnapshotStatus, number> & {
  total: number;
};

type HomepageFareHealthStatus = "healthy" | "warning" | "attention";

type HomepageFareHealth = {
  status: HomepageFareHealthStatus;
  label: string;
  message: string;
};

type DisplayReadiness = HomepageFareHealth & {
  globalReadinessStatus: GlobalReadinessStatus;
  popularFresh: number;
  popularTarget: number;
  discoverFresh: number;
  discoverVisibleTarget: number;
  discoverDisplayedFresh: number;
  discoverBackupFresh: number;
  publicFreshTarget: number;
};

type HomepageFareStatusPayload = {
  routes: HomepageFareStatusRoute[];
  summary: HomepageFareStatusSummary;
  health: HomepageFareHealth;
  displayReadiness: DisplayReadiness;
  candidatePoolHealth: HomepageFareStatusSummary;
  refreshBudget: RefreshBudget;
  globalReadinessStatus: GlobalReadinessStatus;
  requiredMarkets: string[];
  marketTargets: Record<string, MarketReadiness>;
  marketTargetMet: Record<string, boolean>;
  underfilledMarkets: MarketReadiness[];
  readyMarkets: string[];
  marketReadinessSummary: MarketReadiness[];
  popularFreshByMarket: Record<string, number>;
  discoveryFreshByMarket: Record<string, number>;
  backupFreshByMarket: Record<string, number>;
  candidatePoolSizeByMarket: Record<string, number>;
  routeAttemptsByMarket: Record<string, number>;
  providerCallsByMarket: Record<string, number>;
  failedByMarket: Record<string, number>;
  unavailableByMarket: Record<string, number>;
  skippedCooldownByMarket: Record<string, number>;
  timeoutByMarket: Record<string, number>;
  lastKnownGoodByMarket: Record<string, number>;
  replacementCandidatesUsedByMarket: Record<string, number>;
  targetedMarkets: string[];
  visibleGapsAttempted: VisibleGapAttempt[];
  replacementsUsed: ReplacementUsage[];
  marketsNeedingAnotherRun: MarketNextRunNeed[];
  underfillCauseByMarket: Record<string, UnderfillCause>;
  lastRefreshAt?: string;
  cronConfigured?: boolean;
  nextExpectedCronRefresh?: string;
};

type StatusLoadState = {
  data: HomepageFareStatusPayload | null;
  loading: boolean;
  error: string;
};

export function HomepageFaresRefreshCard() {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshState, setRefreshState] = useState<RefreshState>({
    counts: null,
    message: "",
    status: "idle",
  });
  const [statusState, setStatusState] = useState<StatusLoadState>({
    data: null,
    loading: true,
    error: "",
  });
  const [selectedMarketCode, setSelectedMarketCode] = useState("ALL");
  const [routeFilter, setRouteFilter] =
    useState<AdminHomepageFareRouteGroupFilter>("all");

  const loadStatus = useCallback(async () => {
    setStatusState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const payload = await fetchHomepageFareStatus();
      setStatusState({ data: payload, loading: false, error: "" });
    } catch {
      setStatusState((current) => ({
        data: current.data,
        loading: false,
        error: "Could not load homepage fare snapshot status.",
      }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchHomepageFareStatus()
      .then((payload) => {
        if (cancelled) return;
        setStatusState({ data: payload, loading: false, error: "" });
      })
      .catch(() => {
        if (cancelled) return;
        setStatusState({
          data: null,
          loading: false,
          error: "Could not load homepage fare snapshot status.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshHomepageFares() {
    if (refreshing) return;

    setRefreshing(true);
    setRefreshState({ counts: null, message: "", status: "idle" });

    try {
      const response = await fetch("/api/admin/homepage-fares/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Homepage fare refresh failed.");
      }

      const payload = await response.json();
      const counts = normalizeRefreshCounts(payload);

      setRefreshState({
        counts,
        message: `Homepage fares refreshed. ${counts.refreshed} refreshed, ${counts.unavailable} unavailable, ${counts.failed} failed, ${counts.retained} retained, ${counts.skipped} skipped. Provider calls used: ${counts.providerCalls}. Stopped: ${formatStoppedReason(counts.stoppedReason)}.`,
        status: "success",
      });
      await loadStatus();
    } catch {
      setRefreshState({
        counts: null,
        message:
          "Could not refresh homepage fares. Please try again or check provider status.",
        status: "error",
      });
    } finally {
      setRefreshing(false);
    }
  }

  const statusPayload = statusState.data ?? {
    routes: [],
    summary: DEFAULT_STATUS_SUMMARY,
    health: DEFAULT_HEALTH,
    displayReadiness: DEFAULT_DISPLAY_READINESS,
    candidatePoolHealth: DEFAULT_STATUS_SUMMARY,
    refreshBudget: DEFAULT_REFRESH_BUDGET,
    ...DEFAULT_MARKET_STATUS_FIELDS,
  };
  const marketRouteGroups = useMemo(
    () =>
      buildAdminHomepageFareRouteGroups({
        routes: statusPayload.routes,
        markets: statusPayload.marketReadinessSummary,
        filter: routeFilter,
      }),
    [routeFilter, statusPayload.marketReadinessSummary, statusPayload.routes],
  );
  const allRoutesGroup = useMemo(
    () => buildAdminHomepageFareAllRoutesGroup(statusPayload.routes, routeFilter),
    [routeFilter, statusPayload.routes],
  );
  const selectedRouteGroup =
    selectedMarketCode === "ALL"
      ? allRoutesGroup
      : marketRouteGroups.find((group) => group.marketCode === selectedMarketCode) ??
        marketRouteGroups[0] ??
        allRoutesGroup;

  const publicMarkets = statusPayload.marketReadinessSummary.filter(
    (market) => !isFallbackMarket(market),
  );
  const fallbackPools = statusPayload.marketReadinessSummary.filter(isFallbackMarket);
  const latestCounts = refreshState.counts;
  const providerCallsUsed = latestCounts?.providerCalls ?? sumCountRecord(statusPayload.providerCallsByMarket);
  const replacementCandidatesUsed = latestCounts
    ? sumCountRecord(latestCounts.replacementCandidatesUsedByMarket)
    : sumCountRecord(statusPayload.replacementCandidatesUsedByMarket);
  const timeoutCount = latestCounts
    ? sumCountRecord(latestCounts.timeoutByMarket)
    : sumCountRecord(statusPayload.timeoutByMarket);
  const marketsNeedingAnotherRun = latestCounts?.marketsNeedingAnotherRun ?? statusPayload.marketsNeedingAnotherRun;

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border bg-gradient-to-br from-white via-slate-50 to-sky-50/60 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-teal-dark">
                Homepage fare operations
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-navy">
                Production readiness dashboard
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Monitor provider-backed homepage fare coverage by public market, fallback pool,
                route health, refresh state, and underfill cause without changing pricing logic.
              </p>
            </div>
            <GlobalReadinessBadge status={statusPayload.displayReadiness.globalReadinessStatus} />
          </div>
        </div>

        <div className="space-y-5 p-5">
          {statusState.error ? (
            <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-danger">
              {statusState.error}
            </p>
          ) : null}

          <DashboardSection
            eyebrow="Homepage fare status summary"
            title="Global readiness at a glance"
            description="Public readiness excludes fallback-only regional and global pools, so internal 0/0 coverage rows do not make the homepage look ready."
          >
            <DisplayReadinessSummary readiness={statusPayload.displayReadiness} />
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              <SummaryMetricCard label="Global homepage readiness" value={formatGlobalReadinessStatus(statusPayload.displayReadiness.globalReadinessStatus)} tone={readinessTone(statusPayload.displayReadiness.globalReadinessStatus)} />
              <SummaryMetricCard label="Fresh provider-backed fares" value={statusPayload.summary.fresh} tone="good" />
              <SummaryMetricCard label="Last-known-good fares" value={statusPayload.summary.last_known_good} tone="info" />
              <SummaryMetricCard label="Missing routes" value={statusPayload.summary.missing} tone={statusPayload.summary.missing ? "warning" : "neutral"} />
              <SummaryMetricCard label="Failed routes" value={statusPayload.summary.failed} tone={statusPayload.summary.failed ? "danger" : "neutral"} />
              <SummaryMetricCard label="Unavailable routes" value={statusPayload.summary.unavailable} tone={statusPayload.summary.unavailable ? "warning" : "neutral"} />
              <SummaryMetricCard label="Timeout count" value={timeoutCount} tone={timeoutCount ? "warning" : "neutral"} />
              <SummaryMetricCard label="Provider calls used" value={providerCallsUsed} />
              <SummaryMetricCard label="Stopped reason" value={latestCounts ? formatStoppedReason(latestCounts.stoppedReason) : "No manual run yet"} />
              <SummaryMetricCard label="Replacement candidates used" value={replacementCandidatesUsed} />
              <SummaryMetricCard label="Markets needing another run" value={marketsNeedingAnotherRun.filter((market) => market.needed).length} tone={marketsNeedingAnotherRun.some((market) => market.needed) ? "warning" : "good"} />
              <SummaryMetricCard label="Last refresh time" value={formatSnapshotTime(statusPayload.lastRefreshAt)} />
              <SummaryMetricCard label="Cron status" value={formatCronStatus(statusPayload)} tone={statusPayload.cronConfigured ? "good" : "warning"} />
            </dl>
          </DashboardSection>

          <RefreshCronPanel
            refreshing={refreshing}
            loading={statusState.loading}
            refreshState={refreshState}
            statusPayload={statusPayload}
            onRefresh={refreshHomepageFares}
            onReload={() => void loadStatus()}
          />

          <MarketReadinessDashboard markets={publicMarkets} onInspectMarket={setSelectedMarketCode} />

          <MarketRouteInspector
            groups={marketRouteGroups}
            allRoutesGroup={allRoutesGroup}
            selectedMarketCode={selectedMarketCode}
            selectedGroup={selectedRouteGroup}
            filter={routeFilter}
            loading={statusState.loading}
            onSelectMarket={setSelectedMarketCode}
            onFilterChange={setRouteFilter}
          />

          <DiagnosticsPanel
            markets={statusPayload.marketReadinessSummary}
            marketsNeedingAnotherRun={marketsNeedingAnotherRun}
            candidatePoolHealth={statusPayload.candidatePoolHealth}
            stoppedReason={latestCounts?.stoppedReason}
          />

          <FallbackPoolsSection pools={fallbackPools} onInspectMarket={setSelectedMarketCode} />

          <RawDebugDetails statusPayload={statusPayload} refreshCounts={latestCounts} />
        </div>
      </Card>
    </section>
  );
}
type RefreshCountMetricKey =
  | "refreshed"
  | "unavailable"
  | "failed"
  | "retained"
  | "skipped";

const COUNT_LABELS: Array<{ key: RefreshCountMetricKey; label: string }> = [
  { key: "refreshed", label: "Refreshed" },
  { key: "unavailable", label: "Unavailable" },
  { key: "failed", label: "Failed" },
  { key: "retained", label: "Retained" },
  { key: "skipped", label: "Skipped" },
];

const STATUS_BADGE_STYLES: Record<HomepageFareSnapshotStatus, string> = {
  fresh: "bg-teal/10 text-teal-dark",
  last_known_good: "bg-sky-50 text-sky-700",
  expired: "bg-amber/10 text-amber",
  unavailable: "bg-slate-100 text-muted",
  failed: "bg-red-50 text-danger",
  missing: "bg-slate-100 text-muted",
};

const HEALTH_SUMMARY_STYLES: Record<HomepageFareHealthStatus, string> = {
  healthy: "border-teal/20 bg-teal/10 text-teal-dark",
  warning: "border-amber/20 bg-amber/10 text-amber",
  attention: "border-red-100 bg-red-50 text-danger",
};


const ROUTE_FILTERS: Array<{
  key: AdminHomepageFareRouteGroupFilter;
  label: string;
}> = [
  { key: "all", label: "All" },
  { key: "ready", label: "Ready" },
  { key: "underfilled", label: "Underfilled" },
  { key: "failed", label: "Failed" },
  { key: "missing", label: "Missing" },
  { key: "stale", label: "Stale" },
  { key: "last_known_good", label: "Last-known-good" },
  { key: "fresh", label: "Fresh" },
  { key: "unavailable", label: "Unavailable" },
];



function GlobalReadinessBadge({ status }: { status: GlobalReadinessStatus }) {
  return (
    <span className={`inline-flex w-fit rounded-full px-3 py-2 text-sm font-extrabold ${summaryToneClass(readinessTone(status))}`}>
      {formatGlobalReadinessStatus(status)}
    </span>
  );
}

function SummaryMetricCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: SummaryTone;
}) {
  return (
    <div className={`rounded-xl border p-3 ${summaryToneClass(tone)}`}>
      <dt className="text-xs font-extrabold uppercase tracking-wide opacity-80">{label}</dt>
      <dd className="mt-1 text-2xl font-extrabold leading-tight">{value}</dd>
    </div>
  );
}

type SummaryTone = "good" | "info" | "warning" | "danger" | "neutral";

function summaryToneClass(tone: SummaryTone) {
  switch (tone) {
    case "good":
      return "border-teal/20 bg-teal/10 text-teal-dark";
    case "info":
      return "border-sky-100 bg-sky-50 text-sky-700";
    case "warning":
      return "border-amber/20 bg-amber/10 text-amber";
    case "danger":
      return "border-red-100 bg-red-50 text-danger";
    case "neutral":
      return "border-border bg-slate-50 text-navy";
  }
}

function CompactDetail({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs font-extrabold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-navy">{value}</dd>
    </div>
  );
}

function isFallbackMarket(market: MarketReadiness) {
  return market.marketVisibility !== "country" || getPublicDisplayTarget(market) === 0;
}

function getPublicDisplayTarget(market: MarketReadiness) {
  return market.popularVisibleTarget + market.discoveryVisibleTarget;
}

function readinessTone(status: GlobalReadinessStatus): SummaryTone {
  if (status === "ready") return "good";
  if (status === "partial") return "warning";
  return "danger";
}

function formatGlobalReadinessStatus(status: GlobalReadinessStatus) {
  switch (status) {
    case "ready":
      return "Ready";
    case "partial":
      return "Partially ready";
    case "not_ready":
      return "Not ready";
  }
}

function formatNextExpectedCron(status: Pick<HomepageFareStatusPayload, "cronConfigured" | "nextExpectedCronRefresh">) {
  if (status.nextExpectedCronRefresh) return status.nextExpectedCronRefresh;
  return status.cronConfigured ? "Configured externally; cadence note not provided" : "Cron is not configured";
}

function buildDiagnostics(
  markets: MarketReadiness[],
  marketsNeedingAnotherRun: MarketNextRunNeed[],
  stoppedReason?: RefreshStoppedReason,
) {
  const diagnostics: string[] = [];

  for (const market of markets) {
    if (market.targetMet && market.status === "ready" && !isFallbackMarket(market)) continue;

    const subject = isFallbackMarket(market)
      ? `${market.marketLabel} fallback`
      : market.marketLabel;
    const targetText = isFallbackMarket(market)
      ? "but has no public display target"
      : `before coverage reached ${market.popularVisibleFresh}/${market.popularVisibleTarget} popular, ${market.discoveryVisibleFresh}/${market.discoveryVisibleTarget} discovery, and ${market.backupFresh}/${market.backupTarget} backup`;
    const reason = market.underfillReason ?? formatMarketStatus(market.status).toLowerCase();
    diagnostics.push(`${subject} is ${formatMarketStatus(market.status).toLowerCase()} because ${reason} ${targetText}.`);
  }

  for (const need of marketsNeedingAnotherRun) {
    if (!need.needed || diagnostics.some((item) => item.startsWith(need.market))) continue;
    diagnostics.push(`${need.market} needs another run because ${formatUnderfillCause(need.reason)}.`);
  }

  if (stoppedReason && stoppedReason !== "completed" && stoppedReason !== "target_met") {
    diagnostics.unshift(`The last executor run stopped because ${formatStoppedReason(stoppedReason).toLowerCase()}.`);
  }

  return diagnostics.slice(0, 12);
}

function DashboardSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">{eyebrow}</p>
        <h3 className="mt-1 text-lg font-extrabold text-navy">{title}</h3>
        <p className="mt-1 max-w-4xl text-sm leading-6 text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function RefreshCronPanel({
  refreshing,
  loading,
  refreshState,
  statusPayload,
  onRefresh,
  onReload,
}: {
  refreshing: boolean;
  loading: boolean;
  refreshState: RefreshState;
  statusPayload: HomepageFareStatusPayload;
  onRefresh: () => void;
  onReload: () => void;
}) {
  const stoppedReason = refreshState.counts
    ? formatStoppedReason(refreshState.counts.stoppedReason)
    : "No manual refresh result in this session";

  return (
    <DashboardSection
      eyebrow="Refresh and cron controls"
      title="Refresh controls"
      description="Run the existing homepage fare coverage executor and reload the current status snapshot from one dedicated operations panel."
    >
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="rounded-xl border border-border bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="accent"
              onClick={onRefresh}
              disabled={refreshing}
              aria-busy={refreshing}
              className="w-full sm:w-auto"
            >
              <RefreshCcw className={refreshing ? "animate-spin" : ""} size={16} />
              {refreshing ? "Refreshing…" : "Refresh homepage fares"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onReload}
              disabled={loading || refreshing}
              aria-busy={loading}
              className="w-full sm:w-auto"
            >
              <RefreshCcw className={loading ? "animate-spin" : ""} size={16} />
              {loading ? "Loading…" : "Reload status"}
            </Button>
          </div>

          {refreshState.message ? (
            <div
              className={
                refreshState.status === "error"
                  ? "mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-danger"
                  : "mt-4 rounded-lg bg-teal/10 p-3 text-sm font-semibold text-teal-dark"
              }
              role="status"
              aria-live="polite"
            >
              {refreshState.message}
            </div>
          ) : null}

          {refreshState.counts ? (
            <dl className="mt-4 grid gap-2 sm:grid-cols-5">
              {COUNT_LABELS.map(({ key, label }) => (
                <MetricCard key={key} label={label} value={refreshState.counts?.[key] ?? 0} />
              ))}
            </dl>
          ) : null}
        </div>

        <dl className="grid gap-2 rounded-xl border border-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-1">
          <CompactDetail label="Last refresh time" value={formatSnapshotTime(statusPayload.lastRefreshAt)} />
          <CompactDetail label="Cron status" value={formatCronStatus(statusPayload)} />
          <CompactDetail label="Cron cadence note" value={statusPayload.nextExpectedCronRefresh ?? "Not configured"} />
          <CompactDetail label="Next expected refresh" value={formatNextExpectedCron(statusPayload)} />
          <CompactDetail label="Current stopped reason" value={stoppedReason} />
        </dl>
      </div>
      {!statusPayload.cronConfigured ? (
        <p className="mt-3 rounded-xl border border-amber/20 bg-amber/10 p-3 text-sm font-semibold text-amber">
          Cron is not configured. Set HOMEPAGE_FARES_CRON_SECRET and schedule POST /api/internal/homepage-fares/refresh before relying on unattended production refreshes.
        </p>
      ) : null}
    </DashboardSection>
  );
}

function MarketReadinessDashboard({
  markets,
  onInspectMarket,
}: {
  markets: MarketReadiness[];
  onInspectMarket: (marketCode: string) => void;
}) {
  return (
    <DashboardSection
      eyebrow="Market readiness"
      title="Public market coverage"
      description="Only public country markets with homepage display targets are shown here. Regional and global fallback pools are separated below."
    >
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {markets.length ? (
          markets.map((market) => (
            <MarketReadinessCard key={market.marketCode} market={market} onInspectMarket={onInspectMarket} />
          ))
        ) : (
          <p className="rounded-xl border border-border bg-slate-50 p-4 text-sm font-semibold text-muted">
            No public market readiness metadata was returned.
          </p>
        )}
      </div>
    </DashboardSection>
  );
}

function MarketReadinessCard({
  market,
  onInspectMarket,
}: {
  market: MarketReadiness;
  onInspectMarket: (marketCode: string) => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-lg font-extrabold text-navy">{market.marketLabel}</h4>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">
            {market.marketCode} · {market.marketGroup}
          </p>
        </div>
        <MarketStatusBadge status={market.status} />
      </div>
      <dl className="mt-4 grid gap-2 sm:grid-cols-3">
        <CoverageMetric label="Popular coverage" current={market.popularVisibleFresh} target={market.popularVisibleTarget} />
        <CoverageMetric label="Discovery coverage" current={market.discoveryVisibleFresh} target={market.discoveryVisibleTarget} />
        <CoverageMetric label="Backup coverage" current={market.backupFresh} target={market.backupTarget} />
      </dl>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <MarketMiniMetric label="Fresh" value={market.freshCount ?? 0} />
        <MarketMiniMetric label="LKG" value={market.lastKnownGoodCount ?? 0} />
        <MarketMiniMetric label="Missing" value={market.missingCount ?? 0} />
        <MarketMiniMetric label="Failed" value={market.failed} />
        <MarketMiniMetric label="Unavailable" value={market.unavailable} />
        <MarketMiniMetric label="Timeout" value={market.timeoutCount ?? 0} />
        <MarketMiniMetric label="Replacements" value={market.replacementCandidatesUsed ?? 0} />
        <MarketMiniMetric label="Provider calls" value={market.providerCalls} />
        <MarketMiniMetric label="Attempts" value={market.routeAttempts} />
        <MarketMiniMetric label="Cooldown" value={market.skippedCooldown} />
        <MarketMiniMetric label="Candidates" value={market.candidatePoolSize} />
      </dl>
      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-muted">
        <strong className="text-navy">Underfill reason:</strong>{" "}
        {market.underfillReason ?? (market.targetMet ? "Coverage target met." : "No executor reason returned.")}
      </div>
      <button
        type="button"
        onClick={() => onInspectMarket(market.marketCode)}
        className="mt-3 text-sm font-extrabold text-teal-dark underline-offset-4 hover:underline"
      >
        Inspect {market.marketCode} routes
      </button>
    </article>
  );
}

function CoverageMetric({ label, current, target }: { label: string; current: number; target: number }) {
  const met = target === 0 ? current === 0 : current >= target;
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <dt className="text-xs font-extrabold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-extrabold text-navy">{current} / {target}</dd>
      <p className={met ? "mt-1 text-xs font-bold text-teal-dark" : "mt-1 text-xs font-bold text-amber"}>
        {met ? "Target met" : "Needs coverage"}
      </p>
    </div>
  );
}

function DiagnosticsPanel({
  markets,
  marketsNeedingAnotherRun,
  candidatePoolHealth,
  stoppedReason,
}: {
  markets: MarketReadiness[];
  marketsNeedingAnotherRun: MarketNextRunNeed[];
  candidatePoolHealth: HomepageFareStatusSummary;
  stoppedReason?: RefreshStoppedReason;
}) {
  const issues = buildDiagnostics(markets, marketsNeedingAnotherRun, stoppedReason);

  return (
    <DashboardSection
      eyebrow="Provider failure / underfill diagnostics"
      title="Why markets are not ready"
      description="Plain-language operational diagnostics from existing executor metadata."
    >
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-2">
          {issues.length ? (
            issues.map((issue) => (
              <p key={issue} className="rounded-xl border border-border bg-slate-50 p-3 text-sm font-semibold leading-6 text-navy">
                {issue}
              </p>
            ))
          ) : (
            <p className="rounded-xl border border-border bg-teal/10 p-3 text-sm font-semibold text-teal-dark">
              No underfill diagnostics are currently reported for public markets.
            </p>
          )}
        </div>
        <dl className="grid gap-2 rounded-xl border border-border bg-white p-4 text-sm">
          <CompactDetail label="Provider budget exhausted" value={stoppedReason === "provider_budget_exhausted" ? "Yes" : "No"} />
          <CompactDetail label="Route budget exhausted" value={stoppedReason === "route_budget_exhausted" ? "Yes" : "No"} />
          <CompactDetail label="Candidate pool exhausted" value={stoppedReason === "candidate_pool_exhausted" ? "Yes" : "No"} />
          <CompactDetail label="Provider unavailable/no offers" value={stoppedReason === "provider_unavailable_no_offers" ? "Yes" : "No"} />
          <CompactDetail label="Candidate pool failed" value={candidatePoolHealth.failed} />
          <CompactDetail label="Candidate pool unavailable" value={candidatePoolHealth.unavailable} />
        </dl>
      </div>
    </DashboardSection>
  );
}

function FallbackPoolsSection({
  pools,
  onInspectMarket,
}: {
  pools: MarketReadiness[];
  onInspectMarket: (marketCode: string) => void;
}) {
  return (
    <DashboardSection
      eyebrow="Fallback pools / internal regional pools"
      title="Fallback-only coverage pools"
      description="Regional and global pools remain available for debugging but are not counted as public homepage-ready markets."
    >
      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {pools.length ? (
          pools.map((pool) => (
            <article key={pool.marketCode} className="rounded-xl border border-dashed border-border bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-navy">{pool.marketLabel}</h4>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">
                    {pool.marketCode} · {pool.marketGroup}
                  </p>
                </div>
                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-extrabold text-muted">
                  Fallback only
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-muted">
                No public display target. Coverage is retained for internal routing, replacement, and regional debugging.
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <MarketMiniMetric label="Fresh" value={pool.freshCount ?? 0} />
                <MarketMiniMetric label="Missing" value={pool.missingCount ?? 0} />
                <MarketMiniMetric label="Failed" value={pool.failed} />
                <MarketMiniMetric label="Provider" value={pool.providerCalls} />
                <MarketMiniMetric label="Attempts" value={pool.routeAttempts} />
                <MarketMiniMetric label="Timeout" value={pool.timeoutCount ?? 0} />
              </dl>
              <button
                type="button"
                onClick={() => onInspectMarket(pool.marketCode)}
                className="mt-3 text-sm font-extrabold text-teal-dark underline-offset-4 hover:underline"
              >
                Inspect fallback routes
              </button>
            </article>
          ))
        ) : (
          <p className="rounded-xl border border-border bg-slate-50 p-4 text-sm font-semibold text-muted">
            No fallback-only pools were returned.
          </p>
        )}
      </div>
    </DashboardSection>
  );
}

function RawDebugDetails({
  statusPayload,
  refreshCounts,
}: {
  statusPayload: HomepageFareStatusPayload;
  refreshCounts: RefreshCounts | null;
}) {
  return (
    <details className="rounded-2xl border border-border bg-white p-4">
      <summary className="cursor-pointer text-sm font-extrabold uppercase tracking-wide text-navy">
        Raw debug / View All details
      </summary>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Configured routes" value={statusPayload.summary.total} />
        <MetricCard label="Candidate pool failed" value={statusPayload.candidatePoolHealth.failed} />
        <MetricCard label="Candidate pool unavailable" value={statusPayload.candidatePoolHealth.unavailable} />
        <MetricCard label="Visible gaps attempted" value={refreshCounts?.visibleGapsAttempted.length ?? 0} />
        <MetricCard label="Immediate replacements attempted" value={refreshCounts?.replacementsUsed.length ?? 0} />
        <MetricCard label="Executor targets" value={refreshCounts ? formatStringList(refreshCounts.targetedMarkets, "none") : "No manual run yet"} />
        <MetricCard label="Markets needing another run" value={refreshCounts ? formatMarketsNeedingRun(refreshCounts.marketsNeedingAnotherRun) : formatMarketsNeedingRun(statusPayload.marketsNeedingAnotherRun)} />
      </div>
    </details>
  );
}

function MarketRouteInspector({
  groups,
  allRoutesGroup,
  selectedMarketCode,
  selectedGroup,
  filter,
  loading,
  onSelectMarket,
  onFilterChange,
}: {
  groups: AdminHomepageFareMarketRouteGroup[];
  allRoutesGroup: AdminHomepageFareMarketRouteGroup;
  selectedMarketCode: string;
  selectedGroup: AdminHomepageFareMarketRouteGroup;
  filter: AdminHomepageFareRouteGroupFilter;
  loading: boolean;
  onSelectMarket: (marketCode: string) => void;
  onFilterChange: (filter: AdminHomepageFareRouteGroupFilter) => void;
}) {
  const marketButtons = [allRoutesGroup, ...groups];

  return (
    <section className="mt-5 rounded-2xl border border-border bg-white p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="text-sm font-extrabold uppercase tracking-wide text-navy">
            Grouped market route inspector
          </h4>
          <p className="mt-1 text-xs leading-5 text-muted">
            View All keeps every configured route available for debugging. Market cards isolate routes by the configured country, regional, or global market.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ROUTE_FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onFilterChange(item.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                filter === item.key
                  ? "border-navy bg-navy text-white"
                  : "border-border bg-white text-navy hover:border-navy/40"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-2 xl:max-h-[720px] xl:overflow-y-auto xl:pr-1">
          {marketButtons.length ? (
            marketButtons.map((group) => (
              <button
                key={group.marketCode}
                type="button"
                onClick={() => onSelectMarket(group.marketCode)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedMarketCode === group.marketCode
                    ? "border-navy bg-slate-50 shadow-sm"
                    : "border-border bg-white hover:border-navy/30 hover:bg-slate-50/70"
                }`}
                aria-expanded={selectedMarketCode === group.marketCode}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-navy">
                      {group.displayName}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted">
                      {group.routes.length} routes · {group.freshFaresCount} fresh · {group.missingRoutesCount} missing
                    </p>
                  </div>
                  <MarketGroupStatusBadge status={group.status} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <MarketMiniMetric label="Popular" value={group.popularCoverageCount} />
                  <MarketMiniMetric label="Discovery" value={group.discoveryCoverageCount} />
                  <MarketMiniMetric label="Backup" value={group.backupCoverageCount} />
                  <MarketMiniMetric label="LKG" value={group.lastKnownGoodFaresCount} />
                  <MarketMiniMetric label="Failed" value={group.failedUnavailableRoutesCount} />
                  <MarketMiniMetric label="Stale" value={group.staleRoutesCount} />
                </dl>
              </button>
            ))
          ) : (
            <p className="rounded-xl border border-border p-4 text-sm font-semibold text-muted">
              {loading ? "Loading market route groups…" : "No route groups match this filter."}
            </p>
          )}
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl border border-border">
          <div className="border-b border-border bg-slate-50 px-4 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h5 className="text-sm font-extrabold text-navy">
                  {selectedGroup.displayName}
                </h5>
                <p className="text-xs font-semibold text-muted">
                  {selectedGroup.marketCode === "ALL" ? "Debug view across all markets" : selectedGroup.marketCode}
                </p>
              </div>
              <MarketGroupStatusBadge status={selectedGroup.status} />
            </div>
          </div>
          <RouteDetailsTable group={selectedGroup} loading={loading} />
        </div>
      </div>
    </section>
  );
}

function MarketMiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/80 p-2 ring-1 ring-slate-100">
      <dt className="font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 font-extrabold text-navy">{value}</dd>
    </div>
  );
}

function RouteDetailsTable({
  group,
  loading,
}: {
  group: AdminHomepageFareMarketRouteGroup;
  loading: boolean;
}) {
  if (!group.routes.length) {
    return (
      <p className="p-4 text-sm font-semibold text-muted">
        {loading ? "Loading homepage fare snapshot status…" : "No routes to display for this market/filter."}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1120px] divide-y divide-border text-left text-sm">
        <thead className="bg-white text-xs font-extrabold uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-3">Market</th>
            <th className="px-3 py-3">Route</th>
            <th className="px-3 py-3">Origin</th>
            <th className="px-3 py-3">Destination</th>
            <th className="px-3 py-3">Section</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Display price</th>
            <th className="px-3 py-3">Provider native</th>
            <th className="px-3 py-3">Provider</th>
            <th className="px-3 py-3">Last refreshed</th>
            <th className="px-3 py-3">Reason / replacement</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {group.routes.map((route) => (
            <tr key={`${group.marketCode}-${route.id}`} className="align-top">
              <td className="px-3 py-3 font-bold text-navy">{route.market}</td>
              <td className="px-3 py-3 font-bold text-navy">{route.label}</td>
              <td className="px-3 py-3 font-semibold text-navy">
                {route.origin}
                {route.originCity ? <span className="block text-xs font-medium text-muted">{route.originCity}</span> : null}
              </td>
              <td className="px-3 py-3 font-semibold text-navy">
                {route.destination}
                {route.destinationCity ? <span className="block text-xs font-medium text-muted">{route.destinationCity}</span> : null}
              </td>
              <td className="px-3 py-3 capitalize text-navy">{route.section}</td>
              <td className="px-3 py-3">
                <StatusBadge status={route.status} />
              </td>
              <td className="px-3 py-3 font-semibold text-navy">{formatRoutePrice(route)}</td>
              <td className="px-3 py-3 font-semibold text-navy">{formatProviderNativePrice(route)}</td>
              <td className="px-3 py-3 text-navy">{route.provider ?? "—"}</td>
              <td className="px-3 py-3 text-xs font-semibold text-muted">
                {formatSnapshotTime(route.searchedAt)}
                {route.expiresAt ? <span className="block">Expires {formatDateTime(route.expiresAt)}</span> : null}
              </td>
              <td className="max-w-xs px-3 py-3 text-xs font-semibold text-muted">
                <SafeFailureReason route={route} />
                {route.replacementCandidateUsed ? (
                  <span className="block">Replacement: {route.replacementCandidateUsed}</span>
                ) : !route.errorReason ? (
                  "—"
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarketGroupStatusBadge({
  status,
}: {
  status: AdminHomepageFareMarketRouteGroup["status"];
}) {
  const styles =
    status === "Ready"
      ? "bg-teal/10 text-teal-dark"
      : status === "Fallback only"
        ? "bg-slate-100 text-muted"
      : status === "Failed"
        ? "bg-red-50 text-danger"
        : status === "Partially ready"
          ? "bg-sky-50 text-sky-700"
          : "bg-amber/10 text-amber";

  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}>
      {status}
    </span>
  );
}

function DisplayReadinessSummary({ readiness }: { readiness: DisplayReadiness }) {
  return (
    <div
      className={`mt-4 rounded-xl border p-4 ${HEALTH_SUMMARY_STYLES[readiness.status]}`}
      role="status"
      aria-live="polite"
    >
      <p className="text-xs font-extrabold uppercase tracking-wide opacity-80">
        Public homepage display readiness
      </p>
      <p className="mt-1 text-2xl font-extrabold">{readiness.label}</p>
      <p className="mt-2 text-sm font-semibold leading-6">
        {readiness.message}
      </p>
    </div>
  );
}

function MarketStatusBadge({ status }: { status: MarketReadinessStatus }) {
  const ready = status === "ready";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
        ready ? "bg-teal/10 text-teal-dark" : "bg-amber/10 text-amber"
      }`}
    >
      {formatMarketStatus(status)}
    </span>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-xl font-extrabold text-navy">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: HomepageFareSnapshotStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STATUS_BADGE_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

async function fetchHomepageFareStatus() {
  const response = await fetch("/api/admin/homepage-fares/status", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Homepage fare status unavailable.");
  }

  return normalizeStatusPayload(await response.json());
}

function normalizeRefreshCounts(payload: unknown): RefreshCounts {
  if (!payload || typeof payload !== "object") return DEFAULT_COUNTS;

  const counts = payload as Partial<Record<keyof RefreshCounts, unknown>>;

  return {
    refreshed: readCount(counts.refreshed),
    unavailable: readCount(counts.unavailable),
    failed: readCount(counts.failed),
    skipped: readCount(counts.skipped),
    retained: readCount(counts.retained),
    routeAttempts: readCount(counts.routeAttempts),
    providerCalls: readCount(counts.providerCalls),
    stoppedReason: readStoppedReason(counts.stoppedReason),
    globalReadinessStatus: readGlobalReadinessStatus(counts.globalReadinessStatus),
    requiredMarkets: readStringArray(counts.requiredMarkets),
    readyMarkets: readStringArray(counts.readyMarkets),
    underfilledMarkets: normalizeMarketReadinessArray(counts.underfilledMarkets),
    marketReadinessSummary: normalizeMarketReadinessArray(counts.marketReadinessSummary),
    marketTargets: normalizeMarketReadinessRecord(counts.marketTargets),
    marketTargetMet: normalizeBooleanRecord(counts.marketTargetMet),
    popularFreshByMarket: normalizeCountRecord(counts.popularFreshByMarket),
    discoveryFreshByMarket: normalizeCountRecord(counts.discoveryFreshByMarket),
    backupFreshByMarket: normalizeCountRecord(counts.backupFreshByMarket),
    candidatePoolSizeByMarket: normalizeCountRecord(counts.candidatePoolSizeByMarket),
    routeAttemptsByMarket: normalizeCountRecord(counts.routeAttemptsByMarket),
    providerCallsByMarket: normalizeCountRecord(counts.providerCallsByMarket),
    failedByMarket: normalizeCountRecord(counts.failedByMarket),
    unavailableByMarket: normalizeCountRecord(counts.unavailableByMarket),
    skippedCooldownByMarket: normalizeCountRecord(counts.skippedCooldownByMarket),
    replacementCandidatesUsedByMarket: normalizeCountRecord(counts.replacementCandidatesUsedByMarket),
    timeoutByMarket: normalizeCountRecord(counts.timeoutByMarket),
    lastKnownGoodByMarket: normalizeCountRecord(counts.lastKnownGoodByMarket),
    targetedMarkets: readStringArray(counts.targetedMarkets),
    visibleGapsAttempted: normalizeVisibleGapAttempts(counts.visibleGapsAttempted),
    replacementsUsed: normalizeReplacementUsages(counts.replacementsUsed),
    marketsNeedingAnotherRun: normalizeMarketsNeedingAnotherRun(counts.marketsNeedingAnotherRun),
    underfillCauseByMarket: normalizeUnderfillCauseRecord(counts.underfillCauseByMarket),
    readinessBefore: normalizeRefreshReadiness(counts.readinessBefore),
    readinessAfter: normalizeRefreshReadiness(counts.readinessAfter),
    refreshBudget: normalizeRefreshBudget(counts.refreshBudget),
  };
}

function normalizeStatusPayload(payload: unknown): HomepageFareStatusPayload {
  if (!payload || typeof payload !== "object") {
    return {
      routes: [],
      summary: DEFAULT_STATUS_SUMMARY,
      health: DEFAULT_HEALTH,
      displayReadiness: DEFAULT_DISPLAY_READINESS,
      candidatePoolHealth: DEFAULT_STATUS_SUMMARY,
      refreshBudget: DEFAULT_REFRESH_BUDGET,
      ...DEFAULT_MARKET_STATUS_FIELDS,
    };
  }

  const candidate = payload as {
    routes?: unknown;
    summary?: unknown;
    health?: unknown;
    displayReadiness?: unknown;
    candidatePoolHealth?: unknown;
    refreshBudget?: unknown;
    globalReadinessStatus?: unknown;
    requiredMarkets?: unknown;
    marketTargets?: unknown;
    marketTargetMet?: unknown;
    underfilledMarkets?: unknown;
    readyMarkets?: unknown;
    marketReadinessSummary?: unknown;
    popularFreshByMarket?: unknown;
    discoveryFreshByMarket?: unknown;
    backupFreshByMarket?: unknown;
    candidatePoolSizeByMarket?: unknown;
    routeAttemptsByMarket?: unknown;
    providerCallsByMarket?: unknown;
    failedByMarket?: unknown;
    unavailableByMarket?: unknown;
    skippedCooldownByMarket?: unknown;
    replacementCandidatesUsedByMarket?: unknown;
    timeoutByMarket?: unknown;
    lastKnownGoodByMarket?: unknown;
    lastRefreshAt?: unknown;
    targetedMarkets?: unknown;
    visibleGapsAttempted?: unknown;
    replacementsUsed?: unknown;
    marketsNeedingAnotherRun?: unknown;
    underfillCauseByMarket?: unknown;
    cronConfigured?: unknown;
    nextExpectedCronRefresh?: unknown;
  };
  const routes = Array.isArray(candidate.routes)
    ? candidate.routes
        .map(normalizeStatusRoute)
        .filter((route): route is HomepageFareStatusRoute => Boolean(route))
    : [];

  const summary = normalizeStatusSummary(candidate.summary, routes.length);

  return {
    routes,
    summary,
    health: normalizeHealth(candidate.health),
    displayReadiness: normalizeDisplayReadiness(candidate.displayReadiness),
    candidatePoolHealth: normalizeStatusSummary(
      candidate.candidatePoolHealth,
      summary.total,
    ),
    refreshBudget: normalizeRefreshBudget(candidate.refreshBudget),
    globalReadinessStatus: readGlobalReadinessStatus(candidate.globalReadinessStatus),
    requiredMarkets: readStringArray(candidate.requiredMarkets),
    marketTargets: normalizeMarketReadinessRecord(candidate.marketTargets),
    marketTargetMet: normalizeBooleanRecord(candidate.marketTargetMet),
    underfilledMarkets: normalizeMarketReadinessArray(candidate.underfilledMarkets),
    readyMarkets: readStringArray(candidate.readyMarkets),
    marketReadinessSummary: normalizeMarketReadinessArray(candidate.marketReadinessSummary),
    popularFreshByMarket: normalizeCountRecord(candidate.popularFreshByMarket),
    discoveryFreshByMarket: normalizeCountRecord(candidate.discoveryFreshByMarket),
    backupFreshByMarket: normalizeCountRecord(candidate.backupFreshByMarket),
    candidatePoolSizeByMarket: normalizeCountRecord(candidate.candidatePoolSizeByMarket),
    routeAttemptsByMarket: normalizeCountRecord(candidate.routeAttemptsByMarket),
    providerCallsByMarket: normalizeCountRecord(candidate.providerCallsByMarket),
    failedByMarket: normalizeCountRecord(candidate.failedByMarket),
    unavailableByMarket: normalizeCountRecord(candidate.unavailableByMarket),
    skippedCooldownByMarket: normalizeCountRecord(candidate.skippedCooldownByMarket),
    replacementCandidatesUsedByMarket: normalizeCountRecord(candidate.replacementCandidatesUsedByMarket),
    timeoutByMarket: normalizeCountRecord(candidate.timeoutByMarket),
    lastKnownGoodByMarket: normalizeCountRecord(candidate.lastKnownGoodByMarket),
    targetedMarkets: readStringArray(candidate.targetedMarkets),
    visibleGapsAttempted: normalizeVisibleGapAttempts(candidate.visibleGapsAttempted),
    replacementsUsed: normalizeReplacementUsages(candidate.replacementsUsed),
    marketsNeedingAnotherRun: normalizeMarketsNeedingAnotherRun(candidate.marketsNeedingAnotherRun),
    underfillCauseByMarket: normalizeUnderfillCauseRecord(candidate.underfillCauseByMarket),
    lastRefreshAt: typeof candidate.lastRefreshAt === "string" ? candidate.lastRefreshAt : undefined,
    cronConfigured: candidate.cronConfigured === true,
    nextExpectedCronRefresh:
      typeof candidate.nextExpectedCronRefresh === "string"
        ? candidate.nextExpectedCronRefresh
        : undefined,
  };
}

function normalizeDisplayReadiness(value: unknown): DisplayReadiness {
  if (!value || typeof value !== "object") return DEFAULT_DISPLAY_READINESS;

  const readiness = value as Partial<Record<keyof DisplayReadiness, unknown>>;
  const health = normalizeHealth(value);

  return {
    ...health,
    globalReadinessStatus: readGlobalReadinessStatus(readiness.globalReadinessStatus),
    popularFresh: readCount(readiness.popularFresh),
    popularTarget: readCount(readiness.popularTarget) || DEFAULT_DISPLAY_READINESS.popularTarget,
    discoverFresh: readCount(readiness.discoverFresh),
    discoverVisibleTarget:
      readCount(readiness.discoverVisibleTarget) ||
      DEFAULT_DISPLAY_READINESS.discoverVisibleTarget,
    discoverDisplayedFresh: readCount(readiness.discoverDisplayedFresh),
    discoverBackupFresh: readCount(readiness.discoverBackupFresh),
    publicFreshTarget:
      readCount(readiness.publicFreshTarget) ||
      DEFAULT_DISPLAY_READINESS.publicFreshTarget,
  };
}

function normalizeRefreshReadiness(value: unknown): RefreshReadinessCounts {
  if (!value || typeof value !== "object") return DEFAULT_READINESS_COUNTS;

  const readiness = value as Partial<Record<keyof RefreshReadinessCounts, unknown>>;

  return {
    freshPopular: readCount(readiness.freshPopular),
    freshDiscover: readCount(readiness.freshDiscover),
    freshDiscoverDisplayed: readCount(readiness.freshDiscoverDisplayed),
    freshDiscoverBackup: readCount(readiness.freshDiscoverBackup),
    publicFreshTarget:
      readCount(readiness.publicFreshTarget) ||
      DEFAULT_READINESS_COUNTS.publicFreshTarget,
    operationalFreshTarget:
      readCount(readiness.operationalFreshTarget) ||
      DEFAULT_READINESS_COUNTS.operationalFreshTarget,
  };
}

function normalizeRefreshBudget(value: unknown): RefreshBudget {
  if (!value || typeof value !== "object") return DEFAULT_REFRESH_BUDGET;

  const budget = value as Partial<Record<keyof RefreshBudget, unknown>>;

  return {
    popularVisibleTarget:
      readCount(budget.popularVisibleTarget) ||
      DEFAULT_REFRESH_BUDGET.popularVisibleTarget,
    discoverVisibleTarget:
      readCount(budget.discoverVisibleTarget) ||
      DEFAULT_REFRESH_BUDGET.discoverVisibleTarget,
    discoverBackupFreshTarget:
      readCount(budget.discoverBackupFreshTarget) ||
      DEFAULT_REFRESH_BUDGET.discoverBackupFreshTarget,
    maxRouteAttemptsPerRun:
      readCount(budget.maxRouteAttemptsPerRun) ||
      DEFAULT_REFRESH_BUDGET.maxRouteAttemptsPerRun,
    maxProviderCallsPerRun:
      readCount(budget.maxProviderCallsPerRun) ||
      DEFAULT_REFRESH_BUDGET.maxProviderCallsPerRun,
    maxRouteAttemptsPerMarket:
      readCount(budget.maxRouteAttemptsPerMarket) ||
      DEFAULT_REFRESH_BUDGET.maxRouteAttemptsPerMarket,
    maxDateCandidatesPerRoute:
      readCount(budget.maxDateCandidatesPerRoute) ||
      DEFAULT_REFRESH_BUDGET.maxDateCandidatesPerRoute,
    lastKnownGoodTtlHours:
      readCount(budget.lastKnownGoodTtlHours) ||
      DEFAULT_REFRESH_BUDGET.lastKnownGoodTtlHours,
  };
}

function normalizeHealth(value: unknown): HomepageFareHealth {
  if (!value || typeof value !== "object") return DEFAULT_HEALTH;

  const health = value as Partial<Record<keyof HomepageFareHealth, unknown>>;
  const status = readHealthStatus(health.status);
  const label = typeof health.label === "string" ? health.label.trim() : "";
  const message =
    typeof health.message === "string" ? health.message.trim() : "";

  if (!status || !label || !message) return DEFAULT_HEALTH;

  return { status, label, message };
}

function readHealthStatus(value: unknown): HomepageFareHealthStatus | undefined {
  return value === "healthy" || value === "warning" || value === "attention"
    ? value
    : undefined;
}

function normalizeStatusRoute(
  value: unknown,
): HomepageFareStatusRoute | undefined {
  if (!value || typeof value !== "object") return undefined;

  const route = value as Partial<Record<keyof HomepageFareStatusRoute, unknown>>;
  const status = readSnapshotStatus(route.status);
  const origin = readCode(route.origin);
  const destination = readCode(route.destination);

  if (!status || !origin || !destination || typeof route.id !== "string") {
    return undefined;
  }

  return {
    id: route.id,
    market: typeof route.market === "string" ? route.market : "GLOBAL",
    label: typeof route.label === "string" ? route.label : `${origin} → ${destination}`,
    origin,
    destination,
    originCity: typeof route.originCity === "string" ? route.originCity : undefined,
    destinationCity:
      typeof route.destinationCity === "string" ? route.destinationCity : undefined,
    section: readRouteSection(route.section),
    price: typeof route.price === "number" && Number.isFinite(route.price) ? route.price : undefined,
    currency: readCode(route.currency),
    providerNativePrice:
      typeof route.providerNativePrice === "number" &&
      Number.isFinite(route.providerNativePrice)
        ? route.providerNativePrice
        : undefined,
    providerNativeCurrency: readCode(route.providerNativeCurrency),
    provider: typeof route.provider === "string" ? route.provider : undefined,
    status,
    providerBacked: route.providerBacked === true,
    cachedProviderBacked: route.cachedProviderBacked === true,
    searchedAt: typeof route.searchedAt === "string" ? route.searchedAt : undefined,
    expiresAt: typeof route.expiresAt === "string" ? route.expiresAt : undefined,
    replacementCandidateUsed:
      typeof route.replacementCandidateUsed === "string"
        ? route.replacementCandidateUsed
        : undefined,
    ...readSafeHomepageFareStatusRouteError({
      status,
      errorReason: route.errorReason,
      errorCategory: route.errorCategory,
    }),
  };
}

function SafeFailureReason({ route }: { route: { status: HomepageFareSnapshotStatus; errorReason?: string; errorCategory?: string } }) {
  if (
    (route.status !== "failed" && route.status !== "unavailable") ||
    !route.errorReason ||
    !route.errorCategory
  ) {
    return null;
  }

  return (
    <p className="mt-1 text-xs font-semibold text-muted">
      Reason: {route.errorReason} · Category: {route.errorCategory}
    </p>
  );
}

function readSafeHomepageFareStatusRouteError({
  status,
  errorReason,
  errorCategory,
}: {
  status: HomepageFareSnapshotStatus;
  errorReason: unknown;
  errorCategory: unknown;
}): Pick<HomepageFareStatusRoute, "errorReason" | "errorCategory"> {
  if (status === "fresh") return {};
  if (!isSafeHomepageFareErrorReason(errorReason)) return {};

  const derivedCategory = SAFE_HOMEPAGE_FARE_ERROR_CATEGORIES[errorReason];
  const safeCategory =
    isSafeHomepageFareErrorCategory(errorCategory) &&
    errorCategory === derivedCategory
      ? errorCategory
      : derivedCategory;

  return {
    errorReason,
    errorCategory: safeCategory,
  };
}

function isSafeHomepageFareErrorCategory(
  value: unknown,
): value is SafeHomepageFareErrorCategory {
  return (
    typeof value === "string" &&
    Object.values(SAFE_HOMEPAGE_FARE_ERROR_CATEGORIES).includes(
      value as SafeHomepageFareErrorCategory,
    )
  );
}

function isSafeHomepageFareErrorReason(
  value: unknown,
): value is SafeHomepageFareErrorReason {
  return (
    typeof value === "string" &&
    value in SAFE_HOMEPAGE_FARE_ERROR_CATEGORIES
  );
}

function normalizeStatusSummary(
  value: unknown,
  fallbackTotal: number,
): HomepageFareStatusSummary {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_STATUS_SUMMARY, total: fallbackTotal };
  }

  const summary = value as Partial<Record<keyof HomepageFareStatusSummary, unknown>>;

  return {
    fresh: readCount(summary.fresh),
    last_known_good: readCount(summary.last_known_good),
    expired: readCount(summary.expired),
    unavailable: readCount(summary.unavailable),
    failed: readCount(summary.failed),
    missing: readCount(summary.missing),
    total: readCount(summary.total) || fallbackTotal,
  };
}

function readStoppedReason(value: unknown): RefreshStoppedReason {
  return value === "target_met" ||
    value === "route_budget_exhausted" ||
    value === "provider_budget_exhausted" ||
    value === "candidate_pool_exhausted" ||
    value === "provider_unavailable_no_offers" ||
    value === "all_remaining_cooldown_or_unavailable" ||
    value === "completed"
    ? value
    : "completed";
}


function formatMarketStatus(status: MarketReadinessStatus) {
  switch (status) {
    case "ready":
      return "Ready";
    case "provider_exhausted":
      return "Provider exhausted";
    case "budget_exhausted":
      return "Budget exhausted";
    case "candidate_exhausted":
      return "Candidate exhausted";
    case "failed":
      return "Failed";
    case "cooldown":
      return "Cooldown";
    case "underfilled":
      return "Underfilled";
  }
}

function formatStoppedReason(reason: RefreshStoppedReason) {
  switch (reason) {
    case "target_met":
      return "Target met";
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
    case "completed":
      return "Completed";
  }
}



function formatStringList(values: string[], emptyLabel: string) {
  return values.length ? values.join(", ") : emptyLabel;
}

function formatMarketsNeedingRun(markets: MarketNextRunNeed[]) {
  const needed = markets.filter((market) => market.needed);

  return needed.length
    ? needed.map((market) => `${market.market} (${formatUnderfillCause(market.reason)})`).join(", ")
    : "none";
}

function formatUnderfillCause(cause: UnderfillCause) {
  switch (cause) {
    case "none":
      return "none";
    case "budget_exhausted":
      return "budget exhausted";
    case "candidate_pool_exhausted":
      return "candidate pool exhausted";
    case "provider_unavailable_no_offers":
      return "provider unavailable/no offers";
    case "provider_failure":
      return "provider failure";
    case "cooldown":
      return "cooldown";
    case "underfilled":
      return "underfilled";
  }
}

function readGlobalReadinessStatus(value: unknown): GlobalReadinessStatus {
  return value === "ready" || value === "partial" || value === "not_ready"
    ? value
    : "not_ready";
}

function readMarketReadinessStatus(value: unknown): MarketReadinessStatus {
  return value === "ready" ||
    value === "underfilled" ||
    value === "provider_exhausted" ||
    value === "budget_exhausted" ||
    value === "candidate_exhausted" ||
    value === "failed" ||
    value === "cooldown"
    ? value
    : "underfilled";
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}


function readUnderfillCause(value: unknown): UnderfillCause {
  return value === "none" ||
    value === "budget_exhausted" ||
    value === "candidate_pool_exhausted" ||
    value === "provider_unavailable_no_offers" ||
    value === "provider_failure" ||
    value === "cooldown" ||
    value === "underfilled"
    ? value
    : "underfilled";
}

function normalizeUnderfillCauseRecord(value: unknown): Record<string, UnderfillCause> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([key, cause]) => [key, readUnderfillCause(cause)]),
  );
}

function normalizeVisibleGapAttempts(value: unknown): VisibleGapAttempt[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const candidate = item as Record<string, unknown>;
    const market = typeof candidate.market === "string" ? candidate.market : "";
    const routeId = typeof candidate.routeId === "string" ? candidate.routeId : "";
    const origin = typeof candidate.origin === "string" ? candidate.origin : "";
    const destination = typeof candidate.destination === "string" ? candidate.destination : "";
    const section = candidate.section === "popular" || candidate.section === "discovery" || candidate.section === "backup" || candidate.section === "fallback"
      ? candidate.section
      : "fallback";

    if (!market || !routeId || !origin || !destination) return [];

    return [{
      market,
      routeId,
      origin,
      destination,
      section,
      result: typeof candidate.result === "string" ? candidate.result : "skipped",
      ...(typeof candidate.replacementForRouteId === "string"
        ? { replacementForRouteId: candidate.replacementForRouteId }
        : {}),
    }];
  });
}

function normalizeReplacementUsages(value: unknown): ReplacementUsage[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const candidate = item as Record<string, unknown>;
    const market = typeof candidate.market === "string" ? candidate.market : "";
    const failedRouteId = typeof candidate.failedRouteId === "string" ? candidate.failedRouteId : "";
    const replacementRouteId = typeof candidate.replacementRouteId === "string" ? candidate.replacementRouteId : "";
    const origin = typeof candidate.origin === "string" ? candidate.origin : "";
    const destination = typeof candidate.destination === "string" ? candidate.destination : "";

    if (!market || !failedRouteId || !replacementRouteId || !origin || !destination) return [];

    return [{
      market,
      failedRouteId,
      replacementRouteId,
      origin,
      destination,
      result: typeof candidate.result === "string" ? candidate.result : "skipped",
    }];
  });
}

function normalizeMarketsNeedingAnotherRun(value: unknown): MarketNextRunNeed[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const candidate = item as Record<string, unknown>;
    const market = typeof candidate.market === "string" ? candidate.market : "";
    if (!market) return [];

    return [{
      market,
      needed: candidate.needed === true,
      reason: readUnderfillCause(candidate.reason),
    }];
  });
}

function normalizeCountRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([key, count]) => [key, readCount(count)]),
  );
}

function normalizeBooleanRecord(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([key, flag]) => [key, flag === true]),
  );
}

function normalizeMarketReadinessArray(value: unknown): MarketReadiness[] {
  return Array.isArray(value)
    ? value
        .map(normalizeMarketReadiness)
        .filter((market): market is MarketReadiness => Boolean(market))
    : [];
}

function normalizeMarketReadinessRecord(
  value: unknown,
): Record<string, MarketReadiness> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, market]) => [
        key,
        normalizeMarketReadiness(
          market && typeof market === "object" && !Array.isArray(market)
            ? { market: key, ...market }
            : market,
        ),
      ] as const)
      .filter((entry): entry is readonly [string, MarketReadiness] => Boolean(entry[1])),
  );
}

function normalizeMarketReadiness(value: unknown): MarketReadiness | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const market = value as Partial<Record<keyof MarketReadiness, unknown>>;
  const marketCode = typeof market.marketCode === "string" ? market.marketCode : undefined;
  if (!marketCode) return undefined;

  const underfillReason =
    typeof market.underfillReason === "string" ? market.underfillReason : undefined;

  return {
    market: typeof market.market === "string" ? market.market : marketCode,
    marketCode,
    marketLabel:
      typeof market.marketLabel === "string" ? market.marketLabel : marketCode,
    marketGroup:
      typeof market.marketGroup === "string" ? market.marketGroup : "Global",
    marketVisibility:
      market.marketVisibility === "country" ||
      market.marketVisibility === "regional" ||
      market.marketVisibility === "global"
        ? market.marketVisibility
        : "global",
    popularVisibleTarget: readCount(market.popularVisibleTarget),
    popularVisibleFresh: readCount(market.popularVisibleFresh),
    discoveryVisibleTarget: readCount(market.discoveryVisibleTarget),
    discoveryVisibleFresh: readCount(market.discoveryVisibleFresh),
    backupTarget: readCount(market.backupTarget),
    backupFresh: readCount(market.backupFresh),
    targetMet: market.targetMet === true,
    status: readMarketReadinessStatus(market.status),
    ...(underfillReason ? { underfillReason, reason: underfillReason } : {}),
    routeAttempts: readCount(market.routeAttempts),
    providerCalls: readCount(market.providerCalls),
    failed: readCount(market.failed),
    unavailable: readCount(market.unavailable),
    skippedCooldown: readCount(market.skippedCooldown),
    candidatePoolSize: readCount(market.candidatePoolSize),
    freshCount: readCount(market.freshCount),
    lastKnownGoodCount: readCount(market.lastKnownGoodCount),
    missingCount: readCount(market.missingCount),
    timeoutCount: readCount(market.timeoutCount),
    replacementCandidatesUsed: readCount(market.replacementCandidatesUsed),
  };
}


function readRouteSection(value: unknown): HomepageFareRouteSection {
  return value === "popular" ||
    value === "discovery" ||
    value === "backup" ||
    value === "fallback"
    ? value
    : "fallback";
}

function readSnapshotStatus(
  value: unknown,
): HomepageFareSnapshotStatus | undefined {
  return value === "fresh" ||
    value === "last_known_good" ||
    value === "expired" ||
    value === "unavailable" ||
    value === "failed" ||
    value === "missing"
    ? value
    : undefined;
}

function readCode(value: unknown) {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value) ? value : undefined;
}

function sumCountRecord(record: Record<string, number>) {
  return Object.values(record).reduce((total, value) => total + value, 0);
}

function readCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function formatRoutePrice(route: { status: HomepageFareSnapshotStatus; price?: number; currency?: string }) {
  if (
    (route.status !== "fresh" && route.status !== "last_known_good") ||
    !route.price ||
    !route.currency
  ) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: route.currency,
    maximumFractionDigits: 0,
  }).format(route.price);
}

function formatProviderNativePrice(route: { providerNativePrice?: number; providerNativeCurrency?: string }) {
  if (!route.providerNativePrice || !route.providerNativeCurrency) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: route.providerNativeCurrency,
    maximumFractionDigits: 0,
  }).format(route.providerNativePrice);
}

function formatSnapshotTime(value?: string) {
  if (!value) return "No snapshot yet";

  return `Searched ${formatDateTime(value)}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatCronStatus(status: Pick<HomepageFareStatusPayload, "cronConfigured" | "nextExpectedCronRefresh">) {
  if (!status.cronConfigured) return "Not configured";
  return status.nextExpectedCronRefresh ? "Configured" : "Configured (cadence note missing)";
}
