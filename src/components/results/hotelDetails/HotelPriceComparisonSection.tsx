import { Info } from "lucide-react";
import Image from "next/image";
import type { MouseEvent, ReactNode } from "react";

import type { HotelComparisonOffer } from "./hotelDetailsPresentation";

type Price = { formatted: string; title?: string; ariaLabel: string };

type ProviderOfferPresentation = {
  id: string;
  providerName: string;
  providerLogoUrl?: string;
  priceLabel?: string;
  totalPrice: ReactNode;
  nightlyPrice?: ReactNode;
  roomName?: string;
  details: string[];
  action: ReactNode;
  disclosure?: string;
};

function ProviderOffer({ offer }: { offer: ProviderOfferPresentation }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" data-provider-offer>
      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(150px,0.75fr)_minmax(0,1.25fr)_auto] md:items-center md:gap-6">
        <div className="min-w-0">
          {offer.providerLogoUrl ? (
            <Image
              src={offer.providerLogoUrl}
              alt={offer.providerName}
              width={136}
              height={30}
              className="h-auto max-h-7 w-auto max-w-36 object-contain object-left"
            />
          ) : (
            <strong className="block text-base font-bold text-slate-950">{offer.providerName}</strong>
          )}
        </div>

        <div className="min-w-0">
          {offer.priceLabel ? <p className="text-sm font-semibold text-slate-600">{offer.priceLabel}</p> : null}
          {offer.roomName ? <p className="mt-1 text-sm font-bold text-slate-950">{offer.roomName}</p> : null}
          {offer.details.length ? <p className="mt-1 text-sm leading-5 text-slate-600">{offer.details.join(" · ")}</p> : null}
        </div>

        <div className="min-w-0 md:min-w-48 md:text-right">
          <div>{offer.totalPrice}</div>
          {offer.nightlyPrice ? <div className="mt-0.5">{offer.nightlyPrice}</div> : null}
          <div className="mt-3">{offer.action}</div>
        </div>
      </div>

      {offer.disclosure ? (
        <div className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{offer.disclosure}</p>
        </div>
      ) : null}
    </article>
  );
}

export function HotelPriceComparisonSection({
  stayContext,
  stayFacts = [],
  totalPrice,
  nightlyPrice,
  perNightText,
  viewRoomsText,
  roomOptionsAvailable,
  onViewRoomOptions,
  offers = [],
}: {
  stayContext?: string;
  stayFacts?: string[];
  totalPrice: Price | null;
  nightlyPrice: Price | null;
  perNightText: string;
  viewRoomsText: string;
  roomOptionsAvailable: boolean;
  onViewRoomOptions: (trigger: HTMLButtonElement) => void;
  offers?: HotelComparisonOffer[];
}) {
  const providerOffers: ProviderOfferPresentation[] = [
    {
      id: "kurioticket",
      providerName: "Kurioticket",
      providerLogoUrl: "/brand/kurioticket-logo-primary-light-bg.svg",
      priceLabel: "Estimated stay price",
      totalPrice: totalPrice ? (
        <strong className="block text-2xl font-extrabold tracking-tight text-slate-950" title={totalPrice.title} aria-label={totalPrice.ariaLabel}>
          {totalPrice.formatted} <span className="text-base font-bold">total</span>
        </strong>
      ) : (
        <strong className="text-sm font-semibold text-slate-600">Price unavailable</strong>
      ),
      nightlyPrice: nightlyPrice ? (
        <span className="text-sm font-semibold text-slate-600" title={nightlyPrice.title} aria-label={nightlyPrice.ariaLabel}>
          {perNightText.replace("{{price}}", nightlyPrice.formatted)}
        </span>
      ) : undefined,
      details: stayFacts.filter(Boolean),
      action: (
        <button
          type="button"
          disabled={!roomOptionsAvailable}
          onClick={(event: MouseEvent<HTMLButtonElement>) => onViewRoomOptions(event.currentTarget)}
          className="focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-[10px] bg-blue px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 md:w-auto"
        >
          {viewRoomsText}
        </button>
      ),
      disclosure: "Estimated for your selected stay. Final availability and terms may vary.",
    },
    ...offers.map((offer) => ({
      id: offer.id,
      providerName: offer.providerName,
      providerLogoUrl: offer.providerLogoUrl,
      totalPrice: <strong className="block text-xl font-extrabold text-slate-950">{offer.totalPrice}</strong>,
      nightlyPrice: <span className="text-sm font-semibold text-slate-600">{offer.nightlyPrice}</span>,
      roomName: offer.roomName,
      details: [offer.bedConfiguration, offer.mealPlanLabel, offer.cancellationLabel, offer.paymentLabel, offer.taxesAndFeesLabel].filter((detail): detail is string => Boolean(detail)),
      action: <a className="focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-[10px] bg-blue px-5 text-sm font-bold text-white md:w-auto" href={offer.deepLink}>View deal</a>,
    })),
  ];

  return (
    <section id="hotel-compare-prices" className="scroll-mt-16 border-b border-slate-200 px-4 py-7 lg:px-0 lg:py-8" aria-labelledby="hotel-compare-heading" data-hotel-compare-prices>
      <h2 id="hotel-compare-heading" className="text-xl font-extrabold tracking-tight text-slate-950">Compare prices</h2>
      {stayContext ? <p className="mt-1 text-sm font-medium text-slate-600">{stayContext}</p> : null}

      <div className="mt-5 space-y-3" data-comparison-offers>
        {providerOffers.map((offer) => <ProviderOffer key={offer.id} offer={offer} />)}
      </div>
    </section>
  );
}
