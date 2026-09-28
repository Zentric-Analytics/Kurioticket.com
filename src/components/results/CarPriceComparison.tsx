"use client";

import { ChevronRight } from "lucide-react";

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

const desktopDetailsSelector =
  'a[href^="/cars/details/"], a[href^="/sandbox/kayak/details"]';

export function CarPriceComparison({
  resultId,
  sources,
  labels,
  cleanStaticSummary = false,
}: {
  resultId: string;
  sources: CarComparisonSource[];
  labels: CarPriceComparisonLabels;
  cleanStaticSummary?: boolean;
}) {
  const estimate = sources[0];
  if (!estimate) return null;

  const openDesktopDetails = (button: HTMLButtonElement) => {
    const detailsLink = button
      .closest("article")
      ?.querySelector<HTMLAnchorElement>(desktopDetailsSelector);
    detailsLink?.click();
  };

  return <div data-car-price-comparison data-result-id={resultId} className="w-full">
    {!cleanStaticSummary ? (
      <>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#004BB8]">{labels.source}</span>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#004BB8]">{labels.estimate}</span>
        </div>
        <p className="mt-2 text-[19px] font-bold leading-none text-[#07133B] tabular-nums" dir="ltr">{estimate.totalDisplay} <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{labels.total}</span></p>
      </>
    ) : null}
    {cleanStaticSummary ? (
      <p
        className="text-[#07133B]"
        dir="ltr"
      >
        <span className="text-[19px] font-bold leading-none tabular-nums">
          {estimate.perDayDisplay}
        </span>{" "}
        <span className="text-[11px] font-medium text-slate-600">
          {labels.perDay}
        </span>
      </p>
    ) : (
      <p className="mt-1 text-[11px] font-medium text-slate-600" dir="ltr">
        {estimate.perDayDisplay} {labels.perDay}
      </p>
    )}
    <button
      type="button"
      onClick={(event) => openDesktopDetails(event.currentTarget)}
      className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-[#004BB8] px-3 text-[13px] font-bold text-white transition hover:bg-[#021C2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40 focus-visible:ring-offset-2"
    >
      {labels.comparePrices}
      <ChevronRight className="h-4 w-4" aria-hidden="true" />
    </button>
    {!cleanStaticSummary ? <p className="mt-1.5 text-center text-[10px] font-medium text-slate-500">{labels.liveDealsComingSoon}</p> : null}
  </div>;
}
