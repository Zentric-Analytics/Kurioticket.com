"use client";

import { AdminCalendarInput } from "@/components/admin/AdminCalendarInput";
import { adminCalendarDate } from "@/lib/adminTimeZone";
import { useAdminTimeZone } from "./AdminTimeZoneProvider";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { AdminDirectorySelect, type AdminDirectoryOption } from "./AdminDirectorySelect";

export type EmailDeliveryRange = "today" | "24h" | "7d" | "30d" | "90d" | "custom";

type Props = {
  range: EmailDeliveryRange;
  fromDate: string;
  toDate: string;
};

const rangeOptions: readonly AdminDirectoryOption[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "custom", label: "Custom range" },
];

function validDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function defaultCustomDates(timeZone: string) {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    from: adminCalendarDate(from, timeZone),
    to: adminCalendarDate(to, timeZone),
  };
}

export function EmailDeliveryRangeFilter({ range, fromDate, toDate }: Props) {
  const router = useRouter();
  const timeZone = useAdminTimeZone();
  const [customOpen, setCustomOpen] = useState(false);
  const [rangeSelectVersion, setRangeSelectVersion] = useState(0);
  const initial = fromDate && toDate ? { from: fromDate, to: toDate } : defaultCustomDates(timeZone);
  const [draftDates, setDraftDates] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const todayLocal = adminCalendarDate(new Date(), timeZone);
  const validCustom =
    validDate(draftDates.from) &&
    validDate(draftDates.to) &&
    draftDates.from <= draftDates.to &&
    draftDates.to <= todayLocal;

  function navigate(next: string) {
    startTransition(() => router.push(next, { scroll: false }));
  }

  function changeRange(next: string) {
    if (next === "custom") {
      setDraftDates(fromDate && toDate ? { from: fromDate, to: toDate } : defaultCustomDates(timeZone));
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
        options={[...rangeOptions, ...(range === "24h" ? [{ value: "24h", label: "Last 24 hrs (legacy)" }] : [])]}
        nativeExcludeValues={["custom"]}
        plain
        onValueChange={changeRange}
      />

      {(customOpen || range === "custom") ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] font-medium text-[#64748B]">
            From (local)
            <AdminCalendarInput timeZone="local"
              ariaLabel="Email delivery custom start date local"
              value={draftDates.from}
              max={draftDates.to || todayLocal}
              onChange={(event) => {
                setCustomOpen(true);
                setDraftDates((current) => ({ ...current, from: event.target.value }));
              }}
              className="w-[210px] max-w-full" />
          </label>
          <label className="text-[11px] font-medium text-[#64748B]">
            To (local)
            <AdminCalendarInput timeZone="local"
              ariaLabel="Email delivery custom end date local"
              value={draftDates.to}
              min={draftDates.from || undefined}
              max={todayLocal}
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
              setDraftDates(fromDate && toDate ? { from: fromDate, to: toDate } : defaultCustomDates(timeZone));
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
