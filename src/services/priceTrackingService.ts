import { getOptionalPrisma, getPrisma } from "@/lib/prisma";
import { trackAnalyticsEvent } from "@/services/analyticsService";

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
};

export class PriceAlertUnavailableError extends Error {
  constructor(message = "Price alerts are unavailable right now.") {
    super(message);
    this.name = "PriceAlertUnavailableError";
  }
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
  try {
    const db = getPrisma();
    const alert = await db.priceAlert.create({
      data: {
        userId: input.userId,
        type: input.type,
        origin: input.origin,
        destination: input.destination,
        targetPrice: input.targetPrice,
        currency: input.currency,
        query: input.query as never,
        nextCheckAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
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
    console.error("[price-alerts:create-failed]", error);
    throw new PriceAlertUnavailableError("Unable to create price alert.");
  }
}

export function getAlertCadence() {
  return "Price alerts in your account reflect saved provider-backed alert records.";
}
