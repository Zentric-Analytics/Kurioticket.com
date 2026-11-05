"use client";

import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { AdminDirectorySelect, type AdminDirectoryOption } from "./AdminDirectorySelect";

export type EmailDeliveryRange = "24h" | "7d" | "30d" | "90d" | "custom";

type Props = {
  range: EmailDeliveryRange;
  fromDate: string;
  toDate: string;
};

const rangeOptions: readonly AdminDirectoryOption[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "custom", label: "Custom range" },
];

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z"));
}

function defaultCustomDates() {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function EmailDeliveryRangeFilter({ range, fromDate, toDate }: Props) {
  const router = useRouter();
  const [customOpen, setCustomOpen] = useState(false);
  const [rangeSelectVersion, setRangeSelectVersion] = useState(0);
  const initial = fromDate && toDate ? { from: fromDate, to: toDate } : defaultCustomDates();
  const [draftDates, setDraftDates] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const todayUtc = new Date().toISOString().slice(0, 10);
  const validCustom =
    validDate(draftDates.from) &&
    validDate(draftDates.to) &&
    draftDates.from <= draftDates.to &&
    draftDates.to <= todayUtc;

  function navigate(next: string) {
    startTransition(() => router.push(next, { scroll: false }));
  }

  function changeRange(next: string) {
    if (next === "custom") {
      setDraftDates(fromDate && toDate ? { from: fromDate, to: toDate } : defaultCustomDates());
      setCustomOpen(true);
      return;
    }

    setCustomOpen(false);
    navigate("/admin/email-delivery?range=" + next);
  }

  return (
    <div className="flex flex-wrap items-end justify-end gap-3">
      <AdminDirectorySelect
        key={range + ":" + rangeSelectVersion}
        name="range"
        label="Date range"
        value={range}
        options={rangeOptions}
        nativeExcludeValues={["custom"]}
        plain
        onValueChange={changeRange}
      />

      {(customOpen || range === "custom") ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] font-medium text-[#64748B]">
            From (UTC)
            <input
              type="date"
              aria-label="Email delivery custom start date UTC"
              value={draftDates.from}
              max={draftDates.to || todayUtc}
              onChange={(event) => {
                setCustomOpen(true);
                setDraftDates((current) => ({ ...current, from: event.target.value }));
              }}
              className="mt-1 block h-10 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] text-[#020617]"
            />
          </label>
          <label className="text-[11px] font-medium text-[#64748B]">
            To (UTC)
            <input
              type="date"
              aria-label="Email delivery custom end date UTC"
              value={draftDates.to}
              min={draftDates.from || undefined}
              max={todayUtc}
              onChange={(event) => {
                setCustomOpen(true);
                setDraftDates((current) => ({ ...current, to: event.target.value }));
              }}
              className="mt-1 block h-10 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] text-[#020617]"
            />
          </label>
          <button
            type="button"
            disabled={!validCustom || isPending}
            onClick={() => {
              setCustomOpen(false);
              navigate(
                "/admin/email-delivery?range=custom&fromDate=" +
                  encodeURIComponent(draftDates.from) +
                  "&toDate=" +
                  encodeURIComponent(draftDates.to),
              );
            }}
            className="h-10 rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply dates
          </button>
          <button
            type="button"
            onClick={() => {
              setCustomOpen(false);
              setDraftDates(fromDate && toDate ? { from: fromDate, to: toDate } : defaultCustomDates());
              setRangeSelectVersion((version) => version + 1);
            }}
            className="h-10 px-2 text-[13px] font-medium text-[#475569] hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {isPending ? (
        <span role="status" aria-live="polite" className="inline-flex h-10 items-center gap-2 text-[12px] text-[#475569]">
          <LoaderCircle size={14} className="animate-spin text-[#004BB8]" aria-hidden="true" />
          Updating…
        </span>
      ) : null}
    </div>
  );
}
