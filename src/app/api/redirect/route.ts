import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFlightFromCache, getHotelFromCache } from "@/lib/searchCache";
import { withOptionalDb } from "@/lib/prisma";
import { trackAnalyticsEvent } from "@/services/analyticsService";

export async function POST(request: Request) {
  const body = (await request.json()) as { id?: string; type?: "flight" | "hotel"; sourcePage?: string };
  if (!body.id || !body.type) {
    return NextResponse.json({ error: "Redirect target is required." }, { status: 400 });
  }

  const target = body.type === "flight" ? getFlightFromCache(body.id) : getHotelFromCache(body.id);
  if (!target) {
    return NextResponse.json(
      { error: "This partner link expired. Please search again for current prices." },
      { status: 404 },
    );
  }

  const redirectTarget = body.type === "flight"
    ? getFlightRedirectUrl("originAirport" in target ? target : null)
    : getGenericRedirectUrl("location" in target ? target : null);
  if (!redirectTarget.ok) {
    await logRejectedRedirect(body, target, redirectTarget.reason);
    const status = redirectTarget.reason === "unsafe_redirect_target" ? 400 : 409;
    return NextResponse.json(
      {
        error: body.type === "flight"
          ? "This fare can’t be continued to the provider anymore. Please search again for current live fares."
          : "No external provider link is available for this result right now. Please choose another option.",
      },
      { status },
    );
  }

  const url = redirectTarget.url;

  const session = await getOptionalServerSession();
  const route =
    body.type === "flight" && "originAirport" in target
      ? `${target.originAirport}-${target.destinationAirport}`
      : "location" in target
        ? target.location
        : undefined;

  await Promise.all([
    withOptionalDb(
      async (db) => {
        await db.redirectLog.create({
          data: {
            userId: session?.user?.id,
            type: body.type === "flight" ? "FLIGHT" : "HOTEL",
            provider: target.provider,
            route,
            price: "price" in target ? target.price : target.totalPrice,
            currency: target.currency,
            destinationUrl: url.toString(),
            userType: session?.user ? "user" : "guest",
            sourcePage: body.sourcePage || "unknown",
            metadata: { resultId: body.id } as never,
          },
        });
        return true;
      },
      false,
    ),
    trackAnalyticsEvent({
      userId: session?.user?.id,
      type: "REDIRECT",
      name: `${body.type}_partner_redirect`,
      metadata: { provider: target.provider, route },
    }),
  ]);

  return NextResponse.json({ url: url.toString() });
}


type RedirectUrlResult =
  | { ok: true; url: URL }
  | { ok: false; reason: "missing_exact_handoff" | "unsafe_redirect_target" };

function getFlightRedirectUrl(target: ReturnType<typeof getFlightFromCache>): RedirectUrlResult {
  if (!target || target.handoffType !== "exact_provider_link" || !target.handoffUrl) {
    return { ok: false, reason: "missing_exact_handoff" };
  }
  return parseSafeRedirectUrl(target.handoffUrl);
}

function getGenericRedirectUrl(target: { partnerRedirectUrl?: string; bookingUrl?: string } | null): RedirectUrlResult {
  const value = target?.partnerRedirectUrl || target?.bookingUrl;
  if (!value) return { ok: false, reason: "missing_exact_handoff" };
  return parseSafeRedirectUrl(value);
}

function parseSafeRedirectUrl(value: string): RedirectUrlResult {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return { ok: false, reason: "unsafe_redirect_target" };
    if (isGeneratedRouteSearchUrl(url)) return { ok: false, reason: "missing_exact_handoff" };
    return { ok: true, url };
  } catch {
    return { ok: false, reason: "unsafe_redirect_target" };
  }
}

function isGeneratedRouteSearchUrl(url: URL) {
  const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
  if (hostname === "aviasales.com" && url.pathname.startsWith("/search")) return true;
  return Boolean(
    url.searchParams.get("sub_id")?.toLowerCase().includes("metasearch") ||
      (url.searchParams.has("origin_iata") && url.searchParams.has("destination_iata")),
  );
}

async function logRejectedRedirect(
  body: { id?: string; type?: "flight" | "hotel"; sourcePage?: string },
  target: NonNullable<ReturnType<typeof getFlightFromCache>> | NonNullable<ReturnType<typeof getHotelFromCache>>,
  reason: string,
) {
  await withOptionalDb(
    async (db) => {
      await db.redirectLog.create({
        data: {
          type: body.type === "flight" ? "FLIGHT" : "HOTEL",
          provider: target.provider,
          route: body.type === "flight" && "originAirport" in target
            ? `${target.originAirport}-${target.destinationAirport}`
            : "location" in target ? target.location : undefined,
          price: "price" in target ? target.price : target.totalPrice,
          currency: target.currency,
          destinationUrl: "",
          userType: "unknown",
          sourcePage: body.sourcePage || "unknown",
          metadata: { resultId: body.id, reason } as never,
        },
      });
      return true;
    },
    false,
  );
}

async function getOptionalServerSession() {
  try {
    return await getServerSession(authOptions);
  } catch {
    return null;
  }
}
