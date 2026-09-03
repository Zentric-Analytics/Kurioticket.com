import type { MobileLocale } from "../../localization/mobileLocalizationCatalog";

type HotelSummaryCopy = {
  intlLocale: string;
  resultsSummary: string;
  guestsRoomsSummary: string;
  guestSingular: string;
  guestPlural: string;
  roomSingular: string;
  roomPlural: string;
};

const hotelSummaryCopy: Record<MobileLocale, HotelSummaryCopy> = {
  "en-us": { intlLocale: "en-US", resultsSummary: "{{dates}} · {{summary}}", guestsRoomsSummary: "{{guests}} {{guestLabel}}, {{rooms}} {{roomLabel}}", guestSingular: "guest", guestPlural: "guests", roomSingular: "room", roomPlural: "rooms" },
  "es-es": { intlLocale: "es-ES", resultsSummary: "{{dates}} · {{summary}}", guestsRoomsSummary: "{{guests}} {{guestLabel}}, {{rooms}} {{roomLabel}}", guestSingular: "huésped", guestPlural: "huéspedes", roomSingular: "habitación", roomPlural: "habitaciones" },
  fr: { intlLocale: "fr-FR", resultsSummary: "{{dates}} · {{summary}}", guestsRoomsSummary: "{{guests}} {{guestLabel}}, {{rooms}} {{roomLabel}}", guestSingular: "voyageur", guestPlural: "voyageurs", roomSingular: "chambre", roomPlural: "chambres" },
  "de-de": { intlLocale: "de-DE", resultsSummary: "{{dates}} · {{summary}}", guestsRoomsSummary: "{{guests}} {{guestLabel}}, {{rooms}} {{roomLabel}}", guestSingular: "Gast", guestPlural: "Gäste", roomSingular: "Zimmer", roomPlural: "Zimmer" },
  "it-it": { intlLocale: "it-IT", resultsSummary: "{{dates}} · {{summary}}", guestsRoomsSummary: "{{guests}} {{guestLabel}}, {{rooms}} {{roomLabel}}", guestSingular: "ospite", guestPlural: "ospiti", roomSingular: "camera", roomPlural: "camere" },
  "pt-br": { intlLocale: "pt-BR", resultsSummary: "{{dates}} · {{summary}}", guestsRoomsSummary: "{{guests}} {{guestLabel}}, {{rooms}} {{roomLabel}}", guestSingular: "hóspede", guestPlural: "hóspedes", roomSingular: "quarto", roomPlural: "quartos" },
  nl: { intlLocale: "nl-NL", resultsSummary: "{{dates}} · {{summary}}", guestsRoomsSummary: "{{guests}} {{guestLabel}}, {{rooms}} {{roomLabel}}", guestSingular: "gast", guestPlural: "gasten", roomSingular: "kamer", roomPlural: "kamers" },
  ar: { intlLocale: "ar", resultsSummary: "{{dates}}، {{summary}}", guestsRoomsSummary: "{{guests}} {{guestLabel}}، {{rooms}} {{roomLabel}}", guestSingular: "ضيف", guestPlural: "ضيوف", roomSingular: "غرفة", roomPlural: "غرف" },
  "zh-cn": { intlLocale: "zh-CN", resultsSummary: "{{dates}} · {{summary}}", guestsRoomsSummary: "{{guests}}{{guestLabel}}，{{rooms}}{{roomLabel}}", guestSingular: "位住客", guestPlural: "位住客", roomSingular: "间客房", roomPlural: "间客房" },
  ja: { intlLocale: "ja-JP", resultsSummary: "{{dates}} · {{summary}}", guestsRoomsSummary: "{{guestLabel}}{{guests}}名、{{rooms}}{{roomLabel}}", guestSingular: "宿泊者", guestPlural: "宿泊者", roomSingular: "室", roomPlural: "室" },
  ko: { intlLocale: "ko-KR", resultsSummary: "{{dates}} · {{summary}}", guestsRoomsSummary: "{{guestLabel}} {{guests}}명, {{roomLabel}} {{rooms}}개", guestSingular: "투숙객", guestPlural: "투숙객", roomSingular: "객실", roomPlural: "객실" },
  hi: { intlLocale: "hi-IN", resultsSummary: "{{dates}} · {{summary}}", guestsRoomsSummary: "{{guests}} {{guestLabel}}, {{rooms}} {{roomLabel}}", guestSingular: "मेहमान", guestPlural: "मेहमान", roomSingular: "कमरा", roomPlural: "कमरे" },
  tr: { intlLocale: "tr-TR", resultsSummary: "{{dates}} · {{summary}}", guestsRoomsSummary: "{{guests}} {{guestLabel}}, {{rooms}} {{roomLabel}}", guestSingular: "misafir", guestPlural: "misafir", roomSingular: "oda", roomPlural: "oda" },
  pl: { intlLocale: "pl-PL", resultsSummary: "{{dates}} · {{summary}}", guestsRoomsSummary: "{{guests}} {{guestLabel}}, {{rooms}} {{roomLabel}}", guestSingular: "gość", guestPlural: "gości", roomSingular: "pokój", roomPlural: "pokoje" },
  sv: { intlLocale: "sv-SE", resultsSummary: "{{dates}} · {{summary}}", guestsRoomsSummary: "{{guests}} {{guestLabel}}, {{rooms}} {{roomLabel}}", guestSingular: "gäst", guestPlural: "gäster", roomSingular: "rum", roomPlural: "rum" },
  id: { intlLocale: "id-ID", resultsSummary: "{{dates}} · {{summary}}", guestsRoomsSummary: "{{guests}} {{guestLabel}}, {{rooms}} {{roomLabel}}", guestSingular: "tamu", guestPlural: "tamu", roomSingular: "kamar", roomPlural: "kamar" },
  th: { intlLocale: "th-TH", resultsSummary: "{{dates}} · {{summary}}", guestsRoomsSummary: "{{guests}} {{guestLabel}}, {{rooms}} {{roomLabel}}", guestSingular: "ผู้เข้าพัก", guestPlural: "ผู้เข้าพัก", roomSingular: "ห้อง", roomPlural: "ห้อง" },
  vi: { intlLocale: "vi-VN", resultsSummary: "{{dates}} · {{summary}}", guestsRoomsSummary: "{{guests}} {{guestLabel}}, {{rooms}} {{roomLabel}}", guestSingular: "khách", guestPlural: "khách", roomSingular: "phòng", roomPlural: "phòng" },
};

