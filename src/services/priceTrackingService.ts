import { withOptionalDb } from "@/lib/prisma";
import { trackAnalyticsEvent } from "@/services/analyticsService";

export async function createPriceAlert(input: {
  userId: string;
  type: "FLIGHT" | "HOTEL";
  origin?: string;
  destination: string;
  targetPrice?: number;
  currency: string;
  query: Record<string, unknown>;
}) {
  return withOptionalDb<unknown>(
    async (db) => {
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
      });

      await trackAnalyticsEvent({
        userId: input.userId,
        type: "ALERT_CREATED",
        name: "price_alert_created",
        metadata: { type: input.type },
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

export function getAlertCadence() {
  return "Standard account alerts check daily and send meaningful email notifications when prices change.";
}
