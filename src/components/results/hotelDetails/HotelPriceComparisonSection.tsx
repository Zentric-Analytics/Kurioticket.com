import Image from "next/image";
import type { MouseEvent } from "react";

import { HotelAmenityList } from "@/components/results/HotelAmenityList";
import type { HotelDetailsProviderOffer } from "./hotelDetailsPresentation";

function ProviderOffer({
  offer,
  viewDealText,
  perNightText,
  internalRoomFlowAvailable,
  pendingProviderOfferId,
  onInternalRoomFlow,
  onProviderOfferHandoff,
}: {
  offer: HotelDetailsProviderOffer;
  viewDealText: string;
  perNightText: string;
  internalRoomFlowAvailable: boolean;
  pendingProviderOfferId: string | null;
  onInternalRoomFlow: (trigger: HTMLButtonElement) => void;
  onProviderOfferHandoff: (providerOfferId: string) => Promise<void>;
}) {
  const detailLabels = [
    offer.roomName,
    offer.bedConfiguration,
    offer.mealPlanLabel,
    offer.cancellationLabel,
    offer.paymentLabel,
    offer.taxesAndFeesLabel,
  ].filter((label): label is string => Boolean(label));
  const providerOfferId =
    offer.action.kind === "provider-handoff"
      ? offer.action.providerOfferId
      : null;
  const pending =
    providerOfferId !== null && providerOfferId === pendingProviderOfferId;
  const disabled =
    offer.action.kind === "internal-room-flow"
      ? !internalRoomFlowAvailable
      : pendingProviderOfferId !== null;

  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white px-3 py-4 sm:px-4" data-provider-offer data-provider-offer-id={offer.id}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(7.5rem,auto)] items-center gap-x-3 sm:gap-x-6" data-provider-top-row>
        <div className="min-w-0" data-provider-brand>
          {offer.providerLogoUrl ? (
            <Image src={offer.providerLogoUrl} alt={offer.providerName} width={136} height={30} className="h-auto max-h-7 w-auto max-w-32 object-contain object-left sm:max-w-36" />
          ) : (
            <strong className="block text-base font-bold text-slate-950">{offer.providerName}</strong>
          )}
        </div>
        <div className="min-w-0 text-right" data-provider-price>
          <strong className="block text-xl font-extrabold tracking-tight text-slate-950" title={offer.nightlyPriceTitle} aria-label={offer.nightlyPriceAriaLabel} data-nightly-amount>
            {offer.nightlyPrice}
          </strong>
        </div>
      </div>

      <div className="mt-0.5 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(7.5rem,auto)] gap-x-3 sm:gap-x-6" data-provider-secondary-price-row>
        <div aria-hidden="true" />
        <div className="min-w-0 text-right" data-provider-secondary-price>
          <span className="block text-xs font-medium leading-4 text-slate-600" data-nightly-supporting-label>{perNightText.replace("{{price}}", "").trim()}</span>
        </div>
      </div>

      <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(7.5rem,auto)] items-center gap-x-3 sm:gap-x-6" data-provider-bottom-row>
        <div className="min-w-0" data-provider-amenities>
          <HotelAmenityList items={offer.amenities ?? []} t={() => ""} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5" />
          {detailLabels.length ? <p className="mt-1 text-xs leading-5 text-slate-600">{detailLabels.join(" · ")}</p> : null}
        </div>
        <div className="shrink-0 justify-self-end" data-provider-action>
          <button
            type="button"
            disabled={disabled}
            aria-busy={pending || undefined}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              if (offer.action.kind === "internal-room-flow") onInternalRoomFlow(event.currentTarget);
              else void onProviderOfferHandoff(offer.action.providerOfferId);
            }}
            className="focus-ring inline-flex min-h-11 w-auto items-center justify-center whitespace-nowrap rounded-lg bg-blue px-3 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 sm:px-3.5"
          >
            {pending ? "Opening…" : viewDealText}
          </button>
        </div>
      </div>
    </article>
  );
}

export function HotelPriceComparisonSection({
  stayContext,
  viewDealText,
  perNightText,
  internalRoomFlowAvailable,
  offers,
  pendingProviderOfferId,
  providerHandoffError,
  onInternalRoomFlow,
  onProviderOfferHandoff,
}: {
  stayContext?: string;
  viewDealText: string;
  perNightText: string;
  internalRoomFlowAvailable: boolean;
  offers: HotelDetailsProviderOffer[];
  pendingProviderOfferId: string | null;
  providerHandoffError: string | null;
  onInternalRoomFlow: (trigger: HTMLButtonElement) => void;
  onProviderOfferHandoff: (providerOfferId: string) => Promise<void>;
}) {
  return (
    <section id="hotel-compare-prices" className="scroll-mt-16 border-b border-slate-200 px-4 py-7 lg:px-0 lg:py-8" aria-labelledby="hotel-compare-heading" data-hotel-compare-prices>
      <h2 id="hotel-compare-heading" tabIndex={-1} className="text-xl font-extrabold tracking-tight text-slate-950">Compare prices</h2>
      {stayContext ? <p className="mt-1 text-sm font-medium text-slate-600">{stayContext}</p> : null}
      {providerHandoffError ? <p id="hotel-provider-handoff-error" role="alert" tabIndex={-1} className="mt-3 text-sm font-semibold text-red-700">{providerHandoffError}</p> : null}
      <div className="-mx-1 mt-5 space-y-3 sm:mx-0" data-comparison-offers>
        {offers.map((offer) => (
          <ProviderOffer
            key={offer.id}
            offer={offer}
            viewDealText={viewDealText}
            perNightText={perNightText}
            internalRoomFlowAvailable={internalRoomFlowAvailable}
            pendingProviderOfferId={pendingProviderOfferId}
            onInternalRoomFlow={onInternalRoomFlow}
            onProviderOfferHandoff={onProviderOfferHandoff}
          />
        ))}
      </div>
    </section>
  );
}
