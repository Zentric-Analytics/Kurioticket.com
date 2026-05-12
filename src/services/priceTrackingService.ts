import { withOptionalDb } from "@/lib/prisma";
import { trackAnalyticsEvent } from "@/services/analyticsService";

export async function createPriceAlert(input: {
  userId: string;
  isPremium: boolean;
  type: "FLIGHT" | "HOTEL";
  origin?: string;
  destination: string;
  targetPrice?: number;
  currency: string;
  query: Record<string, unknown>;
}) {
  return withOptionalDb<unknown>(
    async (db) => {
      if (!input.isPremium) {
        const activeCount = await db.priceAlert.count({
          where: { userId: input.userId, status: "ACTIVE" },
        });
        if (activeCount >= 3) {
          throw new Error("Free users can create up to 3 active price alerts.");
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
          nextCheckAt: new Date(Date.now() + (input.isPremium ? 1000 * 60 * 60 * 6 : 1000 * 60 * 60 * 24)),
        },
      });

      await trackAnalyticsEvent({
        userId: input.userId,
        type: "ALERT_CREATED",
        name: "price_alert_created",
        metadata: { type: input.type, premium: input.isPremium },
      });

      return alert;
    },
    {
      id: `local-alert-${Date.now()}`,
      userId: input.userId,
      type: input.type,
      destination: input.destination,
      status: "ACTIVE",
    },
  );
}

export function getAlertCadence(isPremium: boolean) {
  return isPremium
    ? "Premium alerts check more frequently and can include alternate airports, dates, trend signals, and AI savings insights."
    : "Free alerts support up to 3 active watches with meaningful email notifications.";
}
