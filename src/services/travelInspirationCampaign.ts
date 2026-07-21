import { timingSafeEqual } from "node:crypto";

import { getPrisma } from "@/lib/prisma";
import { getHomeDiscoveryByRegion, type HomeDiscoveryItem } from "@/data/homeDiscovery";
import { normalizeEmailPreferences } from "@/services/emailPreferencesService";
import { sendOptionalEmail, travelInspirationDigestEmail } from "@/services/emailService";

export const TRAVEL_INSPIRATION_BATCH_SIZE = 50;
export const TRAVEL_INSPIRATION_TEMPLATE = "travel_inspiration_digest" as const;

export type TravelInspirationDestination = {
  id: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  ctaUrl: string;
};

export type TravelInspirationCampaign = {
  campaignKey: string;
  subject: string;
  preheader: string;
  active: boolean;
  sendWindow: { startsAt: string; endsAt: string };
  destinations: TravelInspirationDestination[];
};

export type TravelInspirationProcessingCounts = {
  processed: number;
  eligible: number;
  sent: number;
  skippedByPreferences: number;
  skippedAlreadySent: number;
  failed: number;
};

type UserRecord = {
  id: string;
  email: string | null;
  name: string | null;
  emailVerified: Date | string | null;
  status: "ACTIVE" | string;
  travelPreferences?: { notificationPreferences: unknown } | null;
};

type TravelInspirationDb = {
  user: {
    findMany(args: unknown): Promise<UserRecord[]>;
  };
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
};

export type TravelInspirationEmailSender = typeof sendOptionalEmail;

function discoveryItemToDestination(item: HomeDiscoveryItem): TravelInspirationDestination {
  return {
    id: item.id,
    title: item.title,
    description: item.routeNote,
    image: item.image,
    imageAlt: item.imageAlt,
    ctaUrl: buildRouteSearchUrl(item),
  };
}

function buildRouteSearchUrl(item: Pick<HomeDiscoveryItem, "originCode" | "destinationCode">) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://kurioticket.com").replace(/\/$/, "");
  const url = new URL("/flights", baseUrl);
  url.searchParams.set("origin", item.originCode);
  url.searchParams.set("destination", item.destinationCode);
  return url.toString();
}

function buildDefaultCampaign(): TravelInspirationCampaign {
  const destinations = getHomeDiscoveryByRegion("US").slice(0, 3).map(discoveryItemToDestination);

  return {
    campaignKey: "2026-08-destination-inspiration",
    subject: "3 destination ideas to compare this month",
    preheader: "Explore curated route ideas on Kurioticket without prices, pressure, or booking claims.",
    active: true,
    sendWindow: {
      startsAt: "2026-08-01T00:00:00.000Z",
      endsAt: "2026-09-01T00:00:00.000Z",
    },
    destinations,
  };
}

export const travelInspirationCampaigns: TravelInspirationCampaign[] = [buildDefaultCampaign()];

export function getActiveTravelInspirationCampaign(now = new Date(), campaigns = travelInspirationCampaigns) {
  const activeCampaigns = campaigns.filter((campaign) => campaign.active);
  if (activeCampaigns.length !== 1) return null;

  const campaign = activeCampaigns[0];
  const startsAt = new Date(campaign.sendWindow.startsAt);
  const endsAt = new Date(campaign.sendWindow.endsAt);

  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime())) return null;
  if (now < startsAt || now >= endsAt) return null;

  return campaign;
}

