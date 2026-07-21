import type { HotelSearchParams, NormalizedHotelResult } from "@/lib/types";
import { normalizeHotelClassificationStars } from "@/lib/hotels/hotelRatingSemantics";
import { demoHotelCatalog, getDemoHotelResultId } from "@/services/travel/demoHotelCatalog";
import { normalizeHotelImageUrls } from "@/services/travel/hotelImages";
import { normalizeHotelResult } from "@/services/travel/normalizeHotelResult";

export function buildDemoHotelResults(search: HotelSearchParams): NormalizedHotelResult[] {
  return demoHotelCatalog
    .map((hotel) => {
      const imageUrls = normalizeHotelImageUrls(hotel.imageUrls);
      return normalizeHotelResult(
        "Demo Hotel Catalogue",
        {
          id: getDemoHotelResultId(hotel.id),
          name: hotel.name,
          imageUrl: imageUrls[0],
          imageUrls,
          rating: hotel.rating,
          classificationStars: normalizeHotelClassificationStars(Math.floor(hotel.rating)),
          reviewScore: hotel.reviewScore,
          reviewScale: 10,
          reviewCount: hotel.reviewCount,
          reviewSource: "Demo Hotel Catalogue",
          neighbourhood: hotel.areaLabel,
          location: `${hotel.areaLabel}, ${search.destination}`,
          pricePerNight: hotel.nightlyPrice,
          totalPrice: hotel.nightlyPrice * nights(search),
          currency: hotel.currency,
          amenities: hotel.amenities,
          roomType: hotel.roomType,
          cancellationInfo: hotel.cancellationInfo,
          taxesAndFeesIncluded: hotel.taxesAndFeesIncluded,
          similarHotelIds: hotel.relatedIds.map(getDemoHotelResultId),
          dataSource: "demo",
          bookingUrl: `https://www.google.com/travel/hotels/${encodeURIComponent(search.destination)}`,
        },
        search,
      );
    })
    .filter(Boolean) as NormalizedHotelResult[];
}

function nights(search: HotelSearchParams) {
  const ms = new Date(search.checkOut).getTime() - new Date(search.checkIn).getTime();
  return Math.max(Math.round(ms / 86400000), 1);
}
