import { getOptionalPrisma, getPrisma } from "@/lib/prisma";
import { trackAnalyticsEvent } from "@/services/analyticsService";
import { flightPriceAlertDuplicateKey } from "@/lib/price-alerts/flightPriceAlerts";
import { isFeatureEnabled } from "@/lib/feature-controls/service";

export type AccountPriceAlert = {
  id: string;
  type: "FLIGHT" | "HOTEL";
  origin: string | null;
  destination: string;
  targetPrice: string | null;
  currency: string | null;
  status: "ACTIVE" | "PAUSED" | "TRIGGERED" | "EXPIRED" | "DELETED";
  createdAt: string;
  updatedAt: string;
  lastSeenPrice: string | null;
  lastCheckedAt: string | null;
  query: Record<string, unknown>;
};

export class DuplicatePriceAlertError extends Error {
  alert: AccountPriceAlert;

  constructor(alert: AccountPriceAlert) {
    super("You already have this price alert.");
    this.name = "DuplicatePriceAlertError";
    this.alert = alert;
  }
}

export class PriceAlertUnavailableError extends Error {
  constructor(message = "Price alerts are unavailable right now.") {
    super(message);
    this.name = "PriceAlertUnavailableError";
  }
}

export class PriceAlertNotFoundError extends Error {
  constructor() { super("Price alert not found."); this.name = "PriceAlertNotFoundError"; }
}

export class InvalidPriceAlertTransitionError extends Error {
  constructor() { super("This price alert cannot be changed to that status."); this.name = "InvalidPriceAlertTransitionError"; }
}

export function nextPriceAlertCheck(now = new Date()) {
  return new Date(now.getTime() + 1000 * 60 * 60 * 24);
}

function serializePriceAlert(alert: {
  id: string;
  type: "FLIGHT" | "HOTEL";
  origin: string | null;
  destination: string;
  targetPrice: { toString: () => string } | number | string | null;
  currency: string | null;
  status: "ACTIVE" | "PAUSED" | "TRIGGERED" | "EXPIRED" | "DELETED";
  createdAt: Date;
  updatedAt: Date;
  lastSeenPrice?: { toString: () => string } | number | string | null;
  lastCheckedAt?: Date | null;
  query?: unknown;
}): AccountPriceAlert {
  return {
    id: alert.id,
    type: alert.type,
    origin: alert.origin,
    destination: alert.destination,
    targetPrice: alert.targetPrice === null ? null : alert.targetPrice.toString(),
    currency: alert.currency,
    status: alert.status,
    createdAt: alert.createdAt.toISOString(),
    updatedAt: alert.updatedAt.toISOString(),
    lastSeenPrice: alert.lastSeenPrice == null ? null : alert.lastSeenPrice.toString(),
    lastCheckedAt: alert.lastCheckedAt?.toISOString() ?? null,
    query: typeof alert.query === "object" && alert.query !== null && !Array.isArray(alert.query) ? alert.query as Record<string, unknown> : {},
  };
}

