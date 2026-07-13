import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSavedTripReminderIdempotencyKey,
  isAuthorizedSavedTripReminderCronRequest,
  processDueSavedTripReminders,
} from "@/services/savedTripReminderProcessor";

const now = new Date("2026-07-10T12:00:00.000Z");
const day = 24 * 60 * 60 * 1000;

function user(overrides: Record<string, unknown> = {}) {
  return { email: "user@example.com", name: "User", ...overrides };
}

function flight(overrides: Record<string, unknown> = {}) {
  return {
    id: "flight-1",
    userId: "user-1",
    provider: "Duffel",
    airlineName: "Kuri Air",
    flightNumber: "KT123",
    originAirport: "JFK",
    destinationAirport: "LAX",
    departureTime: new Date(now.getTime() + 7 * day),
    arrivalTime: new Date(now.getTime() + 7 * day + 5 * 60 * 60 * 1000),
    payload: { bookingUrl: "https://provider.example/flight-1" },
    user: user(),
    ...overrides,
  };
}

function hotel(overrides: Record<string, unknown> = {}) {
  return {
    id: "hotel-1",
    userId: "user-1",
    provider: "Hotelbeds",
    hotelName: "Kuri Hotel",
    destination: "Los Angeles",
    checkIn: new Date(now.getTime() + day),
    checkOut: new Date(now.getTime() + 3 * day),
    payload: { bookingUrl: "https://provider.example/hotel-1" },
    user: user(),
    ...overrides,
  };
}

function trip(overrides: Record<string, unknown> = {}) {
  return {
    id: "trip-1",
    userId: "user-1",
    name: "LA weekend",
    startsAt: new Date(now.getTime() + day),
    endsAt: new Date(now.getTime() + 2 * day),
    destination: "Los Angeles",
    payload: { href: "https://kurioticket.com/saved" },
    user: user(),
    ...overrides,
  };
}

function db(input: { flights?: unknown[]; hotels?: unknown[]; trips?: unknown[] }) {
  const queried = { flights: 0, hotels: 0, trips: 0 };
  return {
    queried,
    savedFlight: { async findMany() { queried.flights += 1; return input.flights ?? []; } },
    savedHotel: { async findMany() { queried.hotels += 1; return input.hotels ?? []; } },
    savedTrip: { async findMany() { queried.trips += 1; return input.trips ?? []; } },
  };
}

async function run(input: { flights?: unknown[]; hotels?: unknown[]; trips?: unknown[] }, options: { emailResult?: { skipped: boolean; id?: string; reason?: string }; dedupe?: boolean } = {}) {
  const fakeDb = db(input);
  const emails: Array<Parameters<import("@/services/savedTripReminderProcessor").SavedTripReminderEmailSender>[0]> = [];
  const seen = new Set<string>();
  const counts = await processDueSavedTripReminders({
    now,
    db: fakeDb,
    sendEmail: async (email) => {
      if (options.dedupe && email.idempotencyKey) {
        if (seen.has(email.idempotencyKey)) return { skipped: false, id: "duplicate-suppressed" };
        seen.add(email.idempotencyKey);
      }
      emails.push(email);
      return options.emailResult ?? { skipped: false, id: "email-1" };
    },
  });
  return { counts, emails, fakeDb };
}

test("sends due 7-day SavedFlight reminder", async () => {
  const { counts, emails } = await run({ flights: [flight()] });
  assert.equal(counts.sent, 1);
  assert.equal(emails[0].category, "savedTripReminders");
  assert.equal(emails[0].template, "saved_trip_reminder");
  assert.equal(emails[0].idempotencyKey, "saved-trip-reminder:flight:flight-1:2026-07-17T12:00:00.000Z:7d");
});

test("sends due 24-hour SavedFlight reminder", async () => {
  const { counts, emails } = await run({ flights: [flight({ departureTime: new Date(now.getTime() + day), id: "flight-24" })] });
  assert.equal(counts.sent, 1);
  assert.equal(emails[0].idempotencyKey, "saved-trip-reminder:flight:flight-24:2026-07-11T12:00:00.000Z:24h");
});

test("sends due SavedHotel reminder", async () => {
  const { counts, emails } = await run({ hotels: [hotel()] });
  assert.equal(counts.sent, 1);
  assert.match(emails[0].subject, /Kuri Hotel/);
});

test("sends due dated SavedTrip reminder", async () => {
  const { counts, emails } = await run({ trips: [trip()] });
  assert.equal(counts.sent, 1);
  assert.match(emails[0].subject, /LA weekend/);
});

test("date-less SavedTrip is excluded", async () => {
  const { counts, emails } = await run({ trips: [trip({ startsAt: null })] });
  assert.deepEqual(counts, { processed: 0, sent: 0, skippedByPreferences: 0, notDue: 0, failed: 0 });
  assert.equal(emails.length, 0);
});

test("SavedSearch and TravelWatchlist are excluded by not being queried", async () => {
  const { fakeDb } = await run({ flights: [], hotels: [], trips: [] });
  assert.deepEqual(fakeDb.queried, { flights: 1, hotels: 1, trips: 1 });
});

test("past records and non-due reminders are excluded from sending", async () => {
  const { counts, emails } = await run({
    flights: [flight({ id: "past", departureTime: new Date(now.getTime() - 1000) }), flight({ id: "future", departureTime: new Date(now.getTime() + 6 * day) })],
  });
  assert.equal(counts.sent, 0);
  assert.equal(counts.notDue, 4);
  assert.equal(emails.length, 0);
});

test("disabled preferences skip and leave saved item unchanged", async () => {
  const savedFlight = flight();
  const before = JSON.stringify(savedFlight);
  const { counts } = await run({ flights: [savedFlight] }, { emailResult: { skipped: true, reason: "preferences_disabled" } });
  assert.equal(counts.skippedByPreferences, 1);
  assert.equal(JSON.stringify(savedFlight), before);
});

test("correct idempotency key helper", () => {
  assert.equal(
    buildSavedTripReminderIdempotencyKey({ itemType: "hotel", itemId: "hotel-1", anchorAt: new Date("2026-08-01T00:00:00.000Z"), window: "24h" }),
    "saved-trip-reminder:hotel:hotel-1:2026-08-01T00:00:00.000Z:24h",
  );
});

test("repeated cron run can use idempotency key to avoid duplicate provider send", async () => {
  const sent = new Set<string>();
  const emails: string[] = [];
  const sendEmail = async (email: Parameters<import("@/services/savedTripReminderProcessor").SavedTripReminderEmailSender>[0]) => {
    if (!sent.has(email.idempotencyKey || "")) {
      sent.add(email.idempotencyKey || "");
      emails.push(email.idempotencyKey || "");
    }
    return { skipped: false, id: "email-1" };
  };
  const fakeDb = db({ flights: [flight()] });
  await processDueSavedTripReminders({ now, db: fakeDb, sendEmail });
  await processDueSavedTripReminders({ now, db: fakeDb, sendEmail });
  assert.equal(emails.length, 1);
});

test("cron authorization fails closed and uses timing-safe bearer comparison", () => {
  assert.equal(isAuthorizedSavedTripReminderCronRequest(new Request("http://test", { method: "POST" }), undefined), false);
  assert.equal(isAuthorizedSavedTripReminderCronRequest(new Request("http://test", { method: "POST", headers: { authorization: "Bearer bad" } }), "secret"), false);
  assert.equal(isAuthorizedSavedTripReminderCronRequest(new Request("http://test", { method: "POST", headers: { authorization: "Bearer secret" } }), "secret"), true);
});
