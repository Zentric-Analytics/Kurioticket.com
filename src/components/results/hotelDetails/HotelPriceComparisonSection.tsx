import Image from "next/image";
import type { MouseEvent, ReactNode } from "react";

import { HotelAmenityList } from "@/components/results/HotelAmenityList";
import type { HotelAmenityPresentationItem } from "@/components/results/hotelAmenityPresentation";
import type { HotelComparisonOffer } from "./hotelDetailsPresentation";

type Price = { formatted: string; title?: string; ariaLabel: string };

type ProviderOfferPresentation = {
  id: string;
  providerName: string;
  providerLogoUrl?: string;
  amenities?: HotelAmenityPresentationItem[];
  price: ReactNode;
  secondaryPrice?: ReactNode;
  action: ReactNode;
};

function ProviderOffer({ offer }: { offer: ProviderOfferPresentation }) {
  return (
    <article className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(8.5rem,auto)] gap-x-3 gap-y-3 rounded-xl border border-slate-200 bg-white px-4 py-4 sm:gap-x-6 sm:px-5" data-provider-offer>
        <div className="min-w-0 self-center" data-provider-brand>
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

        <div className="row-span-2 flex min-w-0 flex-col items-end justify-center gap-2.5 text-right sm:min-w-44" data-provider-price-action>
          <div>{offer.price}</div>
          {offer.secondaryPrice ? <div>{offer.secondaryPrice}</div> : null}
          <div className="shrink-0">{offer.action}</div>
        </div>
        <div className="col-span-2 min-w-0 sm:col-span-1" data-provider-amenities>
          <HotelAmenityList
            items={offer.amenities ?? []}
            t={() => ""}
            className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5"
          />
        </div>
    </article>
  );
}

export function HotelPriceComparisonSection({
  stayContext,
  nightlyPrice,
  perNightText,
  viewDealText,
  roomOptionsAvailable,
  onViewRoomOptions,
  amenities = [],
  offers = [],
}: {
  stayContext?: string;
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
      price: nightlyPrice ? (
        <strong className="block whitespace-nowrap text-base font-bold tracking-tight text-slate-950 sm:text-lg" title={nightlyPrice.title} aria-label={nightlyPrice.ariaLabel}>
          {perNightText.replace("{{price}}", nightlyPrice.formatted)}
        </strong>
      ) : (
        <strong className="text-sm font-semibold text-slate-600">Price unavailable</strong>
      ),
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
      price: <strong className="block text-xl font-extrabold text-slate-950">{offer.totalPrice}</strong>,
      secondaryPrice: <span className="text-sm font-semibold text-slate-600">{offer.nightlyPrice}</span>,
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
