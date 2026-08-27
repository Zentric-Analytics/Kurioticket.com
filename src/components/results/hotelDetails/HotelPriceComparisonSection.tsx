import Image from "next/image";
import type { MouseEvent, ReactNode } from "react";

import type { HotelAmenityPresentationItem } from "@/components/results/hotelAmenityPresentation";
import type { HotelComparisonOffer } from "./hotelDetailsPresentation";

type Price = { formatted: string; title?: string; ariaLabel: string };

type ProviderOfferPresentation = {
  id: string;
  providerName: string;
  providerLogoUrl?: string;
  amenities?: HotelAmenityPresentationItem[];
  totalPrice: ReactNode;
  nightlyPrice?: ReactNode;
  action: ReactNode;
};

function ProviderOffer({ offer }: { offer: ProviderOfferPresentation }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 sm:px-5 sm:py-4" data-provider-offer>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(8.75rem,auto)] items-center gap-3 sm:gap-6" data-provider-offer-upper>
        <div className="min-w-0 self-start sm:self-center">
          {offer.providerLogoUrl ? (
            <Image
              src={offer.providerLogoUrl}
              alt={offer.providerName}
              width={136}
              height={30}
              className="h-auto max-h-7 w-auto max-w-32 object-contain object-left sm:max-w-36"
            />
          ) : (
            <strong className="block text-base font-bold text-slate-950">{offer.providerName}</strong>
          )}
        </div>

        <div className="min-w-0 text-right sm:min-w-44">
          <div>{offer.totalPrice}</div>
          {offer.nightlyPrice ? <div className="mt-0.5">{offer.nightlyPrice}</div> : null}
        </div>
      </div>

      <div className="my-3 border-t border-slate-200" role="separator" aria-orientation="horizontal" data-provider-offer-divider />

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:gap-5" data-provider-offer-lower>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium leading-4 text-slate-600" data-provider-amenities>
          {offer.amenities?.map((amenity) => (
            <span key={amenity.key}>{amenity.label}</span>
          ))}
        </div>
        <div className="shrink-0">{offer.action}</div>
      </div>
    </article>
  );
}

export function HotelPriceComparisonSection({
  stayContext,
  totalPrice,
  nightlyPrice,
  perNightText,
  viewDealText,
  roomOptionsAvailable,
  onViewRoomOptions,
  amenities = [],
  offers = [],
}: {
  stayContext?: string;
  totalPrice: Price | null;
  nightlyPrice: Price | null;
  perNightText: string;
  viewDealText: string;
  roomOptionsAvailable: boolean;
  onViewRoomOptions: (trigger: HTMLButtonElement) => void;
  amenities?: HotelAmenityPresentationItem[];
  offers?: HotelComparisonOffer[];
}) {
  const providerOffers: ProviderOfferPresentation[] = [
    {
      id: "kurioticket",
      providerName: "Kurioticket",
      providerLogoUrl: "/brand/kurioticket-logo-primary-light-bg.svg",
      amenities: amenities.slice(0, 3),
      totalPrice: totalPrice ? (
        <strong className="block whitespace-nowrap text-lg font-bold tracking-tight text-slate-950 sm:text-xl" title={totalPrice.title} aria-label={totalPrice.ariaLabel}>
          {totalPrice.formatted} <span className="text-xs font-semibold text-slate-600">total</span>
        </strong>
      ) : (
        <strong className="text-sm font-semibold text-slate-600">Price unavailable</strong>
      ),
      nightlyPrice: nightlyPrice ? (
        <span className="text-xs font-medium text-slate-600 sm:text-[13px]" title={nightlyPrice.title} aria-label={nightlyPrice.ariaLabel}>
          {perNightText.replace("{{price}}", nightlyPrice.formatted)}
        </span>
      ) : undefined,
      action: (
        <button
          type="button"
          disabled={!roomOptionsAvailable}
          onClick={(event: MouseEvent<HTMLButtonElement>) => onViewRoomOptions(event.currentTarget)}
          className="focus-ring inline-flex min-h-11 w-auto items-center justify-center whitespace-nowrap rounded-lg bg-blue px-3 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 sm:px-3.5"
        >
          {viewDealText}
        </button>
      ),
    },
    ...offers.map((offer) => ({
      id: offer.id,
      providerName: offer.providerName,
      providerLogoUrl: offer.providerLogoUrl,
      totalPrice: <strong className="block text-xl font-extrabold text-slate-950">{offer.totalPrice}</strong>,
      nightlyPrice: <span className="text-sm font-semibold text-slate-600">{offer.nightlyPrice}</span>,
      action: <a className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-[10px] bg-blue px-4 text-sm font-bold text-white" href={offer.deepLink}>View deal</a>,
    })),
  ];

  return (
    <section id="hotel-compare-prices" className="scroll-mt-16 border-b border-slate-200 px-4 py-7 lg:px-0 lg:py-8" aria-labelledby="hotel-compare-heading" data-hotel-compare-prices>
      <h2 id="hotel-compare-heading" className="text-xl font-extrabold tracking-tight text-slate-950">Compare prices</h2>
      {stayContext ? <p className="mt-1 text-sm font-medium text-slate-600">{stayContext}</p> : null}

      <div className="-mx-1 mt-5 space-y-3 sm:mx-0" data-comparison-offers>
        {providerOffers.map((offer) => <ProviderOffer key={offer.id} offer={offer} />)}
      </div>
    </section>
  );
}
