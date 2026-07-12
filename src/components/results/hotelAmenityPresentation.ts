export type HotelAmenityIconKey =
  | "wifi"
  | "breakfast"
  | "pool"
  | "spa"
  | "airportShuttle"
  | "parking"
  | "fitness"
  | "workspace"
  | "quietRooms"
  | "frontDesk"
  | "lateCheckIn"
  | "kitchenette"
  | "bikeStorage"
  | "courtyard"
  | "lounge"
  | "restaurant"
  | "airConditioning"
  | "generic";

export type HotelAmenityPresentationItem = {
  key: string;
  label: string;
  iconKey: HotelAmenityIconKey;
  translationKey?: string;
};

type ClassifiedAmenity = {
  label: string;
  iconKey: HotelAmenityIconKey;
  translationKey?: string;
  sourceIndex: number;
};

const iconPriority: Record<HotelAmenityIconKey, number> = {
  wifi: 1,
  breakfast: 2,
  pool: 3,
  spa: 4,
  airportShuttle: 5,
  parking: 6,
  fitness: 7,
  workspace: 8,
  restaurant: 9,
  airConditioning: 10,
  frontDesk: 11,
  lateCheckIn: 12,
  quietRooms: 13,
  kitchenette: 14,
  bikeStorage: 15,
  courtyard: 16,
  lounge: 17,
  generic: 18,
};

const knownAmenityIconKeys = new Set<HotelAmenityIconKey>([
  "wifi",
  "breakfast",
  "pool",
  "spa",
  "airportShuttle",
  "parking",
  "fitness",
  "workspace",
  "quietRooms",
  "frontDesk",
  "lateCheckIn",
  "kitchenette",
  "bikeStorage",
  "courtyard",
  "lounge",
  "restaurant",
  "airConditioning",
]);

const exactIconKeys: Record<string, HotelAmenityIconKey> = {
  "free wi-fi": "wifi",
  "free wifi": "wifi",
  "wi-fi": "wifi",
  wifi: "wifi",
  "wireless internet": "wifi",
  "breakfast included": "breakfast",
  "breakfast available": "breakfast",
  "complimentary breakfast": "breakfast",
  breakfast: "breakfast",
  pool: "pool",
  "swimming pool": "pool",
  "indoor pool": "pool",
  "outdoor pool": "pool",
  spa: "spa",
  wellness: "spa",
  "wellness centre": "spa",
  "wellness center": "spa",
  "airport shuttle": "airportShuttle",
  "airport transfer": "airportShuttle",
  "shuttle to airport": "airportShuttle",
  parking: "parking",
  "free parking": "parking",
  "onsite parking": "parking",
  "on-site parking": "parking",
  "fitness room": "fitness",
  "fitness centre": "fitness",
  "fitness center": "fitness",
  fitness: "fitness",
  gym: "fitness",
  workspace: "workspace",
  "work desk": "workspace",
  desk: "workspace",
  "coworking space": "workspace",
  "quiet rooms": "quietRooms",
  "quiet room": "quietRooms",
  "24-hour front desk": "frontDesk",
  "24-hour desk": "frontDesk",
  "front desk": "frontDesk",
  "concierge desk": "frontDesk",
  concierge: "frontDesk",
  reception: "frontDesk",
  "late check-in": "lateCheckIn",
  "late checkin": "lateCheckIn",
  kitchenette: "kitchenette",
  kitchen: "kitchenette",
  "in-room kitchen": "kitchenette",
  "bike storage": "bikeStorage",
  "bicycle storage": "bikeStorage",
  courtyard: "courtyard",
  "garden courtyard": "courtyard",
  garden: "courtyard",
  lounge: "lounge",
  "river-view lounge": "lounge",
  "riverside lounge": "lounge",
  "waterfront lounge": "lounge",
  restaurant: "restaurant",
  "onsite restaurant": "restaurant",
  "on-site restaurant": "restaurant",
  dining: "restaurant",
  "air conditioning": "airConditioning",
  "air-conditioned": "airConditioning",
  "climate control": "airConditioning",
};

