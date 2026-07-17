"use client";

import { useCallback } from "react";
import { MapPin } from "lucide-react";

import type { PublicHotelResult } from "@/lib/types";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { HotelCard } from "@/components/results/HotelCard";
import { getHotelResultsMapPosition } from "@/components/results/hotelResultsMapPresentation";
import { Card } from "@/components/ui/Card";
import { translations as enTranslations } from "@/lib/i18n/en";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { cn } from "@/lib/utils";

export type HotelResultsMapProps = {
  hotels: PublicHotelResult[];
  selectedHotelId?: string;
  detailsSearchParams: string;
  onSelectHotel: (hotelId: string) => void;
};

export function HotelResultsMap({
  hotels,
  selectedHotelId,
  detailsSearchParams,
  onSelectHotel,
}: HotelResultsMapProps) {
  const { t: dictionary } = useLocale();
  const t = useCallback(
    (key: string) => dictionary[key] ?? enTranslations[key] ?? "",
    [dictionary],
  );
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();

  if (!hotels.length) return null;

  const mapItems = hotels.map((hotel, index) => ({
    hotel,
    index,
    position: getHotelResultsMapPosition(hotel.id),
  }));
  const hasMissingPosition = mapItems.some((item) => item.position === null);
  const selectedHotel =
    hotels.find((hotel) => hotel.id === selectedHotelId) || hotels[0];

  if (hasMissingPosition) {
    return (
      <Card className="p-5">
        <h2 className="text-lg font-bold text-slate-950">
          {t("hotelResults.mapTitle") || "Map results"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Map view is temporarily unavailable because reliable positions are not
          available for every result.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="space-y-3 p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              {t("hotelResults.mapTitle") || "Map results"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {t("hotelResults.demoMapNotice") ||
                "Illustrative positions for demo inventory. Hotels, prices, filters, and ordering match the list."}
            </p>
          </div>
        </div>

        <div className="relative h-[360px] overflow-hidden border-t border-slate-200 bg-[#eef6fb] md:h-[500px]">
          <div
            className="absolute inset-0 opacity-80"
            aria-hidden="true"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(0deg, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(35deg, transparent 47%, rgba(0,75,184,0.16) 48%, rgba(0,75,184,0.16) 52%, transparent 53%), linear-gradient(145deg, transparent 47%, rgba(92,182,178,0.18) 48%, rgba(92,182,178,0.18) 52%, transparent 53%)",
              backgroundSize: "72px 72px, 72px 72px, 240px 240px, 280px 280px",
              backgroundPosition: "0 0, 0 0, -36px 20px, 42px -60px",
            }}
          />
          <div
            className="absolute left-8 top-8 h-24 w-32 rounded-full bg-[#5CB6B2]/15 blur-2xl"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-8 right-10 h-28 w-40 rounded-full bg-[#004BB8]/10 blur-2xl"
            aria-hidden="true"
          />

          {mapItems.map(({ hotel, index, position }) => {
            if (!position) return null;

            const isSelected = hotel.id === selectedHotel.id;
            const nightlyDisplayPrice = formatDisplayPrice({
              amount: hotel.pricePerNight,
              sourceCurrency: hotel.currency,
              displayCurrency: selectedOption.currency,
              convertSourceEstimate: true,
              rates: currencyRates.rates,
              isFallbackRate: currencyRates.isFallback,
            });
            const markerLabel = `${index + 1}. ${hotel.name}: ${nightlyDisplayPrice.formatted} nightly`;

            return (
              <button
                key={hotel.id}
                type="button"
                aria-pressed={isSelected}
                aria-label={markerLabel}
                className={cn(
                  "absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8] focus-visible:ring-offset-2",
                  isSelected
                    ? "border-[#004BB8] bg-[#004BB8] text-white shadow-[#004BB8]/25"
                    : "border-white/80 bg-white text-slate-950 hover:border-[#004BB8]/30 hover:text-[#004BB8]",
                )}
                style={{
                  left: `${position.xPercent}%`,
                  top: `${position.yPercent}%`,
                }}
                onClick={() => onSelectHotel(hotel.id)}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/10">
                  {index + 1}
                </span>
                <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                <span>{nightlyDisplayPrice.formatted}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <HotelCard
        hotel={selectedHotel}
        detailsHref={`/hotels/details/${encodeURIComponent(
          selectedHotel.id,
        )}?${detailsSearchParams}`}
      />
    </div>
  );
}
