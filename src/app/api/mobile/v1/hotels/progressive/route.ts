import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";
import { resolveRequestActivityIdentity } from "@/services/requestActivityIdentity";
import { logProviderCall, logSearchHistory, trackAnalyticsEvent } from "@/services/analyticsService";
import { hotelSearchSchema } from "@/lib/validation";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { getKayakClientIp } from "@/lib/kayak-client-ip";
import { isFeatureEnabled } from "@/lib/feature-controls/service";
import { isKayakSandboxEnabled, KayakSandboxClient, KayakError, type KayakHotelBatchCheckpoint } from "@/services/travel/kayakSandbox";
import { resolveRegularKayakSearch } from "@/services/travel/kayakRegularSearch";
import { kayakProviderCriteria } from "@/services/travel/kayakMetasearchProvider";
import { kayakHotelCardModel } from "@/components/results/kayakCardModels";
import { rememberHotels, toPublicHotel } from "@/lib/searchCache";
import { getHotelSearchCohort, rememberHotelSearchCohort, rememberProviderResults } from "@/services/travel/providerResultCache";
import { classifyHotels } from "@/lib/travel/searchContract";
import type { HotelSearchParams, NormalizedHotelResult } from "@/lib/types";

export const runtime = "nodejs";
const MAX_CURSOR_BYTES = 16384;
const TTL_MS = 90_000;
type State = { search: HotelSearchParams; trackId: string; snapshot: string; checkpoint: KayakHotelBatchCheckpoint; expiresAt: number; issuedAt: number; startedAt: number; };

function signature(value: string, key: string) {
  return createHmac("sha256", key).update("android-hotel-progressive-v1:" + value).digest("base64url");
}
function encode(state: State, key: string) {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return payload + "." + signature(payload, key);
}
function decode(value: unknown, key: string): State | null {
  if (typeof value !== "string" || value.length > MAX_CURSOR_BYTES) return null;
  const parts = value.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const expected = Buffer.from(signature(parts[0], key));
  const actual = Buffer.from(parts[1]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const state = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as State;
    if (!state || Date.now() > state.expiresAt || Date.now() < state.issuedAt ||
        state.expiresAt - state.issuedAt !== TTL_MS || !Number.isSafeInteger(state.startedAt) ||
        state.startedAt > state.issuedAt || state.startedAt < state.issuedAt - 120_000 ||
        !/^[a-f0-9-]{36}$/.test(state.trackId) || !/^[a-f0-9-]{36}$/.test(state.snapshot) ||
        !state.checkpoint || !Number.isSafeInteger(state.checkpoint.nextPage) ||
        state.checkpoint.nextPage < 1 || state.checkpoint.nextPage > 199 ||
        !Number.isSafeInteger(state.checkpoint.total) ||
        state.checkpoint.total < 0 || state.checkpoint.total > 50_000 ||
        !Array.isArray(state.checkpoint.pageHashes) ||
        state.checkpoint.pageHashes.length !== state.checkpoint.nextPage ||
        state.checkpoint.pageHashes.some(x => typeof x !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(x)) ||
        !hotelSearchSchema.safeParse(state.search).success) return null;
    return state;
  } catch { return null; }
}

