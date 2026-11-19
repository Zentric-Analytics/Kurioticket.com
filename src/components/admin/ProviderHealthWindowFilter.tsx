"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";
import { AdminCalendarInput } from "@/components/admin/AdminCalendarInput";

type Props = {
  product: string;
  hours: number;
  custom: { fromDate: string; toDate: string } | null;
};

/** Matches the existing User Activity dropdown. Presets navigate immediately,
 * while unfinished custom dates never trigger a telemetry read. */
export function ProviderHealthWindowFilter({ product, hours, custom }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selection, setSelection] = useState(custom ? "custom" : String(hours));
  const [from, setFrom] = useState(custom?.fromDate ?? "");
  const [to, setTo] = useState(custom?.toDate ?? "");
  const [error, setError] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  // URL history and product navigation can update the server scope while
  // preserving this client component instance. Reconcile its displayed draft.
  const scope = JSON.stringify([hours, custom?.fromDate, custom?.toDate]);
  const [previousScope, setPreviousScope] = useState(scope);
  if (previousScope !== scope) {
    setPreviousScope(scope);
    setSelection(custom ? "custom" : String(hours));
    setFrom(custom?.fromDate ?? "");
    setTo(custom?.toDate ?? "");
    setError("");
    setCustomOpen(false);
  }
  const options = [
    { value: "24", label: "Last 24 hrs" },
    { value: "72", label: "Last 3 days" },
    { value: "168", label: "Last 7 days" },
    { value: "custom", label: "Custom range" },
  ];
  const productQuery = product === "all" ? "" : "&product=" + encodeURIComponent(product);
  function select(value: string) {
    setSelection(value);
    setError("");
    setCustomOpen(value === "custom");
    if (value !== "custom") {
      startTransition(() => router.replace("/admin/providers?hours=" + value + productQuery, { scroll: false }));
    }
  }
  function apply() {
    if (!from || !to || from > to) {
      setError("Choose a valid start and end date.");
      return;
    }
    const dayCount = (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;
    const today = new Date().toISOString().slice(0, 10);
    if (!Number.isFinite(dayCount) || dayCount > 90 || to > today) {
      setError("Choose up to 90 days, ending no later than today.");
      return;
    }
    setError("");
    setCustomOpen(false);
    const params = new URLSearchParams({ period: "custom", from, to });
    if (product !== "all") params.set("product", product);
    startTransition(() => router.replace("/admin/providers?" + params.toString(), { scroll: false }));
  }
  return (
    <div className="relative flex min-w-0 flex-col items-end gap-2">
      <SearchMonitorSelect label="Date range" name="hours" value={selection}
        options={options} appearance="fare" align="end" onValueChange={select} truncateLabel />
      {selection === "custom" && customOpen ? (
        <div className="absolute right-0 top-full z-30 mt-2 flex w-[min(450px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-wrap items-end justify-end gap-2 rounded-xl border border-[#D8E1EC] bg-white p-3 text-[12px] shadow-[0_12px_36px_-12px_rgba(2,6,23,0.24)]">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-[#475569]">From (UTC)
            <AdminCalendarInput value={from} onValueChange={setFrom} max={to || new Date().toISOString().slice(0, 10)} ariaLabel="Provider health start date UTC" className="w-full" />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-[#475569]">To (UTC)
            <AdminCalendarInput value={to} onValueChange={setTo} min={from || undefined} max={new Date().toISOString().slice(0, 10)} ariaLabel="Provider health end date UTC" className="w-full" />
          </label>
          <div className="flex w-full justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setSelection(custom ? "custom" : String(hours)); setCustomOpen(false); setError(""); }}
              className="h-9 rounded-lg border border-[#D8E1EC] px-3 text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC]">Cancel</button>
            <button type="button" onClick={apply} disabled={pending || !from || !to}
              className="h-9 rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white hover:bg-[#003D97] disabled:opacity-50">
              {pending ? "Applying…" : "Apply range"}
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p role="alert" className="text-[12px] text-rose-700">{error}</p> : null}
      <span className="sr-only" aria-live="polite">{pending ? "Updating provider monitoring…" : ""}</span>
    </div>
  );
}
