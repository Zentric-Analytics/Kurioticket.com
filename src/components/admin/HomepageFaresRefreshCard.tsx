"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const DEFAULT_COUNTS: RefreshCounts = {
  refreshed: 0,
  unavailable: 0,
  failed: 0,
  skipped: 0,
};

const DEFAULT_STATUS_SUMMARY: HomepageFareStatusSummary = {
  fresh: 0,
  expired: 0,
  unavailable: 0,
  failed: 0,
  missing: 0,
  total: 0,
};

type RefreshCounts = {
  refreshed: number;
  unavailable: number;
  failed: number;
  skipped: number;
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
};

type HomepageFareStatusSummary = Record<HomepageFareSnapshotStatus, number> & {
  total: number;
};

type HomepageFareStatusPayload = {
  routes: HomepageFareStatusRoute[];
  summary: HomepageFareStatusSummary;
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
        message: `Homepage fares refreshed. ${counts.refreshed} refreshed, ${counts.unavailable} unavailable, ${counts.failed} failed, ${counts.skipped} skipped.`,
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

const COUNT_LABELS: Array<{ key: keyof RefreshCounts; label: string }> = [
  { key: "refreshed", label: "Refreshed" },
  { key: "unavailable", label: "Unavailable" },
  { key: "failed", label: "Failed" },
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
  };
}

function normalizeStatusPayload(payload: unknown): HomepageFareStatusPayload {
  if (!payload || typeof payload !== "object") {
    return { routes: [], summary: DEFAULT_STATUS_SUMMARY };
  }

  const candidate = payload as {
    routes?: unknown;
    summary?: unknown;
  };
  const routes = Array.isArray(candidate.routes)
    ? candidate.routes
        .map(normalizeStatusRoute)
        .filter((route): route is HomepageFareStatusRoute => Boolean(route))
    : [];

  return {
    routes,
    summary: normalizeStatusSummary(candidate.summary, routes.length),
  };
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
  };
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