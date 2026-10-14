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
  // One row per actual offer, including multiple offers from a single KAYAK seller.
  // Keep provider grouping intact for other consumers of getCarDealPickerGroups.
  const rows = useMemo(
    () => getCarDealPickerGroups(car).flatMap((group) =>
      group.offers.map((offer) => ({
        key: group.key + ":offer:" + offer.id,
        group,
        offer,
      })),
    ),
    [car],
  );
  if (!rows.length) return null;

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
    <div
      data-car-deal-picker
      className={compact ? "mt-1.5 min-w-0" : "mt-2 min-w-0"}
    >
      <div
        className="flex min-w-0 flex-col"
        role="list"
        aria-label="Car deal providers"
        data-car-deal-provider-offers
      >
        {rows.map(({ key, group, offer }) => {
          const bookingHref = approvedProviderBookingUrl(car, offer);

          return (
            <div
              key={key}
              role="listitem"
              className="flex min-h-5 min-w-0 items-center gap-1 border-b border-[#E2E8F0] last:border-b-0"
              data-car-deal-provider-offer
            >
              <div className="flex min-w-0 flex-1 items-center gap-0.5">
                <span
                  className={compact
                    ? "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center overflow-hidden"
                    : "inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden"}
                >
                  <ProviderMark group={group} compact={compact} />
                </span>
                <span
                  className={compact
                    ? "min-w-0 truncate text-[9px] font-semibold leading-[11px] tracking-[-0.01em] text-[#334155]"
                    : "min-w-0 truncate text-[10px] font-semibold leading-3 text-[#334155]"}
                  title={group.providerName}
                  data-car-deal-provider-name
                >
                  {group.providerName}
                </span>
              </div>

              <p
                className={compact
                  ? "shrink-0 whitespace-nowrap text-[11px] font-bold leading-[13px] tabular-nums text-[#07133B]"
                  : "shrink-0 whitespace-nowrap text-xs font-bold leading-[14px] tabular-nums text-[#07133B]"}
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
                  className={compact
                    ? "inline-flex min-h-5 shrink-0 items-center justify-end gap-0.5 whitespace-nowrap text-[10px] font-semibold leading-[14px] text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
                    : "inline-flex min-h-5 shrink-0 items-center justify-end gap-0.5 whitespace-nowrap text-[11px] font-semibold leading-4 text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"}
                  data-car-deal-provider-view-deal
                >
                  View deal
                  <ChevronRight size={compact ? 11 : 12} strokeWidth={2} aria-hidden="true" />
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className={compact
                    ? "inline-flex min-h-5 shrink-0 items-center justify-end whitespace-nowrap text-[9px] font-semibold leading-[11px] text-[#94A3B8]"
                    : "inline-flex min-h-5 shrink-0 items-center justify-end whitespace-nowrap text-[10px] font-semibold leading-3 text-[#94A3B8]"}
                  data-car-deal-provider-view-deal-unavailable
                >
                  View deal
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
