"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";

const presetWindows = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "60", label: "Last 60 days" },
  { value: "90", label: "Last 90 days" },
];

/**
 * Compact User Activity-style date selection. On the Providers tab, it lives
 * beside the reporting tabs and never creates an additional toolbar row.
 * The form remains as a progressive, no-JavaScript fallback.
 */
export function ReferralWindowFilter({ days, embedded }: { days: number; embedded: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const options = presetWindows.some(option => option.value === String(days))
    ? presetWindows
    : [...presetWindows, { value: String(days), label: "Last " + days + " days" }];

  const applyPreset = (value: string) => {
    const target = embedded
      ? "/admin/providers?view=attribution&days=" + encodeURIComponent(value)
      : "/admin/referral-attribution?days=" + encodeURIComponent(value);
    startTransition(() => router.replace(target, { scroll: false }));
  };

  return (
    <div className="inline-flex min-w-0 items-center">
      <div className="referral-window-enhanced">
        <SearchMonitorSelect label="Date range" name="days" value={String(days)}
          options={options} appearance="plain" align="end"
          onValueChange={applyPreset} />
      </div>
      <noscript>
        <style>{".referral-window-enhanced { display: none !important; }"}</style>
        <form action={embedded ? "/admin/providers" : "/admin/referral-attribution"} method="get"
          className="inline-flex items-center gap-2">
          {embedded ? <input type="hidden" name="view" value="attribution" /> : null}
          <label htmlFor="referral-window-fallback" className="sr-only">Date range</label>
          <select id="referral-window-fallback" name="days" defaultValue={String(days)}
            className="h-9 border-0 bg-transparent text-[13px]">
            {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <button type="submit" className="text-[13px] font-medium text-[#004BB8]">Apply</button>
        </form>
      </noscript>
      <span aria-live="polite" className="sr-only">{pending ? "Updating referral attribution…" : ""}</span>
    </div>
  );
}
