"use client";

import { AdminCalendarInput } from "@/components/admin/AdminCalendarInput";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { shiftAdminCalendarDate } from "@/lib/adminLocalTime";
import { validAdminCustomCalendarDates } from "@/lib/adminReportingRanges";

import { AdminDirectorySelect, type AdminDirectoryOption } from "./AdminDirectorySelect";

export type EmailDeliveryRange = "today" | "24h" | "7d" | "30d" | "90d" | "custom";

type Props = {
  range: EmailDeliveryRange;
  fromDate: string;
  toDate: string;
  today: string;
  timeZone: string;
  timeZoneLabel: string;
};

const rangeOptions: readonly AdminDirectoryOption[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "custom", label: "Custom range" },
];

export function EmailDeliveryRangeFilter({ range, fromDate, toDate, today, timeZone, timeZoneLabel }: Props) {
  const router = useRouter();
  const [customOpen, setCustomOpen] = useState(false);
  const [rangeSelectVersion, setRangeSelectVersion] = useState(0);
  const initial = fromDate && toDate ? { from: fromDate, to: toDate }
    : { from: shiftAdminCalendarDate(today, -7) ?? today, to: today };
  const [draftDates, setDraftDates] = useState(initial);
  const committedDates = JSON.stringify([range, fromDate, toDate]);
  const [previousDates, setPreviousDates] = useState(committedDates);
  if (previousDates !== committedDates) {
    setPreviousDates(committedDates);
    setDraftDates(initial);
    setCustomOpen(false);
  }
  const [isPending, startTransition] = useTransition();
  const validCustom = validAdminCustomCalendarDates(draftDates.from, draftDates.to, today);

  function navigate(next: string) {
    startTransition(() => router.push(next, { scroll: false }));
  }

  function changeRange(next: string) {
    if (next === "custom") {
      setDraftDates(initial);
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
        timeZoneLabel={timeZoneLabel}
        value={range}
        options={[...rangeOptions, ...(range === "24h" ? [{ value: "24h", label: "Last 24 hrs (legacy)" }] : [])]}
        nativeExcludeValues={["custom"]}
        plain
        onValueChange={changeRange}
      />

      {(customOpen || range === "custom") ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] font-medium text-[#64748B]">
            From ({timeZoneLabel})
            <AdminCalendarInput
              ariaLabel={"Email delivery custom start date (" + timeZoneLabel + ")"}
              value={draftDates.from}
              max={draftDates.to || today}
              timeZone={timeZone}
              onChange={(event) => {
                setCustomOpen(true);
                setDraftDates((current) => ({ ...current, from: event.target.value }));
              }}
              className="w-[210px] max-w-full" />
          </label>
          <label className="text-[11px] font-medium text-[#64748B]">
            To ({timeZoneLabel})
            <AdminCalendarInput
              ariaLabel={"Email delivery custom end date (" + timeZoneLabel + ")"}
              value={draftDates.to}
              min={draftDates.from || undefined}
              max={today}
              timeZone={timeZone}
              onChange={(event) => {
                setCustomOpen(true);
                setDraftDates((current) => ({ ...current, to: event.target.value }));
              }}
              className="w-[210px] max-w-full" />
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
              setDraftDates(initial);
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
