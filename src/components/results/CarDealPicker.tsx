"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { CarFront, ChevronRight, IdCard, Info, MapPin, ShieldCheck, Wallet, X } from "lucide-react";

import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import {
  getCarDealPickerGroups,
  type CarProviderOfferGroup,
} from "@/lib/cars/carResults";
import type { CarOffer, NormalizedCarResult } from "@/lib/cars/types";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { sandboxBookingUrl } from "@/services/travel/kayakSandboxPublic";
import { getCarRateDisclosureSections, getCarRatePaymentLabel, type CarRateDisclosureSection } from "@/lib/cars/carRateDisclosure";

type Props = {
  car: NormalizedCarResult;
  selectedOfferId: string;
  onSelectOffer: (offer: CarOffer) => void;
  compact?: boolean;
  desktopPanelTarget?: HTMLElement | null;
};

// Keep every Cars surface at three visible offer rows by default.
// Never discard the remaining provider offers: the disclosure expands the full list.
const INITIAL_VISIBLE_OFFER_COUNT = 3;

const providerInitial = (name: string) =>
  name.trim().charAt(0).toLocaleUpperCase() || "P";

const approvedProviderBookingUrl = (
  car: NormalizedCarResult,
  offer: CarOffer,
): string | null => {
  if (!offer.bookingUrl) return null;
  if (car.inventorySource === "kayak-sandbox") {
    return sandboxBookingUrl(offer.bookingUrl);
  }
  try {
    const url = new URL(offer.bookingUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
};

function ProviderMark({
  group,
  compact,
}: {
  group: CarProviderOfferGroup;
  compact: boolean;
}) {
  const kurioticket = /kurioticket/i.test(group.providerName);
  const logoUrl = kurioticket
    ? "/brand/kurioticket-icon-blue.svg"
    : group.logoUrl;

  if (logoUrl) {
    return (
      // Provider logos can be external seller assets and must not depend on Next image host allowlists.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        className="h-4 w-4 max-w-full object-contain"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${compact ? "text-[11px]" : "text-[10px]"} font-bold text-[#07133B]`}
    >
      {providerInitial(group.providerName)}
    </span>
  );
}


const rateSectionIcons = {
  payment: Wallet,
  policies: ShieldCheck,
  pickup: MapPin,
  driver: IdCard,
  vehicle: CarFront,
  other: Info,
} as const;

function RateSectionIcon({ id }: { id: CarRateDisclosureSection["id"] }) {
  const SectionIcon = rateSectionIcons[id];
  return <SectionIcon data-car-rate-section-icon={id} aria-hidden="true" size={17} strokeWidth={1.8} className="shrink-0 text-[#64748B]" />;
}

export function CarDealPicker({
  car,
  compact = false,
}: Props) {
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const groups = useMemo(() => getCarDealPickerGroups(car), [car]);
  const [expanded, setExpanded] = useState(false);
  const [detailsKey, setDetailsKey] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogHeadingRef = useRef<HTMLHeadingElement>(null);
  const selectedGroup = groups.find(group => group.key === detailsKey);
  const selectedOffer = selectedGroup?.primaryOffer;
  const disclosureSections = selectedOffer ? getCarRateDisclosureSections(selectedOffer) : [];
  const paymentFacts = disclosureSections.find(section => section.id === "payment")?.facts ?? [];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedOffer && !dialog.open) {
      dialog.showModal();
      // Prevent Safari from auto-focusing the first button (X) and drawing a
      // persistent focus circle on a touch-opened sheet. Announce the heading
      // instead; keyboard Tab still reaches the close button normally.
      dialogHeadingRef.current?.focus({ preventScroll: true });
    }
    if (!selectedOffer && dialog.open) dialog.close();
  }, [selectedOffer]);

  const formatOfferPrice = (offer: CarOffer) =>
    formatDisplayPrice({
      amount: offer.pricePerDay,
      sourceCurrency: offer.currency,
      displayCurrency: selectedOption.currency,
      convertSourceEstimate: true,
      maximumFractionDigits: 0,
      rates: currencyRates.rates,
      isFallbackRate: currencyRates.isFallback,
    }).formatted;
  const formatTotal = (offer: CarOffer) => formatDisplayPrice({
    amount: offer.totalPrice, sourceCurrency: offer.currency,
    displayCurrency: selectedOption.currency, convertSourceEstimate: true,
    rates: currencyRates.rates, isFallbackRate: currencyRates.isFallback,
  }).formatted;
  const isolateProviderAction = (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };
  if (!groups.length) return null;

  return (
    <div data-car-deal-picker data-car-deal-picker-compact={compact ? "true" : undefined} className={["min-w-0", compact ? "mt-0.5" : "mt-1.5"].join(" ")}>
      <div
        role="list"
        aria-label="Car deal providers"
        data-car-deal-provider-offers
        className={["min-w-0 min-h-[108px] md:min-h-[76px]", compact ? "max-[359px]:min-h-[240px] space-y-0" : "space-y-0.5"].join(" ")}
      >
        {groups.map((group, index) => {
          const offer = group.primaryOffer;
          const bookingHref = approvedProviderBookingUrl(car, offer);
          const hasDetails = car.inventorySource === "kayak-sandbox" && Boolean(offer.suppliedFacts?.length);
          const responsiveVisibility = expanded || index < INITIAL_VISIBLE_OFFER_COUNT
            ? "grid"
            : "hidden";
          return (
            <div
              key={group.key}
              role="listitem"
              className={[
                responsiveVisibility, "min-w-0 items-center",
                compact ? "grid-cols-[minmax(0,calc(65%_+_20px))_minmax(0,1fr)] min-h-9 max-[359px]:grid-cols-1 max-[359px]:py-1"
                        : "grid-cols-[minmax(0,calc(50%_+_31px))_minmax(0,1fr)] min-h-6",
              ].join(" ")}
              data-car-deal-provider-offer
            >
              <div data-car-deal-provider-meta className={["flex min-w-0 items-center gap-1", compact ? "pr-2" : "pr-3"].join(" ")}>
                <div data-car-deal-provider-brand className={["flex min-w-0 flex-1 items-center", compact ? "gap-0.5" : "gap-1"].join(" ")}>
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                    <ProviderMark group={group} compact={compact} />
                  </span>
                  <span
                    className={[(compact ? "text-[11px] leading-[15px]" : "text-[10px] leading-3"), "min-w-0 truncate whitespace-nowrap font-semibold text-[#334155]"].join(" ")}
                    title={group.providerName}
                    data-car-deal-provider-name
                  >
                    {group.providerName}
                  </span>
                  {hasDetails ? (
                  <button
                    type="button"
                    data-car-rate-info
                    className={["ml-1.5 inline-flex shrink-0 items-center justify-center rounded-full text-[#64748B] hover:text-[#334155] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40", compact ? "h-9 w-8 max-[389px]:w-7" : "h-6 w-7"].join(" ")}
                    aria-label={"Rate information for " + group.providerName + ", " + formatOfferPrice(offer) + " per day"}
                    onClick={event => { event.stopPropagation(); setDetailsKey(group.key); }}
                  >
                    <Info size={compact ? 17 : 16} strokeWidth={1.9} aria-hidden="true" />
                  </button>
                  ) : null}
                </div>
                <p
                  className={[(compact ? "text-[12px] leading-[16px]" : "text-xs leading-[14px]"), "min-w-0 max-w-full truncate whitespace-nowrap font-bold tabular-nums text-[#07133B]"].join(" ")}
                  dir="ltr"
                  data-car-deal-provider-price
                >
                  {formatOfferPrice(offer)}
                  <span className={["ml-0.5 font-medium text-[#64748B]", compact ? "text-[10px]" : ""].join(" ")}>/day</span>
                </p>
              </div>
              <div data-car-deal-provider-action-slot className={["flex min-w-0 items-center justify-start gap-0.5", compact ? "max-[359px]:pl-4" : ""].join(" ")}>
                {bookingHref ? (
                  <a
                    href={bookingHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={"View deal from " + group.providerName}
                    onClick={isolateProviderAction}
                    className={[(compact ? "text-[12px] leading-4" : "text-[11px] leading-4"), `inline-flex ${compact ? "min-h-9" : "min-h-6"} shrink-0 items-center gap-0.5 whitespace-nowrap font-semibold text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35`].join(" ")}
                    data-car-deal-provider-view-deal
                  >
                    View deal <ChevronRight size={compact ? 11 : 12} strokeWidth={2} aria-hidden="true" className={compact ? "max-[409px]:hidden" : undefined} />
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    className={[(compact ? "text-[12px] leading-4" : "text-[10px] leading-3"), `inline-flex ${compact ? "min-h-9" : "min-h-6"} shrink-0 items-center whitespace-nowrap font-semibold text-[#94A3B8]`].join(" ")}
                    data-car-deal-provider-view-deal-unavailable
                  >
                    View deal
                  </span>
                )}

              </div>
            </div>
          );
        })}
      </div>
      {/* Reserve a disclosure row even when only one or two providers are available.
          This keeps collapsed three-offer cards the same height without fake offers. */}
      <div data-car-deal-more-slot className="mt-0.5 flex min-h-9 items-center md:mt-1 md:min-h-6">
        {groups.length > INITIAL_VISIBLE_OFFER_COUNT ? (
          <button
            type="button"
            data-car-deal-more-offers
            className="inline-flex min-h-9 items-center gap-1 text-[10px] font-semibold text-[#004BB8] md:min-h-6"
            style={compact ? { fontSize: 11, lineHeight: "16px", fontWeight: 600 } : undefined}
            onClick={event => { event.stopPropagation(); setExpanded(current => !current); }}
            aria-expanded={expanded}
          >
            {expanded ? "Show fewer offers" : "+" + (groups.length - INITIAL_VISIBLE_OFFER_COUNT) + " more offers"}
            <ChevronRight size={12} className={expanded ? "-rotate-90" : "rotate-90"} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <dialog
        ref={dialogRef}
        data-car-rate-dialog
        aria-label="Rental rate details"
        onClose={() => setDetailsKey(null)}
        onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) event.currentTarget.close(); }}
        className="fixed inset-0 m-0 h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-white p-0 text-[#07133B] shadow-none focus:outline-none backdrop:bg-[#07133B]/55 open:flex md:inset-0 md:m-auto md:h-auto md:max-h-[80dvh] md:w-[540px] md:max-w-[calc(100%_-_2rem)] md:rounded-2xl md:border md:border-[#D8E1EC] md:shadow-2xl"
      >
        {selectedOffer && selectedGroup ? (
          <>
            <div data-car-rate-header className="shrink-0 border-b border-[#E2E8F0] bg-white px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))] md:px-5 md:pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 ref={dialogHeadingRef} data-car-rate-heading="true" tabIndex={-1} className="text-[18px] font-semibold leading-6 tracking-tight text-[#0F172A] focus:outline-none">Rate details</h2>
                  <p className="mt-1 break-words text-[13px] font-medium leading-5 text-[#475569]">Booking provider · {selectedGroup.providerName}</p>
                  <p data-car-rate-source-note className="mt-1 text-[11px] leading-[16px] text-[#64748B]">KAYAK sandbox · Simulated rates and availability. No live booking.</p>
                </div>
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  aria-label="Close rate details"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#07133B] focus-visible:bg-slate-100 focus-visible:outline-none"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div data-car-rate-scroll className="min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain bg-white px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-4 [-webkit-overflow-scrolling:touch] md:px-5 md:pb-5">
              <div className="min-w-0" onClick={event => event.stopPropagation()}>
            <section data-car-rate-section="payment" className="border-b border-[#E2E8F0] pb-4">
              <h3 className="mb-3 flex min-w-0 items-center gap-2 text-[15px] font-semibold leading-[21px] tracking-[-0.012em] text-[#1E293B]"><RateSectionIcon id="payment" /><span className="min-w-0">Price and payment</span></h3>
              <p className="text-xl font-bold tabular-nums">{formatOfferPrice(selectedOffer)}<span className="ml-1 text-xs font-medium text-[#64748B]">per day</span></p>
              <p className="mt-1 text-sm text-[#475569]">Estimated total: {formatTotal(selectedOffer)}</p>
              <p className="mt-1 text-xs text-[#64748B]">Payment timing: {getCarRatePaymentLabel(selectedOffer) ?? "Not supplied"}</p>
              {paymentFacts.length ? (
                <dl className="mt-2 divide-y divide-[#E2E8F0]">
                  {paymentFacts.map((fact, index) => (
                    <div key={fact.label + ":" + index} data-car-rate-fact-row className="grid min-w-0 grid-cols-[minmax(0,42%)_minmax(0,1fr)] items-start gap-x-4 py-2.5 text-[13px] leading-[19px] first:pt-0">
                      <dt className="min-w-0 break-words font-normal text-[#64748B]">{fact.label}</dt>
                      <dd data-car-rate-fact-value className="min-w-0 break-words whitespace-pre-wrap text-right font-normal text-[#334155]">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </section>
            {disclosureSections.filter(section => section.id !== "payment").map(section => (
              <section key={section.id} className="min-w-0 border-b border-[#E2E8F0] py-4" data-car-rate-section={section.id}>
                <h3 className="mb-3 flex min-w-0 items-center gap-2 text-[15px] font-semibold leading-[21px] tracking-[-0.012em] text-[#1E293B]"><RateSectionIcon id={section.id} /><span className="min-w-0">{section.title}</span></h3>
                <dl className="divide-y divide-[#E2E8F0]">
                  {section.facts.map((fact, index) => (
                    <div
                      key={fact.label + ":" + index}
                      data-car-rate-fact-row
                      className="grid min-w-0 grid-cols-[minmax(0,42%)_minmax(0,1fr)] items-start gap-x-4 py-2.5 text-[13px] leading-[19px] first:pt-0"
                    >
                      <dt className="min-w-0 break-words font-normal text-[#64748B]">{fact.label}</dt>
                      <dd data-car-rate-fact-value className="min-w-0 break-words whitespace-pre-wrap text-right font-normal text-[#334155]">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
            <p className="pt-4 text-[11px] leading-[17px] text-[#64748B]">Sandbox rate information is simulated. Confirm pricing, rental eligibility, and final terms directly with the rental provider before booking.</p>
              </div>
            </div>
          </>
        ) : null}
      </dialog>
    </div>
  );
}
