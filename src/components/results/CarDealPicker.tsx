"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { ChevronRight, Info, X } from "lucide-react";

import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import {
  getCarDealPickerGroups,
  type CarProviderOfferGroup,
} from "@/lib/cars/carResults";
import type { CarOffer, NormalizedCarResult } from "@/lib/cars/types";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { sandboxBookingUrl } from "@/services/travel/kayakSandboxPublic";
import { getCarRateDisclosureSections, getCarRatePaymentLabel } from "@/lib/cars/carRateDisclosure";

type Props = {
  car: NormalizedCarResult;
  selectedOfferId: string;
  onSelectOffer: (offer: CarOffer) => void;
  compact?: boolean;
  desktopPanelTarget?: HTMLElement | null;
};

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
        className={`${compact ? "h-4 w-4" : "h-4 w-4"} max-w-full object-contain`}
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
  const selectedGroup = groups.find(group => group.key === detailsKey);
  const selectedOffer = selectedGroup?.primaryOffer;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedOffer && !dialog.open) dialog.showModal();
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
    <div data-car-deal-picker data-car-deal-picker-compact={compact ? "true" : undefined} className={["min-w-0", compact ? "mt-1" : "mt-1.5"].join(" ")}>
      <div
        role="list"
        aria-label="Car deal providers"
        data-car-deal-provider-offers
        className={["min-w-0", compact ? "space-y-0" : "space-y-0.5"].join(" ")}
      >
        {groups.map((group, index) => {
          const offer = group.primaryOffer;
          const bookingHref = approvedProviderBookingUrl(car, offer);
          const hasDetails = car.inventorySource === "kayak-sandbox" && Boolean(offer.suppliedFacts?.length);
          const responsiveVisibility = expanded ? "grid" : index < 3 ? "grid" : index < 5 ? "hidden md:grid" : "hidden";
          return (
            <div
              key={group.key}
              role="listitem"
              className={[
                responsiveVisibility, "min-w-0 items-center",
                compact ? "grid-cols-[minmax(0,calc(50%_+_12px))_minmax(0,1fr)] min-h-10 max-[359px]:grid-cols-1 max-[359px]:py-1"
                        : "grid-cols-[minmax(0,calc(50%_+_31px))_minmax(0,1fr)] min-h-6",
              ].join(" ")}
              data-car-deal-provider-offer
            >
              <div data-car-deal-provider-meta className={["flex min-w-0 items-center gap-1", compact ? "pr-2" : "pr-3"].join(" ")}>
                <div className={["flex min-w-0 flex-1 items-center", compact ? "gap-0.5" : "gap-1"].join(" ")}>
                  <span className={[(compact ? "h-4 w-4" : "h-4 w-4"), "inline-flex shrink-0 items-center justify-center overflow-hidden"].join(" ")}>
                    <ProviderMark group={group} compact={compact} />
                  </span>
                  <span
                    className={[(compact ? "text-[11px] leading-[15px]" : "text-[10px] leading-3"), "min-w-0 truncate whitespace-nowrap font-semibold text-[#334155]"].join(" ")}
                    title={group.providerName}
                    data-car-deal-provider-name
                  >
                    {group.providerName}
                  </span>
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
                    className={[(compact ? "text-[12px] leading-4" : "text-[11px] leading-4"), `inline-flex ${compact ? "min-h-10" : "min-h-6"} shrink-0 items-center gap-0.5 whitespace-nowrap font-semibold text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35`].join(" ")}
                    data-car-deal-provider-view-deal
                  >
                    View deal <ChevronRight size={compact ? 12 : 12} strokeWidth={2} aria-hidden="true" />
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    className={[(compact ? "text-[12px] leading-4" : "text-[10px] leading-3"), `inline-flex ${compact ? "min-h-10" : "min-h-6"} shrink-0 items-center whitespace-nowrap font-semibold text-[#94A3B8]`].join(" ")}
                    data-car-deal-provider-view-deal-unavailable
                  >
                    View deal
                  </span>
                )}
                {hasDetails ? (
                  <button
                    type="button"
                    data-car-rate-info
                    className={["ml-auto inline-flex shrink-0 items-center justify-center rounded-full text-[#64748B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40", compact ? "h-10 w-9" : "h-6 w-6"].join(" ")}
                    aria-label={"Rate information for " + group.providerName + ", " + formatOfferPrice(offer) + " per day"}
                    onClick={event => { event.stopPropagation(); setDetailsKey(group.key); }}
                  >
                    <Info size={compact ? 16 : 14} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {groups.length > 3 ? (
        <button
          type="button"
          data-car-deal-more-offers
          className="mt-1 inline-flex min-h-9 items-center gap-1 text-[10px] font-semibold text-[#004BB8] md:hidden"
          style={compact ? { fontSize: 11, lineHeight: "16px", fontWeight: 600 } : undefined}
          onClick={event => { event.stopPropagation(); setExpanded(current => !current); }}
          aria-expanded={expanded}
        >
          {expanded ? "Show fewer offers" : "+" + (groups.length - 3) + " more offers"}
          <ChevronRight size={12} className={expanded ? "-rotate-90" : "rotate-90"} aria-hidden="true" />
        </button>
      ) : null}
      {groups.length > 5 ? (
        <button
          type="button"
          data-car-deal-more-offers
          className="mt-1 hidden min-h-6 items-center gap-1 text-[10px] font-semibold text-[#004BB8] md:inline-flex"
          style={compact ? { fontSize: 11, lineHeight: "16px", fontWeight: 600 } : undefined}
          onClick={event => { event.stopPropagation(); setExpanded(current => !current); }}
          aria-expanded={expanded}
        >
          {expanded ? "Show fewer offers" : "+" + (groups.length - 5) + " more offers"}
          <ChevronRight size={12} className={expanded ? "-rotate-90" : "rotate-90"} aria-hidden="true" />
        </button>
      ) : null}
      <dialog
        ref={dialogRef}
        data-car-rate-dialog
        aria-label="Rental rate details"
        onClose={() => setDetailsKey(null)}
        onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) event.currentTarget.close(); }}
        className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-[#D8E1EC] bg-white p-4 text-[#07133B] shadow-2xl backdrop:bg-[#07133B]/55 md:inset-0 md:m-auto md:max-h-[80vh] md:w-[540px] md:max-w-[calc(100%_-_2rem)] md:rounded-2xl md:p-5"
      >
        {selectedOffer && selectedGroup ? (
          <div className="space-y-4" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-bold">Rate details</p>
                <p className="mt-1 truncate text-sm font-semibold text-[#475569]">{selectedGroup.providerName}</p>
              </div>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label="Close rate details"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#07133B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="border-y border-[#E2E8F0] py-3">
              <p className="text-xl font-bold tabular-nums">{formatOfferPrice(selectedOffer)}<span className="ml-1 text-xs font-medium text-[#64748B]">per day</span></p>
              <p className="mt-1 text-sm text-[#475569]">Estimated total: {formatTotal(selectedOffer)}</p>
              <p className="mt-1 text-xs text-[#64748B]">{getCarRatePaymentLabel(selectedOffer) ?? "Payment timing not supplied"}</p>
            </div>
            {getCarRateDisclosureSections(selectedOffer).map(section => (
              <section key={section.id} className="space-y-2" data-car-rate-section={section.id}>
                <h3 className="text-sm font-bold">{section.title}</h3>
                <dl className="space-y-2">
                  {section.facts.map((fact, index) => (
                    <div key={fact.label + ":" + index} className="grid grid-cols-[minmax(0,42%)_minmax(0,1fr)] gap-x-3 border-b border-[#F0F2F6] pb-2 text-xs">
                      <dt className="min-w-0 break-words font-semibold text-[#475569]">{fact.label}</dt>
                      <dd className="min-w-0 break-words whitespace-pre-wrap text-[#07133B]">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
            <p className="text-xs leading-5 text-[#64748B]">These conditions are specific to this offer. Confirm final terms with the rental provider before booking.</p>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
