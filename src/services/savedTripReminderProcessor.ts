import { timingSafeEqual } from "node:crypto";

import { getPrisma } from "@/lib/prisma";
import { savedTripReminderEmail, sendOptionalEmail } from "@/services/emailService";

export const SAVED_TRIP_REMINDER_BATCH_SIZE = 50;
export const SAVED_TRIP_REMINDER_LOOKAHEAD_MS = 1000 * 60 * 60 * 24 * 7;
export const SAVED_TRIP_REMINDER_DUE_TOLERANCE_MS = 1000 * 60 * 60;

export type SavedTripReminderWindow = "7d" | "24h";
export type SavedTripReminderItemType = "flight" | "hotel" | "trip";

type UserContact = { email: string | null; name: string | null } | null;

type SavedFlightReminderRecord = {
  id: string;
  userId: string;
  provider: string;
  airlineName: string;
  flightNumber: string | null;
  originAirport: string;
  destinationAirport: string;
  departureTime: Date;
  arrivalTime: Date;
  payload: unknown;
  user?: UserContact;
};

type SavedHotelReminderRecord = {
  id: string;
  userId: string;
  provider: string;
  hotelName: string;
  destination: string;
  checkIn: Date;
  checkOut: Date;
  payload: unknown;
  user?: UserContact;
};

type SavedTripReminderRecord = {
  id: string;
  userId: string;
  name: string;
  startsAt: Date | null;
  endsAt: Date | null;
  destination: string | null;
  payload: unknown;
  user?: UserContact;
};

type SavedTripReminderDb = {
  savedFlight: { findMany(args: unknown): Promise<SavedFlightReminderRecord[]> };
  savedHotel: { findMany(args: unknown): Promise<SavedHotelReminderRecord[]> };
  savedTrip: { findMany(args: unknown): Promise<SavedTripReminderRecord[]> };
};

export type SavedTripReminderCandidate = {
  userId: string;
  user: { email: string | null; name: string | null };
  itemType: SavedTripReminderItemType;
  itemId: string;
  title: string;
  destination: string;
  anchorAt: Date;
  endAt?: Date;
  provider?: string;
  link?: string;
  window: SavedTripReminderWindow;
};

export type SavedTripReminderProcessingCounts = {
  processed: number;
  sent: number;
  skippedByPreferences: number;
  notDue: number;
  failed: number;
};

export type SavedTripReminderEmailSender = typeof sendOptionalEmail;

const savedFlightSelect = {
  id: true,
  userId: true,
  provider: true,
  airlineName: true,
  flightNumber: true,
  originAirport: true,
  destinationAirport: true,
  departureTime: true,
  arrivalTime: true,
  payload: true,
  user: { select: { email: true, name: true } },
} as const;

const savedHotelSelect = {
  id: true,
  userId: true,
  provider: true,
  hotelName: true,
  destination: true,
  checkIn: true,
  checkOut: true,
  payload: true,
  user: { select: { email: true, name: true } },
} as const;

const savedTripSelect = {
  id: true,
  userId: true,
  name: true,
  startsAt: true,
  endsAt: true,
  destination: true,
  payload: true,
  user: { select: { email: true, name: true } },
} as const;

export async function processDueSavedTripReminders(options: {
  now?: Date;
  batchSize?: number;
  dueToleranceMs?: number;
  db?: SavedTripReminderDb;
  sendEmail?: SavedTripReminderEmailSender;
} = {}): Promise<SavedTripReminderProcessingCounts> {
  const now = options.now ?? new Date();
  const batchSize = options.batchSize ?? SAVED_TRIP_REMINDER_BATCH_SIZE;
  const dueToleranceMs = options.dueToleranceMs ?? SAVED_TRIP_REMINDER_DUE_TOLERANCE_MS;
  const db = options.db ?? (getPrisma() as unknown as SavedTripReminderDb);
  const sendEmail = options.sendEmail ?? sendOptionalEmail;
  const counts = emptyCounts();
  const candidates = await listSavedTripReminderCandidates({ db, now, batchSize });

  for (const candidate of candidates) {
    if (!isReminderDue(candidate, now, dueToleranceMs)) {
      counts.notDue += 1;
      continue;
    }

    counts.processed += 1;

    if (!candidate.user.email) {
      counts.failed += 1;
      console.warn("[saved-trip-reminders:missing-email]", {
        itemType: candidate.itemType,
        itemId: candidate.itemId,
      });
      continue;
    }

    try {
      const ctaUrl = candidate.link || buildSavedTripReminderCtaUrl(candidate.itemType);
      const result = await sendEmail({
        userId: candidate.userId,
        category: "savedTripReminders",
        to: candidate.user.email,
        subject: buildSavedTripReminderSubject(candidate),
        html: savedTripReminderEmail({
          name: candidate.user.name,
          title: candidate.title,
          destination: candidate.destination,
          anchorAt: candidate.anchorAt,
          endAt: candidate.endAt,
          provider: candidate.provider,
          ctaUrl,
          window: candidate.window,
        }),
        template: "saved_trip_reminder",
        idempotencyKey: buildSavedTripReminderIdempotencyKey(candidate),
        metadata: {
          itemType: candidate.itemType,
          itemId: candidate.itemId,
          anchorAt: candidate.anchorAt.toISOString(),
          reminderWindow: candidate.window,
        },
      });

      if (result.skipped) {
        counts.skippedByPreferences += 1;
      } else {
        counts.sent += 1;
      }
    } catch (error) {
      counts.failed += 1;
      console.error("[saved-trip-reminders:send-failed]", safeError(error, candidate));
    }
  }

  return counts;
}

