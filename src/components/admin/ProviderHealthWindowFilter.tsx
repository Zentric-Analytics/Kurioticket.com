"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";

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
  const options = [
    { value: "24", label: "Last 24 hours" },
    { value: "72", label: "Last 3 days" },
    { value: "168", label: "Last 7 days" },
    { value: "custom", label: "Custom range" },
  ];
  const productQuery = product === "all" ? "" : "&product=" + encodeURIComponent(product);
  function select(value: string) {
    setSelection(value);
    setError("");
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
    const params = new URLSearchParams({ period: "custom", from, to });
    if (product !== "all") params.set("product", product);
    startTransition(() => router.replace("/admin/providers?" + params.toString(), { scroll: false }));
  }
  return (
    <div className="flex min-w-0 flex-col items-end gap-2">
      <SearchMonitorSelect label="Date range" name="hours" value={selection}
        options={options} appearance="plain" align="end" onValueChange={select} />
      {selection === "custom" ? (
        <div className="flex max-w-full flex-wrap items-end justify-end gap-2 text-[12px]">
          <label className="flex flex-col gap-1 text-[#475569]">From
            <input type="date" value={from} onChange={event => setFrom(event.target.value)}
              className="h-9 border border-[#D8E1EC] bg-white px-2 text-[13px] text-[#020617]" />
          </label>
          <label className="flex flex-col gap-1 text-[#475569]">To
            <input type="date" value={to} min={from || undefined} max={new Date().toISOString().slice(0, 10)}
              onChange={event => setTo(event.target.value)}
              className="h-9 border border-[#D8E1EC] bg-white px-2 text-[13px] text-[#020617]" />
          </label>
          <button type="button" onClick={apply} disabled={pending || !from || !to}
            className="h-9 bg-[#111827] px-4 text-[13px] font-medium text-white disabled:opacity-50">
            {pending ? "Applying…" : "Apply range"}
          </button>
        </div>
      ) : null}
      {error ? <p role="alert" className="text-[12px] text-rose-700">{error}</p> : null}
      <span className="sr-only" aria-live="polite">{pending ? "Updating provider monitoring…" : ""}</span>
    </div>
  );
}
