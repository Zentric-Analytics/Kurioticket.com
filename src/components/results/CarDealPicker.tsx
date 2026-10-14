"use client";

import { useMemo, type MouseEvent } from "react";
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

/** Compact comparison lines inside the existing result card, not a popup or a second card. */
export function CarDealPicker({ car }: Props) {
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
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

  return (
    <section data-car-deal-picker className="min-w-0 border-t border-[#CBD5E1] bg-white px-3 pb-1.5 pt-2 sm:px-4">
      <h4 className="mb-0.5 text-[12px] font-semibold leading-4 text-[#07133B]">Compare deals</h4>
      <div
        role="list"
        aria-label="Car deal providers"
        data-car-deal-provider-offers
        className="min-w-0 divide-y divide-[#E2E8F0]"
      >
        {groups.map((group) => {
          const offer = group.primaryOffer;
          const bookingHref = approvedProviderBookingUrl(car, offer);
          return (
            <div
              key={group.key}
              role="listitem"
              data-car-deal-provider-offer
              className="grid min-h-10 min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 py-0.5 sm:gap-x-3"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center overflow-hidden">
                  <ProviderMark group={group} compact />
                </span>
                <span
                  className="min-w-0 truncate text-[10px] font-semibold leading-[14px] text-[#334155] sm:text-[11px]"
                  title={group.providerName}
                  data-car-deal-provider-name
                >
                  {group.providerName}
                </span>
              </div>
              <p
                dir="ltr"
                data-car-deal-provider-price
                className="shrink-0 whitespace-nowrap text-[11px] font-bold leading-4 tabular-nums text-[#07133B] sm:text-xs"
              >
                {formatOfferPrice(offer)}
                <span className="ml-0.5 text-[9px] font-medium text-[#64748B] sm:text-[10px]">/day</span>
              </p>
              {bookingHref ? (
                <a
                  href={bookingHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View deal from ${group.providerName}`}
                  onClick={isolateProviderAction}
                  data-car-deal-provider-view-deal
                  className="inline-flex min-h-10 min-w-[69px] shrink-0 items-center justify-end gap-0.5 whitespace-nowrap text-[10px] font-semibold leading-4 text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 sm:min-w-[80px] sm:text-[11px]"
                >
                  View deal
                  <ChevronRight size={11} strokeWidth={2} aria-hidden="true" />
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  data-car-deal-provider-view-deal-unavailable
                  className="inline-flex min-h-10 min-w-[69px] shrink-0 items-center justify-end whitespace-nowrap text-[10px] font-semibold leading-4 text-[#94A3B8] sm:min-w-[80px] sm:text-[11px]"
                >
                  View deal
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
