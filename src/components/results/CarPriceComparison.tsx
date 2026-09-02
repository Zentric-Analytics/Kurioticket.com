"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export type CarComparisonSource = {
  id: string; displayName: string; logoUrl?: string; currency: string;
  totalPrice: number; perDayPrice?: number; totalDisplay: string;
  perDayDisplay?: string; priceStatus: "estimate" | "live";
  bookable: boolean; handoffAvailable: boolean;
  externalAction?: { label: string; approvedUrl: string }; disclosure: string;
};

export type CarPriceComparisonLabels = {
  source: string; estimate: string; comparePrices: string; hidePrices: string;
  liveDealsComingSoon: string; notBookable: string; total: string; perDay: string;
};

export function CarPriceComparison({ resultId, sources, labels }: {
  resultId: string; sources: CarComparisonSource[]; labels: CarPriceComparisonLabels;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = `car-price-comparison-${resultId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const estimate = sources[0];
  if (!estimate) return null;
  return <div data-car-price-comparison className="w-full">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#004BB8]">{labels.source}</span>
      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#004BB8]">{labels.estimate}</span>
    </div>
    <p className="mt-2 text-[19px] font-bold leading-none text-[#07133B] tabular-nums" dir="ltr">{estimate.totalDisplay} <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{labels.total}</span></p>
    <p className="mt-1 text-[11px] font-medium text-slate-600" dir="ltr">{estimate.perDayDisplay} {labels.perDay}</p>
    <button type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded((current) => !current)} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-[#004BB8] px-3 text-[13px] font-bold text-white transition hover:bg-[#021C2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40 focus-visible:ring-offset-2">
      {expanded ? labels.hidePrices : labels.comparePrices}
      <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
    <p className="mt-1.5 text-center text-[10px] font-medium text-slate-500">{labels.liveDealsComingSoon}</p>
    {expanded ? <div id={panelId} data-car-price-comparison-panel className="mt-3 border-t border-slate-200 pt-3">
      {sources.map((source) => <div key={source.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-start">
        <div className="min-w-0"><p className="truncate text-[11px] font-bold text-[#07133B]">{source.displayName}</p><p className="mt-0.5 text-[10px] leading-4 text-slate-500">{source.disclosure}</p></div>
        <div className="text-end"><p className="text-[13px] font-bold text-[#07133B] tabular-nums" dir="ltr">{source.totalDisplay}</p><button type="button" disabled aria-label={labels.notBookable} className="mt-1 min-h-8 cursor-not-allowed rounded-md border border-slate-200 bg-slate-100 px-2.5 text-[10px] font-bold text-slate-500">{labels.notBookable}</button></div>
      </div>)}
    </div> : null}
  </div>;
}
