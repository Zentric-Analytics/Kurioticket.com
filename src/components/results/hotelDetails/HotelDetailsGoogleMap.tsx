import type { PublicHotelPropertyDetails } from "@/lib/types";
import {
  buildGoogleHotelMapEmbedUrl,
  buildHotelAddress,
} from "@/lib/hotels/hotelMap";

type HotelDetailsGoogleMapProps = {
  hotelName: string;
  propertyDetails: PublicHotelPropertyDetails;
};

export function HotelDetailsGoogleMap({
  hotelName,
  propertyDetails,
}: HotelDetailsGoogleMapProps) {
  const mapUrl = buildGoogleHotelMapEmbedUrl({
    hotelName,
    propertyDetails,
    googleMapsEmbedApiKey:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY,
  });

  if (!mapUrl) return null;

  const address = buildHotelAddress(propertyDetails);

  return (
    <section
      className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] lg:mt-8"
      aria-labelledby="hotel-details-google-map-heading"
      data-hotel-details-google-map
    >
      <div className="px-4 py-4 sm:px-5">
        <h2
          id="hotel-details-google-map-heading"
          className="text-lg font-extrabold text-slate-950"
        >
          Property location
        </h2>
        {address ? (
          <p className="mt-1 text-sm leading-5 text-slate-600">{address}</p>
        ) : null}
      </div>
      <iframe
        title={`Google map showing the location of ${hotelName}`}
        src={mapUrl}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="h-[260px] w-full border-0 bg-slate-100 sm:h-[340px] lg:h-[420px]"
        allowFullScreen
      />
    </section>
  );
}
