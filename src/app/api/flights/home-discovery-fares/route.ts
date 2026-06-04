import { NextResponse } from "next/server";

import {
  HOME_DISCOVERY_VISIBLE_CARD_COUNT,
  DEFAULT_HOME_DISCOVERY_REGION,
} from "@/data/homeDiscovery";
import {
  HOMEPAGE_FARE_DEFAULT_CURRENCY,
  normalizeHomepageFareCurrency,
  readHomepageDiscoveryFareCards,
} from "@/services/homepageFareSnapshotService";

export async function GET(request: Request) {
  const url = new URL(request.url);

  return NextResponse.json(
    await readHomepageDiscoveryFareCards({
      regionCode: readRegionCode(url.searchParams.get("regionCode")),
      limit: readLimit(url.searchParams.get("limit")),
      currency: readCurrency(url.searchParams.get("currency")),
    }),
  );
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid home discovery fare request." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    await readHomepageDiscoveryFareCards({
      regionCode: readRegionCode(readStringProperty(payload, "regionCode")),
      limit: readLimit(readStringProperty(payload, "limit")),
      currency: readCurrency(readStringProperty(payload, "currency")),
    }),
  );
}

function readRegionCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();

  return normalized && /^[A-Z]{2}$/.test(normalized)
    ? normalized
    : DEFAULT_HOME_DISCOVERY_REGION;
}

function readCurrency(value: string | null | undefined) {
  return normalizeHomepageFareCurrency(value) ?? HOMEPAGE_FARE_DEFAULT_CURRENCY;
}

function readLimit(value: string | null | undefined) {
  if (!value) return HOME_DISCOVERY_VISIBLE_CARD_COUNT;

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : HOME_DISCOVERY_VISIBLE_CARD_COUNT;
}

function readStringProperty(payload: unknown, key: string) {
  if (!payload || typeof payload !== "object") return undefined;

  const value = (payload as Record<string, unknown>)[key];

  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : undefined;
}