export function validateTravelInspirationCampaign(campaign: TravelInspirationCampaign | null | undefined) {
  if (!campaign || !campaign.active) return false;
  if (!/^\d{4}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(campaign.campaignKey)) return false;
  if (!campaign.subject.trim() || !campaign.preheader.trim()) return false;
  if (!campaign.destinations || campaign.destinations.length !== 3) return false;

  return campaign.destinations.every((destination) => {
    if (!destination.id.trim() || !destination.title.trim() || !destination.description.trim()) return false;
    if (!destination.image.trim() || !destination.imageAlt.trim() || !destination.ctaUrl.trim()) return false;
    if (!/^https?:\/\//i.test(destination.ctaUrl)) return false;
    return !containsPriceLikeContent(destination.title) && !containsPriceLikeContent(destination.description);
  });
}

function containsPriceLikeContent(value: string) {
  return /(?:\$|£|€|₦|\bUSD\b|\bGBP\b|\bEUR\b|\bNGN\b|\bprice\b|\bdiscount\b|\bdeal\b|\bfare\b)/i.test(value);
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isDryRun(value = process.env.TRAVEL_INSPIRATION_DRY_RUN) {
  return /^(1|true|yes|on)$/i.test(value?.trim() || "");
}

function isValidEmail(email: string | null | undefined) {
  return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.trim().length <= 254);
}

export function buildTravelInspirationIdempotencyKey(campaignKey: string, userId: string) {
  return `travel-inspiration:${campaignKey}:${userId}`;
}

async function hasExistingSuccessfulDelivery(db: TravelInspirationDb, idempotencyKey: string) {
  const rows = await db.$queryRawUnsafe<Array<{ id: string }>>(
    "SELECT id FROM email_deliveries WHERE idempotency_key = $1 AND status IN ('SENT', 'DELIVERED', 'DELIVERY_DELAYED', 'OPENED', 'CLICKED') LIMIT 1",
    idempotencyKey,
  );
  return rows.length > 0;
}

async function isSuppressed(db: TravelInspirationDb, email: string) {
  const rows = await db.$queryRawUnsafe<Array<{ id: string }>>(
    "SELECT id FROM email_suppressions WHERE email = $1 LIMIT 1",
    email.toLowerCase().trim(),
  );
  return rows.length > 0;
}

async function loadCandidateUsers(db: TravelInspirationDb, batchSize: number) {
  return db.user.findMany({
    where: {
      status: "ACTIVE",
      email: { not: null },
      emailVerified: { not: null },
      travelPreferences: { isNot: null },
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      status: true,
      travelPreferences: { select: { notificationPreferences: true } },
    },
  });
}

function hasTravelInspirationPreferences(user: UserRecord) {
  const preferences = normalizeEmailPreferences(
    isRecord(user.travelPreferences?.notificationPreferences)
      ? user.travelPreferences?.notificationPreferences.email
      : undefined,
  );

  return preferences.receiveOptionalEmails === true && preferences.travelInspiration === true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function emptyCounts(): TravelInspirationProcessingCounts {
  return { processed: 0, eligible: 0, sent: 0, skippedByPreferences: 0, skippedAlreadySent: 0, failed: 0 };
}

export async function processTravelInspirationCampaign(options: {
  now?: Date;
  batchSize?: number;
  db?: TravelInspirationDb;
  sendEmail?: TravelInspirationEmailSender;
  campaign?: TravelInspirationCampaign | null;
  dryRun?: boolean;
} = {}): Promise<TravelInspirationProcessingCounts> {
  const counts = emptyCounts();
  const db = options.db ?? (getPrisma() as unknown as TravelInspirationDb);
  const sendEmail = options.sendEmail ?? sendOptionalEmail;
  const batchSize = options.batchSize ?? parsePositiveInteger(process.env.TRAVEL_INSPIRATION_BATCH_SIZE, TRAVEL_INSPIRATION_BATCH_SIZE);
  const dryRun = options.dryRun ?? isDryRun();
  const campaign = options.campaign === undefined ? getActiveTravelInspirationCampaign(options.now ?? new Date()) : options.campaign;

  if (!campaign || !validateTravelInspirationCampaign(campaign)) return counts;

  const users = await loadCandidateUsers(db, batchSize);

  for (const user of users) {
    counts.processed += 1;

    if (user.status !== "ACTIVE" || !user.emailVerified || !isValidEmail(user.email) || !hasTravelInspirationPreferences(user)) {
      counts.skippedByPreferences += 1;
      continue;
    }

    const email = user.email!.trim().toLowerCase();
    const idempotencyKey = buildTravelInspirationIdempotencyKey(campaign.campaignKey, user.id);

    try {
      if (await isSuppressed(db, email)) {
        counts.skippedByPreferences += 1;
        continue;
      }

      if (await hasExistingSuccessfulDelivery(db, idempotencyKey)) {
        counts.skippedAlreadySent += 1;
        continue;
      }

      counts.eligible += 1;

      if (dryRun) continue;

      const result = await sendEmail({
        userId: user.id,
        category: "travelInspiration",
        to: email,
        subject: campaign.subject,
        html: travelInspirationDigestEmail({
          name: user.name,
          heading: "Travel ideas to compare this month",
          intro: "Explore three curated destination ideas on Kurioticket, then compare current options before you decide where to go next.",
          preheader: campaign.preheader,
          destinations: campaign.destinations,
          preferencesUrl: buildPreferencesUrl(),
        }),
        template: TRAVEL_INSPIRATION_TEMPLATE,
        idempotencyKey,
        metadata: { campaignKey: campaign.campaignKey },
      });

      if (result.skipped) {
        counts.skippedByPreferences += 1;
      } else {
        counts.sent += 1;
      }
    } catch (error) {
      counts.failed += 1;
      console.error("[travel-inspiration:send-failed]", {
        userId: user.id,
        campaignKey: campaign.campaignKey,
        message: error instanceof Error ? error.message : "Unknown travel inspiration send error",
      });
    }
  }

  return counts;
}

function buildPreferencesUrl() {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://kurioticket.com").replace(/\/$/, "");
  return new URL("/dashboard/preferences/email", baseUrl).toString();
}

export function isAuthorizedTravelInspirationCronRequest(
  request: Request,
  secret = process.env.TRAVEL_INSPIRATION_CRON_SECRET?.trim(),
) {
  if (!secret) return false;
  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization?.startsWith("Bearer ")) return false;
  const value = authorization.slice("Bearer ".length).trim();
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(secret);
  return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer);
}
