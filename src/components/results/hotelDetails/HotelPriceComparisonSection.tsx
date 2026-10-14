import Image from "next/image";
import { Info } from "lucide-react";
import type { ReactNode } from "react";

import type { HotelDetailsProviderOffer } from "./hotelDetailsPresentation";

function RateTerms({ offer }: { offer: HotelDetailsProviderOffer }) {
  return <span className="block min-w-0 space-y-1 text-sm text-slate-700" data-rate-terms>
    <strong className="block">{offer.roomName || "Room description not supplied"}</strong>
    {offer.suppliedRateFacts?.map((fact, index) => <span className="block" key={index}>{fact.label}: {fact.value}</span>)}
    {[offer.bedConfiguration, offer.mealPlanLabel, offer.cancellationLabel, offer.paymentLabel, offer.taxesAndFeesLabel].filter(Boolean).map((term, index) => <span className="block" key={index}>{term}</span>)}
  </span>;
}

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
      className={`relative block min-w-0 rounded-[14px] border px-3 py-3.5 transition sm:rounded-xl sm:px-4 sm:py-4 ${
        selected
          ? "border-[#075EE8] bg-[#F4F8FF] ring-1 ring-[#075EE8]/10 lg:bg-white"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/40"
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
        className="pointer-events-none absolute inset-0 rounded-[14px] peer-focus-visible:ring-2 peer-focus-visible:ring-[#075EE8] peer-focus-visible:ring-offset-2 sm:rounded-xl"
        aria-hidden="true"
      />

      <span className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto_auto] gap-x-3 sm:gap-x-6">
        <span className="min-w-0 self-start" data-provider-brand>
          {offer.providerLogoUrl ? (
            <Image
              src={offer.providerLogoUrl}
              alt={offer.providerName}
              width={136}
              height={30}
              className="h-auto max-h-7 w-auto max-w-28 object-contain object-left sm:max-w-36"
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
          className="mt-3 min-w-0 text-right text-[18px] font-extrabold leading-[22px] tracking-tight text-slate-950 tabular-nums sm:text-xl sm:leading-normal"
          title={offer.nightlyPriceTitle}
          aria-label={offer.nightlyPriceAriaLabel}
          data-provider-price
          data-nightly-amount
        >
          {offer.nightlyPrice}
        </strong>

        <span
          className="col-span-2 row-start-3 mt-1 flex min-w-0 items-center justify-between gap-3"
          data-provider-bottom-row
        >
          <span
            className="ms-auto shrink-0 whitespace-nowrap text-right text-[12px] font-medium leading-4 text-slate-600 sm:text-[#075EE8]"
            data-nightly-supporting-label
          >
            {perNightText.replace("{{price}}", "").trim()}
          </span>
        </span>
      </span>
      <RateTerms offer={offer} />
    </label>
  );
}

type ContinueOffer = (offerId: string, trigger: HTMLButtonElement) => void;
type DesktopOfferProps = {
  offer: HotelDetailsProviderOffer;
  perNightText: string;
  totalLabel: string;
  selected: boolean;
  selectable: boolean;
  pendingOfferId: string | null;
  continueLabel: string;
  onSelect: (offerId: string) => void;
  onContinue?: ContinueOffer;
  onInfo?: (trigger: HTMLButtonElement) => void;
};

export function DesktopProviderOffer({
  offer,
  selected,
  selectable,
  pendingOfferId,
  onSelect,
  onContinue,
  onInfo,
}: DesktopOfferProps) {
  const totalPrice = offer.totalPrice?.trim();
  const pending = pendingOfferId === offer.id;
  const disabled = !selectable || pendingOfferId !== null;

  return (
    <article
      className="grid min-h-[88px] min-w-0 items-center gap-6 rounded-xl border border-[#D9E2E8] bg-white px-5 py-4"
      style={{ gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)" }}
      data-provider-offer
      data-provider-offer-id={offer.id}
      data-provider-selected={selected || undefined}
      data-desktop-provider-offer
      aria-busy={pending || undefined}
    >
      <div className="flex min-w-0 items-center gap-2" data-provider-brand>
      {offer.providerLogoUrl ? <Image src={offer.providerLogoUrl} alt={offer.providerName} width={132} height={30} className="h-8 min-w-0 max-w-[132px] object-contain object-left" /> : <strong className="min-w-0 truncate text-[14px] font-semibold text-[#1a1a1a]" title={offer.providerName}>{offer.providerName}</strong>}
      <button type="button" className="focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#595959] hover:bg-[#f2f4f8]" aria-haspopup="dialog" aria-label={'Rate details for ' + (offer.roomName || offer.providerName)} onClick={event => onInfo?.(event.currentTarget)}><Info size={18} strokeWidth={1.6} /></button>
      </div>
      <div className="text-center"><strong className="block whitespace-nowrap text-[18px] font-semibold leading-6 text-[#1a1a1a] tabular-nums" data-provider-price aria-label={(totalPrice ? 'Stay total: ' : 'Per night: ') + (totalPrice || offer.nightlyPrice)}>{totalPrice || offer.nightlyPrice}</strong><span className="block text-[11px] font-normal leading-4 text-[#595959]">{totalPrice ? "Stay total" : "Per night"}</span></div>
      <button type="button" className="focus-ring inline-flex h-9 w-[112px] justify-self-end items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-4 text-[16px] font-semibold leading-5 text-white hover:bg-[#003B91] disabled:opacity-50" disabled={disabled || !onContinue} aria-label={pending ? `Opening ${offer.providerName} offer` : `View deal with ${offer.providerName}`} onClick={event => { onSelect(offer.id); onContinue?.(offer.id, event.currentTarget); }} data-provider-action>{pending ? "Opening…" : "View deal"}</button>
    </article>
  );
}

export function MobileProviderOffer({ offer, selectable, pendingOfferId, continueLabel, onSelect, onContinue, onInfo }: DesktopOfferProps & { onInfo: (trigger: HTMLButtonElement) => void }) {
  const pending = pendingOfferId === offer.id;
  const totalPrice = offer.totalPrice?.trim();
  return <article className="grid min-h-[76px] min-w-0 grid-cols-[max-content_max-content_max-content] items-baseline content-center justify-between gap-x-1 rounded-xl border border-[#D9E2E8] bg-white px-3 py-3 max-[349px]:px-2" data-provider-offer data-provider-offer-id={offer.id} aria-busy={pending || undefined}>
    <div className="flex min-w-0 items-baseline gap-0.5" data-provider-brand>
      {offer.providerLogoUrl ? <Image src={offer.providerLogoUrl} alt={offer.providerName} width={132} height={30} className="h-7 min-w-0 max-w-[80px] object-contain object-left" /> : <p className="min-w-0 whitespace-nowrap text-[12px] font-semibold leading-5 text-[#1a1a1a] max-[349px]:text-[11px]" title={offer.providerName}>{offer.providerName}</p>}

    <button type="button" className="focus-ring relative inline-flex h-5 w-6 shrink-0 items-center justify-center self-center rounded-md text-[#595959] max-[349px]:w-5" aria-haspopup="dialog" aria-label={'Rate details for ' + (offer.roomName || offer.providerName)} onClick={event => onInfo(event.currentTarget)}><Info size={18} strokeWidth={1.6} /><span className="absolute -inset-y-3 inset-x-0" aria-hidden="true" /></button>
    </div>

    <div className="justify-self-center text-center"><strong className="block whitespace-nowrap text-[16px] font-semibold leading-5 tracking-tight text-[#1a1a1a] tabular-nums max-[349px]:text-[13px] max-[349px]:leading-4" aria-label={(totalPrice ? 'Stay total: ' : 'Per night: ') + (totalPrice || offer.nightlyPrice)}>{totalPrice || offer.nightlyPrice}</strong><span className="block text-[10px] font-normal leading-4 text-[#595959] max-[349px]:text-[9px]">{totalPrice ? "Stay total" : "Per night"}</span></div>

    <button type="button" className="focus-ring inline-flex min-h-8 items-center justify-center justify-self-end whitespace-nowrap rounded-lg bg-[#004bb8] px-2.5 text-[16px] font-semibold leading-5 text-white disabled:opacity-50 max-[349px]:px-1.5 max-[349px]:text-[13px] max-[349px]:leading-4" disabled={!selectable || pendingOfferId !== null || !onContinue} aria-label={(pending ? 'Opening ' : 'View deal with ') + offer.providerName} onClick={event => { onSelect(offer.id); onContinue?.(offer.id, event.currentTarget); }} data-provider-action>{pending ? "Opening…" : continueLabel}</button>
  </article>;
}
export function HotelPriceComparisonSection({
  stayContext,
  perNightText,
  offers,
  selectedOfferId,
  selectableOfferIds,
  providerHandoffError,
  onSelectOffer,
  variant = "default",
  onContinueOffer,
  onInfoOffer,
  pendingOfferId = null,
  totalLabel = "Stay total",
  continueLabel = "View deal",
  stayEditor,
  alertControl,
}: {
  stayContext?: string;
  perNightText: string;
  offers: HotelDetailsProviderOffer[];
  selectedOfferId: string | null;
  selectableOfferIds: ReadonlySet<string>;
  providerHandoffError: string | null;
  onSelectOffer: (offerId: string) => void;
  variant?: "default" | "desktop";
  onContinueOffer?: ContinueOffer;
  onInfoOffer?: (offer: HotelDetailsProviderOffer, trigger: HTMLButtonElement) => void;
  pendingOfferId?: string | null;
  totalLabel?: string;
  continueLabel?: string;
  stayEditor?: ReactNode;
  alertControl?: ReactNode;
}) {
  const desktop = variant === "desktop";
  return (
    <section
      id="hotel-compare-prices"
      className={desktop ? "min-w-0 scroll-mt-[84px] py-5" : "scroll-mt-16 border-b border-slate-200 px-4 py-5 lg:px-0 lg:py-8"}
      aria-labelledby="hotel-compare-heading"
      data-hotel-compare-prices
    >
      <div className={desktop ? "flex flex-wrap items-center justify-between gap-3" : undefined}>
        <h2
          id="hotel-compare-heading"
          tabIndex={-1}
          className={desktop ? "text-xl font-semibold leading-7 text-[#192024]" : "text-[18px] font-extrabold tracking-tight text-slate-950 sm:text-xl"}
        >
          {desktop ? "Compare prices" : "Rates"}
        </h2>
        {desktop ? alertControl : null}
      </div>
      {desktop && stayEditor ? stayEditor : null}
      {stayContext && !(desktop && stayEditor) ? (
        <p className={desktop ? "mt-1 text-sm font-normal leading-5 text-slate-600" : "mt-1 text-[13px] font-medium leading-5 text-slate-600 sm:text-sm"}>{stayContext}</p>
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
      {desktop && offers.length === 0 ? (
        <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm font-normal leading-6 text-slate-600" role="status">
          No offers are currently available for this stay. Try different dates or another hotel.
        </p>
      ) : null}
      {offers.length ? <div
        role={desktop ? "group" : "radiogroup"}
        aria-label="Hotel provider offers"
        className={desktop ? "mt-4 w-full max-w-[680px] space-y-3" : "mt-4 space-y-2.5 sm:-mx-1 sm:mt-5 sm:space-y-3 lg:mx-0"}
        data-comparison-offers
      >
        {offers.map((offer) => desktop ? (
          <DesktopProviderOffer
            key={offer.id}
            offer={offer}
            perNightText={perNightText}
            totalLabel={totalLabel}
            selected={offer.id === selectedOfferId}
            selectable={selectableOfferIds.has(offer.id)}
            pendingOfferId={pendingOfferId}
            continueLabel={continueLabel}
            onSelect={onSelectOffer}
            onContinue={onContinueOffer}
            onInfo={trigger => onInfoOffer?.(offer, trigger)}
          />
        ) : (
          <ProviderOffer
            key={offer.id}
            offer={offer}
            perNightText={perNightText}
            selected={offer.id === selectedOfferId}
            selectable={selectableOfferIds.has(offer.id)}
            onSelect={onSelectOffer}
          />
        ))}
      </div> : !desktop ? (
        <div className="mt-4 rounded-[14px] border border-slate-200 bg-white px-4 py-4" data-hotel-rates-empty>
          <p className="text-[15px] font-bold leading-5 text-slate-950">No reservable rates available</p>
          <p className="mt-1 text-[13px] leading-5 text-slate-600">Try updating your stay or check again later.</p>
        </div>
      ) : null}
    </section>
  );
}
