"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const DEFAULT_REFRESH_BUDGET: RefreshBudget = {
  popularVisibleTarget: 5,
  discoverVisibleTarget: 16,
  discoverBackupFreshTarget: 3,
  maxRouteAttemptsPerRun: 28,
  maxProviderCallsPerRun: 84,
  maxDateCandidatesPerRoute: 3,
};

const DEFAULT_READINESS_COUNTS: RefreshReadinessCounts = {
  freshPopular: 0,
  freshDiscover: 0,
  freshDiscoverDisplayed: 0,
  freshDiscoverBackup: 0,
  publicFreshTarget: 21,
  operationalFreshTarget: 24,
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
  readinessBefore: DEFAULT_READINESS_COUNTS,
  readinessAfter: DEFAULT_READINESS_COUNTS,
  refreshBudget: DEFAULT_REFRESH_BUDGET,
};

const DEFAULT_STATUS_SUMMARY: HomepageFareStatusSummary = {
  fresh: 0,
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
  popularFresh: 0,
  popularTarget: 5,
  discoverFresh: 0,
  discoverVisibleTarget: 16,
  discoverDisplayedFresh: 0,
  discoverBackupFresh: 0,
  publicFreshTarget: 21,
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
  | "completed";

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
  maxDateCandidatesPerRoute: number;
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
  readinessBefore: RefreshReadinessCounts;
  readinessAfter: RefreshReadinessCounts;
  refreshBudget: RefreshBudget;
};

type RefreshState = {
  counts: RefreshCounts | null;
  message: string;
  status: "idle" | "success" | "error";
};

type HomepageFareSnapshotStatus =
  | "fresh"
  | "expired"
  | "unavailable"
  | "failed"
  | "missing";

type HomepageFareStatusRoute = {
  id: string;
  label: string;
  origin: string;
  destination: string;
  price?: number;
  currency?: string;
  status: HomepageFareSnapshotStatus;
  providerBacked: boolean;
  searchedAt?: string;
  expiresAt?: string;
  errorReason?: SafeHomepageFareErrorReason;
  errorCategory?: SafeHomepageFareErrorCategory;
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
  };

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
            label="Discover backup fresh"
            value={statusPayload.displayReadiness.discoverBackupFresh}
          />
          <MetricCard
            label="Public fresh target"
            value={statusPayload.displayReadiness.publicFreshTarget}
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
            label="Provider calls used"
            value={refreshState.counts?.providerCalls ?? "—"}
          />
          <MetricCard
            label="Stopped reason"
            value={refreshState.counts ? formatStoppedReason(refreshState.counts.stoppedReason) : "—"}
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
          Candidate pool health: {statusPayload.candidatePoolHealth.failed} failed and {statusPayload.candidatePoolHealth.unavailable} unavailable routes remain visible here without forcing public display readiness to attention.
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <div className="hidden grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-muted md:grid">
            <span>Route</span>
            <span>Pair</span>
            <span>Price</span>
            <span>Status</span>
          </div>
          {statusPayload.routes.length ? (
            <div className="divide-y divide-border">
              {statusPayload.routes.map((route) => (
                <div
                  key={route.id}
                  className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr] md:items-center"
                >
                  <div>
                    <p className="font-bold text-navy">{route.label}</p>
                    <p className="mt-1 text-xs text-muted">
                      {formatSnapshotTime(route.searchedAt)}
                    </p>
                  </div>
                  <p className="font-semibold text-navy">
                    {route.origin} → {route.destination}
                  </p>
                  <p className="font-semibold text-navy">
                    {formatRoutePrice(route)}
                  </p>
                  <div>
                    <StatusBadge status={route.status} />
                    {route.expiresAt ? (
                      <p className="mt-1 text-xs text-muted">
                        Expires {formatDateTime(route.expiresAt)}
                      </p>
                    ) : null}
                    <SafeFailureReason route={route} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-4 text-sm font-semibold text-muted">
              {statusState.loading
                ? "Loading homepage fare snapshot status…"
                : "No homepage fare routes are configured for the status panel."}
            </p>
          )}
        </div>
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
  { key: "expired", label: "Expired" },
  { key: "unavailable", label: "Unavailable" },
  { key: "failed", label: "Failed" },
  { key: "missing", label: "Missing" },
];

const STATUS_BADGE_STYLES: Record<HomepageFareSnapshotStatus, string> = {
  fresh: "bg-teal/10 text-teal-dark",
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
    };
  }

  const candidate = payload as {
    routes?: unknown;
    summary?: unknown;
    health?: unknown;
    displayReadiness?: unknown;
    candidatePoolHealth?: unknown;
    refreshBudget?: unknown;
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
  };
}

function normalizeDisplayReadiness(value: unknown): DisplayReadiness {
  if (!value || typeof value !== "object") return DEFAULT_DISPLAY_READINESS;

  const readiness = value as Partial<Record<keyof DisplayReadiness, unknown>>;
  const health = normalizeHealth(value);

  return {
    ...health,
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
    maxDateCandidatesPerRoute:
      readCount(budget.maxDateCandidatesPerRoute) ||
      DEFAULT_REFRESH_BUDGET.maxDateCandidatesPerRoute,
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
    label: typeof route.label === "string" ? route.label : `${origin} → ${destination}`,
    origin,
    destination,
    price: typeof route.price === "number" && Number.isFinite(route.price) ? route.price : undefined,
    currency: readCode(route.currency),
    status,
    providerBacked: route.providerBacked === true,
    searchedAt: typeof route.searchedAt === "string" ? route.searchedAt : undefined,
    expiresAt: typeof route.expiresAt === "string" ? route.expiresAt : undefined,
    ...readSafeHomepageFareStatusRouteError({
      status,
      errorReason: route.errorReason,
      errorCategory: route.errorCategory,
    }),
  };
}

function SafeFailureReason({ route }: { route: HomepageFareStatusRoute }) {
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
    value === "completed"
    ? value
    : "completed";
}

function formatStoppedReason(reason: RefreshStoppedReason) {
  switch (reason) {
    case "target_met":
      return "Target met";
    case "route_budget_exhausted":
      return "Route budget exhausted";
    case "provider_budget_exhausted":
      return "Provider budget exhausted";
    case "completed":
      return "Completed";
  }
}

function readSnapshotStatus(
  value: unknown,
): HomepageFareSnapshotStatus | undefined {
  return value === "fresh" ||
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

function readCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function formatRoutePrice(route: HomepageFareStatusRoute) {
  if (route.status !== "fresh" || !route.price || !route.currency) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: route.currency,
    maximumFractionDigits: 0,
  }).format(route.price);
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