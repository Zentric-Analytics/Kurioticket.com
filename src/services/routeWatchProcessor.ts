import { timingSafeEqual } from "node:crypto";

import { getPrisma } from "@/lib/prisma";
import { parseSavedFlightSearchQuery, type ParsedSavedFlightSearch } from "@/lib/saved-searches";
import type { FlightSearchParams, NormalizedFlightResult } from "@/lib/types";
import { hasSuccessfulEmailDelivery } from "@/services/emailDeliveryService";
import { routeWatchUpdateEmail, sendOptionalEmail } from "@/services/emailService";
import { searchFlights } from "@/services/travel/flightAggregator";

export const ROUTE_WATCH_BATCH_SIZE = 50;
export const ROUTE_WATCH_CHECK_DELAY_MS = 1000 * 60 * 60 * 24;
export const ROUTE_WATCH_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7;
export const ROUTE_WATCH_MIN_DROP_PERCENT = 15;
export const ROUTE_WATCH_MIN_DROP_AMOUNT = 25;

const routeWatchSuccessfulDeliveryStatuses = ["SENT", "DELIVERED", "DELIVERY_DELAYED", "OPENED", "CLICKED"] as const;

type DecimalLike = { toString(): string } | number | string | null;
type RouteWatchStatus = "ACTIVE" | "PAUSED" | "EXPIRED" | "ERROR";

type RouteWatchRecord = {
  id: string;
  userId: string;
  savedSearchId: string;
  status: RouteWatchStatus;
  baselinePrice: DecimalLike;
  baselineCurrency: string | null;
  lastSeenPrice: DecimalLike;
  lastSeenCurrency: string | null;
  lastNotifiedPrice: DecimalLike;
  lastNotifiedAt: Date | null;
  consecutiveFailures: number;
  nextCheckAt: Date | null;
  savedSearch: {
    id: string;
    type: "FLIGHT" | "HOTEL";
    origin: string | null;
    destination: string | null;
    query: unknown;
  } | null;
  user: { id: string; email: string | null; name: string | null; status: string } | null;
};

type PriceAlertRecord = {
  id: string;
  type: "FLIGHT" | "HOTEL";
  origin: string | null;
  destination: string;
  currency: string | null;
  status: string;
  query: unknown;
};

type RouteWatchDb = {
  routeWatchState: {
    findMany(args: unknown): Promise<RouteWatchRecord[]>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  };
  priceAlert: { findMany(args: unknown): Promise<PriceAlertRecord[]> };
  $queryRawUnsafe?<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
};

export type RouteWatchProcessingCounts = {
  processed: number;
  initialized: number;
  checked: number;
  notified: number;
  skippedPreferences: number;
  skippedSuppressed: number;
  skippedPriceAlert: number;
  skippedThreshold: number;
  skippedDuplicate: number;
  expired: number;
  failed: number;
};

export type RouteWatchPriceResolver = (search: FlightSearchParams) => Promise<ResolvedRouteWatchFare>;
export type RouteWatchEmailSender = typeof sendOptionalEmail;
export type SuccessfulDeliveryChecker = (idempotencyKey: string) => Promise<boolean>;

export type ResolvedRouteWatchFare = {
  provider: string;
  price: number;
  currency: string;
  bookingUrl?: string;
};

