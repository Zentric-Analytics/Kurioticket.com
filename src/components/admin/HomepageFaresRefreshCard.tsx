"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  AdminButton,
  AdminPageShell,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { HomepageOperationsStatusBar } from "@/components/admin/homepage-operations/HomepageOperationsPanels";
import {
  buildAdminHomepageFareRouteGroups,
  filterAdminHomepageFareMarketsByRouteGroups,
  normalizeAdminHomepageFareMarketCode,
  paginateAdminHomepageFareRoutes,
  resolveAdminHomepageFareActiveRouteScope,
  resolveAdminHomepageFareSelectedRouteGroup,
  type AdminHomepageFareRouteGroupFilter,
  type AdminHomepageFareMarketRouteGroup,
} from "@/lib/admin/homepageFareRouteGrouping";
import {
  createHomepageFareStatusRequestCoordinator,
  markHomepageFareStatusRequestFailed,
  markHomepageFareStatusRequestStarted,
  markHomepageFareStatusRequestSucceeded,
  type HomepageFareStatusLoadState,
} from "@/lib/admin/homepageFareStatusRequest";

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
  message: "Homepage fares are missing or expired.",
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

const ROUTE_FILTERS: Array<{
  key: AdminHomepageFareRouteGroupFilter;
  label: string;
}> = [
  { key: "all", label: "All" },
  { key: "ready", label: "Usable" },
  { key: "underfilled", label: "Needs coverage" },
  { key: "failed", label: "Failed" },
  { key: "missing", label: "Missing" },
  { key: "stale", label: "Expired" },
  { key: "last_known_good", label: "Last-known-good" },
  { key: "fresh", label: "Fresh" },
  { key: "unavailable", label: "Unavailable" },
];

