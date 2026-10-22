import type { PublicHotelPropertyDetails } from "../../../../../src/lib/types";
import type {
  HotelAmenityIconKey,
  HotelAmenityPresentationItem,
} from "../../../../../src/components/results/hotelAmenityPresentation";

export type NativeHotelAmenityGroup = {
  title: string;
  items: HotelAmenityPresentationItem[];
};

const AMENITY_GROUP_ORDER = [
  "Internet",
  "Food & drink",
  "Wellness",
  "Transport & parking",
  "Room & comfort",
  "Services",
  "Work & shared spaces",
  "Other amenities",
] as const;

function amenityGroupTitle(iconKey: HotelAmenityIconKey) {
  if (iconKey === "wifi") return "Internet";
  if (["breakfast", "restaurant", "bar", "kitchenette"].includes(iconKey)) {
    return "Food & drink";
  }
  if (["pool", "spa", "fitness"].includes(iconKey)) return "Wellness";
  if (["airportShuttle", "parking", "evCharging", "bikeStorage"].includes(iconKey)) {
    return "Transport & parking";
  }
  if (["airConditioning", "quietRooms"].includes(iconKey)) return "Room & comfort";
  if (["frontDesk", "lateCheckIn", "petFriendly"].includes(iconKey)) return "Services";
  if (["workspace", "lounge", "courtyard"].includes(iconKey)) {
    return "Work & shared spaces";
  }
  return "Other amenities";
}

export function buildNativeHotelAmenityGroups(
  items: HotelAmenityPresentationItem[],
): NativeHotelAmenityGroup[] {
  const grouped = new Map<string, HotelAmenityPresentationItem[]>();
  items.forEach((item) => {
    const title = amenityGroupTitle(item.iconKey);
    const existing = grouped.get(title) ?? [];
    existing.push(item);
    grouped.set(title, existing);
  });

  return AMENITY_GROUP_ORDER.flatMap((title) => {
    const groupItems = grouped.get(title);
    return groupItems?.length ? [{ title, items: groupItems }] : [];
  });
}

function ensurePeriod(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function explanatoryDescription(value: string) {
  const sentence = ensurePeriod(value);
  if (/^An?\s/i.test(sentence)) {
    return `The hotel is ${sentence[0]!.toLocaleLowerCase()}${sentence.slice(1)}`;
  }
  return sentence;
}

function articleFor(value: string) {
  return /^[aeiou]/i.test(value.trim()) ? "an" : "a";
}

export function buildNativeHotelAboutCopy({
  name,
  property,
  classification,
}: {
  name: string;
  property: PublicHotelPropertyDetails;
  classification: number | null;
}) {
  const propertyType = property.propertyType?.trim() || "hotel";
  const typeCopy = classification
    ? `${classification}-star ${propertyType.toLocaleLowerCase()}`
    : propertyType.toLocaleLowerCase();
  const place = [property.neighbourhood, property.city]
    .map((value) => value.trim())
    .filter(
      (value, index, values) =>
        Boolean(value) &&
        values.findIndex(
          (candidate) =>
            candidate.toLocaleLowerCase() === value.toLocaleLowerCase(),
        ) === index,
    )
    .join(", ");
  const intro = `${name} is ${classification ? "a" : articleFor(propertyType)} ${typeCopy}${place ? ` in ${place}` : ""}.`;
  const sentences = [intro];

  if (property.description.trim()) {
    sentences.push(explanatoryDescription(property.description));
  }

  const roomSummary = property.roomSummary?.trim();
  const bedSummary = property.bedSummary?.trim();
  if (roomSummary || bedSummary) {
    const roomCopy = [roomSummary, bedSummary ? `with ${bedSummary}` : ""]
      .filter(Boolean)
      .join(", ");
    sentences.push(`Room information currently lists ${roomCopy}.`);
  }

  return sentences.join(" ");
}
