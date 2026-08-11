import "server-only";
import { resolveOptionalWebApiSession } from "@/lib/web-api-auth";
import { withOptionalDb } from "@/lib/prisma";
import { trackAnalyticsEvent } from "@/services/analyticsService";
import { dealsFlightInventorySessions } from "./dealsFlightInventorySession";
import { revalidateFlightOfferInternal } from "./flightOfferRevalidation";

export type DealsFlightHandoffSelectionV2 = {
  inventoryToken: string;
  sourceSearchKey: string;
  outboundItineraryKey: string;
  returnItineraryKey?: string;
  fareKey: string;
};

export function safeExternalHandoffUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export async function activateDealsFlightHandoffV2(
  selection: DealsFlightHandoffSelectionV2,
) {
  const loaded = await dealsFlightInventorySessions.resolve(
    selection.inventoryToken,
    selection.sourceSearchKey,
    selection.outboundItineraryKey,
    selection.returnItineraryKey,
    selection.fareKey,
  );
  if (!loaded.offer) return { status: "invalid-selection" as const };
  const outcome = await revalidateFlightOfferInternal({
    cachedOffer: loaded.offer,
    search: loaded.search,
    outboundItineraryKey: selection.outboundItineraryKey,
    returnItineraryKey: selection.returnItineraryKey,
    fareKey: selection.fareKey,
    now: Date.now(),
  });
  if (outcome.status !== "confirmed") {
    if (outcome.status === "changed")
      return { status: "changed" as const, offer: outcome.offer };
    return outcome;
  }
  const url = safeExternalHandoffUrl(
    outcome.refreshedOffer.partnerRedirectUrl ||
      outcome.refreshedOffer.bookingUrl,
  );
  if (!url) return { status: "action-unavailable" as const };

  const session = (await resolveOptionalWebApiSession())?.session;
  const route = `${loaded.search.origin}-${loaded.search.destination}`;
  await Promise.all([
    withOptionalDb(async (db) => {
      await db.redirectLog.create({
        data: {
          userId: session?.user?.id,
          type: "FLIGHT",
          provider: outcome.offer.provider,
          route,
          price: outcome.offer.sourcePrice,
          currency: outcome.offer.sourceCurrency,
          destinationUrl: url,
          userType: session?.user ? "user" : "guest",
          sourcePage: "deals_v2_handoff",
          metadata: { contract: "deals-v2-flight-handoff" } as never,
        },
      });
      return true;
    }, false),
    trackAnalyticsEvent({
      userId: session?.user?.id,
      type: "REDIRECT",
      name: "flight_partner_redirect",
      metadata: {
        provider: outcome.offer.provider,
        route,
        sourcePage: "deals_v2_handoff",
      },
    }),
  ]);
  return { status: "ready" as const, url };
}