export async function processDueRouteWatches(options: {
  now?: Date;
  batchSize?: number;
  db?: RouteWatchDb;
  resolveFare?: RouteWatchPriceResolver;
  sendEmail?: RouteWatchEmailSender;
  hasSuccessfulDelivery?: SuccessfulDeliveryChecker;
} = {}): Promise<RouteWatchProcessingCounts> {
  const now = options.now ?? new Date();
  const db = options.db ?? (getPrisma() as unknown as RouteWatchDb);
  const resolveFare = options.resolveFare ?? resolveRouteWatchFare;
  const sendEmail = options.sendEmail ?? sendOptionalEmail;
  const hasDelivery = options.hasSuccessfulDelivery ?? buildSuccessfulDeliveryChecker(db);
  const counts = emptyCounts();

  const watches = await db.routeWatchState.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: now } }],
      savedSearch: { is: { type: "FLIGHT" } },
      user: { is: { status: "ACTIVE" } },
    },
    orderBy: [{ nextCheckAt: "asc" }, { createdAt: "asc" }],
    take: options.batchSize ?? parseBatchSize(),
    include: {
      savedSearch: { select: { id: true, type: true, origin: true, destination: true, query: true } },
      user: { select: { id: true, email: true, name: true, status: true } },
    },
  });

  for (const watch of watches) {
    if (watch.status !== "ACTIVE" || (watch.nextCheckAt && watch.nextCheckAt > now)) continue;
    if (!watch.user || watch.user.status !== "ACTIVE" || !watch.savedSearch || watch.savedSearch.type !== "FLIGHT") continue;
    counts.processed += 1;

    try {
      const parsed = getEligibleParsedSearch(watch);
      if (!parsed) {
        await failWatch(db, watch, now, "invalid_saved_search");
        counts.failed += 1;
        continue;
      }

      if (isPastDeparture(parsed, now)) {
        await db.routeWatchState.update({ where: { id: watch.id }, data: { status: "EXPIRED", nextCheckAt: null, lastCheckedAt: now, lastErrorCode: null } });
        counts.expired += 1;
        continue;
      }

      const fare = await resolveFare(toFlightSearchParams(parsed));
      const baselinePrice = toFiniteNumber(watch.baselinePrice);
      const baselineCurrency = normalizeCurrency(watch.baselineCurrency);
      const nextCheckAt = new Date(now.getTime() + ROUTE_WATCH_CHECK_DELAY_MS);

      if (baselinePrice === null || !baselineCurrency) {
        await db.routeWatchState.update({
          where: { id: watch.id },
          data: successfulCheckData(fare, now, nextCheckAt, {
            baselinePrice: fare.price,
            baselineCurrency: fare.currency,
          }),
        });
        counts.initialized += 1;
        continue;
      }

      counts.checked += 1;
      const comparisonPrice = toFiniteNumber(watch.lastNotifiedPrice) ?? baselinePrice;
      const comparisonCurrency = baselineCurrency;
      const drop = calculateMeaningfulDrop({ currentPrice: fare.price, currentCurrency: fare.currency, comparisonPrice, comparisonCurrency });

      if (!drop.shouldNotify) {
        await db.routeWatchState.update({ where: { id: watch.id }, data: successfulCheckData(fare, now, nextCheckAt) });
        counts.skippedThreshold += 1;
        continue;
      }

      const lastNotifiedAt = watch.lastNotifiedAt;
      if (lastNotifiedAt && now.getTime() - lastNotifiedAt.getTime() < ROUTE_WATCH_COOLDOWN_MS) {
        const lastNotifiedPrice = toFiniteNumber(watch.lastNotifiedPrice);
        const cooldownDrop = lastNotifiedPrice === null ? null : calculateMeaningfulDrop({
          currentPrice: fare.price,
          currentCurrency: fare.currency,
          comparisonPrice: lastNotifiedPrice,
          comparisonCurrency: fare.currency,
        });
        if (!cooldownDrop?.shouldNotify) {
          await db.routeWatchState.update({ where: { id: watch.id }, data: successfulCheckData(fare, now, nextCheckAt) });
          counts.skippedThreshold += 1;
          continue;
        }
      }

      if (await hasEquivalentActivePriceAlert(db, watch.userId, parsed)) {
        await db.routeWatchState.update({ where: { id: watch.id }, data: successfulCheckData(fare, now, nextCheckAt) });
        counts.skippedPriceAlert += 1;
        continue;
      }

      const idempotencyKey = buildRouteWatchUpdateIdempotencyKey({ routeWatchId: watch.id, currency: fare.currency, price: fare.price, observedAt: now });
      if (await hasDelivery(idempotencyKey)) {
        await db.routeWatchState.update({ where: { id: watch.id }, data: successfulCheckData(fare, now, nextCheckAt) });
        counts.skippedDuplicate += 1;
        continue;
      }

      if (!watch.user?.email) {
        await db.routeWatchState.update({ where: { id: watch.id }, data: successfulCheckData(fare, now, nextCheckAt) });
        counts.skippedPreferences += 1;
        continue;
      }

      const result = await sendEmail({
        userId: watch.userId,
        category: "routeWatchUpdates",
        to: watch.user.email,
        subject: `Route watch: ${parsed.origin} to ${parsed.destination} fare is lower`,
        html: routeWatchUpdateEmail({
          name: watch.user.name,
          origin: parsed.origin,
          destination: parsed.destination,
          departureDate: parsed.departureDate,
          returnDate: parsed.returnDate ?? null,
          previousPrice: formatPrice(comparisonPrice, fare.currency),
          currentPrice: formatPrice(fare.price, fare.currency),
          decreasePercent: `${drop.dropPercent.toFixed(0)}% lower`,
          currency: fare.currency,
          ctaUrl: fare.bookingUrl || buildRouteWatchCtaUrl(parsed),
          preferencesUrl: buildPreferencesUrl(),
        }),
        template: "route_watch_update",
        idempotencyKey,
        metadata: { routeWatchId: watch.id, savedSearchId: watch.savedSearchId, currentPrice: fare.price, currency: fare.currency },
      });

      if (result.skipped) {
        await db.routeWatchState.update({ where: { id: watch.id }, data: successfulCheckData(fare, now, nextCheckAt) });
        if (result.reason === "email_suppressed") counts.skippedSuppressed += 1;
        else counts.skippedPreferences += 1;
        continue;
      }

      await db.routeWatchState.update({
        where: { id: watch.id },
        data: successfulCheckData(fare, now, nextCheckAt, { lastNotifiedPrice: fare.price, lastNotifiedAt: now }),
      });
      counts.notified += 1;
    } catch (error) {
      console.error("[route-watch:process-failed]", { routeWatchId: watch.id, message: error instanceof Error ? error.message : "Unknown route watch processing error" });
      await failWatch(db, watch, now, classifyRouteWatchError(error));
      counts.failed += 1;
    }
  }

  return counts;
}