const translationKeys: Record<string, string> = {
  "free wi-fi": "hotelResults.filter.freeWifi",
  "free wifi": "hotelResults.filter.freeWifi",
  "wi-fi": "hotelResults.filter.freeWifi",
  wifi: "hotelResults.filter.freeWifi",
  parking: "hotelResults.filter.parking",
  pool: "hotelResults.filter.pool",
  "airport shuttle": "hotelResults.filter.airportShuttle",
  spa: "hotelResults.filter.spa",
  wellness: "hotelResults.filter.spa",
  "fitness center": "hotelResults.filter.fitnessCenter",
  fitness: "hotelResults.filter.fitnessCenter",
  gym: "hotelResults.filter.fitnessCenter",
  workspace: "hotelResults.filter.workspace",
  desk: "hotelResults.filter.workspace",
  "quiet rooms": "hotelResults.filter.quietRooms",
  "24-hour front desk": "hotelResults.filter.frontDesk24",
  "front desk": "hotelResults.filter.frontDesk24",
  "late check-in": "hotelResults.filter.lateCheckIn",
};

function cleanAmenity(value: string) {
  return value
    .trim()
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ");
}

function normalizeForComparison(value: string) {
  return cleanAmenity(value).toLocaleLowerCase();
}

function isExcludedAmenity(normalized: string) {
  return (
    /\b(cancellation|cancel|policy|refund|refundable|prepayment|payment|pay at property|pay later)\b/.test(
      normalized,
    ) ||
    /\b(verified partner inventory|provider placeholder|inventory placeholder)\b/.test(
      normalized,
    ) ||
    /^(room only|accommodation only|half board|full board|all-inclusive|all inclusive)$/.test(
      normalized,
    ) ||
    /^(airport corridor|airport area|city centre|city center|business district|museum district|old town|waterfront|riverside quarter|central|transit-friendly area|central or transit-friendly area)$/.test(
      normalized,
    )
  );
}

function classifyAmenity(
  label: string,
  sourceIndex: number,
): ClassifiedAmenity {
  const normalized = normalizeForComparison(label);
  const iconKey = exactIconKeys[normalized] ?? "generic";
  return {
    label,
    iconKey,
    translationKey: translationKeys[normalized],
    sourceIndex,
  };
}

function resolveLimit(limit: number | undefined) {
  if (limit === undefined) return 4;
  if (!Number.isFinite(limit)) return 4;
  return Math.floor(limit);
}

export function buildHotelAmenityPresentation(
  amenities: readonly unknown[],
  limit?: number,
): HotelAmenityPresentationItem[] {
  if (!Array.isArray(amenities)) return [];

  const resolvedLimit = resolveLimit(limit);
  if (resolvedLimit <= 0) return [];

  const seenKnown = new Set<HotelAmenityIconKey>();
  const seenGeneric = new Set<string>();
  const items: ClassifiedAmenity[] = [];

  amenities.forEach((amenity, sourceIndex) => {
    if (typeof amenity !== "string") return;

    const label = cleanAmenity(amenity);
    if (!label) return;

    const normalized = normalizeForComparison(label);
    if (isExcludedAmenity(normalized)) return;

    const item = classifyAmenity(label, sourceIndex);
    if (knownAmenityIconKeys.has(item.iconKey)) {
      if (seenKnown.has(item.iconKey)) return;
      seenKnown.add(item.iconKey);
    } else {
      if (seenGeneric.has(normalized)) return;
      seenGeneric.add(normalized);
    }

    items.push(item);
  });

  return items
    .sort((left, right) => {
      const priorityDiff =
        iconPriority[left.iconKey] - iconPriority[right.iconKey];
      return priorityDiff || left.sourceIndex - right.sourceIndex;
    })
    .slice(0, resolvedLimit)
    .map((item) => ({
      key: `${item.iconKey}-${normalizeForComparison(item.label)}`,
      label: item.label,
      iconKey: item.iconKey,
      ...(item.translationKey ? { translationKey: item.translationKey } : {}),
    }));
}
