"use client";

import { useState } from "react";
import { RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const DEFAULT_COUNTS: RefreshCounts = {
  refreshed: 0,
  unavailable: 0,
  failed: 0,
  skipped: 0,
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

export function HomepageFaresRefreshCard() {
  const [loading, setLoading] = useState(false);
  const [refreshState, setRefreshState] = useState<RefreshState>({
    counts: null,
    message: "",
    status: "idle",
  });

  async function refreshHomepageFares() {
    if (loading) return;

    setLoading(true);
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
    } catch {
      setRefreshState({
        counts: null,
        message:
          "Could not refresh homepage fares. Please try again or check provider status.",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-bold text-navy">Homepage fares</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Refresh cached provider-backed fares shown on homepage destination
            cards.
          </p>
        </div>
        <Button
          type="button"
          variant="accent"
          onClick={refreshHomepageFares}
          disabled={loading}
          aria-busy={loading}
          className="w-full sm:w-auto"
        >
          <RefreshCcw className={loading ? "animate-spin" : ""} size={16} />
          {loading ? "Refreshing…" : "Refresh homepage fares"}
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
    </Card>
  );
}

const COUNT_LABELS: Array<{ key: keyof RefreshCounts; label: string }> = [
  { key: "refreshed", label: "Refreshed" },
  { key: "unavailable", label: "Unavailable" },
  { key: "failed", label: "Failed" },
  { key: "skipped", label: "Skipped" },
];

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

function readCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}
