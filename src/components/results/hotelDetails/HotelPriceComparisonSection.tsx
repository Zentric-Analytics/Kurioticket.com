import { Info } from "lucide-react";
import type { MouseEvent } from "react";

import type { HotelComparisonOffer } from "./hotelDetailsPresentation";

type Price = { formatted: string; title?: string; ariaLabel: string };

export function HotelPriceComparisonSection({
  stayContext,
  totalPrice,
  nightlyPrice,
  perNightText,
  planningPriceText,
  viewRoomsText,
  roomOptionsAvailable,
  onViewRoomOptions,
  offers = [],
}: {
  stayContext?: string;
  totalPrice: Price | null;
  nightlyPrice: Price | null;
  perNightText: string;
  planningPriceText: string;
  viewRoomsText: string;
  roomOptionsAvailable: boolean;
  onViewRoomOptions: (trigger: HTMLButtonElement) => void;
  offers?: HotelComparisonOffer[];
}) {
  return (
    <section id="hotel-compare-prices" className="scroll-mt-16 border-b border-slate-200 px-4 py-8 lg:px-0 lg:py-10" aria-labelledby="hotel-compare-heading" data-hotel-compare-prices>
      <h2 id="hotel-compare-heading" className="text-xl font-extrabold tracking-tight text-slate-950">Compare prices</h2>
      {stayContext ? <p className="mt-1 text-sm font-medium text-slate-600">{stayContext}</p> : null}

      <div className="mt-5 border-y border-slate-200" data-planning-price-row>
        <div className="grid min-w-0 gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <strong className="block text-base text-slate-950">Kurioticket estimate</strong>
            <span className="mt-1 block text-sm text-slate-600">Planning estimate</span>
          </div>
          <div className="sm:text-right">
            {totalPrice ? <strong className="block text-xl font-extrabold text-slate-950" title={totalPrice.title} aria-label={totalPrice.ariaLabel}>{totalPrice.formatted} total</strong> : <strong className="text-sm text-slate-600">Price unavailable</strong>}
            {nightlyPrice ? <span className="mt-1 block text-sm font-semibold text-slate-600" title={nightlyPrice.title}>{perNightText.replace("{{price}}", nightlyPrice.formatted)}</span> : null}
            <button type="button" disabled={!roomOptionsAvailable} onClick={(event: MouseEvent<HTMLButtonElement>) => onViewRoomOptions(event.currentTarget)} className="focus-ring mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{viewRoomsText}</button>
          </div>
        </div>
        <div className="flex items-start gap-2 border-t border-slate-100 py-3 text-xs leading-5 text-slate-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{stayContext ? `Based on ${stayContext}. ` : ""}{planningPriceText}</p>
        </div>
      </div>

      <div className="pt-6" data-additional-provider-prices>
        <h3 className="text-base font-bold text-slate-950">Additional booking-site prices</h3>
        {offers.length ? (
          <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200" data-live-comparison-offers>
            {offers.map((offer) => (
              <article key={offer.id} className="grid min-w-0 gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <strong className="text-sm text-slate-950">{offer.providerName}</strong>
                  {offer.roomName ? <p className="mt-1 text-sm text-slate-700">{offer.roomName}</p> : null}
                  <p className="mt-1 text-xs text-slate-600">{[offer.bedConfiguration, offer.mealPlanLabel, offer.cancellationLabel, offer.paymentLabel, offer.taxesAndFeesLabel].filter(Boolean).join(" · ")}</p>
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
          <div className="mt-3 border-l-2 border-slate-200 py-1 pl-4 text-sm leading-6 text-slate-600">
            <p>Live booking-site rates are not connected yet.</p>
            <p>Comparable provider offers will appear here when available.</p>
          </div>
        )}
        {offers.length ? <p className="mt-4 text-xs leading-5 text-slate-500">Prices are provided by booking sites. You&apos;ll complete your booking with the provider you choose.</p> : null}
      </div>
    </section>
  );
}
