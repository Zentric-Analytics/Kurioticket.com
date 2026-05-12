import { fetchJson, runProvider, skippedProvider } from "@/services/travel/providerUtils";

export type TravelpayoutsHealth = {
  configured: boolean;
  markerConfigured: boolean;
  marker?: string;
  connected: boolean;
  latencyMs: number;
  lastError?: string;
  checkedAt: string;
};

export function getTravelpayoutsMarker() {
  return process.env.TRAVELPAYOUTS_MARKER || "";
}

export function buildTravelpayoutsAffiliateUrl(input: {
  url: string;
  subId?: string;
}) {
  const marker = getTravelpayoutsMarker();
  const url = new URL("https://www.aviasales.com/search");
  url.searchParams.set("marker", marker);
  url.searchParams.set("params", input.url);
  if (input.subId) url.searchParams.set("sub_id", input.subId);
  return url.toString();
}

export async function checkTravelpayoutsHealth(): Promise<TravelpayoutsHealth> {
  const apiKey = process.env.TRAVELPAYOUTS_API_KEY;
  const marker = getTravelpayoutsMarker();
  const checkedAt = new Date().toISOString();

  if (!apiKey) {
    return {
      configured: false,
      markerConfigured: Boolean(marker),
      marker: marker ? maskMarker(marker) : undefined,
      connected: false,
      latencyMs: 0,
      lastError: "Missing TRAVELPAYOUTS_API_KEY.",
      checkedAt,
    };
  }

  const result = await runProvider("Travelpayouts", async () => {
    const params = new URLSearchParams({
      currency: "usd",
      origin: "NYC",
      destination: "LON",
      period_type: "year",
      one_way: "true",
      show_to_affiliates: "true",
      sorting: "price",
      limit: "1",
      token: apiKey,
    });

    await fetchJson<{ success?: boolean; data?: unknown[] }>(
      `https://api.travelpayouts.com/v2/prices/latest?${params.toString()}`,
      { headers: { Accept: "application/json" } },
      9000,
    );

    return [{ ok: true }];
  });

  return {
    configured: true,
    markerConfigured: Boolean(marker),
    marker: marker ? maskMarker(marker) : undefined,
    connected: result.status === "success",
    latencyMs: result.latencyMs,
    lastError: result.error,
    checkedAt,
  };
}

export function skippedTravelpayoutsProvider() {
  return skippedProvider("Travelpayouts", "Missing TRAVELPAYOUTS_API_KEY.");
}

function maskMarker(marker: string) {
  if (marker.length <= 4) return "configured";
  return `${marker.slice(0, 2)}...${marker.slice(-2)}`;
}
