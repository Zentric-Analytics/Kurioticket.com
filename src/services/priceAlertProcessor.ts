import { timingSafeEqual } from "node:crypto";

import { getPrisma } from "@/lib/prisma";
import type { FlightSearchParams, HotelSearchParams } from "@/lib/types";
import { searchFlights } from "@/services/travel/flightAggregator";
import { searchHotels } from "@/services/travel/hotelAggregator";
import { priceAlertEmail, sendOptionalEmail } from "@/services/emailService";

export const PRICE_ALERT_BATCH_SIZE = 50;
const DEFAULT_RETRY_DELAY_MS = 1000 * 60 * 60;
const DEFAULT_CHECK_DELAY_MS = 1000 * 60 * 60 * 24;

export type ResolvedPrice = {
  provider: string;
  price: number;
  currency: string;
  payload?: Record<string, unknown>;
  url?: string;
};

type PriceAlertRecord = {
  id: string;
  userId: string;
  type: "FLIGHT" | "HOTEL";
  origin: string | null;
  destination: string;
  targetPrice: { toString(): string } | number | string | null;
  currency: string;
  status: "ACTIVE" | "PAUSED" | "TRIGGERED" | "EXPIRED" | "DELETED";
  query: unknown;
  nextCheckAt: Date | null;
  user?: { email: string | null; name: string | null } | null;
};

type PriceAlertDb = {
  priceAlert: {
    findMany(args: unknown): Promise<PriceAlertRecord[]>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
    updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
  };
  priceSnapshot: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
};

export type PriceAlertProcessingCounts = {
  processed: number;
  sent: number;
  skippedByPreferences: number;
  notTriggered: number;
  failed: number;
};

export type PriceResolver = (alert: PriceAlertRecord) => Promise<ResolvedPrice>;
export type OptionalEmailSender = typeof sendOptionalEmail;

export async function processDuePriceAlerts(options: {
  now?: Date;
  batchSize?: number;
  db?: PriceAlertDb;
  resolvePrice?: PriceResolver;
  sendEmail?: OptionalEmailSender;
  checkDelayMs?: number;
  retryDelayMs?: number;
} = {}): Promise<PriceAlertProcessingCounts> {
  const now = options.now ?? new Date();
  const db = options.db ?? (getPrisma() as unknown as PriceAlertDb);
  const resolvePrice = options.resolvePrice ?? resolveAlertPrice;
  const sendEmail = options.sendEmail ?? sendOptionalEmail;
  const checkDelayMs = options.checkDelayMs ?? DEFAULT_CHECK_DELAY_MS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const counts = emptyCounts();

  const alerts = await db.priceAlert.findMany({
    where: { status: "ACTIVE", nextCheckAt: { lte: now } },
    orderBy: { nextCheckAt: "asc" },
    take: options.batchSize ?? PRICE_ALERT_BATCH_SIZE,
    include: { user: { select: { email: true, name: true } } },
  });

  for (const alert of alerts) {
    if (alert.status !== "ACTIVE" || !alert.nextCheckAt || alert.nextCheckAt > now) continue;
    counts.processed += 1;
    try {
      const resolved = await resolvePrice(alert);
      const nextCheckAt = new Date(now.getTime() + checkDelayMs);
      await recordSuccessfulCheck(db, alert, resolved, now, nextCheckAt);

      const targetPrice = toFiniteNumber(alert.targetPrice);
      if (targetPrice === null) {
        counts.notTriggered += 1;
        continue;
      }

      if (resolved.currency.toUpperCase() !== alert.currency.toUpperCase()) {
        console.warn("[price-alerts:currency-mismatch]", { alertId: alert.id, expected: alert.currency, actual: resolved.currency });
        counts.notTriggered += 1;
        continue;
      }

      if (resolved.price > targetPrice) {
        counts.notTriggered += 1;
        continue;
      }

      if (!alert.user?.email) {
        console.warn("[price-alerts:missing-email]", { alertId: alert.id });
        counts.failed += 1;
        await scheduleRetry(db, alert.id, now, retryDelayMs);
        continue;
      }

      const route = alert.type === "FLIGHT" && alert.origin ? `${alert.origin} to ${alert.destination}` : alert.destination;
      const url = resolved.url || `${process.env.NEXT_PUBLIC_APP_URL || "https://kurioticket.com"}/dashboard/alerts`;
      const html = priceAlertEmail({ name: alert.user.name, route, price: formatPrice(resolved.price, resolved.currency), url });
      const idempotencyKey = buildPriceAlertIdempotencyKey(alert);
      const result = await sendEmail({
        userId: alert.userId,
        category: "priceAlerts",
        to: alert.user.email,
        subject: `Price alert: ${route} reached ${formatPrice(resolved.price, resolved.currency)}`,
        html,
        template: "price_alert",
        idempotencyKey,
        metadata: { alertId: alert.id, currentPrice: resolved.price, currency: resolved.currency },
      });

      if (result.skipped) {
        counts.skippedByPreferences += 1;
        continue;
      }

      const triggered = await db.priceAlert.updateMany({
        where: { id: alert.id, status: "ACTIVE", nextCheckAt },
        data: { status: "TRIGGERED", nextCheckAt: null },
      });
      if (triggered.count > 0) counts.sent += 1;
    } catch (error) {
      counts.failed += 1;
      console.error("[price-alerts:process-failed]", safeError(error, alert.id));
      await scheduleRetry(db, alert.id, now, retryDelayMs);
    }
  }

  return counts;
}

