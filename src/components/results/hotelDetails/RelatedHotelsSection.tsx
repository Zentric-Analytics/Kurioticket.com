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
};

function RelatedHotelCard({
  hotel,
  searchContext,
  labels,
}: {
  hotel: PublicHotelResult;
  searchContext?: HotelDetailsSearchContext;
  labels: RelatedHotelLabels;
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
      className="group focus-ring block w-[82vw] max-w-[300px] shrink-0 snap-start overflow-hidden rounded-[15px] border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.09)] lg:w-full lg:max-w-none lg:min-w-0"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-100">
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
            sizes="(max-width: 1023px) min(82vw, 300px), 25vw"
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

      <div className="flex min-h-[174px] flex-col p-3">
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
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
            {location}
          </p>
        ) : null}

        <div className="mt-auto pt-3">
          {nightly && total ? (
            <div>
              <p className="text-sm font-bold text-slate-950">
                {labels.pricePerNight.replace("{{price}}", nightly.formatted)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {total.formatted} {labels.estimatedStayTotal}
              </p>
            </div>
          ) : (
            <p className="text-sm font-semibold text-slate-600">
              {labels.priceUnavailable}
            </p>
          )}
          <span className="mt-2.5 flex min-h-11 items-center justify-between border-t border-slate-200 pt-2.5 text-sm font-bold text-blue">
            {labels.viewHotel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
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
}: RelatedHotelsSectionProps) {
  const displayedHotels = hotels.slice(0, 7);
  if (!displayedHotels.length) return null;

  return (
    <section
      className="mt-6 min-w-0"
      aria-labelledby="related-hotels-heading"
      data-related-hotels-section
    >
      <h2
        id="related-hotels-heading"
        className="px-4 text-xl font-extrabold text-slate-950 lg:px-0"
      >
        {labels.heading.replace("{{destination}}", city)}
      </h2>
      <div
        className="mt-4 flex w-full min-w-0 max-w-full gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain snap-x snap-mandatory px-4 pb-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
        data-related-hotels-grid
      >
        {displayedHotels.map((hotel) => (
          <RelatedHotelCard
            key={hotel.id}
            hotel={hotel}
            searchContext={searchContext}
            labels={labels}
          />
        ))}
      </div>
    </section>
  );
}
