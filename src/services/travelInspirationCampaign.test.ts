import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { travelInspirationDigestEmail } from "@/services/emailService";
import {
  buildTravelInspirationIdempotencyKey,
  isAuthorizedTravelInspirationCronRequest,
  processTravelInspirationCampaign,
  validateTravelInspirationCampaign,
  type TravelInspirationCampaign,
} from "@/services/travelInspirationCampaign";

const validCampaign: TravelInspirationCampaign = {
  campaignKey: "2026-08-destination-inspiration",
  subject: "3 destination ideas to compare this month",
  preheader: "Explore curated route ideas on Kurioticket.",
  active: true,
  sendWindow: { startsAt: "2026-08-01T00:00:00.000Z", endsAt: "2026-09-01T00:00:00.000Z" },
  destinations: [
    {
      id: "new-york",
      title: "New York city break",
      description: "Skyline viewpoints, museums, and neighborhood food scenes.",
      image: "https://example.com/new-york.jpg",
      imageAlt: "New York skyline",
      ctaUrl: "https://kurioticket.com/flights?origin=JFK&destination=EWR",
    },
    {
      id: "miami",
      title: "Miami waterfront escape",
      description: "Beach walks, art districts, and warm-weather city energy.",
      image: "https://example.com/miami.jpg",
      imageAlt: "Miami waterfront",
      ctaUrl: "https://kurioticket.com/flights?origin=BOS&destination=MIA",
    },
    {
      id: "london",
      title: "London culture route",
      description: "Historic landmarks, markets, parks, and theater nights.",
      image: "https://example.com/london.jpg",
      imageAlt: "London bridge",
      ctaUrl: "https://kurioticket.com/flights?origin=JFK&destination=LHR",
    },
  ],
};

type MockUser = {
  id: string;
  email: string | null;
  name: string | null;
  emailVerified: Date | null;
  status: string;
  travelPreferences: { notificationPreferences: { email: Record<string, boolean> } } | null;
};

function user(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: "user-1",
    email: "traveler@example.com",
    name: "Traveler",
    emailVerified: new Date("2026-01-01T00:00:00.000Z"),
    status: "ACTIVE",
    travelPreferences: {
      notificationPreferences: {
        email: {
          receiveOptionalEmails: true,
          priceAlerts: false,
          savedTripReminders: false,
          routeWatchUpdates: false,
          travelInspiration: true,
          productUpdates: false,
          dealsRecommendations: false,
        },
      },
    },
    ...overrides,
  };
}

function mockDb(input: { users?: MockUser[]; sentKeys?: string[]; suppressedEmails?: string[] } = {}) {
  const sentKeys = new Set(input.sentKeys || []);
  const suppressedEmails = new Set((input.suppressedEmails || []).map((email) => email.toLowerCase()));
  const calls: unknown[] = [];

  return {
    calls,
    db: {
      user: {
        async findMany(args: unknown) {
          calls.push(args);
          const take = typeof args === "object" && args !== null && "take" in args ? Number((args as { take?: unknown }).take) : 50;
          return (input.users || [user()]).slice(0, take);
        },
      },
      async $queryRawUnsafe(query: string, value: unknown) {
        if (query.includes("email_suppressions")) {
          return suppressedEmails.has(String(value).toLowerCase()) ? [{ id: "suppression-1" }] : [];
        }
        if (query.includes("email_deliveries")) {
          return sentKeys.has(String(value)) ? [{ id: "delivery-1" }] : [];
        }
        return [];
      },
    },
  };
}

afterEach(() => {
  delete process.env.TRAVEL_INSPIRATION_DRY_RUN;
});

test("active user receives travel inspiration email", async () => {
  const { db } = mockDb();
  const sent: unknown[] = [];

  const counts = await processTravelInspirationCampaign({
    db,
    campaign: validCampaign,
    sendEmail: async (input) => {
      sent.push(input);
      return { skipped: false as const, id: "email-1" };
    },
  });

  assert.deepEqual(counts, { processed: 1, eligible: 1, sent: 1, skippedByPreferences: 0, skippedAlreadySent: 0, failed: 0 });
  assert.equal((sent[0] as { category: string }).category, "travelInspiration");
  assert.equal((sent[0] as { template: string }).template, "travel_inspiration_digest");
  assert.equal((sent[0] as { idempotencyKey: string }).idempotencyKey, "travel-inspiration:2026-08-destination-inspiration:user-1");
});

test("category disabled skips before sending", async () => {
  const disabled = user({
    travelPreferences: { notificationPreferences: { email: { ...user().travelPreferences!.notificationPreferences.email, travelInspiration: false } } },
  });
  const { db } = mockDb({ users: [disabled] });
  let sends = 0;

  const counts = await processTravelInspirationCampaign({
    db,
    campaign: validCampaign,
    sendEmail: async () => {
      sends += 1;
      return { skipped: false as const, id: "email-1" };
    },
  });

  assert.equal(sends, 0);
  assert.equal(counts.skippedByPreferences, 1);
});

