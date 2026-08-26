import { Info } from "lucide-react";

import type { HotelComparisonOffer } from "./hotelDetailsPresentation";

type Price = { formatted: string; title?: string; ariaLabel: string };

export function HotelPriceComparisonSection({
  stayContext,
  totalPrice,
  nightlyPrice,
  perNightText,
  planningPriceText,
  offers = [],
}: {
  stayContext?: string;
  totalPrice: Price | null;
  nightlyPrice: Price | null;
  perNightText: string;
  planningPriceText: string;
  offers?: HotelComparisonOffer[];
}) {
  return (
    <section className="mx-4 mt-5 rounded-[18px] border border-slate-200 bg-white p-[18px] lg:mx-0 lg:mt-6 lg:p-5" aria-labelledby="hotel-compare-heading" data-hotel-compare-prices>
      <h2 id="hotel-compare-heading" className="text-xl font-extrabold tracking-tight text-slate-950">Compare prices</h2>
      {stayContext ? <p className="mt-1 text-sm font-medium text-slate-600">{stayContext}</p> : null}

      {offers.length ? (
        <div className="mt-4 divide-y divide-slate-200" data-live-comparison-offers>
          {offers.map((offer) => (
            <article key={offer.id} className="grid min-w-0 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <strong className="text-sm text-slate-950">{offer.providerName}</strong>
                <p className="mt-1 text-xs text-slate-600">{[offer.cancellationLabel, offer.mealPlanLabel, offer.paymentLabel].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="text-left sm:text-right">
                <strong className="block text-lg text-slate-950">{offer.totalPrice}</strong>
                <span className="text-xs text-slate-600">{offer.nightlyPrice}</span>
                <a className="focus-ring mt-2 inline-flex min-h-11 items-center rounded-lg bg-blue px-4 text-sm font-bold text-white" href={offer.deepLink}>View deal</a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-slate-200 p-4" data-planning-price-row>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <strong className="block text-sm text-slate-950">Kurioticket planning estimate</strong>
              <span className="mt-1 block text-xs text-slate-600">Planning estimate</span>
            </div>
            <div className="sm:text-right">
              {totalPrice ? <strong className="block text-xl font-extrabold text-slate-950" title={totalPrice.title} aria-label={totalPrice.ariaLabel}>{totalPrice.formatted} estimated stay total</strong> : <strong className="text-sm text-slate-600">Price unavailable</strong>}
              {nightlyPrice ? <span className="mt-1 block text-sm font-semibold text-slate-700" title={nightlyPrice.title}>{perNightText.replace("{{price}}", nightlyPrice.formatted)}</span> : null}
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Compare live booking sites when provider rates are available. {planningPriceText}</p>
        </div>
      )}
    </section>
  );
}
