import type { PublicHotelResult } from "@/lib/types";
import { hotelPropertyKey } from "@/lib/hotels/groupHotelOffers";

/** Provider results need not have a static catalogue profile. */
export function hotelRoomFilterText(hotel: Pick<PublicHotelResult, "catalogueProfile" | "roomType">): string {
  return hotel.catalogueProfile?.room.name?.trim() || hotel.roomType?.trim() || "";
}

export function hotelMatchesRoomFilter(hotel: Pick<PublicHotelResult, "catalogueProfile" | "roomType">, selected: string[]) {
  return selected.length === 0 || selected.includes(hotelRoomFilterText(hotel).toLocaleLowerCase());
}

export function buildHotelRoomFilterOptions(hotels: PublicHotelResult[]) {
  const options = new Map<string, { value: string; label: string; count: number }>();
  const seen = new Map<string, Set<string>>();
  for (const [index, hotel] of hotels.entries()) {
    const label = hotelRoomFilterText(hotel);
    if (!label || /^(room|not supplied|room not supplied|not available)$/i.test(label)) continue;
    const value = label.toLocaleLowerCase();
    const properties = seen.get(value) ?? new Set<string>();
    const key = hotel.id ? hotelPropertyKey(hotel) : String(index);
    if (properties.has(key)) continue;
    properties.add(key);
    seen.set(value, properties);
    const existing = options.get(value);
    if (existing) existing.count++;
    else options.set(value, { value, label, count: 1 });
  }
  return [...options.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function hotelShortcutAvailability(input: {
  hasPricedResults: boolean;
  starCount: number;
  facilityCount: number;
  roomTypeCount: number;
}) {
  return {
    price: input.hasPricedResults,
    stars: input.starCount > 0,
    amenities: input.facilityCount > 0,
    roomTypes: input.roomTypeCount > 0,
  };
}
