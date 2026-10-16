import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { hotelSearchSchema } from "@/lib/validation";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { getKayakClientIp } from "@/lib/kayak-client-ip";
import { isFeatureEnabled } from "@/lib/feature-controls/service";
import { isKayakSandboxEnabled, KayakSandboxClient, KayakError, type KayakHotelBatchCheckpoint } from "@/services/travel/kayakSandbox";
import { resolveRegularKayakSearch } from "@/services/travel/kayakRegularSearch";
import { kayakProviderCriteria } from "@/services/travel/kayakMetasearchProvider";
import { kayakHotelCardModel } from "@/components/results/kayakCardModels";
import { rememberHotels, toPublicHotel } from "@/lib/searchCache";
import { rememberHotelSearchCohort, rememberProviderResults } from "@/services/travel/providerResultCache";
import { classifyHotels } from "@/lib/travel/searchContract";
import type { HotelSearchParams, NormalizedHotelResult } from "@/lib/types";

export const runtime = "nodejs";
const MAX_CURSOR_BYTES = 16384;
const TTL_MS = 90_000;
type State = { search: HotelSearchParams; trackId: string; snapshot: string; checkpoint: KayakHotelBatchCheckpoint; expiresAt: number; issuedAt: number; };

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
        state.expiresAt - state.issuedAt !== TTL_MS ||
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
  const trackId = state?.trackId ?? randomUUID();
  const snapshot = state?.snapshot ?? randomUUID();
  const client = new KayakSandboxClient(key, undefined, undefined, "kayakaffiliateapp", getKayakClientIp(request));
  try {
    const resolved = await resolveRegularKayakSearch("hotels", kayakProviderCriteria(search as unknown as Record<string, unknown>),
      (term, vertical = "hotels") => client.places(vertical, term, trackId, request.signal));
    if (!resolved.supported || resolved.search.vertical !== "hotels")
      return NextResponse.json({ error: resolved.supported ? "Invalid search." : resolved.reason, status: "unavailable", results: [] }, { status: 422 });
    const batch = await client.searchHotelBatch(resolved.search, trackId, state?.checkpoint, request.signal);
    const nights = Math.max(1, Math.round((Date.parse(search.checkOut) - Date.parse(search.checkIn)) / 86_400_000));
    const results: NormalizedHotelResult[] = batch.offers.flatMap(offer => {
      const model = kayakHotelCardModel({ ...offer,
        id: snapshot + ":" + offer.id,
        ...(offer.hotelPropertyKey ? { hotelPropertyKey: snapshot + ":" + offer.hotelPropertyKey } : {}),
      }, nights);
      return model ? [model] : [];
    });
    // Persist every completed batch before exposing clickable hotel details.
    if (results.length) {
      rememberHotels(results, search);
      await rememberProviderResults("hotel", results, search);
    }
    const classified = classifyHotels(results.map(toPublicHotel), [], trackId);
    const now = Date.now();
    const nextCursor = batch.checkpoint ? encode({
      search, trackId, snapshot, checkpoint: batch.checkpoint,
      issuedAt: now, expiresAt: now + TTL_MS,
    }, key) : null;
    if (!nextCursor && results.length) await rememberHotelSearchCohort(results, search);
    return NextResponse.json({ ...classified, nextCursor, progressive: true,
      completed: nextCursor === null, receivedCount: results.length,
      providerRowsSeen: batch.providerRows, estimatedTotal: batch.checkpoint?.total ?? batch.providerRows });
  } catch (error) {
    const unavailable = error instanceof KayakError ? error.code : "unavailable";
    return NextResponse.json({ error: "Hotel provider is temporarily unavailable.", code: unavailable, status: "unavailable", results: [] }, { status: 503 });
  }
}