export async function resolveAlertPrice(alert: PriceAlertRecord): Promise<ResolvedPrice> {
  if (alert.type === "FLIGHT") {
    const search = alert.query as Partial<FlightSearchParams>;
    const result = await searchFlights(search as FlightSearchParams);
    if (result.servedFromFallback || result.results.length === 0) throw new Error("live_flight_price_unavailable");
    const best = result.results[0];
    return { provider: best.provider, price: best.price, currency: best.currency, url: best.partnerRedirectUrl || best.bookingUrl, payload: { resultId: best.id } };
  }
  const search = alert.query as Partial<HotelSearchParams>;
  const result = await searchHotels(search as HotelSearchParams);
  if (result.servedFromFallback || result.results.length === 0) throw new Error("live_hotel_price_unavailable");
  const best = result.results[0];
  return { provider: best.provider, price: best.totalPrice, currency: best.currency, url: best.partnerRedirectUrl || best.bookingUrl, payload: { resultId: best.id } };
}

async function recordSuccessfulCheck(db: PriceAlertDb, alert: PriceAlertRecord, resolved: ResolvedPrice, now: Date, nextCheckAt: Date) {
  await db.priceSnapshot.create({ data: { priceAlertId: alert.id, provider: resolved.provider, price: resolved.price, currency: resolved.currency, payload: resolved.payload ?? {} } });
  await db.priceAlert.update({ where: { id: alert.id }, data: { lastSeenPrice: resolved.price, lastCheckedAt: now, nextCheckAt } });
}

async function scheduleRetry(db: PriceAlertDb, alertId: string, now: Date, retryDelayMs: number) {
  await db.priceAlert.updateMany({ where: { id: alertId, status: "ACTIVE" }, data: { nextCheckAt: new Date(now.getTime() + retryDelayMs) } });
}

function emptyCounts(): PriceAlertProcessingCounts { return { processed: 0, sent: 0, skippedByPreferences: 0, notTriggered: 0, failed: 0 }; }
function toFiniteNumber(value: PriceAlertRecord["targetPrice"]) { const n = value === null ? NaN : Number(value.toString()); return Number.isFinite(n) ? n : null; }
export function buildPriceAlertIdempotencyKey(alert: Pick<PriceAlertRecord, "id" | "targetPrice" | "currency">) { return `price-alert:${alert.id}:${alert.targetPrice?.toString() ?? "none"}:${alert.currency}`; }
function formatPrice(price: number, currency: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price); }
function safeError(error: unknown, alertId: string) { return { alertId, message: error instanceof Error ? error.message : "Unknown price alert processing error" }; }

export function isAuthorizedCronRequest(request: Request, secret = process.env.PRICE_ALERTS_CRON_SECRET?.trim()) {
  if (!secret) return false;
  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization?.startsWith("Bearer ")) return false;
  const value = authorization.slice("Bearer ".length).trim();
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(secret);
  return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer);
}