export async function resolveRouteWatchFare(search: FlightSearchParams): Promise<ResolvedRouteWatchFare> {
  const result = await searchFlights({ ...search, sort: "cheapest" });
  if (result.servedFromFallback) throw new Error("fallback_results_rejected");
  const liveSuccess = result.providerStatuses.some((provider) => provider.status === "success" && !/fallback|demo|mock|synthetic/i.test(provider.provider));
  if (!liveSuccess) throw new Error("live_provider_unavailable");
  const fare = result.results
    .filter(isValidLiveFare)
    .sort((left, right) => left.price - right.price)[0];
  if (!fare) throw new Error("valid_live_fare_unavailable");
  return { provider: fare.provider, price: fare.price, currency: normalizeCurrency(fare.currency) || "USD", bookingUrl: fare.partnerRedirectUrl || fare.bookingUrl };
}

function isValidLiveFare(fare: NormalizedFlightResult) {
  return Number.isFinite(fare.price) && fare.price > 0 && Boolean(normalizeCurrency(fare.currency)) && !/fallback|demo|mock|synthetic/i.test(fare.provider);
}

function getEligibleParsedSearch(watch: RouteWatchRecord) {
  if (!watch.user || watch.user.status !== "ACTIVE") return null;
  if (!watch.savedSearch || watch.savedSearch.type !== "FLIGHT") return null;
  const parsed = parseSavedFlightSearchQuery(watch.savedSearch.query);
  if (!parsed || !parsed.origin || !parsed.destination) return null;
  return parsed;
}

function toFlightSearchParams(parsed: ParsedSavedFlightSearch): FlightSearchParams {
  return {
    tripType: parsed.tripType,
    origin: parsed.origin,
    destination: parsed.destination,
    departureDate: parsed.departureDate,
    returnDate: parsed.returnDate,
    adults: parsed.adults,
    children: parsed.children,
    infants: parsed.infants,
    travelers: parsed.travelers,
    cabinClass: parsed.cabinClass,
    currency: parsed.currency,
    sort: "cheapest",
  };
}

function isPastDeparture(parsed: ParsedSavedFlightSearch, now: Date) {
  const departure = new Date(`${parsed.departureDate}T00:00:00.000Z`);
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  return !Number.isFinite(departure.getTime()) || departure < today;
}

function successfulCheckData(fare: ResolvedRouteWatchFare, now: Date, nextCheckAt: Date, extra: Record<string, unknown> = {}) {
  return {
    lastSeenPrice: fare.price,
    lastSeenCurrency: fare.currency,
    lastProvider: fare.provider,
    lastAvailability: "AVAILABLE",
    lastCheckedAt: now,
    nextCheckAt,
    consecutiveFailures: 0,
    lastErrorCode: null,
    status: "ACTIVE",
    ...extra,
  };
}

async function failWatch(db: RouteWatchDb, watch: RouteWatchRecord, now: Date, errorCode: string) {
  const failures = Math.max(0, watch.consecutiveFailures || 0) + 1;
  await db.routeWatchState.update({
    where: { id: watch.id },
    data: {
      consecutiveFailures: failures,
      lastErrorCode: errorCode.slice(0, 80),
      lastCheckedAt: now,
      nextCheckAt: new Date(now.getTime() + retryDelayMs(failures)),
      status: failures >= 5 ? "ERROR" : "ACTIVE",
    },
  });
}

function retryDelayMs(failures: number) {
  if (failures <= 1) return 1000 * 60 * 60 * 3;
  if (failures === 2) return 1000 * 60 * 60 * 6;
  return ROUTE_WATCH_CHECK_DELAY_MS;
}

export function calculateMeaningfulDrop(input: { currentPrice: number; currentCurrency: string; comparisonPrice: number; comparisonCurrency: string | null }) {
  const currentCurrency = normalizeCurrency(input.currentCurrency);
  const comparisonCurrency = normalizeCurrency(input.comparisonCurrency);
  const dropAmount = input.comparisonPrice - input.currentPrice;
  const dropPercent = input.comparisonPrice > 0 ? (dropAmount / input.comparisonPrice) * 100 : 0;
  return {
    dropAmount,
    dropPercent,
    shouldNotify: Boolean(
      currentCurrency && comparisonCurrency && currentCurrency === comparisonCurrency &&
      dropAmount >= ROUTE_WATCH_MIN_DROP_AMOUNT &&
      dropPercent >= ROUTE_WATCH_MIN_DROP_PERCENT,
    ),
  };
}

