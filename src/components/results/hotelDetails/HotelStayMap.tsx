import type { PublicHotelPropertyDetails } from "@/lib/types";
import { buildHotelAddress, buildHotelMapEmbedUrl } from "@/lib/hotels/hotelMap";

type HotelStayMapProps = {
  hotelName: string;
  propertyDetails: PublicHotelPropertyDetails;
};

export function HotelStayMap({
  hotelName,
  propertyDetails,
}: HotelStayMapProps) {
  const mapUrl = buildHotelMapEmbedUrl({
    hotelName,
    propertyDetails,
    googleMapsEmbedApiKey:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY,
  });

  if (!mapUrl) return null;

  const address = buildHotelAddress(propertyDetails);

  return (
    <section
      className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
      aria-labelledby="your-stay-location-heading"
      data-hotel-stay-map
    >
      <div className="px-3.5 py-3">
        <h3
          id="your-stay-location-heading"
          className="text-sm font-bold text-slate-950"
        >
          Property location
        </h3>
        {address ? (
          <p className="mt-1 text-xs leading-5 text-slate-600">{address}</p>
        ) : null}
      </div>
      <iframe
        title={`Map showing the location of ${hotelName}`}
        src={mapUrl}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="h-[190px] w-full border-0 bg-slate-100"
      />
    </section>
  );
}