export function HomepageFaresRefreshCard() {
  const [statusState, setStatusState] = useState<
    HomepageFareStatusLoadState<HomepageFareStatusPayload>
  >({
    data: null,
    loading: true,
    error: "",
    stale: false,
    lastSuccessfulLoadAt: null,
  });
  const statusRequestCoordinatorRef = useRef(
    createHomepageFareStatusRequestCoordinator(),
  );
  const [selectedRouteScope, setSelectedRouteScope] = useState<string | null>(
    null,
  );
  const [routePage, setRoutePage] = useState(1);
  const routeDetailsRef = useRef<HTMLDivElement>(null);
  const [routeFilter, setRouteFilter] =
    useState<AdminHomepageFareRouteGroupFilter>("all");
  const selectRouteScope = useCallback((scope: string) => {
    setRoutePage(1);
    setSelectedRouteScope(normalizeAdminHomepageFareMarketCode(scope));
  }, []);
  const selectRouteFilter = useCallback(
    (filter: AdminHomepageFareRouteGroupFilter) => {
      setRoutePage(1);
      setRouteFilter(filter);
    },
    [],
  );

  const loadStatus = useCallback(async () => {
    await statusRequestCoordinatorRef.current.run({
      request: fetchHomepageFareStatus,
      onStart: () =>
        setStatusState((current) =>
          markHomepageFareStatusRequestStarted(current),
        ),
      onSuccess: (payload) =>
        setStatusState(
          markHomepageFareStatusRequestSucceeded(
            payload,
            new Date().toISOString(),
          ),
        ),
      onError: () =>
        setStatusState((current) =>
          markHomepageFareStatusRequestFailed(
            current,
            "Could not load homepage fare snapshot status.",
          ),
        ),
    });
  }, []);

  useEffect(() => {
    const statusRequestCoordinator = statusRequestCoordinatorRef.current;
    statusRequestCoordinator.activate();
    void loadStatus();

    return () => {
      statusRequestCoordinator.dispose();
    };
  }, [loadStatus]);

  const statusPayload = statusState.data ?? {
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
  const publicMarkets = useMemo(
    () =>
      statusPayload.marketReadinessSummary.filter(
        (market) => !isFallbackMarket(market),
      ),
    [statusPayload.marketReadinessSummary],
  );
  const routeFilteredMarkets = useMemo(
    () =>
      filterAdminHomepageFareMarketsByRouteGroups(
        publicMarkets,
        marketRouteGroups,
        routeFilter,
      ),
    [marketRouteGroups, publicMarkets, routeFilter],
  );
  const routeFilterCounts = useMemo(
    () =>
      Object.fromEntries(
        ROUTE_FILTERS.map(({ key }) => {
          const groups = buildAdminHomepageFareRouteGroups({
            routes: statusPayload.routes,
            markets: statusPayload.marketReadinessSummary,
            filter: key,
            includeEmptyGroups: true,
          });

          return [
            key,
            filterAdminHomepageFareMarketsByRouteGroups(
              publicMarkets,
              groups,
              key,
            ).length,
          ];
        }),
      ) as Record<AdminHomepageFareRouteGroupFilter, number>,
    [publicMarkets, statusPayload.marketReadinessSummary, statusPayload.routes],
  );
  const activeSelectedRouteScope = resolveAdminHomepageFareActiveRouteScope({
    selectedScope: selectedRouteScope,
    markets: publicMarkets,
    visibleMarkets: routeFilteredMarkets,
  });
  const selectedRouteGroup = resolveAdminHomepageFareSelectedRouteGroup({
    selectedScope: activeSelectedRouteScope,
    marketRouteGroups,
  });

  useEffect(() => {
    if (!activeSelectedRouteScope) return;

    const animationFrame = window.requestAnimationFrame(() => {
      routeDetailsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeSelectedRouteScope, routeFilter]);

  return (
    <AdminPageShell eyebrow="" title="Homepage Operations">
      <AdminSectionCard
        aria-labelledby="operations-summary-heading"
        className="px-5 py-4"
      >
        <h2
          id="operations-summary-heading"
          className="mb-2 text-sm font-bold text-slate-950"
        >
          Operations Summary
        </h2>
        <HomepageOperationsStatusBar
          items={[
            {
              label: "Overall status",
              value: statusState.data
                ? formatGlobalReadinessStatus(
                    statusPayload.displayReadiness.globalReadinessStatus,
                  )
                : statusState.loading
                  ? "Loading…"
                  : "Unavailable",
              tone: statusState.data
                ? readinessTone(
                    statusPayload.displayReadiness.globalReadinessStatus,
                  ) === "good"
                  ? "good"
                  : "warning"
                : "neutral",
            },
            {
              label: "Status last updated",
              value: statusState.lastSuccessfulLoadAt
                ? formatDateTime(statusState.lastSuccessfulLoadAt)
                : statusState.loading
                  ? "Loading…"
                  : "Unavailable",
            },
            {
              label: "Markets ready",
              value: statusState.data
                ? `${statusPayload.readyMarkets.length} / ${statusPayload.requiredMarkets.length}`
                : "—",
            },
            {
              label: "Missing routes",
              value: statusState.data ? statusPayload.summary.missing : "—",
              tone:
                statusState.data && statusPayload.summary.missing
                  ? "warning"
                  : "neutral",
            },
            {
              label: "Failed routes",
              value: statusState.data ? statusPayload.summary.failed : "—",
              tone:
                statusState.data && statusPayload.summary.failed
                  ? "danger"
                  : "neutral",
            },
          ]}
        />
      </AdminSectionCard>

      {statusState.error ? (
        <p
          className="border-y border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
          role="alert"
        >
          {statusState.error}
          {statusState.stale && statusState.lastSuccessfulLoadAt ? (
            <span className="block">
              Status data is stale · Last updated{" "}
              {formatDateTime(statusState.lastSuccessfulLoadAt)} · Latest reload
              failed.
            </span>
          ) : null}
        </p>
      ) : null}

      <section aria-label="Homepage operations workspace">
        <div className="grid items-start gap-5 md:grid-cols-[16.5rem_minmax(0,1fr)]">
          <div className="md:sticky md:top-24">
            <RouteFilterPanel
              filter={routeFilter}
              counts={routeFilterCounts}
              onChange={selectRouteFilter}
            />
          </div>
          <div className="min-w-0 space-y-5">
            <AdminSectionCard
              aria-labelledby="market-coverage-heading"
              className="overflow-hidden p-0"
            >
              <h2 id="market-coverage-heading" className="border-b border-slate-200 px-5 py-4 text-base font-semibold text-slate-950">
                Market Coverage
              </h2>
              <MarketReadinessDashboard
                markets={routeFilteredMarkets}
                selectedRouteScope={activeSelectedRouteScope}
                onInspectMarket={selectRouteScope}
                emptyMessage={
                  statusState.data
                    ? getRouteFilterEmptyMessage(routeFilter)
                    : statusState.loading
                      ? "Loading homepage fare status…"
                      : "Homepage fare status is unavailable."
                }
              />
            </AdminSectionCard>
            {activeSelectedRouteScope ? (
              <MarketRouteInspector
                selectedRouteScope={activeSelectedRouteScope}
                selectedGroup={selectedRouteGroup}
                loading={statusState.loading}
                onClose={() => setSelectedRouteScope(null)}
                routePage={routePage}
                onPreviousPage={() =>
                  setRoutePage((page) => Math.max(1, page - 1))
                }
                onNextPage={() => setRoutePage((page) => page + 1)}
                routeDetailsRef={routeDetailsRef}
              />
            ) : null}
          </div>
        </div>
      </section>
    </AdminPageShell>
  );
}

function isFallbackMarket(market: MarketReadiness) {
  return (
    market.marketVisibility !== "country" ||
    getPublicDisplayTarget(market) === 0
  );
}

function getPublicDisplayTarget(market: MarketReadiness) {
  return market.popularVisibleTarget + market.discoveryVisibleTarget;
}

function readinessTone(
  status: GlobalReadinessStatus,
): "good" | "warning" | "danger" {
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

function RouteFilterPanel({
  filter,
  counts,
  onChange,
}: {
  filter: AdminHomepageFareRouteGroupFilter;
  counts: Record<AdminHomepageFareRouteGroupFilter, number>;
  onChange: (filter: AdminHomepageFareRouteGroupFilter) => void;
}) {
  return (
    <AdminSectionCard
      className="p-5"
      aria-labelledby="route-filter-heading"
    >
      <h3
        id="route-filter-heading"
        className="text-base font-semibold text-slate-950"
      >
        Filter routes
      </h3>
      <div className="mt-4">
        <RouteFilterControls
          filter={filter}
          counts={counts}
          onChange={onChange}
        />
      </div>
    </AdminSectionCard>
  );
}

function RouteFilterControls({
  filter,
  counts,
  onChange,
}: {
  filter: AdminHomepageFareRouteGroupFilter;
  counts: Record<AdminHomepageFareRouteGroupFilter, number>;
  onChange: (filter: AdminHomepageFareRouteGroupFilter) => void;
}) {
  const groups = [
    {
      label: "Coverage issues",
      keys: ["all", "underfilled", "missing", "failed", "stale"],
    },
    {
      label: "Route availability",
      keys: ["ready", "fresh", "last_known_good", "unavailable"],
    },
  ] satisfies Array<{
    label: string;
    keys: AdminHomepageFareRouteGroupFilter[];
  }>;

  return (
    <div className="space-y-5" aria-label="Route status filters">
      {groups.map((group) => (
        <div key={group.label} role="group" aria-label={group.label}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {group.label}
          </p>
          <div className="grid gap-1">
            {group.keys.map((key) => {
              const item = ROUTE_FILTERS.find(
                (candidate) => candidate.key === key,
              )!;
              const selected = filter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onChange(item.key)}
                  className={`focus-ring flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-2 py-1 text-left text-sm transition ${selected ? "bg-indigo-50 font-semibold text-indigo-700" : "font-medium text-slate-700 hover:bg-slate-50"}`}
                  aria-pressed={selected}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={`h-4 w-4 rounded-full border ${selected ? "border-[5px] border-indigo-600" : "border-slate-300"}`}
                      aria-hidden="true"
                    />
                    {item.label}
                  </span>
                  <span className="tabular-nums text-slate-500">
                    {counts[item.key]}
                  </span>
                </button>
              );
            })}
          </div>
          {group.label === "Route availability" && filter === "ready" ? (
            <p className="mt-2 px-1 text-xs font-semibold leading-5 text-slate-600">
              Usable includes fresh and last-known-good routes.
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function getRouteFilterEmptyMessage(filter: AdminHomepageFareRouteGroupFilter) {
  switch (filter) {
    case "ready":
      return "No markets currently have usable routes.";
    case "underfilled":
      return "No markets have missing or expired routes.";
    case "stale":
      return "No markets contain expired routes.";
    default:
      return "No markets match the current filters.";
  }
}

function MarketReadinessDashboard({
  markets,
  selectedRouteScope,
  onInspectMarket,
  emptyMessage = "No public market readiness metadata was returned.",
}: {
  markets: MarketReadiness[];
  selectedRouteScope: string | null;
  onInspectMarket: (marketCode: string) => void;
  emptyMessage?: string;
}) {
  if (!markets.length)
    return (
      <p className="px-5 py-6 text-sm font-medium text-slate-600">
        {emptyMessage}
      </p>
    );

  return (
    <div className="overflow-x-auto overscroll-x-contain bg-[linear-gradient(to_right,white,white),linear-gradient(to_right,white,white),linear-gradient(to_right,rgba(15,23,42,0.08),rgba(255,255,255,0)),linear-gradient(to_left,rgba(15,23,42,0.08),rgba(255,255,255,0))] bg-[length:24px_100%,24px_100%,12px_100%,12px_100%] bg-[position:left_center,right_center,left_center,right_center] bg-no-repeat [background-attachment:local,local,scroll,scroll]">
      <table
        className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm"
        aria-label="Market coverage"
      >
        <caption className="sr-only">Market coverage</caption>
        <thead className="sticky top-0 z-10 bg-slate-50/95 text-xs text-slate-500 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
          <tr>
            {["Market", "Coverage", "Freshness", "Missing", "Status", "Action"].map(
              (heading) => (
                <th
                  scope="col"
                  key={heading}
                  className={`border-b border-slate-200 px-5 py-4 font-semibold uppercase tracking-wide ${heading === "Action" ? "text-right" : "text-left"}`}
                >
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {markets.map((market) => {
            const selected =
              normalizeAdminHomepageFareMarketCode(selectedRouteScope ?? "") ===
              normalizeAdminHomepageFareMarketCode(market.marketCode);
            return (
              <MarketReadinessRow
                key={market.marketCode}
                market={market}
                selected={selected}
                onInspectMarket={onInspectMarket}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MarketReadinessRow({
  market,
  selected,
  onInspectMarket,
}: {
  market: MarketReadiness;
  selected: boolean;
  onInspectMarket: (marketCode: string) => void;
}) {
  return (
    <tr
      data-market-row
      className={`group align-top text-slate-700 transition-colors hover:bg-slate-50/80 focus-within:bg-slate-50/80 ${selected ? "bg-indigo-50/50 font-semibold" : ""}`}
    >
      <td className="max-w-[22rem] px-5 py-4 font-medium text-slate-950">
        <h4 className="font-semibold text-slate-950">
          {market.marketLabel}
        </h4>
        <p className="mt-1 text-xs font-medium text-slate-500">
          {market.marketCode} · {market.marketGroup}
          {selected ? " · Selected" : ""}
        </p>
      </td>
      <td className="max-w-[22rem] px-5 py-4">
        {market.popularVisibleFresh + market.discoveryVisibleFresh} /{" "}
        {getPublicDisplayTarget(market)}
      </td>
      <td className="max-w-[22rem] px-5 py-4">
        {market.freshCount ?? 0}
      </td>
      <td className="max-w-[22rem] px-5 py-4">
        {market.missingCount ?? 0}
      </td>
      <td className="max-w-[22rem] px-5 py-4">
        <MarketStatusBadge status={market.status} />
      </td>
      <td className="max-w-[22rem] whitespace-nowrap px-5 py-4 text-right">
        <AdminButton
          type="button"
          onClick={() => onInspectMarket(market.marketCode)}
          aria-pressed={selected}
          variant="secondary"
          size="sm"
        >
          Inspect routes<span className="sr-only"> for {market.marketLabel}</span>
        </AdminButton>
      </td>
    </tr>
  );
}

function MarketRouteInspector({
  selectedRouteScope,
  selectedGroup,
  loading,
  onClose,
  routePage,
  onPreviousPage,
  onNextPage,
  routeDetailsRef,
}: {
  selectedRouteScope: string | null;
  selectedGroup: AdminHomepageFareMarketRouteGroup | null;
  loading: boolean;
  onClose: () => void;
  routePage: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  routeDetailsRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <AdminSectionCard className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="px-5 py-4 text-base font-semibold text-slate-950">
          Route Inspector
        </h3>
        <AdminButton
          type="button"
          onClick={onClose}
          variant="secondary"
          size="sm"
          className="me-5"
        >
          Close inspector
        </AdminButton>
      </div>

      <SelectedRouteDetails
        routeDetailsRef={routeDetailsRef}
        group={selectedGroup}
        selectedRouteScope={selectedRouteScope}
        loading={loading}
        routePage={routePage}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
      />
    </AdminSectionCard>
  );
}

function SelectedRouteDetails({
  routeDetailsRef,
  group,
  selectedRouteScope,
  loading,
  routePage,
  onPreviousPage,
  onNextPage,
}: {
  routeDetailsRef: RefObject<HTMLDivElement | null>;
  group: AdminHomepageFareMarketRouteGroup | null;
  selectedRouteScope: string | null;
  loading: boolean;
  routePage: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
}) {
  if (!selectedRouteScope || !group) {
    return (
      <div
        ref={routeDetailsRef}
        className="border-t border-slate-200 px-5 py-6 text-center"
      >
        <p className="text-sm font-semibold text-slate-950">
          Select a market to inspect its routes.
        </p>
        <p className="mt-2 text-xs font-semibold text-slate-500">
          Route rows stay hidden until a market context is selected.
        </p>
      </div>
    );
  }

  const page = paginateAdminHomepageFareRoutes(group.routes, routePage);
  return (
    <div ref={routeDetailsRef} className="min-w-0 overflow-hidden border-t border-slate-200">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h5 className="text-base font-semibold text-slate-950">
              {group.displayName} — {page.totalRoutes} total routes
            </h5>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Showing {page.start}–{page.end} of {page.totalRoutes}
              {` · ${group.marketCode}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <MarketGroupStatusBadge status={group.status} />
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <AdminButton
                type="button"
                onClick={onPreviousPage}
                disabled={!page.hasPreviousPage}
                variant="secondary"
                size="sm"
              >
                Previous
              </AdminButton>
              <span className="min-w-16 text-center">
                Page {page.currentPage} of {page.totalPages}
              </span>
              <AdminButton
                type="button"
                onClick={onNextPage}
                disabled={!page.hasNextPage}
                variant="secondary"
                size="sm"
              >
                Next
              </AdminButton>
            </div>
          </div>
        </div>
      </div>
      <RouteDetailsTable group={group} routes={page.routes} loading={loading} />
    </div>
  );
}

function RouteDetailsTable({
  group,
  routes,
  loading,
}: {
  group: AdminHomepageFareMarketRouteGroup;
  routes: AdminHomepageFareMarketRouteGroup["routes"];
  loading: boolean;
}) {
  if (!routes.length) {
    return (
      <p className="p-4 text-sm font-semibold text-slate-500">
        {loading
          ? "Loading homepage fare snapshot status…"
          : "No routes to display for this market/filter."}
      </p>
    );
  }

  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain">
      <table className="min-w-[1120px] text-left text-sm">
        <thead className="bg-slate-50/95 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="border-b border-slate-200 px-4 py-3">Market</th>
            <th className="border-b border-slate-200 px-4 py-3">Route</th>
            <th className="border-b border-slate-200 px-4 py-3">Origin</th>
            <th className="border-b border-slate-200 px-4 py-3">Destination</th>
            <th className="border-b border-slate-200 px-4 py-3">Section</th>
            <th className="border-b border-slate-200 px-4 py-3">Status</th>
            <th className="border-b border-slate-200 px-4 py-3">Display price</th>
            <th className="border-b border-slate-200 px-4 py-3">Provider native</th>
            <th className="border-b border-slate-200 px-4 py-3">Provider</th>
            <th className="border-b border-slate-200 px-4 py-3">Last refreshed</th>
            <th className="border-b border-slate-200 px-4 py-3">Reason / replacement</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {routes.map((route) => (
            <tr key={`${group.marketCode}-${route.id}`} className="align-top transition-colors hover:bg-slate-50/80">
              <td className="px-4 py-3 font-bold text-slate-950">
                {route.market}
              </td>
              <td className="px-4 py-3 font-bold text-slate-950">
                {route.label}
              </td>
              <td className="px-4 py-3 font-semibold text-slate-950">
                {route.origin}
                {route.originCity ? (
                  <span className="block text-xs font-medium text-slate-500">
                    {route.originCity}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 font-semibold text-slate-950">
                {route.destination}
                {route.destinationCity ? (
                  <span className="block text-xs font-medium text-slate-500">
                    {route.destinationCity}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 capitalize text-slate-950">
                {route.section}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={route.status} />
              </td>
              <td className="px-4 py-3 font-semibold text-slate-950">
                {formatRoutePrice(route)}
              </td>
              <td className="px-4 py-3 font-semibold text-slate-950">
                {formatProviderNativePrice(route)}
              </td>
              <td className="px-4 py-3 text-slate-950">
                {route.provider ?? "—"}
              </td>
              <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                {formatSnapshotTime(route.searchedAt)}
                {route.expiresAt ? (
                  <span className="block">
                    Expires {formatDateTime(route.expiresAt)}
                  </span>
                ) : null}
              </td>
              <td className="max-w-xs px-4 py-3 text-xs font-semibold text-slate-500">
                <SafeFailureReason route={route} />
                {route.replacementCandidateUsed ? (
                  <span className="block">
                    Replacement: {route.replacementCandidateUsed}
                  </span>
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
  const tone = status === "Ready"
    ? "good"
    : status === "Failed"
      ? "bad"
      : status === "Partially ready" || status === "Needs coverage"
        ? "warn"
        : "neutral";
  return <AdminStatusBadge tone={tone}>{status}</AdminStatusBadge>;
}

function StatusBadge({ status }: { status: HomepageFareSnapshotStatus }) {
  const tone = status === "fresh"
    ? "good"
    : status === "last_known_good" || status === "expired"
      ? "warn"
      : status === "failed"
        ? "bad"
        : "neutral";
  return <AdminStatusBadge tone={tone}>{status}</AdminStatusBadge>;
}

function MarketStatusBadge({ status }: { status: MarketReadinessStatus }) {
  return <AdminStatusBadge tone={marketStatusTone(status)}>{formatMarketStatus(status)}</AdminStatusBadge>;
}

function marketStatusTone(status: MarketReadinessStatus): "good" | "bad" | "warn" | "neutral" {
  if (status === "ready") return "good";
  if (status === "failed") return "bad";
  if (status === "underfilled" || status === "budget_exhausted" || status === "candidate_exhausted") return "warn";
  return "neutral";
}

async function fetchHomepageFareStatus(signal: AbortSignal) {
  const response = await fetch("/api/admin/homepage-fares/status", {
    credentials: "include",
    signal,
  });
  if (!response.ok) throw new Error("Homepage fare status unavailable.");
  return normalizeStatusPayload(await response.json());
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
      publicPriceDiagnostics: createEmptyPublicPriceDiagnostics(),
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
    routes,
    summary,
    health: normalizeHealth(candidate.health),
    displayReadiness: normalizeDisplayReadiness(candidate.displayReadiness),
    candidatePoolHealth: normalizeStatusSummary(
      candidate.candidatePoolHealth,
      summary.total,
    ),
    refreshBudget: normalizeRefreshBudget(candidate.refreshBudget),
    globalReadinessStatus: readGlobalReadinessStatus(
      candidate.globalReadinessStatus,
    ),
    requiredMarkets: readStringArray(candidate.requiredMarkets),
    marketTargets: normalizeMarketReadinessRecord(candidate.marketTargets),
    marketTargetMet: normalizeBooleanRecord(candidate.marketTargetMet),
    underfilledMarkets: normalizeMarketReadinessArray(
      candidate.underfilledMarkets,
    ),
    readyMarkets: readStringArray(candidate.readyMarkets),
    marketReadinessSummary: normalizeMarketReadinessArray(
      candidate.marketReadinessSummary,
    ),
    popularFreshByMarket: normalizeCountRecord(candidate.popularFreshByMarket),
    discoveryFreshByMarket: normalizeCountRecord(
      candidate.discoveryFreshByMarket,
    ),
    backupFreshByMarket: normalizeCountRecord(candidate.backupFreshByMarket),
    candidatePoolSizeByMarket: normalizeCountRecord(
      candidate.candidatePoolSizeByMarket,
    ),
    routeAttemptsByMarket: normalizeCountRecord(
      candidate.routeAttemptsByMarket,
    ),
    providerCallsByMarket: normalizeCountRecord(
      candidate.providerCallsByMarket,
    ),
    failedByMarket: normalizeCountRecord(candidate.failedByMarket),
    unavailableByMarket: normalizeCountRecord(candidate.unavailableByMarket),
    skippedCooldownByMarket: normalizeCountRecord(
      candidate.skippedCooldownByMarket,
    ),
    replacementCandidatesUsedByMarket: normalizeCountRecord(
      candidate.replacementCandidatesUsedByMarket,
    ),
    timeoutByMarket: normalizeCountRecord(candidate.timeoutByMarket),
    lastKnownGoodByMarket: normalizeCountRecord(
      candidate.lastKnownGoodByMarket,
    ),
    publicPriceDiagnostics: normalizePublicPriceDiagnostics(
      candidate.publicPriceDiagnostics,
    ),
    targetedMarkets: readStringArray(candidate.targetedMarkets),
    visibleGapsAttempted: normalizeVisibleGapAttempts(
      candidate.visibleGapsAttempted,
    ),
    replacementsUsed: normalizeReplacementUsages(candidate.replacementsUsed),
    marketsNeedingAnotherRun: normalizeMarketsNeedingAnotherRun(
      candidate.marketsNeedingAnotherRun,
    ),
    underfillCauseByMarket: normalizeUnderfillCauseRecord(
      candidate.underfillCauseByMarket,
    ),
    lastRefreshAt:
      typeof candidate.lastRefreshAt === "string"
        ? candidate.lastRefreshAt
        : undefined,
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
    globalReadinessStatus: readGlobalReadinessStatus(
      readiness.globalReadinessStatus,
    ),
    popularFresh: readCount(readiness.popularFresh),
    popularTarget:
      readCount(readiness.popularTarget) ||
      DEFAULT_DISPLAY_READINESS.popularTarget,
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

function readHealthStatus(
  value: unknown,
): HomepageFareHealthStatus | undefined {
  return value === "healthy" || value === "warning" || value === "attention"
    ? value
    : undefined;
}

function normalizeStatusRoute(
  value: unknown,
): HomepageFareStatusRoute | undefined {
  if (!value || typeof value !== "object") return undefined;

  const route = value as Partial<
    Record<keyof HomepageFareStatusRoute, unknown>
  >;
  const status = readSnapshotStatus(route.status);
  const origin = readCode(route.origin);
  const destination = readCode(route.destination);

  if (!status || !origin || !destination || typeof route.id !== "string") {
    return undefined;
  }

  return {
    id: route.id,
    market: typeof route.market === "string" ? route.market : "GLOBAL",
    label:
      typeof route.label === "string"
        ? route.label
        : `${origin} → ${destination}`,
    origin,
    destination,
    originCity:
      typeof route.originCity === "string" ? route.originCity : undefined,
    destinationCity:
      typeof route.destinationCity === "string"
        ? route.destinationCity
        : undefined,
    section: readRouteSection(route.section),
    price:
      typeof route.price === "number" && Number.isFinite(route.price)
        ? route.price
        : undefined,
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
    searchedAt:
      typeof route.searchedAt === "string" ? route.searchedAt : undefined,
    expiresAt:
      typeof route.expiresAt === "string" ? route.expiresAt : undefined,
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

function SafeFailureReason({
  route,
}: {
  route: {
    status: HomepageFareSnapshotStatus;
    errorReason?: string;
    errorCategory?: string;
  };
}) {
  if (
    (route.status !== "failed" && route.status !== "unavailable") ||
    !route.errorReason ||
    !route.errorCategory
  ) {
    return null;
  }

  return (
    <p className="mt-1 text-xs font-semibold text-slate-500">
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
    typeof value === "string" && value in SAFE_HOMEPAGE_FARE_ERROR_CATEGORIES
  );
}

function createEmptyPublicPriceDiagnostics(): Record<
  PublicPriceDiagnosis,
  number
> {
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

  const summary = value as Partial<
    Record<keyof HomepageFareStatusSummary, unknown>
  >;

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
      return "Needs coverage";
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

function normalizeUnderfillCauseRecord(
  value: unknown,
): Record<string, UnderfillCause> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([key, cause]) => [
      key,
      readUnderfillCause(cause),
    ]),
  );
}

function normalizeVisibleGapAttempts(value: unknown): VisibleGapAttempt[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const candidate = item as Record<string, unknown>;
    const market = typeof candidate.market === "string" ? candidate.market : "";
    const routeId =
      typeof candidate.routeId === "string" ? candidate.routeId : "";
    const origin = typeof candidate.origin === "string" ? candidate.origin : "";
    const destination =
      typeof candidate.destination === "string" ? candidate.destination : "";
    const section =
      candidate.section === "popular" ||
      candidate.section === "discovery" ||
      candidate.section === "backup" ||
      candidate.section === "fallback"
        ? candidate.section
        : "fallback";

    if (!market || !routeId || !origin || !destination) return [];

    return [
      {
        market,
        routeId,
        origin,
        destination,
        section,
        result:
          typeof candidate.result === "string" ? candidate.result : "skipped",
        ...(typeof candidate.replacementForRouteId === "string"
          ? { replacementForRouteId: candidate.replacementForRouteId }
          : {}),
      },
    ];
  });
}

function normalizeReplacementUsages(value: unknown): ReplacementUsage[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const candidate = item as Record<string, unknown>;
    const market = typeof candidate.market === "string" ? candidate.market : "";
    const failedRouteId =
      typeof candidate.failedRouteId === "string"
        ? candidate.failedRouteId
        : "";
    const replacementRouteId =
      typeof candidate.replacementRouteId === "string"
        ? candidate.replacementRouteId
        : "";
    const origin = typeof candidate.origin === "string" ? candidate.origin : "";
    const destination =
      typeof candidate.destination === "string" ? candidate.destination : "";

    if (
      !market ||
      !failedRouteId ||
      !replacementRouteId ||
      !origin ||
      !destination
    )
      return [];

    return [
      {
        market,
        failedRouteId,
        replacementRouteId,
        origin,
        destination,
        result:
          typeof candidate.result === "string" ? candidate.result : "skipped",
      },
    ];
  });
}

function normalizeMarketsNeedingAnotherRun(
  value: unknown,
): MarketNextRunNeed[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const candidate = item as Record<string, unknown>;
    const market = typeof candidate.market === "string" ? candidate.market : "";
    if (!market) return [];

    return [
      {
        market,
        needed: candidate.needed === true,
        reason: readUnderfillCause(candidate.reason),
      },
    ];
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
      .map(
        ([key, market]) =>
          [
            key,
            normalizeMarketReadiness(
              market && typeof market === "object" && !Array.isArray(market)
                ? { market: key, ...market }
                : market,
            ),
          ] as const,
      )
      .filter((entry): entry is readonly [string, MarketReadiness] =>
        Boolean(entry[1]),
      ),
  );
}

function normalizeMarketReadiness(value: unknown): MarketReadiness | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;

  const market = value as Partial<Record<keyof MarketReadiness, unknown>>;
  const marketCode =
    typeof market.marketCode === "string" ? market.marketCode : undefined;
  if (!marketCode) return undefined;

  const underfillReason =
    typeof market.underfillReason === "string"
      ? market.underfillReason
      : undefined;

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
  return typeof value === "string" && /^[A-Z]{3}$/.test(value)
    ? value
    : undefined;
}

function readCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function formatRoutePrice(route: {
  status: HomepageFareSnapshotStatus;
  price?: number;
  currency?: string;
}) {
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

function formatProviderNativePrice(route: {
  providerNativePrice?: number;
  providerNativeCurrency?: string;
}) {
  if (!route.providerNativePrice || !route.providerNativeCurrency) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: route.providerNativeCurrency,
    maximumFractionDigits: 0,
  }).format(route.providerNativePrice);
}

function formatSnapshotTime(value?: string) {
  if (!value) return "No snapshot yet";

  return formatDateTime(value);
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