test("master optional emails disabled skips before sending", async () => {
  const disabled = user({
    travelPreferences: { notificationPreferences: { email: { ...user().travelPreferences!.notificationPreferences.email, receiveOptionalEmails: false } } },
  });
  const { db } = mockDb({ users: [disabled] });
  const counts = await processTravelInspirationCampaign({ db, campaign: validCampaign });
  assert.equal(counts.skippedByPreferences, 1);
  assert.equal(counts.sent, 0);
});

test("duplicate run does not resend", async () => {
  const idempotencyKey = buildTravelInspirationIdempotencyKey(validCampaign.campaignKey, "user-1");
  const { db } = mockDb({ sentKeys: [idempotencyKey] });
  let sends = 0;

  const counts = await processTravelInspirationCampaign({
    db,
    campaign: validCampaign,
    sendEmail: async () => {
      sends += 1;
      return { skipped: false as const, id: "email-1" };
    },
  });

  assert.equal(sends, 0);
  assert.equal(counts.skippedAlreadySent, 1);
});

test("inactive or missing campaign skips", async () => {
  const { db } = mockDb();
  assert.deepEqual(await processTravelInspirationCampaign({ db, campaign: null }), {
    processed: 0,
    eligible: 0,
    sent: 0,
    skippedByPreferences: 0,
    skippedAlreadySent: 0,
    failed: 0,
  });

  assert.deepEqual(await processTravelInspirationCampaign({ db, campaign: { ...validCampaign, active: false } }), {
    processed: 0,
    eligible: 0,
    sent: 0,
    skippedByPreferences: 0,
    skippedAlreadySent: 0,
    failed: 0,
  });
});

test("invalid content blocks send", async () => {
  const invalid = { ...validCampaign, destinations: validCampaign.destinations.slice(0, 2) };
  const { db } = mockDb();
  let sends = 0;
  const counts = await processTravelInspirationCampaign({
    db,
    campaign: invalid,
    sendEmail: async () => {
      sends += 1;
      return { skipped: false as const, id: "email-1" };
    },
  });

  assert.equal(validateTravelInspirationCampaign(invalid), false);
  assert.equal(sends, 0);
  assert.equal(counts.processed, 0);
});

test("dry-run sends nothing but counts eligible users", async () => {
  const { db } = mockDb();
  let sends = 0;
  const counts = await processTravelInspirationCampaign({
    db,
    campaign: validCampaign,
    dryRun: true,
    sendEmail: async () => {
      sends += 1;
      return { skipped: false as const, id: "email-1" };
    },
  });

  assert.equal(sends, 0);
  assert.equal(counts.eligible, 1);
  assert.equal(counts.sent, 0);
});

test("batch limit respected", async () => {
  const users = [user({ id: "user-1" }), user({ id: "user-2", email: "two@example.com" })];
  const { db } = mockDb({ users });
  let sends = 0;
  const counts = await processTravelInspirationCampaign({
    db,
    campaign: validCampaign,
    batchSize: 1,
    sendEmail: async () => {
      sends += 1;
      return { skipped: false as const, id: "email-1" };
    },
  });

  assert.equal(counts.processed, 1);
  assert.equal(sends, 1);
});

test("cron authorization uses bearer secret", () => {
  const authorized = new Request("http://localhost/api/cron/travel-inspiration", {
    method: "POST",
    headers: { authorization: "Bearer secret-1" },
  });
  const unauthorized = new Request("http://localhost/api/cron/travel-inspiration", {
    method: "POST",
    headers: { authorization: "Bearer wrong" },
  });

  assert.equal(isAuthorizedTravelInspirationCronRequest(authorized, "secret-1"), true);
  assert.equal(isAuthorizedTravelInspirationCronRequest(unauthorized, "secret-1"), false);
});

test("template renders destination cards, preference footer, and no price content", () => {
  const html = travelInspirationDigestEmail({
    name: "Traveler",
    heading: "Travel ideas to compare this month",
    intro: "Explore three curated destination ideas on Kurioticket.",
    preheader: validCampaign.preheader,
    destinations: validCampaign.destinations,
    preferencesUrl: "https://kurioticket.com/dashboard/preferences/email",
  });

  assert.match(html, /Travel ideas to compare this month/);
  assert.match(html, /Explore destination/);
  assert.match(html, /Manage email preferences/);
  assert.match(html, /search and compare travel options/);
  assert.doesNotMatch(html, /\$|discount|live fare|visa|guarantee/i);
  assert.match(html, /New York city break/);
  assert.match(html, /Miami waterfront escape/);
  assert.match(html, /London culture route/);
});
