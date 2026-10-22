import type { PublicHotelPropertyDetails } from "@/lib/types";
import type { HotelAmenityPresentationItem } from "../hotelAmenityPresentation";
import type { HotelDetailsSearchContext } from "./hotelDetailsPresentation";
import { parseHotelDetailsSearchDate, getHotelDetailsNightCount } from "./hotelDetailsPresentation";

export function mobileHotelAmenityGroups(items: HotelAmenityPresentationItem[]) {
  const categories: [string, string[]][] = [
    ["Internet", ["wifi"]], ["Food & drink", ["breakfast", "restaurant", "bar", "kitchenette"]],
    ["Wellness", ["pool", "spa", "fitness"]], ["Transport & parking", ["airportShuttle", "parking", "evCharging", "bikeStorage"]],
    ["Room & comfort", ["airConditioning", "quietRooms"]], ["Services", ["frontDesk", "lateCheckIn", "petFriendly"]],
    ["Work & shared spaces", ["workspace", "lounge", "courtyard"]],
  ];
  const assigned = new Set(categories.flatMap(([, keys]) => keys));
  return [...categories.map(([title, keys]) => ({ title, items: items.filter(item => keys.includes(item.iconKey)) })),
    { title: "Other amenities", items: items.filter(item => !assigned.has(item.iconKey)) }].filter(group => group.items.length);
}

export function formatMobileHotelPrice(price: { amount?: number; currency?: string; formatted: string } | null, fallback: string) {
  if (!price) return fallback;
  if (price.amount === undefined || !Number.isFinite(price.amount) || !price.currency) return price.formatted;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency, currencyDisplay: "narrowSymbol" }).format(price.amount);
  } catch { return price.formatted; }
}

// Mirrors Preview's hotelStaySummary: day first, omit the current year, rooms first.
export function mobileHotelStay(context?: HotelDetailsSearchContext, locale = "en-US", currentYear = new Date().getFullYear()) {
  const start = parseHotelDetailsSearchDate(context?.checkIn);
  const end = parseHotelDetailsSearchDate(context?.checkOut);
  const nights = start && end ? getHotelDetailsNightCount(start, end) : null;
  const showYear = start?.getFullYear() !== currentYear || end?.getFullYear() !== currentYear;
  const format = (date: Date) => {
    const parts = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).formatToParts(date);
    const part = (type: string) => parts.find(p => p.type === type)?.value ?? "";
    return `${part("day")} ${part("month")}${showYear ? ` ${part("year")}` : ""}`;
  };
  const guests = Math.max(1, Math.min(12, Number(context?.guests) || 1));
  const rooms = Math.max(1, Math.min(6, Number(context?.rooms) || 1));
  return {
    dates: start && end && nights ? `${format(start)} – ${format(end)}` : "Stay dates unavailable",
    nights: nights ? `${nights} ${nights === 1 ? "night" : "nights"}` : "",
    occupancy: `${rooms} ${rooms === 1 ? "room" : "rooms"}, ${guests} ${guests === 1 ? "guest" : "guests"}`,
  };
}

// Preview's Overview is a factual introduction plus the supplied property copy.
export function mobileHotelAbout(name: string, property: PublicHotelPropertyDetails | null, stars: number | null) {
  if (!property) return "A property description is not available yet.";
  const type = property.propertyType?.trim().toLocaleLowerCase() || "hotel";
  const place = [...new Set([property.neighbourhood, property.city].filter(Boolean))].join(", ");
  const intro = `${name} is ${stars ? `a ${stars}-star` : /^[aeiou]/i.test(type) ? "an" : "a"} ${type}${place ? ` in ${place}` : ""}.`;
  let description = property.description?.trim() || "";
  if (description && !/[.!?]$/.test(description)) description += ".";
  if (/^An?\s/i.test(description)) description = `The hotel is ${description[0].toLocaleLowerCase()}${description.slice(1)}`;
  const room = [property.roomSummary, property.bedSummary ? `with ${property.bedSummary}` : ""].filter(Boolean).join(", ");
  return [intro, description, room ? `Room information currently lists ${room}.` : ""].filter(Boolean).join(" ");
}
