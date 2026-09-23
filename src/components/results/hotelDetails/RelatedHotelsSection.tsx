"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff } from "lucide-react";
import { useState } from "react";

import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import type { HotelDetailsSearchContext } from "@/components/results/hotelDetails/hotelDetailsPresentation";
import { buildHotelDetailsHref } from "@/components/results/hotelDetails/hotelDetailsPresentation";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { formatMobileHotelPrice } from "./mobileHotelDetailsPresentation";
import { getHotelPriceDetails } from "@/lib/hotels/hotelResultAvailability";
import type { PublicHotelResult } from "@/lib/types";

type RelatedHotelLabels = {
  heading: string;
  viewHotel: string;
  pricePerNight: string;
  estimatedStayTotal: string;
  priceUnavailable: string;
  imageUnavailable: string;
  imageAlt: string;
  nearLocation: string;
  starHotelAria: string;
};

type RelatedHotelsSectionProps = {
  hotels: PublicHotelResult[];
  city: string;
  searchContext?: HotelDetailsSearchContext;
  labels: RelatedHotelLabels;
  mobilePreview?: boolean;
};

function RelatedHotelCard({
  hotel,
  searchContext,
  labels,
  desktopHidden = false,
  mobilePreview = false,
}: {
  hotel: PublicHotelResult;
  searchContext?: HotelDetailsSearchContext;
  labels: RelatedHotelLabels;
  desktopHidden?: boolean;
  mobilePreview?: boolean;
}) {
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const [imageFailed, setImageFailed] = useState(false);
  const price = getHotelPriceDetails(hotel);
  const nightly = price
    ? formatDisplayPrice({
        amount: price.pricePerNight,
        sourceCurrency: price.currency,
        displayCurrency: selectedOption.currency,
        convertSourceEstimate: true,
        rates: currencyRates.rates,
        isFallbackRate: currencyRates.isFallback,
      })
    : null;
  const total = price
    ? formatDisplayPrice({
        amount: price.totalPrice,
        sourceCurrency: price.currency,
        displayCurrency: selectedOption.currency,
        convertSourceEstimate: true,
        rates: currencyRates.rates,
        isFallbackRate: currencyRates.isFallback,
      })
    : null;
  const stars = hotel.classificationStars;
  const location = [hotel.neighbourhood, hotel.location]
    .filter(Boolean)
    .join(", ");
  const href = buildHotelDetailsHref(hotel.id, searchContext);

  return (
    <Link
      href={href}
      aria-label={`${labels.viewHotel}: ${hotel.name}`}
      className={`group focus-ring block w-[241px] max-w-[78vw] shrink-0 snap-start overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.09)] lg:w-full lg:max-w-none lg:min-w-0 ${desktopHidden ? "lg:hidden" : ""}`}
    >
      <div className="relative h-[150px] overflow-hidden bg-slate-100 lg:aspect-video lg:h-auto">
        {hotel.imageUrl && !imageFailed ? (
          <Image
            src={hotel.imageUrl}
            alt={labels.imageAlt
              .replace("{{name}}", hotel.name)
              .replace(
                "{{location}}",
                location
                  ? ` ${labels.nearLocation.replace("{{location}}", location)}`
                  : "",
              )}
            fill
            sizes="(max-width: 1023px) min(78vw, 241px), 25vw"
            className="object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.02]"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="flex h-full items-center justify-center gap-2 text-xs font-medium text-slate-500">
            <ImageOff className="h-5 w-5" aria-hidden="true" />
            {labels.imageUnavailable}
          </span>
        )}
      </div>

      <div className="flex min-h-[158px] flex-col p-3 lg:min-h-[174px]">
        {stars ? (
          <span
            aria-label={labels.starHotelAria.replace(
              "{{rating}}",
              String(stars),
            )}
            className="text-xs tracking-[0.08em] text-amber-500"
          >
            <span aria-hidden="true">{"★".repeat(stars)}</span>
          </span>
        ) : null}
        <h3 className="mt-1 line-clamp-2 text-[15px] font-bold leading-5 text-slate-950">
          {hotel.name}
        </h3>
        {location ? (
          <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-500 lg:line-clamp-2">
            {location}
          </p>
        ) : null}

        <div className="mt-auto pt-3">
          {nightly && total ? (
            <div>
              <p className="text-sm font-bold text-slate-950">
                {labels.pricePerNight.replace("{{price}}", mobilePreview ? formatMobileHotelPrice(nightly, nightly.formatted) : nightly.formatted)}
              </p>
              {!mobilePreview ? <p className="mt-1 hidden text-xs text-slate-500 lg:block">
                {total.formatted} {labels.estimatedStayTotal}
              </p> : null}
            </div>
          ) : (
            <p className="text-sm font-semibold text-slate-600">
              {labels.priceUnavailable}
            </p>
          )}
          {!mobilePreview ? <span className="mt-2 flex min-h-9 items-center justify-between border-t border-slate-200 pt-2 text-[13px] font-bold text-blue lg:mt-2.5 lg:min-h-11 lg:pt-2.5 lg:text-sm">
            {labels.viewHotel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span> : null}
        </div>
      </div>
    </Link>
  );
}

export function RelatedHotelsSection({
  hotels,
  city,
  searchContext,
  labels,
  mobilePreview = false,
}: RelatedHotelsSectionProps) {
  const displayedHotels = hotels.slice(0, 12);
  if (!displayedHotels.length) return null;

  return (
    <section
      className="mt-5 min-w-0 px-4 lg:mt-6 lg:px-0"
      aria-labelledby="related-hotels-heading"
      data-related-hotels-section
    >
      <h2
        id="related-hotels-heading"
        className="text-[18px] font-extrabold text-slate-950 lg:text-xl"
      >
        {labels.heading.replace("{{destination}}", city)}
      </h2>
      <div
        className="mt-3 flex w-full min-w-0 max-w-full scroll-px-0 gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain snap-x snap-mandatory pb-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] lg:mt-4 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden"
        data-related-hotels-grid
      >
        {displayedHotels.map((hotel, index) => (
          <RelatedHotelCard
            key={hotel.id}
            hotel={hotel}
            searchContext={searchContext}
            labels={labels}
            desktopHidden={index >= 7}
            mobilePreview={mobilePreview}
          />
        ))}
      </div>
    </section>
  );
}
