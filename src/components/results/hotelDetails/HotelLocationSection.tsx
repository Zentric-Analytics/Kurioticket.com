"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { useState } from "react";

import type { PublicHotelPropertyDetails } from "@/lib/types";
import {
  buildHotelDirectionsUrl,
  buildHotelMapEmbedUrl,
  buildGoogleHotelStreetViewEmbedUrl,
} from "@/lib/hotels/hotelMap";

type HotelLocationSectionProps = {
  hotelName: string;
  propertyDetails: PublicHotelPropertyDetails;
  locationLabel: string;
  directionsLabel: string;
  mapLabel: string;
  streetViewLabel: string;
};

function getSecondaryLocation(details: PublicHotelPropertyDetails): string {
  const address = details.streetAddress.toLocaleLowerCase();
  return [details.neighbourhood, details.city, details.country]
    .map((part) => part.trim())
    .filter(
      (part, index, parts) =>
        part &&
        !address.includes(part.toLocaleLowerCase()) &&
        parts.findIndex(
          (candidate) =>
            candidate.toLocaleLowerCase() === part.toLocaleLowerCase(),
        ) === index,
    )
    .join(", ");
}

export function HotelLocationSection({
  hotelName,
  propertyDetails,
  locationLabel,
  directionsLabel,
  mapLabel,
  streetViewLabel,
}: HotelLocationSectionProps) {
  const [view, setView] = useState<"map" | "streetview">("map");
  const googleMapsEmbedApiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  const mapUrl = buildHotelMapEmbedUrl({
    hotelName,
    propertyDetails,
    googleMapsEmbedApiKey,
  });
  const streetViewUrl = buildGoogleHotelStreetViewEmbedUrl({
    hotelName,
    propertyDetails,
    googleMapsEmbedApiKey,
  });
  const activeEmbedUrl = view === "streetview" ? streetViewUrl : mapUrl;
  const directionsUrl = buildHotelDirectionsUrl(propertyDetails);
  const streetAddress = propertyDetails.streetAddress.trim();
  const secondaryLocation = getSecondaryLocation(propertyDetails);
  const hasAddress = Boolean(streetAddress || secondaryLocation);

  if (!mapUrl && !hasAddress && !directionsUrl) return null;

  return (
    <section
      className="mt-5"
      aria-labelledby="hotel-location-heading"
      data-hotel-location-section
    >
      <h2
        id="hotel-location-heading"
        className="text-[17px] font-bold text-slate-950"
      >
        {locationLabel}
      </h2>

      {hasAddress ? (
        <div className="mt-3 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue">
            <MapPin className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0 pt-0.5">
            {streetAddress ? (
              <p className="text-[13px] font-semibold leading-5 text-slate-800">
                {streetAddress}
              </p>
            ) : null}
            {secondaryLocation ? (
              <p className="text-xs leading-5 text-slate-500">
                {secondaryLocation}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-3 overflow-hidden rounded-[14px] border border-slate-200 bg-white">
        {streetViewUrl ? (
          <div
            className="flex min-h-11 border-b border-slate-200 px-1"
            aria-label={locationLabel}
          >
            {(["map", "streetview"] as const).map((option) => {
              const label = option === "map" ? mapLabel : streetViewLabel;
              const active = view === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setView(option)}
                  className={`focus-ring min-h-11 border-b-2 px-4 text-sm font-bold transition-colors ${active ? "border-blue text-blue" : "border-transparent text-slate-600 hover:text-slate-950"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}
        {activeEmbedUrl ? (
          <iframe
            key={`${hotelName}:${propertyDetails.latitude}:${propertyDetails.longitude}:${view}`}
            title={
              view === "streetview"
                ? `Street View near ${hotelName}`
                : `Map showing the location of ${hotelName}`
            }
            src={activeEmbedUrl}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-[200px] w-full border-0 sm:h-[220px] lg:h-[240px]"
          />
        ) : null}
        {directionsUrl ? (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`focus-ring flex min-h-11 items-center justify-between border-slate-200 bg-white px-4 text-sm font-bold text-blue hover:bg-slate-50 ${activeEmbedUrl ? "border-t" : ""}`}
          >
            {directionsLabel}
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </section>
  );
}
