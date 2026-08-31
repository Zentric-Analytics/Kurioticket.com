import Image from "next/image";

import { HotelAmenityList } from "@/components/results/HotelAmenityList";
import type { HotelDetailsProviderOffer } from "./hotelDetailsPresentation";

function ProviderOffer({
  offer,
  perNightText,
  selected,
  selectable,
  onSelect,
}: {
  offer: HotelDetailsProviderOffer;
  perNightText: string;
  selected: boolean;
  selectable: boolean;
  onSelect: (offerId: string) => void;
}) {
  return (
    <label
      className={`relative block min-w-0 rounded-xl border bg-white px-3 py-4 transition sm:px-4 ${
        selected
          ? "border-[#075EE8] ring-1 ring-[#075EE8]/10"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/40"
      } ${selectable ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
      data-provider-offer
      data-provider-offer-id={offer.id}
      data-provider-selected={selected || undefined}
    >
      <input
        type="radio"
        name="hotel-provider-offer"
        value={offer.id}
        checked={selected}
        disabled={!selectable}
        onChange={() => onSelect(offer.id)}
        className="peer sr-only"
        aria-label={`Select ${offer.providerName} offer`}
      />
      <span
        className="pointer-events-none absolute inset-0 rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-[#075EE8] peer-focus-visible:ring-offset-2"
        aria-hidden="true"
      />

      <span className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto_auto_auto] gap-x-3 sm:grid-rows-[auto_auto_auto] sm:gap-x-6">
        <span className="min-w-0 self-start" data-provider-brand>
          {offer.providerLogoUrl ? (
            <Image
              src={offer.providerLogoUrl}
              alt={offer.providerName}
              width={136}
              height={30}
              className="h-auto max-h-7 w-auto max-w-32 object-contain object-left sm:max-w-36"
            />
          ) : (
            <strong className="block text-base font-bold text-slate-950">
              {offer.providerName}
            </strong>
          )}
        </span>
        <span
          className={`flex h-[22px] w-[22px] items-center justify-center justify-self-end rounded-full border-2 bg-white ${selected ? "border-[#075EE8]" : "border-slate-400"}`}
          data-provider-selector
          aria-hidden="true"
        >
          {selected ? (
            <span className="h-2.5 w-2.5 rounded-full bg-[#075EE8]" />
          ) : null}
        </span>

        <span aria-hidden="true" />
        <strong
          className="mt-3 min-w-0 text-right text-xl font-extrabold tracking-tight text-slate-950 tabular-nums"
          title={offer.nightlyPriceTitle}
          aria-label={offer.nightlyPriceAriaLabel}
          data-provider-price
          data-nightly-amount
        >
          {offer.nightlyPrice}
        </strong>

        <span
          className="col-span-2 row-start-3 mt-0.5 flex min-w-0 items-center justify-between"
          data-provider-bottom-row
        >
          <span className="min-w-0" data-provider-amenities>
            <HotelAmenityList
              items={offer.amenities ?? []}
              t={() => ""}
              className="flex min-w-0 flex-nowrap items-center gap-x-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>li]:shrink-0 [&>li>span]:whitespace-nowrap"
            />
          </span>
          <span
            className="shrink-0 whitespace-nowrap text-right text-xs font-medium leading-4 text-[#075EE8]"
            data-nightly-supporting-label
          >
            {perNightText.replace("{{price}}", "").trim()}
          </span>
        </span>
      </span>
    </label>
  );
}

export function HotelPriceComparisonSection({
  stayContext,
  perNightText,
  offers,
  selectedOfferId,
  selectableOfferIds,
  providerHandoffError,
  onSelectOffer,
}: {
  stayContext?: string;
  perNightText: string;
  offers: HotelDetailsProviderOffer[];
  selectedOfferId: string | null;
  selectableOfferIds: ReadonlySet<string>;
  providerHandoffError: string | null;
  onSelectOffer: (offerId: string) => void;
}) {
  return (
    <section
      id="hotel-compare-prices"
      className="scroll-mt-16 border-b border-slate-200 px-4 py-7 lg:px-0 lg:py-8"
      aria-labelledby="hotel-compare-heading"
      data-hotel-compare-prices
    >
      <h2
        id="hotel-compare-heading"
        tabIndex={-1}
        className="text-xl font-extrabold tracking-tight text-slate-950"
      >
        Compare prices
      </h2>
      {stayContext ? (
        <p className="mt-1 text-sm font-medium text-slate-600">{stayContext}</p>
      ) : null}
      {providerHandoffError ? (
        <p
          id="hotel-provider-handoff-error"
          role="alert"
          tabIndex={-1}
          className="mt-3 text-sm font-semibold text-red-700"
        >
          {providerHandoffError}
        </p>
      ) : null}
      <div
        role="radiogroup"
        aria-label="Hotel provider offers"
        className="-mx-1 mt-5 space-y-3 sm:mx-0"
        data-comparison-offers
      >
        {offers.map((offer) => (
          <ProviderOffer
            key={offer.id}
            offer={offer}
            perNightText={perNightText}
            selected={offer.id === selectedOfferId}
            selectable={selectableOfferIds.has(offer.id)}
            onSelect={onSelectOffer}
          />
        ))}
      </div>
    </section>
  );
}