const fillTemplate = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(values[key] ?? ""));

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : null;
}

/** Formats canonical calendar dates without parsing them in the device timezone. */
export function formatCompactHotelDateRange(startIso: string, endIso: string, locale: MobileLocale): string | null {
  const start = parseDateOnly(startIso);
  const end = parseDateOnly(endIso);
  if (!start || !end || end.getTime() < start.getTime()) return null;
  const formatter = new Intl.DateTimeFormat(hotelSummaryCopy[locale].intlLocale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const rangeFormatter = formatter as Intl.DateTimeFormat & { formatRange?: (startDate: Date, endDate: Date) => string };
  const formatted = typeof rangeFormatter.formatRange === "function"
    ? rangeFormatter.formatRange(start, end)
    : `${formatter.format(start)} – ${formatter.format(end)}`;
  return formatted.replace(/[\u2009\u202f]*–[\u2009\u202f]*/g, " – ");
}

export function formatHotelOccupancy(guests: number, rooms: number, locale: MobileLocale): string {
  const copy = hotelSummaryCopy[locale];
  return fillTemplate(copy.guestsRoomsSummary, {
    guests,
    guestLabel: guests === 1 ? copy.guestSingular : copy.guestPlural,
    rooms,
    roomLabel: rooms === 1 ? copy.roomSingular : copy.roomPlural,
  });
}

export function buildHotelResultsSummary(input: {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  locale: MobileLocale;
}) {
  const copy = hotelSummaryCopy[input.locale];
  const dates = formatCompactHotelDateRange(input.checkIn, input.checkOut, input.locale);
  const guests = Math.max(1, Math.min(12, Math.trunc(input.guests)));
  const rooms = Math.max(1, Math.min(6, Math.trunc(input.rooms)));
  const occupancy = formatHotelOccupancy(guests, rooms, input.locale);
  return {
    destination: input.destination.trim(),
    secondaryLine: dates ? fillTemplate(copy.resultsSummary, { dates, summary: occupancy }) : occupancy,
  };
}
