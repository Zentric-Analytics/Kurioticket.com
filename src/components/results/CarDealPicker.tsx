"use client";

import { useId, useMemo, useState, type MouseEvent } from "react";
import { ChevronRight } from "lucide-react";

import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import {
  getCarDealPickerGroups,
  type CarProviderOfferGroup,
} from "@/lib/cars/carResults";
import type { CarOffer, NormalizedCarResult } from "@/lib/cars/types";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { sandboxBookingUrl } from "@/services/travel/kayakSandboxPublic";
import { formatCarSupplierFacts } from "@/lib/cars/supplierFacts";

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
        className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} max-w-full object-contain`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${compact ? "text-[9px]" : "text-[10px]"} font-bold text-[#07133B]`}
    >
      {providerInitial(group.providerName)}
    </span>
  );
}

function CarRateDetails({ id, offer, seller, total, payment }: {
  id: string; offer: CarOffer; seller: string; total: string; payment: string;
}) {
  const [open, setOpen] = useState(false);
  if (!offer.suppliedFacts?.length) return null;
  return <>
    <button type="button" popoverTarget={id} onClick={event => event.stopPropagation()}
      aria-label={`Rate details from ${seller}, ${total} total, ${payment}`}
      className="min-h-11 text-xs font-semibold text-[#004BB8] underline">Rate details</button>
    <div id={id} popover="auto" aria-label={`Rate details from ${seller}`}
      onToggle={event => setOpen(event.currentTarget.matches(":popover-open"))}
      className="fixed inset-0 m-auto max-h-[80vh] w-[calc(100vw-2rem)] max-w-lg overflow-auto rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold">{seller} — {total} total</h3>
        <button type="button" popoverTarget={id} popoverTargetAction="hide" className="min-h-11 shrink-0 text-blue-700">Close</button>
      </div>
      <p className="mb-3">Specifications and conditions for this offer</p>
      {open && <dl className="space-y-3">{formatCarSupplierFacts(offer.suppliedFacts)?.map((fact, index) => <div key={index} className="break-words">
        <dt className="font-semibold">{fact.label}</dt><dd className="whitespace-pre-wrap">{fact.value}</dd>
      </div>)}</dl>}
    </div>
  </>;
}

export function CarDealPicker({
  car,
  compact = false,
}: Props) {
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const detailsId = useId();
  const groups = useMemo(() => getCarDealPickerGroups(car), [car]);
  if (!groups.length) return null;

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

  const isolateProviderAction = (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };
  const formatTotal = (offer: CarOffer) => formatDisplayPrice({
    amount: offer.totalPrice, sourceCurrency: offer.currency,
    displayCurrency: selectedOption.currency, convertSourceEstimate: true,
    rates: currencyRates.rates, isFallbackRate: currencyRates.isFallback,
  }).formatted;
  const paymentLabel = (offer: CarOffer) => {
    const value = offer.suppliedFacts?.find(fact => fact.label === "payment Type")?.value;
    return value === "prepay" ? "Pay now" : value === "payAtPickup" ? "Pay at pickup" : value === "deposit" ? "Deposit payment" : "";
  };

  return (
    <div
      data-car-deal-picker
      className={`min-w-0 ${compact ? "mt-1" : "mt-1.5"}`}
    >
      <div
        className={`min-w-0 ${compact ? "space-y-0" : "space-y-0.5"}`}
        role="list"
        aria-label="Car deal providers"
        data-car-deal-provider-offers
      >
        {groups.map((group) => {
          const offer = group.primaryOffer;
          const bookingHref = approvedProviderBookingUrl(car, offer);

          return (
            <div
              key={group.key}
              role="listitem"
              className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center ${compact ? "min-h-4 gap-x-1" : "min-h-[18px] gap-x-2"}`}
              data-car-deal-provider-offer
            >
              <div className={`flex min-w-0 items-center ${compact ? "gap-0.5" : "gap-1"}`}>
                <span
                  className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} inline-flex shrink-0 items-center justify-center overflow-hidden`}
                >
                  <ProviderMark group={group} compact={compact} />
                </span>
                <span
                  className={`${compact ? "text-[9px] leading-[11px] tracking-[-0.01em]" : "text-[10px] leading-3"} min-w-0 truncate whitespace-nowrap font-semibold text-[#334155]`}
                  title={group.providerName}
                  data-car-deal-provider-name
                >
                  {group.providerName}
                </span>
              </div>

              <p
                className={`${compact ? "text-[11px] leading-[13px]" : "text-xs leading-[14px]"} shrink-0 whitespace-nowrap font-bold tabular-nums text-[#07133B]`}
                dir="ltr"
                data-car-deal-provider-price
              >
                {formatOfferPrice(offer)}
                <span className="ml-0.5 font-medium text-[#64748B]">/day</span>
              </p>

              {bookingHref ? (
                <a
                  href={bookingHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View deal from ${group.providerName}`}
                  onClick={isolateProviderAction}
                  className={`${compact ? "text-[10px] leading-[14px]" : "text-[11px] leading-4"} inline-flex min-h-4 shrink-0 items-center gap-0.5 whitespace-nowrap font-semibold text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35`}
                  data-car-deal-provider-view-deal
                >
                  View deal
                  <ChevronRight size={compact ? 11 : 12} strokeWidth={2} aria-hidden="true" />
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className={`${compact ? "text-[9px] leading-[11px]" : "text-[10px] leading-3"} inline-flex min-h-4 shrink-0 items-center whitespace-nowrap font-semibold text-[#94A3B8]`}
                  data-car-deal-provider-view-deal-unavailable
                >
                  View deal
                </span>
              )}
              {car.inventorySource === "kayak-sandbox" && <div className="col-span-3 flex min-w-0 flex-wrap items-center gap-x-3 text-xs text-slate-600" data-car-rate-terms>
                <span>{formatTotal(offer)} total</span>
                {paymentLabel(offer) && <span>{paymentLabel(offer)}</span>}
                <CarRateDetails id={`${detailsId}-${offer.id}`} offer={offer} seller={group.providerName} total={formatTotal(offer)} payment={paymentLabel(offer)} />
              </div>}
            </div>
          );
        })}
      </div>
      {car.inventorySource === "kayak-sandbox" && <div className="min-w-0">
        {car.offers.length > 1 && <p className="mt-3 text-xs text-slate-600">Specifications and terms can vary by offer. Check each seller&apos;s details.</p>}
      </div>}
    </div>
  );
}
