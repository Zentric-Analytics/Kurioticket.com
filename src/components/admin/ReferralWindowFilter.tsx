"use client";

import type { ChangeEvent } from "react";

/** Preset windows behave like the User Activity date filter: select and apply. */
export function ReferralWindowFilter({ days, embedded }: { days: number; embedded: boolean }) {
  const change = (event: ChangeEvent<HTMLSelectElement>) => {
    event.currentTarget.form?.requestSubmit();
  };
  return (
    <form action={embedded ? "/admin/providers" : "/admin/referral-attribution"}
      method="get" className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      {embedded ? <input type="hidden" name="view" value="attribution" /> : null}
      <label htmlFor="referral-window" className="text-[12px] font-medium text-[#475569]">
        Reporting window
      </label>
      <select id="referral-window" name="days" value={days} onChange={change}
        className="h-9 min-w-[160px] rounded-md border border-[#D8E1EC] bg-white px-3 text-[13px] text-[#0F172A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
        <option value="7">Last 7 days</option>
        <option value="14">Last 14 days</option>
        <option value="30">Last 30 days</option>
        <option value="60">Last 60 days</option>
        <option value="90">Last 90 days</option>
      </select>
      <noscript>
        <button type="submit" className="h-9 rounded-md bg-[#004BB8] px-3 text-[13px] font-medium text-white">
          Apply window
        </button>
      </noscript>
    </form>
  );
}
