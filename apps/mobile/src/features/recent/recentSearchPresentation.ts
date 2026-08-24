import type { MobileRecentSearch } from "../../api/travelApi";
import { sanitizeSearchParams } from "../flow/savedSearchContext";

export type RecentSearchPresentation = {
  icon: "flight" | "hotel";
  title: string;
  metadata: string;
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function formatDateOnly(value?: string) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth) return "";
  return `${months[month - 1]} ${day}`;
}

function formatDateRange(start?: string, end?: string) {
  const formattedStart = formatDateOnly(start);
  const formattedEnd = formatDateOnly(end);
  return formattedStart && formattedEnd ? `${formattedStart} – ${formattedEnd}` : formattedStart || formattedEnd;
}

function formatCount(value: string | undefined, singular: string) {
  if (!value || !/^\d+$/.test(value)) return "";
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count <= 0) return "";
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function formatCabinClass(value?: string) {
  const words = value?.trim().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
  return words ? `${words.charAt(0).toUpperCase()}${words.slice(1).toLowerCase()}` : "";
}

export function recentSearchPresentation(item: MobileRecentSearch): RecentSearchPresentation {
  const params = sanitizeSearchParams(item.type, item.params);
  if (item.type === "flight") {
    const title = params.origin && params.destination ? `${params.origin} → ${params.destination}` : item.label;
    const metadata = [
      formatDateRange(params.departureDate, params.returnDate),
      formatCount(params.travelers, "traveler"),
      formatCabinClass(params.cabinClass || params.cabin),
    ].filter(Boolean).join(" · ");
    return { icon: "flight", title, metadata: metadata || item.subtitle };
  }

  const metadata = [
    formatDateRange(params.checkIn, params.checkOut),
    formatCount(params.guests, "guest"),
    formatCount(params.rooms, "room"),
  ].filter(Boolean).join(" · ");
  return { icon: "hotel", title: params.destination || item.label, metadata: metadata || item.subtitle };
}
