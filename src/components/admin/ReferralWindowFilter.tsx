"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { formatAdminTimeZoneLabel } from "@/lib/adminLocalTime";
import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";

const presetWindows = [
  { value: "today", label: "Today" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
];

/**
 * Compact User Activity-style date selection. On the Providers tab, it lives
 * beside the reporting tabs and never creates an additional toolbar row.
 * The form remains as a progressive, no-JavaScript fallback.
 */
export function ReferralWindowFilter({ days, embedded, period = "rolling", timeZone = "UTC" }: { days: number; embedded: boolean; period?: "today" | "rolling"; timeZone?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const timeZoneLabel = formatAdminTimeZoneLabel(timeZone);
  const options = [...presetWindows,
    ...(period === "rolling" && days === 1 ? [{ value: "1", label: "Last 24 hrs (legacy)" }] : []),
    ...(![1, 7, 30].includes(days) ? [{ value: String(days), label: "Last " + days + " days (legacy)" }] : [])];

  const selectedValue = period === "today" ? "today" : String(days);
  const applyPreset = (value: string) => {
    const query = value === "today" ? "period=today" : "days=" + encodeURIComponent(value);
    const target = embedded
      ? "/admin/providers?view=attribution&" + query
      : "/admin/referral-attribution?" + query;
    startTransition(() => router.replace(target, { scroll: false }));
  };

  return (
    <div className="inline-flex min-w-0 items-center">
      <div className="referral-window-enhanced">
        <SearchMonitorSelect label="Date range" name="days" value={selectedValue}
          options={options} appearance="plain" align="end" timeZoneLabel={timeZoneLabel}
          onValueChange={applyPreset} />
      </div>
      <noscript>
        <style>{".referral-window-enhanced { display: none !important; }"}</style>
        <form action={embedded ? "/admin/providers" : "/admin/referral-attribution"} method="get"
          className="inline-flex items-center gap-2">
          {embedded ? <input type="hidden" name="view" value="attribution" /> : null}
          <div className="min-w-0">
            <label htmlFor="referral-window-fallback" className="sr-only">Date range</label>
            <select id="referral-window-fallback" name="days" defaultValue={selectedValue}
              aria-describedby="referral-window-fallback-zone" className="h-8 border-0 bg-transparent text-[13px]">
              {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <span id="referral-window-fallback-zone" className="block text-[10px] text-[#475569]">{timeZoneLabel}</span>
          </div>
          <button type="submit" className="text-[13px] font-medium text-[#004BB8]">Apply</button>
        </form>
      </noscript>
      <span aria-live="polite" className="sr-only">{pending ? "Updating referral attribution…" : ""}</span>
    </div>
  );
}
