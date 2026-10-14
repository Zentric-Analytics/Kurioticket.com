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

export function CarDealPicker({
  car,
  compact = false,
}: Props) {
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
    <section
      data-car-deal-picker
      data-car-deals-comparison
      aria-label="Compare deals"
      className="min-w-0 border-t border-[#CBD5E1] bg-white px-3 py-3 sm:px-4"
    >
      <h3 className="mb-2 text-[13px] font-semibold leading-5 text-[#07133B] sm:text-sm">
        Compare deals
      </h3>
      <div
        className="min-w-0 divide-y divide-[#E2E8F0] overflow-hidden rounded-xl border border-[#D8E1EC] bg-white"
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
              className="grid min-h-12 min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-2.5 max-[359px]:gap-1.5 max-[359px]:px-2 sm:gap-4 sm:px-3"
              data-car-deal-provider-offer
            >
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-sm">
                  <ProviderMark group={group} compact={compact} />
                </span>
                <span
                  className="min-w-0 truncate text-[11px] font-semibold leading-4 text-[#334155] sm:text-[13px]"
                  title={group.providerName}
                  data-car-deal-provider-name
                >
                  {group.providerName}
                </span>
              </div>

              <p
                className="min-w-0 whitespace-nowrap text-[12px] font-bold leading-4 tabular-nums text-[#07133B] sm:text-sm"
                dir="ltr"
                data-car-deal-provider-price
              >
                {formatOfferPrice(offer)}
                <span className="ml-0.5 text-[10px] font-medium text-[#64748B] sm:text-xs">/day</span>
              </p>

              {bookingHref ? (
                <a
                  href={bookingHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View deal from ${group.providerName}`}
                  onClick={isolateProviderAction}
                  className="inline-flex min-h-11 shrink-0 items-center justify-end gap-0.5 whitespace-nowrap text-[11px] font-semibold text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 sm:text-[13px]"
                  data-car-deal-provider-view-deal
                >
                  View deal
                  <ChevronRight size={compact ? 12 : 14} strokeWidth={2} aria-hidden="true" />
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex min-h-11 shrink-0 items-center justify-end gap-0.5 whitespace-nowrap text-[11px] font-semibold text-[#94A3B8] sm:text-[13px]"
                  data-car-deal-provider-view-deal-unavailable
                >
                  View deal
                  <ChevronRight size={compact ? 12 : 14} strokeWidth={2} aria-hidden="true" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
