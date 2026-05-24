import { NextResponse } from "next/server";

import { searchDuffelPlaces } from "@/services/travel/providers/duffelProvider";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 80;
const SAFE_QUERY = /^[\p{L}\p{N}\s'.,\-()]+$/u;

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const query = (searchParams.get("q") || "").trim();

  if (
    query.length < MIN_QUERY_LENGTH ||
    query.length > MAX_QUERY_LENGTH ||
    !SAFE_QUERY.test(query)
  ) {
    return NextResponse.json({ suggestions: [] });
  }

  const providerResult = await searchDuffelPlaces(query);

  if (providerResult.status !== "success") {
    return NextResponse.json({
      suggestions: [],
      error: "Suggestions are temporarily unavailable.",
    });
  }

  return NextResponse.json({ suggestions: providerResult.results });
}
