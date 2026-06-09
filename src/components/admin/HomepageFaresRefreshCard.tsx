"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  | "all_remaining_cooldown_or_unavailable";

type GlobalReadinessStatus = "ready" | "partial" | "not_ready";

type MarketReadinessStatus =
  | "ready"
  | "underfilled"
  | "provider_exhausted"
  | "budget_exhausted"
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
    () => buildAdminHomepageFareAllRoutesGroup(statusPayload.routes),
    [statusPayload.routes],
  );
  const selectedRouteGroup =
    selectedMarketCode === "ALL"
      ? allRoutesGroup
      : marketRouteGroups.find((group) => group.marketCode === selectedMarketCode) ??
        marketRouteGroups[0] ??
        allRoutesGroup;

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-bold text-navy">Homepage fares</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Refresh cached provider-backed fares shown on homepage destination
            cards and monitor the current snapshot health by route.
          </p>
        </div>
        <Button
          type="button"
          variant="accent"
          onClick={refreshHomepageFares}
          disabled={refreshing}
          aria-busy={refreshing}
          className="w-full sm:w-auto"
        >
          <RefreshCcw className={refreshing ? "animate-spin" : ""} size={16} />
          {refreshing ? "Refreshing…" : "Refresh homepage fares"}
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
        <dl className="mt-4 grid gap-2 sm:grid-cols-4">
          {COUNT_LABELS.map(({ key, label }) => (
            <div key={key} className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted">
                {label}
              </dt>
              <dd className="mt-1 text-xl font-extrabold text-navy">
                {refreshState.counts?.[key] ?? 0}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-5 border-t border-border pt-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-navy">
              Snapshot status
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              Safe operational view of Phase 3A homepage routes. Missing means a
              route does not have a current snapshot row.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void loadStatus()}
            disabled={statusState.loading || refreshing}
            aria-busy={statusState.loading}
            className="w-full sm:w-auto"
          >
            <RefreshCcw
              className={statusState.loading ? "animate-spin" : ""}
              size={16}
            />
            {statusState.loading ? "Loading…" : "Reload status"}
          </Button>
        </div>

        {statusState.error ? (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-danger">
            {statusState.error}
          </p>
        ) : null}

        <DisplayReadinessSummary readiness={statusPayload.displayReadiness} />

        <p className="mt-3 text-xs leading-5 text-muted">
          Ready means this market has enough fresh provider-backed fares to fill visible homepage pricing slots. Underfilled means this market still needs more provider-backed fare snapshots. Regional and global rows are fallback markets used when a supported country resolves to that market experience.
        </p>

        <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Popular fresh"
            value={`${statusPayload.displayReadiness.popularFresh} / ${statusPayload.displayReadiness.popularTarget}`}
          />
          <MetricCard
            label="Discover displayed"
            value={`${statusPayload.displayReadiness.discoverDisplayedFresh} / ${statusPayload.displayReadiness.discoverVisibleTarget}`}
          />
          <MetricCard
            label="Discover backup usable"
            value={statusPayload.displayReadiness.discoverBackupFresh}
          />
          <MetricCard
            label="Last-known-good"
            value={statusPayload.summary.last_known_good}
          />
          <MetricCard
            label="Total expired"
            value={statusPayload.summary.expired}
          />
        </dl>

        <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Max route attempts"
            value={statusPayload.refreshBudget.maxRouteAttemptsPerRun}
          />
          <MetricCard
            label="Max provider calls"
            value={statusPayload.refreshBudget.maxProviderCallsPerRun}
          />
          <MetricCard
            label="Max attempts / market"
            value={statusPayload.refreshBudget.maxRouteAttemptsPerMarket}
          />
          <MetricCard
            label="Total provider calls"
            value={refreshState.counts?.providerCalls ?? "—"}
          />
          <MetricCard
            label="Last refresh time"
            value={formatSnapshotTime(statusPayload.lastRefreshAt)}
          />
          <MetricCard
            label="Cron status"
            value={formatCronStatus(statusPayload)}
          />
          <MetricCard
            label="Stopped reason"
            value={refreshState.counts ? formatStoppedReason(refreshState.counts.stoppedReason) : "—"}
          />
          <MetricCard
            label="Replacement candidates used"
            value={
              refreshState.counts
                ? sumCountRecord(refreshState.counts.replacementCandidatesUsedByMarket)
                : "—"
            }
          />
        </dl>

        <dl className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {STATUS_LABELS.map(({ key, label }) => (
            <div key={key} className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted">
                {label}
              </dt>
              <dd className="mt-1 text-xl font-extrabold text-navy">
                {statusPayload.summary[key] ?? 0}
              </dd>
            </div>
          ))}
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-muted">
              Total
            </dt>
            <dd className="mt-1 text-xl font-extrabold text-navy">
              {statusPayload.summary.total}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-xs font-semibold text-muted">
          Next expected cron refresh: {statusPayload.nextExpectedCronRefresh ?? (statusPayload.cronConfigured ? "external scheduler configured; set HOMEPAGE_FARES_CRON_SCHEDULE_NOTE to show an exact cadence here" : "cron is not configured; set HOMEPAGE_FARES_CRON_SECRET and schedule POST /api/internal/homepage-fares/refresh")}.
        </p>

        <p className="mt-3 text-xs font-semibold text-muted">
          Candidate pool health: {statusPayload.candidatePoolHealth.failed} failed and {statusPayload.candidatePoolHealth.unavailable} unavailable routes remain visible here without forcing public display readiness to attention.
        </p>

        <MarketReadinessTable markets={statusPayload.marketReadinessSummary} />

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
      </div>
    </Card>
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

const STATUS_LABELS: Array<{
  key: HomepageFareSnapshotStatus;
  label: string;
}> = [
  { key: "fresh", label: "Fresh" },
  { key: "last_known_good", label: "Last-known-good" },
  { key: "expired", label: "Expired" },
  { key: "unavailable", label: "Unavailable" },
  { key: "failed", label: "Failed" },
  { key: "missing", label: "Missing" },
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
  { key: "stale", label: "Stale" },
  { key: "missing", label: "Missing" },
];

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

function MarketReadinessTable({ markets }: { markets: MarketReadiness[] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full divide-y divide-border text-left text-sm">
        <thead className="bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-3">Market</th>
            <th className="px-3 py-3">Popular</th>
            <th className="px-3 py-3">Discovery</th>
            <th className="px-3 py-3">Backup</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Attempts</th>
            <th className="px-3 py-3">Provider calls</th>
            <th className="px-3 py-3">Fresh</th>
            <th className="px-3 py-3">LKG</th>
            <th className="px-3 py-3">Missing</th>
            <th className="px-3 py-3">Failed</th>
            <th className="px-3 py-3">Unavailable</th>
            <th className="px-3 py-3">Timeout</th>
            <th className="px-3 py-3">Replacements</th>
            <th className="px-3 py-3">Cooldown</th>
            <th className="px-3 py-3">Underfill reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {markets.length ? (
            markets.map((market) => (
              <tr key={market.marketCode} className="align-top">
                <td className="px-3 py-3 font-bold text-navy">
                  <span>{market.marketCode}</span>
                  <span className="block text-xs font-semibold text-muted">
                    {market.marketLabel} · {market.marketGroup}
                  </span>
                </td>
                <td className="px-3 py-3 font-semibold text-navy">
                  {market.popularVisibleFresh}/{market.popularVisibleTarget}
                </td>
                <td className="px-3 py-3 font-semibold text-navy">
                  {market.discoveryVisibleFresh}/{market.discoveryVisibleTarget}
                </td>
                <td className="px-3 py-3 font-semibold text-navy">
                  {market.backupFresh}/{market.backupTarget}
                </td>
                <td className="px-3 py-3">
                  <MarketStatusBadge status={market.status} />
                </td>
                <td className="px-3 py-3 text-navy">{market.routeAttempts}</td>
                <td className="px-3 py-3 text-navy">{market.providerCalls}</td>
                <td className="px-3 py-3 text-navy">{market.freshCount ?? 0}</td>
                <td className="px-3 py-3 text-navy">{market.lastKnownGoodCount ?? 0}</td>
                <td className="px-3 py-3 text-navy">{market.missingCount ?? 0}</td>
                <td className="px-3 py-3 text-navy">{market.failed}</td>
                <td className="px-3 py-3 text-navy">{market.unavailable}</td>
                <td className="px-3 py-3 text-navy">{market.timeoutCount ?? 0}</td>
                <td className="px-3 py-3 text-navy">{market.replacementCandidatesUsed ?? 0}</td>
                <td className="px-3 py-3 text-navy">{market.skippedCooldown}</td>
                <td className="max-w-xs px-3 py-3 text-xs font-semibold text-muted">
                  {market.underfillReason ?? "—"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-3 py-4 font-semibold text-muted" colSpan={15}>
                No market readiness metadata was returned.
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
    case "all_remaining_cooldown_or_unavailable":
      return "Cooldown / unavailable";
    case "completed":
      return "Completed";
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
    value === "cooldown"
    ? value
    : "underfilled";
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
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
