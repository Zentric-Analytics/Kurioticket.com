import { ExternalLink, MapPin } from "lucide-react";

import type { PublicHotelPropertyDetails } from "@/lib/types";
import {
  buildHotelDirectionsUrl,
  buildHotelMapEmbedUrl,
} from "@/lib/hotels/hotelMap";

type HotelLocationSectionProps = {
  hotelName: string;
  propertyDetails: PublicHotelPropertyDetails;
  locationLabel: string;
  directionsLabel: string;
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
}: HotelLocationSectionProps) {
  const mapUrl = buildHotelMapEmbedUrl(propertyDetails);
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
        {mapUrl ? (
          <iframe
            key={`${hotelName}:${propertyDetails.latitude}:${propertyDetails.longitude}`}
            title={`Map showing the location of ${hotelName}`}
            src={mapUrl}
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
            className={`focus-ring flex min-h-11 items-center justify-between border-slate-200 bg-white px-4 text-sm font-bold text-blue hover:bg-slate-50 ${mapUrl ? "border-t" : ""}`}
          >
            {directionsLabel}
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </section>
  );
}
