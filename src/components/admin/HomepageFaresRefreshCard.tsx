"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject, type ReactNode } from "react";
import { ChevronDown, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";
import {
  ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE,
  buildAdminHomepageFareAllRoutesGroup,
  buildAdminHomepageFareRouteGroups,
  normalizeAdminHomepageFareMarketCode,
  paginateAdminHomepageFareRoutes,
  resolveAdminHomepageFareSelectedRouteGroup,
  splitAdminHomepageFareMarketRouteGroups,
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

type PublicPriceDiagnosis =
  | "fresh_available"
  | "last_known_good_used"
  | "last_known_good_failed_safety_check"
  | "fresh_missing"
  | "last_known_good_missing"
  | "exact_route_mismatch"
  | "provider_failed"
  | "provider_unavailable"
  | "no_provider_backed_fare_ever"
  | "price_invalid";

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
  publicPriceDiagnosis?: PublicPriceDiagnosis;
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
  dataAvailable: boolean;
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
  publicPriceDiagnostics: Record<PublicPriceDiagnosis, number>;
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
  const [selectedRouteScope, setSelectedRouteScope] = useState<string>(ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE);
  const [routePage, setRoutePage] = useState(1);
  // Stable route-inspector anchor: only explicit Inspect actions navigate here.
  const routeInspectorRef = useRef<HTMLDivElement>(null);
  const [routeFilter, setRouteFilter] =
    useState<AdminHomepageFareRouteGroupFilter>("all");
  const selectRouteScope = useCallback((scope: string) => {
    setRoutePage(1);
    setSelectedRouteScope(
      scope
        ? scope === ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE
          ? ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE
          : normalizeAdminHomepageFareMarketCode(scope)
        : ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE,
    );
  }, []);
  const selectRouteFilter = useCallback((filter: AdminHomepageFareRouteGroupFilter) => {
    setRoutePage(1);
    setRouteFilter(filter);
  }, []);

  const inspectMarketRoutes = useCallback((marketCode: string) => {
    selectRouteScope(marketCode);
    // An explicit click navigates even when this market is already selected.
    // Dropdown and status-filter changes must never automatically scroll.
    routeInspectorRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }, [selectRouteScope]);

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
        throw new Error(await buildSafeRefreshFailureMessage(response));
      }

      const payload = await response.json();
      const counts = normalizeRefreshCounts(payload);

      setRefreshState({
        counts,
        message: `Manual fare refresh finished. ${counts.refreshed} refreshed, ${counts.unavailable} unavailable, ${counts.failed} failed, ${counts.retained} retained, ${counts.skipped} skipped. Provider calls used: ${counts.providerCalls}. Stopped: ${formatStoppedReason(counts.stoppedReason)}.`,
        status: "success",
      });
      await loadStatus();
    } catch (error) {
      setRefreshState({
        counts: null,
        message:
          error instanceof Error
            ? error.message
            : "Could not refresh homepage fares. Please try again or check provider status.",
        status: "error",
      });
    } finally {
      setRefreshing(false);
    }
  }

  const statusPayload = statusState.data ?? {
    dataAvailable: false,
    routes: [],
    summary: DEFAULT_STATUS_SUMMARY,
    health: DEFAULT_HEALTH,
    displayReadiness: DEFAULT_DISPLAY_READINESS,
    candidatePoolHealth: DEFAULT_STATUS_SUMMARY,
    refreshBudget: DEFAULT_REFRESH_BUDGET,
    publicPriceDiagnostics: createEmptyPublicPriceDiagnostics(),
    ...DEFAULT_MARKET_STATUS_FIELDS,
  };
  const marketRouteGroups = useMemo(
    () =>
      buildAdminHomepageFareRouteGroups({
        routes: statusPayload.routes,
        markets: statusPayload.marketReadinessSummary,
        filter: routeFilter,
        includeEmptyGroups: true,
      }),
    [routeFilter, statusPayload.marketReadinessSummary, statusPayload.routes],
  );
  const allRoutesGroup = useMemo(
    () => buildAdminHomepageFareAllRoutesGroup(statusPayload.routes, routeFilter),
    [routeFilter, statusPayload.routes],
  );
  const selectedRouteGroup = resolveAdminHomepageFareSelectedRouteGroup({
    selectedScope: selectedRouteScope,
    marketRouteGroups,
    allRoutesGroup,
  });
  const { publicGroups: publicRouteGroups } =
    splitAdminHomepageFareMarketRouteGroups(marketRouteGroups);

  const publicMarkets = statusPayload.marketReadinessSummary.filter(
    (market) => !isFallbackMarket(market),
  );
  const fallbackPools = statusPayload.marketReadinessSummary.filter(isFallbackMarket);
  const latestCounts = refreshState.counts;
  const initialStatusLoading = statusState.loading && !statusState.data;
  const telemetryUnavailable = !initialStatusLoading && !statusPayload.dataAvailable;
  const marketsNeedingAnotherRun = latestCounts?.marketsNeedingAnotherRun ?? statusPayload.marketsNeedingAnotherRun;

  return (
    <section className="min-w-0 bg-white text-[#020617]">
          {statusState.error ? (
            <p className="mb-3 border-l-[3px] border-rose-500 py-1 pl-3 text-[13px] font-medium text-rose-700">
              {statusState.error}
            </p>
          ) : null}
          {telemetryUnavailable ? (
            <p className="mb-3 border-l-[3px] border-rose-500 py-1 pl-3 text-[13px] font-medium text-rose-700">
              Telemetry unavailable. Snapshot data could not be read; coverage counts are hidden.
            </p>
          ) : null}

      <section aria-labelledby="homepage-fare-readiness-heading" className="pb-5 pt-5">
        <h2 id="homepage-fare-readiness-heading" className="text-[15px] font-semibold text-[#020617]">
          Readiness overview
        </h2>

            {initialStatusLoading ? (
              <p className="mt-3 text-[13px] leading-5 text-[#475569]">
                Loading homepage fare snapshot status…
              </p>
            ) : statusPayload.dataAvailable ? (
              <DisplayReadinessSummary readiness={statusPayload.displayReadiness} />
            ) : null}

        <div
          role="region"
          aria-label="Readiness metrics (scroll horizontally on narrow screens)"
          tabIndex={0}
          className="mt-4 max-w-full overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]"
        >
          <dl aria-label="Fare readiness metrics" className="grid min-w-[920px] grid-cols-5 gap-px border-y border-[#D8E1EC] bg-[#E7ECF5]">
              <SummaryMetricCard label="Fresh fares" value={statusPayload.dataAvailable ? statusPayload.summary.fresh : "Unavailable"} tone={statusPayload.dataAvailable ? "good" : "danger"} />
              <SummaryMetricCard label="Last-known-good" value={statusPayload.dataAvailable ? statusPayload.summary.last_known_good : "Unavailable"} tone={statusPayload.dataAvailable ? "info" : "danger"} />
              <SummaryMetricCard label="Missing routes" value={statusPayload.dataAvailable ? statusPayload.summary.missing : "Unavailable"} tone={!statusPayload.dataAvailable ? "danger" : statusPayload.summary.missing ? "warning" : "neutral"} />
              <SummaryMetricCard label="Failed / unavailable" value={statusPayload.dataAvailable ? statusPayload.summary.failed + statusPayload.summary.unavailable : "Unavailable"} tone={!statusPayload.dataAvailable ? "danger" : statusPayload.summary.failed + statusPayload.summary.unavailable ? "warning" : "neutral"} />
              <SummaryMetricCard label="Markets needing attention" value={statusPayload.dataAvailable ? marketsNeedingAnotherRun.filter((market) => market.needed).length : "Unavailable"} tone={!statusPayload.dataAvailable ? "danger" : marketsNeedingAnotherRun.some((market) => market.needed) ? "warning" : "good"} />
          </dl>
        </div>
          </section>

      <RefreshCronPanel
            refreshing={refreshing}
            loading={statusState.loading}
            refreshState={refreshState}
            statusPayload={statusPayload}
            operationsAvailable={statusPayload.dataAvailable}
            initialStatusLoading={initialStatusLoading}
            onRefresh={refreshHomepageFares}
            onReload={() => void loadStatus()}
          />

      {statusPayload.dataAvailable ? (
            <>
              <MarketReadinessDashboard
                markets={publicMarkets}
                marketsNeedingAnotherRun={marketsNeedingAnotherRun}
                selectedRouteScope={selectedRouteScope}
                onInspectMarket={inspectMarketRoutes}
              />

              <MarketRouteInspector
                publicGroups={publicRouteGroups}
                selectedRouteScope={selectedRouteScope}
                selectedGroup={selectedRouteGroup}
                filter={routeFilter}
                loading={statusState.loading}
                onSelectMarket={selectRouteScope}
                routePage={routePage}
                onPreviousPage={() => setRoutePage((page) => Math.max(1, page - 1))}
                onNextPage={() => setRoutePage((page) => page + 1)}
                onFilterChange={selectRouteFilter}
                routeInspectorRef={routeInspectorRef}
              />

              <AdvancedDiagnostics
                pools={fallbackPools}
                selectedRouteScope={selectedRouteScope}
                onInspectMarket={inspectMarketRoutes}
                statusPayload={statusPayload}
                refreshCounts={latestCounts}
              />
            </>
          ) : null}
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


// Individual route snapshot statuses only. "Ready" and "Underfilled" are
// overlapping aggregate filters, not distinct route states. The internal
// "stale" filter matches stored "expired" route snapshots.
const ROUTE_FILTERS: Array<{
  key: AdminHomepageFareRouteGroupFilter;
  label: string;
}> = [
  { key: "all", label: "All statuses" },
  { key: "fresh", label: "Fresh" },
  { key: "last_known_good", label: "Last-known-good" },
  { key: "stale", label: "Expired" },
  { key: "missing", label: "Missing" },
  { key: "failed", label: "Failed" },
  { key: "unavailable", label: "Unavailable" },
];



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
    <div className="min-h-[88px] min-w-0 bg-white px-3 py-4 sm:px-4 xl:px-5">
      <dt className="flex min-h-5 items-center gap-1.5 whitespace-nowrap text-[11px] font-medium leading-5 text-[#64748B] lg:gap-2 lg:text-[12px]">
        <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${summaryToneDotClass(tone)}`} />
        <span>{label}</span>
      </dt>
      <dd className="mt-2 break-words text-[24px] font-medium leading-7 tracking-[-0.03em] tabular-nums text-[#020617]">{value}</dd>
    </div>
  );
}

type SummaryTone = "good" | "info" | "warning" | "danger" | "neutral";

function summaryToneDotClass(tone: SummaryTone) {
  switch (tone) {
    case "good":
      return "bg-teal";
    case "info":
      return "bg-sky-500";
    case "warning":
      return "bg-amber";
    case "danger":
      return "bg-danger";
    case "neutral":
      return "bg-slate-300";
  }
}

function CompactDetail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-[#64748B]">{label}</dt>
      <dd className="mt-1 break-words text-[13px] font-medium leading-5 text-[#0F172A]">{value}</dd>
    </div>
  );
}

function isFallbackMarket(market: MarketReadiness) {
  return market.marketVisibility !== "country" || getPublicDisplayTarget(market) === 0;
}

function getPublicDisplayTarget(market: MarketReadiness) {
  return market.popularVisibleTarget + market.discoveryVisibleTarget;
}

function DashboardSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-[#D8E1EC] pb-5 pt-5">
      <div>
        <h3 className="text-[15px] font-semibold text-[#020617]">{title}</h3>
        {description ? <p className="mt-1 max-w-4xl text-[13px] leading-5 text-[#475569]">{description}</p> : null}
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
  operationsAvailable,
  initialStatusLoading,
  onRefresh,
  onReload,
}: {
  refreshing: boolean;
  loading: boolean;
  refreshState: RefreshState;
  statusPayload: HomepageFareStatusPayload;
  operationsAvailable: boolean;
  initialStatusLoading: boolean;
  onRefresh: () => void;
  onReload: () => void;
}) {
  return (
    <DashboardSection title="Refresh operations">
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Button
          type="button"
          variant="accent"
          onClick={onRefresh}
          disabled={refreshing || !operationsAvailable}
          aria-busy={refreshing}
          className="w-full sm:w-auto"
        >
          <RefreshCcw className={refreshing ? "animate-spin" : ""} size={16} />
          {refreshing
            ? "Refreshing…"
            : initialStatusLoading
              ? "Loading status…"
              : operationsAvailable
                ? "Run fare refresh"
                : "Refresh unavailable"}
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
          {loading ? "Checking…" : "Check latest status"}
        </Button>
      </div>

      <p className="mt-2 text-[12px] leading-5 text-[#64748B]">
        Run fare refresh requests new fares from providers and saves the results. Check latest status only reads saved records.
      </p>

      <div className="mt-4 grid gap-5 border-t border-[#E7ECF5] pt-4 lg:grid-cols-2">
        <div className="min-w-0">
          <h4 className="text-[13px] font-semibold text-[#0F172A]">Saved fare status</h4>
          <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
            Includes snapshots saved by manual or scheduled refreshes.
          </p>
          <dl aria-label="Saved fare status" className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
            <CompactDetail label="Latest saved snapshot" value={statusPayload.dataAvailable ? formatSnapshotTime(statusPayload.lastRefreshAt) : "Unavailable"} />
            <CompactDetail label="Scheduler setup" value={formatCronStatus(statusPayload)} />
          </dl>
        </div>

        <div className="min-w-0 border-t border-[#E7ECF5] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <h4 className="text-[13px] font-semibold text-[#0F172A]">Last manual run in this tab</h4>
          <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
            Checking status does not start a run or change these results.
          </p>
          {refreshState.counts ? (
            <dl aria-label="Last manual fare refresh" className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
              <CompactDetail label="Provider calls" value={refreshState.counts.providerCalls} />
              <CompactDetail label="Stopped reason" value={formatStoppedReason(refreshState.counts.stoppedReason)} />
            </dl>
          ) : (
            <p className="mt-3 text-[12px] leading-5 text-[#64748B]">
              No manual refresh result in this tab.
            </p>
          )}
        </div>
      </div>

      {refreshState.message ? (
        <div
          className={
            refreshState.status === "error"
              ? "mt-4 border-l-2 border-rose-500 py-1 pl-3 text-[12px] font-medium leading-5 text-rose-700"
              : "mt-4 border-l-2 border-emerald-500 py-1 pl-3 text-[12px] font-medium leading-5 text-emerald-700"
          }
          role="status"
          aria-live="polite"
        >
          {refreshState.message}
        </div>
      ) : null}

      {refreshState.counts ? (
        <div className="mt-4 border-t border-[#E7ECF5] pt-3">
          <h4 className="text-[12px] font-semibold text-[#0F172A]">Manual run outcomes</h4>
          <dl aria-label="Manual run outcomes" className="mt-2 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
            {COUNT_LABELS.map(({ key, label }) => (
              <MetricCard key={key} label={label} value={refreshState.counts?.[key] ?? 0} />
            ))}
          </dl>
        </div>
      ) : null}

      {!initialStatusLoading && !operationsAvailable ? (
        <p className="mt-4 border-l-[3px] border-rose-500 py-1 pl-3 text-[13px] font-medium text-rose-700">
          Manual refresh unavailable while the snapshot store is offline.
        </p>
      ) : null}
      {!statusPayload.cronConfigured ? (
        <p className="mt-3 border-l-[3px] border-amber-500 py-1 pl-3 text-[13px] font-medium text-[#9A3412]">
          Cron credential not configured.
        </p>
      ) : null}
    </DashboardSection>
  );
}

function MarketReadinessDashboard({
  markets,
  marketsNeedingAnotherRun,
  selectedRouteScope,
  onInspectMarket,
}: {
  markets: MarketReadiness[];
  marketsNeedingAnotherRun: MarketNextRunNeed[];
  selectedRouteScope: string | null;
  onInspectMarket: (marketCode: string) => void;
}) {
  const [expandedMarket, setExpandedMarket] = useState<string | null>(null);
  const displayedCodes = new Set(markets.map((market) => normalizeAdminHomepageFareMarketCode(market.marketCode)));
  const outsidePublicCount = marketsNeedingAnotherRun.filter(
    (market) => market.needed && !displayedCodes.has(normalizeAdminHomepageFareMarketCode(market.market)),
  ).length;

  return (
    <DashboardSection title="Market coverage">
      {markets.length ? (
        <div className="mt-4 min-w-0">
          <div className="hidden gap-3 border-y border-[#D8E1EC] px-3 py-3 text-[12px] font-semibold uppercase tracking-[0.03em] text-[#64748B] lg:grid lg:grid-cols-[minmax(150px,1.5fr)_70px_85px_72px_minmax(120px,1fr)_minmax(240px,auto)]">
            <span>Market</span>
            <span>Popular</span>
            <span>Discovery</span>
            <span>Backup</span>
            <span>Health</span>
            <span className="text-right">Actions</span>
          </div>
          <ul aria-label="Public market coverage" className="divide-y divide-[#E7ECF5] border-b border-[#D8E1EC]">
            {markets.map((market) => {
              const selected = normalizeAdminHomepageFareMarketCode(selectedRouteScope ?? "") === normalizeAdminHomepageFareMarketCode(market.marketCode);
              const nextRun = marketsNeedingAnotherRun.find(
                (item) => normalizeAdminHomepageFareMarketCode(item.market) === normalizeAdminHomepageFareMarketCode(market.marketCode),
              );
              const nextRunNeeded = nextRun ? nextRun.needed : !market.targetMet;
              const nextRunCause = nextRun?.reason;
              const needsAttention = !market.targetMet || market.status !== "ready";
              const showDetails = expandedMarket === market.marketCode;
              const detailsId = "fare-market-details-" + market.marketCode.replace(/[^a-zA-Z0-9_-]/g, "-");
              const healthNotes = [
                (market.freshCount ?? 0) > 0 ? String(market.freshCount) + " fresh" : null,
                (market.missingCount ?? 0) > 0 ? String(market.missingCount) + " missing" : null,
                market.failed > 0 ? String(market.failed) + " failed" : null,
              ].filter(Boolean).join(" · ") || "No issues";

              return (
                <li key={market.marketCode} className="min-w-0">
                  <div className={"grid min-w-0 grid-cols-2 items-center gap-x-4 gap-y-2 px-3 py-3.5 lg:grid-cols-[minmax(150px,1.5fr)_70px_85px_72px_minmax(120px,1fr)_minmax(240px,auto)] lg:gap-x-3 " + (selected ? "bg-[#F2F7FF]" : "")}>
                    <div className="col-span-2 min-w-0 lg:col-span-1">
                      <span className="block text-[13px] font-semibold leading-5 text-[#020617]">{market.marketLabel}</span>
                      <span className="mt-0.5 block text-[12px] leading-4 text-[#64748B]">{market.marketCode} · {market.marketGroup}</span>
                    </div>
                    <span className="text-[13px] font-medium tabular-nums text-[#0F172A]"><span className="mr-1.5 text-[12px] text-[#64748B] lg:hidden">Popular</span>{market.popularVisibleFresh}/{market.popularVisibleTarget}</span>
                    <span className="text-[13px] font-medium tabular-nums text-[#0F172A]"><span className="mr-1.5 text-[12px] text-[#64748B] lg:hidden">Discovery</span>{market.discoveryVisibleFresh}/{market.discoveryVisibleTarget}</span>
                    <span className="text-[13px] font-medium tabular-nums text-[#0F172A]"><span className="mr-1.5 text-[12px] text-[#64748B] lg:hidden">Backup</span>{market.backupFresh}/{market.backupTarget}</span>
                    <div className="min-w-0">
                      <MarketStatusBadge status={market.status} />
                      <span className="mt-1 block text-[12px] leading-5 text-[#64748B]">{healthNotes}</span>
                    </div>
                    <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 lg:col-span-1 lg:justify-end">
                      {needsAttention ? (
                        <button
                          type="button"
                          aria-expanded={showDetails}
                          aria-controls={detailsId}
                          onClick={() => setExpandedMarket(showDetails ? null : market.marketCode)}
                          className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-[#475569] hover:text-[#004BB8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]"
                        >
                          Coverage details
                          <ChevronDown size={14} aria-hidden="true" className={"shrink-0 transition-transform " + (showDetails ? "rotate-180" : "")} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onInspectMarket(market.marketCode)}
                        aria-pressed={selected}
                        aria-label={"Inspect routes for " + market.marketLabel}
                        className="inline-flex min-h-9 items-center whitespace-nowrap text-[12px] font-semibold text-[#004BB8] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]"
                      >
                        Inspect routes
                      </button>
                    </div>
                  </div>
                  {needsAttention ? (
                    <div
                      id={detailsId}
                      hidden={!showDetails}
                      role="region"
                      aria-label={market.marketLabel + " coverage details"}
                      className="border-t border-[#E7ECF5] px-4 py-3"
                    >
                      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
                        <CompactDetail label="Next run" value={nextRunNeeded ? "Needed" : "Not required"} />
                        <CompactDetail
                          label="Reason"
                          value={nextRunCause && nextRunCause !== "underfilled" ? formatUnderfillCause(nextRunCause) : formatMarketStatus(market.status)}
                        />
                        <CompactDetail
                          label="Current gaps"
                          value={Math.max(0, market.popularVisibleTarget - market.popularVisibleFresh) + " popular · " + Math.max(0, market.discoveryVisibleTarget - market.discoveryVisibleFresh) + " discovery · " + Math.max(0, market.backupTarget - market.backupFresh) + " backup"}
                        />
                      </dl>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {outsidePublicCount > 0 ? (
            <p role="note" className="mt-3 text-[12px] leading-5 text-[#64748B]">
              {outsidePublicCount} additional market {outsidePublicCount === 1 ? "scope needs" : "scopes need"} attention outside the public country table. Review Advanced diagnostics for fallback coverage.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 border-b border-[#E7ECF5] py-3 text-[13px] leading-5 text-[#64748B]">
          No public market readiness metadata was returned.
        </p>
      )}
    </DashboardSection>
  );
}

function AdvancedDiagnostics({
  pools,
  selectedRouteScope,
  onInspectMarket,
  statusPayload,
  refreshCounts,
}: {
  pools: MarketReadiness[];
  selectedRouteScope: string | null;
  onInspectMarket: (marketCode: string) => void;
  statusPayload: HomepageFareStatusPayload;
  refreshCounts: RefreshCounts | null;
}) {
  return (
    <details id="homepage-fare-advanced-diagnostics" className="group border-b border-[#D8E1EC] py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm text-[15px] font-semibold text-[#020617] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] [&::-webkit-details-marker]:hidden">
        <span>Advanced diagnostics</span>
        <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-[#64748B] transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-5 space-y-6">
        <section aria-labelledby="fallback-pools-heading">
          <h4 id="fallback-pools-heading" className="text-[14px] font-semibold text-[#020617]">Fallback coverage pools</h4>
          <p className="mt-1 max-w-4xl text-[12px] leading-5 text-[#475569]">
            Internal regional and global pools used for routing and replacement; they do not count as public homepage readiness.
          </p>
          <div className="mt-4 grid max-w-[1200px] gap-x-5 gap-y-1 md:grid-cols-2 xl:grid-cols-3">
            {pools.length ? (
              pools.map((pool) => {
                const selected = normalizeAdminHomepageFareMarketCode(selectedRouteScope ?? "") === normalizeAdminHomepageFareMarketCode(pool.marketCode);
                return (
                  <button
                    key={pool.marketCode}
                    type="button"
                    onClick={() => onInspectMarket(pool.marketCode)}
                    aria-pressed={selected}
                    aria-label={"Inspect routes for " + pool.marketLabel}
                    className={"min-w-0 border-b border-[#E7ECF5] px-2 py-3.5 text-left transition-colors hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] " + (selected ? "bg-[#F2F7FF]" : "")}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <span className="min-w-0 text-[13px] font-semibold leading-5 text-[#020617]">{pool.marketLabel}</span>
                      <span className="shrink-0 text-[11px] font-medium leading-5 text-[#64748B]">{pool.marketCode}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[12px] leading-5 text-[#64748B]">
                      <span>Fresh <strong className="font-semibold text-[#020617]">{pool.freshCount ?? 0}</strong></span>
                      <span>Missing <strong className="font-semibold text-[#020617]">{pool.missingCount ?? 0}</strong></span>
                      <span>Failed <strong className="font-semibold text-[#020617]">{pool.failed}</strong></span>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="py-3 text-[13px] text-[#64748B]">No fallback-only pools were returned.</p>
            )}
          </div>
        </section>

        <section aria-labelledby="executor-debug-heading" className="border-t border-[#E7ECF5] pt-5">
          <h4 id="executor-debug-heading" className="text-[14px] font-semibold text-[#020617]">Executor details</h4>
          <div className="mt-4 grid gap-x-8 gap-y-5 lg:grid-cols-2">
            <div className="min-w-0">
              <h5 className="text-[12px] font-semibold text-[#334155]">Execution and budgets</h5>
              <dl className="mt-2 grid grid-cols-2 gap-x-5 gap-y-4">
                <MetricCard label="Configured routes" value={statusPayload.summary.total} />
                <MetricCard label="Stopped reason" value={refreshCounts ? formatStoppedReason(refreshCounts.stoppedReason) : "No run yet"} />
                <MetricCard label="Provider budget" value={refreshCounts ? (refreshCounts.stoppedReason === "provider_budget_exhausted" ? "Exhausted" : "Available") : "Not observed yet"} />
                <MetricCard label="Route budget" value={refreshCounts ? (refreshCounts.stoppedReason === "route_budget_exhausted" ? "Exhausted" : "Available") : "Not observed yet"} />
                <MetricCard label="Candidate pool failed" value={statusPayload.candidatePoolHealth.failed} />
                <MetricCard label="Candidate pool unavailable" value={statusPayload.candidatePoolHealth.unavailable} />
                <MetricCard label="Replacement candidates" value={refreshCounts ? sumCountRecord(refreshCounts.replacementCandidatesUsedByMarket) : sumCountRecord(statusPayload.replacementCandidatesUsedByMarket)} />
                <MetricCard label="Timeouts" value={refreshCounts ? sumCountRecord(refreshCounts.timeoutByMarket) : sumCountRecord(statusPayload.timeoutByMarket)} />
              </dl>
            </div>
            <div className="min-w-0">
              <h5 className="text-[12px] font-semibold text-[#334155]">Public fare outcomes</h5>
              <dl className="mt-2 grid grid-cols-2 gap-x-5 gap-y-4">
                <MetricCard label="Fresh used publicly" value={statusPayload.publicPriceDiagnostics.fresh_available} />
                <MetricCard label="LKG used publicly" value={statusPayload.publicPriceDiagnostics.last_known_good_used} />
                <MetricCard label="Exact route mismatch" value={statusPayload.publicPriceDiagnostics.exact_route_mismatch} />
                <MetricCard label="Visible gaps attempted" value={refreshCounts?.visibleGapsAttempted.length ?? 0} />
                <MetricCard label="Immediate replacements attempted" value={refreshCounts?.replacementsUsed.length ?? 0} />
              </dl>
            </div>
          </div>
          <div className="mt-5 border-t border-[#E7ECF5] pt-4">
            <h5 className="text-[12px] font-semibold text-[#334155]">Scheduling and market targets</h5>
            <dl className="mt-2 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <MetricCard label="Scheduler cadence" value={statusPayload.nextExpectedCronRefresh ?? "Not provided"} />
              <MetricCard label="Scheduler verification" value="Not observable from this service" />
              <MetricCard label="Executor targets" value={refreshCounts ? formatStringList(refreshCounts.targetedMarkets, "none") : "No manual run yet"} />
              <MetricCard label="Markets needing another run" value={refreshCounts ? formatMarketsNeedingRun(refreshCounts.marketsNeedingAnotherRun) : formatMarketsNeedingRun(statusPayload.marketsNeedingAnotherRun)} />
            </dl>
          </div>
        </section>
      </div>
    </details>
  );
}

function MarketRouteInspector({
  publicGroups,
  selectedRouteScope,
  selectedGroup,
  filter,
  loading,
  onSelectMarket,
  routePage,
  onPreviousPage,
  onNextPage,
  onFilterChange,
  routeInspectorRef,
}: {
  publicGroups: AdminHomepageFareMarketRouteGroup[];
  selectedRouteScope: string | null;
  selectedGroup: AdminHomepageFareMarketRouteGroup | null;
  filter: AdminHomepageFareRouteGroupFilter;
  loading: boolean;
  onSelectMarket: (marketCode: string) => void;
  routePage: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onFilterChange: (filter: AdminHomepageFareRouteGroupFilter) => void;
  routeInspectorRef: RefObject<HTMLDivElement | null>;
}) {
  const marketOptions = [
    { value: ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE, label: "All routes" },
    ...publicGroups.map((group) => ({ value: group.marketCode, label: group.marketLabel })),
  ];
  // A fallback pool can be inspected from Advanced diagnostics. Keep its name
  // visible in the selector even though it is outside the public country list.
  if (selectedGroup && selectedRouteScope && selectedRouteScope !== ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE &&
    !marketOptions.some((option) => normalizeAdminHomepageFareMarketCode(option.value) === normalizeAdminHomepageFareMarketCode(selectedRouteScope))) {
    marketOptions.push({ value: selectedRouteScope, label: selectedGroup.displayName });
  }

  return (
    <div ref={routeInspectorRef} className="min-w-0 scroll-mt-32">
      <DashboardSection title="Route inspector">
      <div className="mt-4 grid gap-x-4 gap-y-3 border-y border-[#E7ECF5] py-4 sm:grid-cols-[minmax(0,320px)_minmax(0,240px)]">
        <div className="min-w-0">
          <p className="mb-1.5 text-[12px] font-medium text-[#64748B]">Market</p>
          <SearchMonitorSelect
            label="Market"
            name="homepage-fare-market"
            appearance="fare"
            truncateLabel
            value={selectedRouteScope}
            options={marketOptions}
            onValueChange={onSelectMarket}
          />
        </div>
        <div className="min-w-0">
          <p className="mb-1.5 text-[12px] font-medium text-[#64748B]">Status</p>
          <SearchMonitorSelect
            label="Status"
            name="homepage-fare-status"
            appearance="fare"
            truncateLabel
            value={filter}
            options={ROUTE_FILTERS.map(({ key, label }) => ({ value: key, label }))}
            onValueChange={(next) => onFilterChange(next as AdminHomepageFareRouteGroupFilter)}
          />
        </div>
      </div>

      {!publicGroups.length && !loading ? (
        <p role="status" className="mt-3 py-3 text-[13px] leading-5 text-[#64748B]">
          No public market route groups match this filter.
        </p>
      ) : null}

      <SelectedRouteDetails
        group={selectedGroup}
        selectedRouteScope={selectedRouteScope}
        filterLabel={ROUTE_FILTERS.find((option) => option.key === filter)?.label ?? "All statuses"}
        loading={loading}
        routePage={routePage}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
      />
      </DashboardSection>
    </div>
  );
}

function SelectedRouteDetails({
  group,
  selectedRouteScope,
  filterLabel,
  loading,
  routePage,
  onPreviousPage,
  onNextPage,
}: {
  group: AdminHomepageFareMarketRouteGroup | null;
  selectedRouteScope: string | null;
  filterLabel: string;
  loading: boolean;
  routePage: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
}) {
  if (!selectedRouteScope || !group) {
    return (
      <p className="mt-3 border-b border-[#E7ECF5] py-3 text-[12px] leading-5 text-[#64748B]">
        No route group is available for this market. Choose All routes or another market.
      </p>
    );
  }

  const page = paginateAdminHomepageFareRoutes(group.routes, routePage);
  const isViewAll = group.marketCode === "ALL";

  return (
    <div className="mt-4 min-w-0 border-y border-[#D8E1EC] bg-white">
      <div className="border-b border-[#E7ECF5] px-3 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h5 className="text-[15px] font-semibold leading-6 text-[#020617]">
              {isViewAll ? "All routes" : group.displayName} — {page.totalRoutes} total routes
            </h5>
            <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
              Showing {page.start}–{page.end} of {page.totalRoutes}
              {isViewAll ? " · Across all markets" : ` · ${group.marketCode}`}
              {" · Status: "}{filterLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!isViewAll ? <MarketGroupStatusBadge status={group.status} /> : null}
            <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-[#475569]">
              <button
                type="button"
                onClick={onPreviousPage}
                disabled={!page.hasPreviousPage}
                className="rounded-md border border-[#D8E1EC] bg-white px-3 py-1.5 text-[13px] font-medium text-[#020617] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="min-w-16 text-center">
                Page {page.currentPage} of {page.totalPages}
              </span>
              <button
                type="button"
                onClick={onNextPage}
                disabled={!page.hasNextPage}
                className="rounded-md border border-[#D8E1EC] bg-white px-3 py-1.5 text-[13px] font-medium text-[#020617] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
      <RouteDetailsTable group={group} routes={page.routes} loading={loading} keepPageHeight={page.totalPages > 1} />
    </div>
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
  routes,
  loading,
  keepPageHeight,
}: {
  group: AdminHomepageFareMarketRouteGroup;
  routes: AdminHomepageFareMarketRouteGroup["routes"];
  loading: boolean;
  keepPageHeight: boolean;
}) {
  if (!routes.length) {
    return (
      <p className="p-4 text-sm font-semibold text-muted">
        {loading ? "Loading homepage fare snapshot status…" : group.marketCode === "ALL" ? "No routes match the selected status." : "No routes match this market and status."}
      </p>
    );
  }

  return (
    <div
      className={"max-w-full overflow-x-auto overscroll-x-contain [overflow-anchor:none] " + (keepPageHeight ? "min-h-[740px]" : "")}
      role="region"
      aria-label="Route inspection results"
      tabIndex={0}
    >
      <table className="w-full min-w-[1400px] table-fixed text-left text-[13px]">
        <colgroup>
          <col className="w-[70px]" />
          <col className="w-[145px]" />
          <col className="w-[115px]" />
          <col className="w-[135px]" />
          <col className="w-[100px]" />
          <col className="w-[105px]" />
          <col className="w-[110px]" />
          <col className="w-[115px]" />
          <col className="w-[110px]" />
          <col className="w-[175px]" />
          <col className="w-[220px]" />
        </colgroup>
        <thead className="border-b border-[#E7ECF5] text-[12px] font-medium uppercase text-[#64748B]">
          <tr>
            <th className="px-3 py-2.5">Market</th>
            <th className="px-3 py-2.5">Route</th>
            <th className="px-3 py-2.5">Origin</th>
            <th className="px-3 py-2.5">Destination</th>
            <th className="px-3 py-2.5">Section</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Display price</th>
            <th className="px-3 py-2.5">Provider native</th>
            <th className="px-3 py-2.5">Provider</th>
            <th className="px-3 py-2.5">Last refreshed</th>
            <th className="px-3 py-2.5">Reason / replacement</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E7ECF5]">
          {routes.map((route) => (
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
              <td className="px-3 py-2.5">
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
  const dot =
    readiness.status === "healthy"
      ? "bg-emerald-500"
      : readiness.status === "warning"
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div className="mt-3" role="status" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <p className="text-[13px] font-semibold text-[#020617]">{readiness.label}</p>
      </div>
      <p className="mt-1 text-[12px] leading-5 text-[#475569]">{readiness.message}</p>
    </div>
  );
}

function MarketStatusBadge({ status }: { status: MarketReadinessStatus }) {
  const ready = status === "ready";

  return (
    <span className={"inline-flex items-center gap-1.5 text-[12px] font-medium " + (ready ? "text-emerald-700" : "text-amber-700")}>
      <span aria-hidden="true" className={"h-1.5 w-1.5 shrink-0 rounded-full " + (ready ? "bg-emerald-500" : "bg-amber-500")} />
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
    <div className="min-w-0 border-t border-[#E7ECF5] pt-2">
      <dt className="text-[12px] text-[#64748B]">{label}</dt>
      <dd className="mt-1 break-words text-[13px] font-medium leading-5 text-[#0F172A]">{value}</dd>
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

async function buildSafeRefreshFailureMessage(response: Response) {
  const fallback = `Could not refresh homepage fares. Status ${response.status}.`;

  try {
    const payload = (await response.json()) as {
      error?: unknown;
      errorCode?: unknown;
      safeReason?: unknown;
    };
    const details = [
      typeof payload.error === "string" ? payload.error : "Homepage fare refresh failed.",
      typeof payload.safeReason === "string" ? payload.safeReason : undefined,
      typeof payload.errorCode === "string" ? `Code: ${payload.errorCode}.` : undefined,
      `Status: ${response.status}.`,
    ].filter(Boolean);

    return details.join(" ");
  } catch {
    return fallback;
  }
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
      dataAvailable: false,
      routes: [],
      summary: DEFAULT_STATUS_SUMMARY,
      health: DEFAULT_HEALTH,
      displayReadiness: DEFAULT_DISPLAY_READINESS,
      candidatePoolHealth: DEFAULT_STATUS_SUMMARY,
      refreshBudget: DEFAULT_REFRESH_BUDGET,
      publicPriceDiagnostics: createEmptyPublicPriceDiagnostics(),
      ...DEFAULT_MARKET_STATUS_FIELDS,
    };
  }

  const candidate = payload as {
    dataAvailable?: unknown;
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
    publicPriceDiagnostics?: unknown;
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
    dataAvailable: candidate.dataAvailable === true,
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
    publicPriceDiagnostics: normalizePublicPriceDiagnostics(candidate.publicPriceDiagnostics),
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

function createEmptyPublicPriceDiagnostics(): Record<PublicPriceDiagnosis, number> {
  return {
    fresh_available: 0,
    last_known_good_used: 0,
    last_known_good_failed_safety_check: 0,
    fresh_missing: 0,
    last_known_good_missing: 0,
    exact_route_mismatch: 0,
    provider_failed: 0,
    provider_unavailable: 0,
    no_provider_backed_fare_ever: 0,
    price_invalid: 0,
  };
}

function normalizePublicPriceDiagnostics(value: unknown) {
  const diagnostics = createEmptyPublicPriceDiagnostics();

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return diagnostics;
  }

  for (const key of Object.keys(diagnostics) as PublicPriceDiagnosis[]) {
    diagnostics[key] = readCount((value as Record<string, unknown>)[key]);
  }

  return diagnostics;
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
  return status.nextExpectedCronRefresh ? "Configured" : "Configured · cadence missing";
}
