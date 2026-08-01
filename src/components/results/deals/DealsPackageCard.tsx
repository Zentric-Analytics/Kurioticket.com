"use client";

import { AlertCircle, CalendarDays } from "lucide-react";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import type { DealsPackageCandidate } from "@/lib/deals/dealsPackageCandidates";
import { getDealsPackageCardPresentation } from "@/lib/deals/dealsPackageCardPresentation";
import { DealsPackageCarSummary } from "./DealsPackageCarSummary";
import { DealsPackageFlightSummary } from "./DealsPackageFlightSummary";
import { DealsPackageHotelSummary } from "./DealsPackageHotelSummary";
import { DealsPackagePricePanel } from "./DealsPackagePricePanel";

type Props = {
  candidate: DealsPackageCandidate;
  search: DealsSearch;
  locale: string;
  selected: boolean;
  t: (key: string) => string;
  onSelect: () => void;
};

const badgeStyle = {
  recommended: "bg-cyan-50 text-cyan-800",
  "lowest-total": "bg-emerald-50 text-emerald-800",
  comfort: "bg-indigo-50 text-indigo-800",
  alternative: "bg-slate-100 text-slate-700",
};

export function DealsPackageCard({ candidate, search, locale, selected, t, onSelect }: Props) {
  const view = getDealsPackageCardPresentation(candidate, search, locale);
  const accessibleHeading = [
    t(candidate.badgeKey),
    view.header.modeLabel,
    view.flight?.airlineLabel,
    view.hotel?.name,
    view.car?.modelLabel,
  ].filter(Boolean).join(" — ");

  return (
    <article aria-labelledby={view.headingId} aria-describedby={`${view.headingId}-summary`} className={`scroll-mt-20 overflow-hidden rounded-2xl border bg-white shadow-sm transition motion-reduce:transition-none hover:shadow-md ${selected ? "border-[#004BB8] ring-2 ring-blue-100" : "border-slate-200"}`}>
      <p id={`${view.headingId}-summary`} className="sr-only">{view.header.accessibleSummary}</p>
      <header className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-x-5 sm:px-5">
        <h2 id={view.headingId} className="sr-only">{accessibleHeading}</h2>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ${badgeStyle[candidate.strategy]}`}>{t(candidate.badgeKey)}</span>
          <span className="text-xs font-semibold text-slate-500">{view.header.modeLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700 sm:justify-end">
          <p className="flex items-center gap-2 font-semibold"><CalendarDays aria-hidden className="h-4 w-4 text-[#004BB8]" />{view.header.dateRangeLabel}</p>
          {view.header.stayDurationLabel && <p className="text-xs text-slate-500 sm:border-l sm:border-slate-300 sm:pl-3">{view.header.stayDurationLabel}</p>}
        </div>
      </header>
      {view.routeNotice && <p className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 sm:px-5"><AlertCircle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />{view.routeNotice.label}</p>}
      <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 divide-y divide-slate-200 px-4 sm:px-5">
          {view.flight && <DealsPackageFlightSummary flight={view.flight} headingId={view.headingId} t={t} />}
          {view.hotel && <DealsPackageHotelSummary hotel={view.hotel} headingId={view.headingId} t={t} />}
          {view.car && <DealsPackageCarSummary car={view.car} headingId={view.headingId} t={t} />}
        </div>
        <DealsPackagePricePanel candidate={candidate} headingId={view.headingId} selected={selected} t={t} onSelect={onSelect} />
      </div>
    </article>
  );
}