export async function listSavedTripReminderCandidates(input: {
  db: SavedTripReminderDb;
  now: Date;
  batchSize: number;
}): Promise<SavedTripReminderCandidate[]> {
  const upperAnchor = new Date(input.now.getTime() + SAVED_TRIP_REMINDER_LOOKAHEAD_MS);
  const where = { gt: input.now, lte: upperAnchor };
  const takePerType = Math.max(1, input.batchSize);

  const [flights, hotels, trips] = await Promise.all([
    input.db.savedFlight.findMany({
      where: { departureTime: where },
      orderBy: { departureTime: "asc" },
      take: takePerType,
      select: savedFlightSelect,
    }),
    input.db.savedHotel.findMany({
      where: { checkIn: where },
      orderBy: { checkIn: "asc" },
      take: takePerType,
      select: savedHotelSelect,
    }),
    input.db.savedTrip.findMany({
      where: { startsAt: where },
      orderBy: { startsAt: "asc" },
      take: takePerType,
      select: savedTripSelect,
    }),
  ]);

  return [
    ...flights.flatMap((flight) => buildWindows(normalizeFlight(flight))),
    ...hotels.flatMap((hotel) => buildWindows(normalizeHotel(hotel))),
    ...trips.flatMap((trip) => {
      const normalized = normalizeTrip(trip);
      return normalized ? buildWindows(normalized) : [];
    }),
  ]
    .sort((left, right) => left.anchorAt.getTime() - right.anchorAt.getTime())
    .slice(0, input.batchSize);
}

function normalizeFlight(flight: SavedFlightReminderRecord): Omit<SavedTripReminderCandidate, "window"> {
  return {
    userId: flight.userId,
    user: { email: flight.user?.email ?? null, name: flight.user?.name ?? null },
    itemType: "flight",
    itemId: flight.id,
    title: flight.flightNumber ? `${flight.airlineName} ${flight.flightNumber}` : flight.airlineName,
    destination: flight.destinationAirport,
    anchorAt: flight.departureTime,
    endAt: flight.arrivalTime,
    provider: flight.provider,
    link: extractLink(flight.payload),
  };
}

function normalizeHotel(hotel: SavedHotelReminderRecord): Omit<SavedTripReminderCandidate, "window"> {
  return {
    userId: hotel.userId,
    user: { email: hotel.user?.email ?? null, name: hotel.user?.name ?? null },
    itemType: "hotel",
    itemId: hotel.id,
    title: hotel.hotelName,
    destination: hotel.destination,
    anchorAt: hotel.checkIn,
    endAt: hotel.checkOut,
    provider: hotel.provider,
    link: extractLink(hotel.payload),
  };
}

function normalizeTrip(trip: SavedTripReminderRecord): Omit<SavedTripReminderCandidate, "window"> | null {
  if (!trip.startsAt) return null;
  return {
    userId: trip.userId,
    user: { email: trip.user?.email ?? null, name: trip.user?.name ?? null },
    itemType: "trip",
    itemId: trip.id,
    title: trip.name,
    destination: trip.destination || trip.name,
    anchorAt: trip.startsAt,
    endAt: trip.endsAt ?? undefined,
    link: extractLink(trip.payload),
  };
}

function buildWindows(candidate: Omit<SavedTripReminderCandidate, "window">): SavedTripReminderCandidate[] {
  return [
    { ...candidate, window: "7d" },
    { ...candidate, window: "24h" },
  ];
}

function isReminderDue(candidate: SavedTripReminderCandidate, now: Date, dueToleranceMs: number) {
  if (candidate.anchorAt <= now) return false;
  const reminderAt = getReminderAt(candidate);
  return reminderAt <= now && reminderAt.getTime() > now.getTime() - dueToleranceMs;
}

function getReminderAt(candidate: Pick<SavedTripReminderCandidate, "anchorAt" | "window">) {
  const offsetMs = candidate.window === "7d" ? SAVED_TRIP_REMINDER_LOOKAHEAD_MS : 1000 * 60 * 60 * 24;
  return new Date(candidate.anchorAt.getTime() - offsetMs);
}

export function buildSavedTripReminderIdempotencyKey(candidate: Pick<SavedTripReminderCandidate, "itemType" | "itemId" | "anchorAt" | "window">) {
  return `saved-trip-reminder:${candidate.itemType}:${candidate.itemId}:${candidate.anchorAt.toISOString()}:${candidate.window}`;
}

function buildSavedTripReminderSubject(candidate: SavedTripReminderCandidate) {
  const when = candidate.window === "7d" ? "in 7 days" : "tomorrow";
  return `Reminder: ${candidate.title} ${when}`;
}

function buildSavedTripReminderCtaUrl(itemType: SavedTripReminderItemType) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://kurioticket.com").replace(/\/$/, "");
  return `${baseUrl}${itemType === "trip" ? "/saved" : "/saved"}`;
}

function extractLink(payload: unknown) {
  if (!isRecord(payload)) return undefined;
  for (const key of ["partnerRedirectUrl", "bookingUrl", "url", "href"]) {
    const value = payload[key];
    if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function emptyCounts(): SavedTripReminderProcessingCounts {
  return { processed: 0, sent: 0, skippedByPreferences: 0, notDue: 0, failed: 0 };
}

function safeError(error: unknown, candidate: SavedTripReminderCandidate) {
  return {
    itemType: candidate.itemType,
    itemId: candidate.itemId,
    message: error instanceof Error ? error.message : "Unknown saved trip reminder error",
  };
}

export function isAuthorizedSavedTripReminderCronRequest(
  request: Request,
  secret = process.env.SAVED_TRIP_REMINDERS_CRON_SECRET?.trim(),
) {
  if (!secret) return false;
  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization?.startsWith("Bearer ")) return false;
  const value = authorization.slice("Bearer ".length).trim();
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(secret);
  return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer);
}