async function hasEquivalentActivePriceAlert(db: RouteWatchDb, userId: string, parsed: ParsedSavedFlightSearch) {
  const alerts = await db.priceAlert.findMany({
    where: { userId, type: "FLIGHT", status: "ACTIVE", origin: parsed.origin, destination: parsed.destination },
    select: { id: true, type: true, origin: true, destination: true, currency: true, status: true, query: true },
  });
  return alerts.some((alert) => isEquivalentFlightPriceAlert(alert, parsed));
}

export function isEquivalentFlightPriceAlert(alert: PriceAlertRecord, parsed: ParsedSavedFlightSearch) {
  if (alert.status !== "ACTIVE" || alert.type !== "FLIGHT") return false;
  const query = parseSavedFlightSearchQuery(alert.query);
  if (!query) return false;
  return normalizeText(query.origin) === normalizeText(parsed.origin)
    && normalizeText(query.destination) === normalizeText(parsed.destination)
    && query.departureDate === parsed.departureDate
    && (query.returnDate ?? null) === (parsed.returnDate ?? null)
    && query.tripType === parsed.tripType
    && query.cabinClass === parsed.cabinClass
    && query.adults === parsed.adults
    && query.children === parsed.children
    && query.infants === parsed.infants
    && query.travelers === parsed.travelers
    && normalizeCurrency(query.currency || alert.currency) === normalizeCurrency(parsed.currency || alert.currency);
}

export function buildRouteWatchUpdateIdempotencyKey(input: { routeWatchId: string; currency: string; price: number; observedAt: Date }) {
  const price = input.price.toFixed(2);
  const dateBucket = input.observedAt.toISOString().slice(0, 10);
  return `route-watch-update:${input.routeWatchId}:${normalizeCurrency(input.currency) || "UNK"}:${price}:${dateBucket}`;
}

function buildSuccessfulDeliveryChecker(db: RouteWatchDb): SuccessfulDeliveryChecker {
  const queryRawUnsafe = db.$queryRawUnsafe;
  if (queryRawUnsafe) {
    return async (idempotencyKey: string) => {
      const rows = await queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM email_deliveries WHERE idempotency_key = $1 AND status IN (${routeWatchSuccessfulDeliveryStatuses.map((_, index) => `$${index + 2}`).join(", ")}) LIMIT 1`,
        idempotencyKey,
        ...routeWatchSuccessfulDeliveryStatuses,
      );
      return rows.length > 0;
    };
  }
  return hasSuccessfulEmailDelivery;
}

function toFiniteNumber(value: DecimalLike) {
  const number = value === null ? NaN : Number(value.toString());
  return Number.isFinite(number) && number > 0 ? number : null;
}

function normalizeCurrency(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase() || "";
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toUpperCase() || "";
}

function parseBatchSize() {
  const parsed = Number.parseInt(process.env.ROUTE_WATCH_BATCH_SIZE || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : ROUTE_WATCH_BATCH_SIZE;
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
}

function buildRouteWatchCtaUrl(parsed: ParsedSavedFlightSearch) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://kurioticket.com").replace(/\/$/, "");
  return `${baseUrl}${parsed.href}`;
}

function buildPreferencesUrl() {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://kurioticket.com").replace(/\/$/, "");
  return new URL("/dashboard/preferences/email", baseUrl).toString();
}

function classifyRouteWatchError(error: unknown) {
  const message = error instanceof Error ? error.message : "route_watch_failed";
  if (/fallback/i.test(message)) return "fallback_results_rejected";
  if (/fare|price/i.test(message)) return "valid_live_fare_unavailable";
  if (/provider|timeout|network|unavailable/i.test(message)) return "provider_unavailable";
  return "route_watch_failed";
}

function emptyCounts(): RouteWatchProcessingCounts {
  return {
    processed: 0,
    initialized: 0,
    checked: 0,
    notified: 0,
    skippedPreferences: 0,
    skippedSuppressed: 0,
    skippedPriceAlert: 0,
    skippedThreshold: 0,
    skippedDuplicate: 0,
    expired: 0,
    failed: 0,
  };
}

export function isAuthorizedRouteWatchCronRequest(
  request: Request,
  secret = process.env.ROUTE_WATCH_UPDATES_CRON_SECRET?.trim(),
) {
  if (!secret) return false;
  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization?.startsWith("Bearer ")) return false;
  const value = authorization.slice("Bearer ".length).trim();
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(secret);
  return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer);
}
