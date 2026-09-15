import { NextResponse } from "next/server";
import {
  getFlightDetailsCacheContext,
} from "@/lib/searchCache";
import {
  buildProviderAwareFlightDetails,
} from "@/services/travel/standaloneFlightDetails";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawId = searchParams.get("id");
  if (!rawId) return NextResponse.json({ error: "Flight id is required." }, { status: 400 });

  // Prefer the exact opaque ID.  A provider may legitimately supply percent
  // escapes in its identifier. Dynamic route segments can also retain their
  // own escaping, however, so retry once with that route layer decoded.
  const decodedId = safelyDecodeResultId(rawId);
  const cached = await getFlightDetailsCacheContext(rawId)
    ?? (decodedId === rawId ? null : await getFlightDetailsCacheContext(decodedId));
  if (!cached) {
    return NextResponse.json(
      { error: "This flight quote is no longer available. Please search again for current prices." },
      { status: 404 },
    );
  }
  const search = cached.search;
  if (!search) {
    return NextResponse.json(
      { status: "unavailable", error: "This flight search context is no longer available. Please search again." },
      { status: 409 },
    );
  }
  const details = await buildProviderAwareFlightDetails({
    cachedSelected: cached.flight,
    cachedAlternatives: cached.compatibleFlights,
    search,
  });
  return NextResponse.json(details, {
    status: details.status === "available" ? 200 : 409,
    headers: { "Cache-Control": "no-store" },
  });
}

function safelyDecodeResultId(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
