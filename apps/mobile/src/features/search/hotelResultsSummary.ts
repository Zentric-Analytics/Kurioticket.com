import { getHotelLocationFieldDisplay } from "@/lib/search/hotelLocationFieldDisplay";
import { mobileLocales, type MobileLocale } from "../../localization/mobileLocalizationCatalog";

const occupancyWords: Partial<Record<MobileLocale, { guest: [string, string]; room: [string, string] }>> = {
  "en-us": { guest: ["guest", "guests"], room: ["room", "rooms"] },
  "es-es": { guest: ["huésped", "huéspedes"], room: ["habitación", "habitaciones"] },
  fr: { guest: ["voyageur", "voyageurs"], room: ["chambre", "chambres"] },
  "de-de": { guest: ["Gast", "Gäste"], room: ["Zimmer", "Zimmer"] },
  "it-it": { guest: ["ospite", "ospiti"], room: ["camera", "camere"] },
  "pt-br": { guest: ["hóspede", "hóspedes"], room: ["quarto", "quartos"] },
  nl: { guest: ["gast", "gasten"], room: ["kamer", "kamers"] },
  ar: { guest: ["ضيف", "ضيوف"], room: ["غرفة", "غرف"] },
  "zh-cn": { guest: ["位客人", "位客人"], room: ["间客房", "间客房"] },
  ja: { guest: ["名", "名"], room: ["室", "室"] },
  ko: { guest: ["명", "명"], room: ["객실", "객실"] },
  hi: { guest: ["मेहमान", "मेहमान"], room: ["कमरा", "कमरे"] },
  tr: { guest: ["misafir", "misafir"], room: ["oda", "oda"] },
  pl: { guest: ["gość", "goście"], room: ["pokój", "pokoje"] },
  sv: { guest: ["gäst", "gäster"], room: ["rum", "rum"] },
  id: { guest: ["tamu", "tamu"], room: ["kamar", "kamar"] },
  th: { guest: ["ผู้เข้าพัก", "ผู้เข้าพัก"], room: ["ห้อง", "ห้อง"] },
  vi: { guest: ["khách", "khách"], room: ["phòng", "phòng"] },
};

function parseCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

export function formatCompactHotelDateRange(startIso: string, endIso: string, locale: MobileLocale) {
  const start = parseCalendarDate(startIso);
  const end = parseCalendarDate(endIso);
  if (!start || !end) return null;
  const intlLocale = mobileLocales.find((item) => item.code === locale)?.intl ?? "en-US";
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();
  const format = (date: Date, month: boolean, year: boolean) => new Intl.DateTimeFormat(intlLocale, {
    timeZone: "UTC",
    ...(month ? { month: "short" as const } : {}),
    day: "numeric",
    ...(year ? { year: "numeric" as const } : {}),
  }).format(date);
  return `${format(start, true, !sameYear)} – ${format(end, !sameMonth, true)}`;
}

export function formatHotelOccupancy(guestsValue: string, roomsValue: string, locale: MobileLocale) {
  const guests = Math.max(1, Number.parseInt(guestsValue, 10) || 1);
  const rooms = Math.max(1, Number.parseInt(roomsValue, 10) || 1);
  const words = occupancyWords[locale] ?? occupancyWords["en-us"]!;
  return `${guests} ${words.guest[guests === 1 ? 0 : 1]}, ${rooms} ${words.room[rooms === 1 ? 0 : 1]}`;
}

export function buildHotelResultsSummary(destination: string, checkIn: string, checkOut: string, guests: string, rooms: string, locale: MobileLocale) {
  const intlLocale = mobileLocales.find((item) => item.code === locale)?.intl;
  const primary = getHotelLocationFieldDisplay(destination, intlLocale).primary || destination.trim();
  const dates = formatCompactHotelDateRange(checkIn, checkOut, locale) ?? `${checkIn} – ${checkOut}`;
  const occupancy = formatHotelOccupancy(guests, rooms, locale);
  return { primary, dates, occupancy, metadata: `${dates} · ${occupancy}` };
}
