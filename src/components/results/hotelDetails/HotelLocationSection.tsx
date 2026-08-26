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
  stayFitFacts?: string[];
  accessibilityDetails?: string[];
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
  stayFitFacts = [],
  accessibilityDetails = [],
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
  const directionsUrl = buildHotelDirectionsUrl({ hotelName, propertyDetails });
  const streetAddress = propertyDetails.streetAddress.trim();
  const secondaryLocation = getSecondaryLocation(propertyDetails);
  const hasAddress = Boolean(streetAddress || secondaryLocation);

  return (
    <section
      id="hotel-location"
      className="scroll-mt-16 border-b border-slate-200 px-4 py-8 lg:px-0 lg:py-10"
      aria-labelledby="hotel-location-heading"
      data-hotel-location-section
    >
      <h2
        id="hotel-location-heading"
        className="text-xl font-extrabold tracking-tight text-slate-950"
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

      <div className="mt-4 overflow-hidden rounded-[14px] border border-slate-200 bg-white">
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
      <div className="mt-7" data-hotel-stay-fit-facts>
          <h3 className="text-base font-bold text-slate-950">Why this location works</h3>
          {stayFitFacts.length ? <div className="mt-3 flex flex-wrap gap-2">{stayFitFacts.map((fact) => <span key={fact} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">{fact}</span>)}</div> : <p className="mt-3 text-sm text-slate-600">Location fit details are limited to the verified address and map.</p>}
          <h3 className="mt-7 text-base font-bold text-slate-950">Accessibility and location details</h3>
          {accessibilityDetails.length ? <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-6 text-slate-700">{accessibilityDetails.map((detail) => <li key={detail}>{detail}</li>)}</ul> : <p className="mt-3 text-sm leading-6 text-slate-600">Confirm specific accessibility requirements with the property before travel.</p>}
        </div>
    </section>
  );
}