/** Native Android opt-in only: legacy web/iOS/full hotel search is untouched. */
export async function POST(request: Request) {
  if (request.headers.get("x-mobile-platform") !== "android")
    return NextResponse.json({ error: "Unsupported platform." }, { status: 404 });
  if (!(await isFeatureEnabled("HOTEL_SEARCH_ENABLED")) || !isKayakSandboxEnabled())
    return NextResponse.json({ error: "Hotel search is temporarily unavailable." }, { status: 503 });
  const ip = getClientIp(request);
  if (!checkRateLimit("android-hotel-progressive:" + ip, 30, 60_000).allowed)
    return NextResponse.json({ error: "Please slow down." }, { status: 429 });
  const key = process.env.KAYAK_SANDBOX_API_KEY!;
  let input: { search?: unknown; cursor?: unknown };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const continued = input.cursor !== undefined;
  const state = continued ? decode(input.cursor, key) : null;
  if (continued && !state) return NextResponse.json({ error: "This hotel search expired. Search again." }, { status: 400 });
  const parsed = state ? { success: true as const, data: state.search } : hotelSearchSchema.safeParse(input.search);
  if (!parsed.success) return NextResponse.json({ error: "Invalid hotel search." }, { status: 400 });
  const search = parsed.data;
  const startedAt = state?.startedAt ?? Date.now();
  const trackId = state?.trackId ?? randomUUID();
  const snapshot = state?.snapshot ?? randomUUID();
  const client = new KayakSandboxClient(key, undefined, undefined, "kayakaffiliateapp", getKayakClientIp(request));
  try {
    const resolved = await resolveRegularKayakSearch("hotels", kayakProviderCriteria(search as unknown as Record<string, unknown>),
      (term, vertical = "hotels") => client.places(vertical, term, trackId, request.signal));
    if (!resolved.supported || resolved.search.vertical !== "hotels") {
      after(async () => {
        const { userId, visitorId } = await resolveRequestActivityIdentity(request);
        await Promise.all([
          logSearchHistory({ userId, visitorId, requestId: trackId, progressive: true, type: "HOTEL", destination: search.destination,
            checkIn: new Date(search.checkIn), checkOut: new Date(search.checkOut),
            query: search, resultCount: 0, latencyMs: Date.now() - startedAt, status: "FAILED" }),
          trackAnalyticsEvent({ userId, visitorId, type: "SEARCH",
            name: "hotel_search", metadata: { destination: search.destination, resultCount: 0, progressive: true, unsupported: true, trackId } }),
          logProviderCall({ provider: "KAYAK sandbox", service: "hotel-search", status: "DISABLED",
            latencyMs: Date.now() - startedAt, errorMessage: "unsupported_search",
            metadata: { progressive: true, trackId } }),
        ]);
      });
      return NextResponse.json({ error: resolved.supported ? "Invalid search." : resolved.reason, status: "unavailable", results: [] }, { status: 422 });
    }
    const batch = await client.searchHotelBatch(resolved.search, trackId, state?.checkpoint, request.signal);
    const nights = Math.max(1, Math.round((Date.parse(search.checkOut) - Date.parse(search.checkIn)) / 86_400_000));
    const results: NormalizedHotelResult[] = batch.offers.flatMap(offer => {
      const model = kayakHotelCardModel({ ...offer,
        id: snapshot + ":" + offer.id,
        ...(offer.hotelPropertyKey ? { hotelPropertyKey: snapshot + ":" + offer.hotelPropertyKey } : {}),
      }, nights);
      return model ? [model] : [];
    });
    // Always reconstruct the verified same-search cohort, including early-page
    // rates and related properties. Ignore any previous search snapshot for
    // identical criteria; only this signed cursor's snapshot may be appended.
    const previous = state
      ? (await getHotelSearchCohort(search)).filter(item => item.id.startsWith("kayak-sandbox:" + snapshot + ":"))
      : [];
    const cumulative = [...new Map([...previous, ...results].map(item => [item.id, item])).values()];
    if (results.length) {
      rememberHotels(cumulative, search);
      await rememberProviderResults("hotel", results, search);
    }
    // Persist before returning clickable results. Never publish only the final
    // page: the cohort underpins same-property rates and related hotels.
    if (cumulative.length) await rememberHotelSearchCohort(cumulative, search);
    const classified = classifyHotels(results.map(toPublicHotel), [], trackId);
    const now = Date.now();
    const nextCursor = batch.checkpoint ? encode({
      search, trackId, snapshot, checkpoint: batch.checkpoint,
      startedAt, issuedAt: now, expiresAt: now + TTL_MS,
    }, key) : null;
    after(async () => {
      const { userId, visitorId } = await resolveRequestActivityIdentity(request);
      // Persist each displayed batch under the signed cursor's stable request ID.
      // Early result/offer events can then resolve ownership before the last page.
      await logSearchHistory({ userId, visitorId, requestId: trackId, progressive: true,
        completed: nextCursor === null, type: "HOTEL", destination: search.destination,
        checkIn: new Date(search.checkIn), checkOut: new Date(search.checkOut),
        query: search, resultCount: cumulative.length, latencyMs: Date.now() - startedAt,
        status: nextCursor ? "PARTIAL" : "SUCCESS" });
      if (!nextCursor) {
        await Promise.all([
          trackAnalyticsEvent({ userId, visitorId, type: "SEARCH",
            name: "hotel_search", metadata: { destination: search.destination, resultCount: cumulative.length, progressive: true, trackId } }),
          logProviderCall({ provider: "KAYAK sandbox", service: "hotel-search", status: "SUCCESS",
            latencyMs: Date.now() - startedAt, metadata: { progressive: true, trackId, resultCount: cumulative.length } }),
        ]);
      }
    });
    return NextResponse.json({ ...classified, nextCursor, progressive: true,
      completed: nextCursor === null, receivedCount: results.length,
      providerRowsSeen: batch.providerRows, estimatedTotal: batch.checkpoint?.total ?? batch.providerRows });
  } catch (error) {
    const unavailable = error instanceof KayakError ? error.code : "unavailable";
    after(async () => {
      const { userId, visitorId } = await resolveRequestActivityIdentity(request);
      await Promise.all([
        logSearchHistory({ userId, visitorId, requestId: trackId, progressive: true, type: "HOTEL", destination: search.destination,
          checkIn: new Date(search.checkIn), checkOut: new Date(search.checkOut),
          query: search, resultCount: 0, latencyMs: Date.now() - startedAt, status: "FAILED" }),
        trackAnalyticsEvent({ userId, visitorId, type: "SEARCH",
          name: "hotel_search", metadata: { destination: search.destination, resultCount: 0, progressive: true, failed: true, trackId } }),
        logProviderCall({ provider: "KAYAK sandbox", service: "hotel-search",
          status: "FAILED", latencyMs: Date.now() - startedAt, errorMessage: unavailable,
          metadata: { progressive: true, trackId } }),
      ]);
    });
    return NextResponse.json({ error: "Hotel provider is temporarily unavailable.", code: unavailable, status: "unavailable", results: [] }, { status: 503 });
  }
}