export async function listUserPriceAlerts(userId: string): Promise<AccountPriceAlert[]> {
  const db = getOptionalPrisma();

  if (!db) {
    return [];
  }

  try {
    const alerts = await db.priceAlert.findMany({
      where: {
        userId,
        status: {
          not: "DELETED",
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        type: true,
        origin: true,
        destination: true,
        targetPrice: true,
        currency: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastSeenPrice: true,
        lastCheckedAt: true,
        query: true,
      },
    });

    return alerts.map(serializePriceAlert);
  } catch (error) {
    console.error("[price-alerts:list-failed]", error);
    throw new PriceAlertUnavailableError("Unable to load price alerts.");
  }
}

export async function createPriceAlert(input: {
  userId: string;
  type: "FLIGHT" | "HOTEL";
  origin?: string;
  destination: string;
  targetPrice?: number;
  currency: string;
  query: Record<string, unknown>;
}) {
  if (!(await isFeatureEnabled("PRICE_ALERTS_ENABLED"))) throw new PriceAlertUnavailableError();
  try {
    const db = getPrisma();
    if (input.type === "FLIGHT") {
      const requestedKey = flightPriceAlertDuplicateKey({
        origin: input.origin ?? null,
        destination: input.destination,
        targetPrice: input.targetPrice ?? null,
        currency: input.currency,
        query: input.query,
      });

      if (requestedKey) {
        const existingAlerts = await db.priceAlert.findMany({
          where: {
            userId: input.userId,
            type: "FLIGHT",
            status: { in: ["ACTIVE", "PAUSED"] },
            origin: input.origin,
            destination: input.destination,
            currency: input.currency,
          },
          select: {
            id: true, type: true, origin: true, destination: true, targetPrice: true, currency: true, status: true, query: true, createdAt: true, updatedAt: true,
          },
        });
        const duplicate = existingAlerts.find((alert) => flightPriceAlertDuplicateKey(alert) === requestedKey);
        if (duplicate) throw new DuplicatePriceAlertError(serializePriceAlert(duplicate));
      }
    }

    const alert = await db.priceAlert.create({
      data: {
        userId: input.userId,
        type: input.type,
        origin: input.origin,
        destination: input.destination,
        targetPrice: input.targetPrice,
        currency: input.currency,
        query: input.query as never,
        nextCheckAt: nextPriceAlertCheck(),
      },
      select: {
        id: true,
        type: true,
        origin: true,
        destination: true,
        targetPrice: true,
        currency: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastSeenPrice: true,
        lastCheckedAt: true,
        query: true,
      },
    });

    await trackAnalyticsEvent({
      userId: input.userId,
      type: "ALERT_CREATED",
      name: "price_alert_created",
      metadata: { type: input.type },
    });

    return serializePriceAlert(alert);
  } catch (error) {
    if (error instanceof DuplicatePriceAlertError) throw error;
    console.error("[price-alerts:create-failed]", error);
    throw new PriceAlertUnavailableError("Unable to create price alert.");
  }
}

const alertSelect = {
  id: true, type: true, origin: true, destination: true, targetPrice: true, currency: true,
  status: true, createdAt: true, updatedAt: true, lastSeenPrice: true, lastCheckedAt: true, query: true,
} as const;

export async function updateUserPriceAlertStatus(input: { id: string; userId: string; status: "ACTIVE" | "PAUSED" }) {
  if (input.status === "ACTIVE" && !(await isFeatureEnabled("PRICE_ALERTS_ENABLED"))) throw new PriceAlertUnavailableError();
  try {
    const db = getPrisma();
    const current = input.status === "PAUSED" ? "ACTIVE" : "PAUSED";
    const result = await db.priceAlert.updateMany({
      where: { id: input.id, userId: input.userId, status: current },
      data: { status: input.status, nextCheckAt: input.status === "ACTIVE" ? nextPriceAlertCheck() : null },
    });
    if (!result.count) {
      const exists = await db.priceAlert.findFirst({ where: { id: input.id, userId: input.userId, status: { not: "DELETED" } }, select: { id: true } });
      if (!exists) throw new PriceAlertNotFoundError();
      throw new InvalidPriceAlertTransitionError();
    }
    const alert = await db.priceAlert.findFirst({ where: { id: input.id, userId: input.userId }, select: alertSelect });
    if (!alert) throw new PriceAlertNotFoundError();
    return serializePriceAlert(alert);
  } catch (error) {
    if (error instanceof PriceAlertNotFoundError || error instanceof InvalidPriceAlertTransitionError) throw error;
    console.error("[price-alerts:update-failed]", error);
    throw new PriceAlertUnavailableError("Unable to update price alert.");
  }
}

export async function deleteUserPriceAlert(input: { id: string; userId: string }) {
  try {
    const result = await getPrisma().priceAlert.updateMany({
      where: { id: input.id, userId: input.userId, status: { not: "DELETED" } },
      data: { status: "DELETED", nextCheckAt: null },
    });
    if (!result.count) throw new PriceAlertNotFoundError();
    return { deleted: true as const, id: input.id };
  } catch (error) {
    if (error instanceof PriceAlertNotFoundError) throw error;
    console.error("[price-alerts:delete-failed]", error);
    throw new PriceAlertUnavailableError("Unable to delete price alert.");
  }
}

export function getAlertCadence() {
  return "Price alerts in your account reflect saved provider-backed alert records.";
}
