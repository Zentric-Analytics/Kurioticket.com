import { createHash } from "node:crypto";
import {
  assertProductionLiveProvider,
  assertSandboxProviderAllowed,
  getHotelbedsApiMode,
  isProductionProviderMode,
} from "@/lib/env";
import type { HotelSearchParams, NormalizedHotelResult, ProviderResult } from "@/lib/types";
import { normalizeHotelResult } from "@/services/travel/normalizeHotelResult";
import { fetchJson, runProvider, skippedProvider } from "@/services/travel/providerUtils";

type HotelbedsAvailabilityResponse = {
  hotels?: {
    hotels?: unknown[];
  };
};

const DESTINATION_CODES: Record<string, string> = {
  "new york": "NYC",
  london: "LON",
  paris: "PAR",
  dubai: "DXB",
  tokyo: "TYO",
  lagos: "LOS",
  abuja: "ABV",
  houston: "HOU",
  miami: "MIA",
  "las vegas": "LAS",
  "san francisco": "SFO",
  seattle: "SEA",
  "los angeles": "LAX",
  chicago: "CHI",
  dallas: "DFW",
  atlanta: "ATL",
  boston: "BOS",
  toronto: "YTO",
  vancouver: "YVR",
  cancun: "CUN",
  madrid: "MAD",
  barcelona: "BCN",
  rome: "ROM",
  amsterdam: "AMS",
  berlin: "BER",
  frankfurt: "FRA",
  istanbul: "IST",
  doha: "DOH",
  singapore: "SIN",
  bangkok: "BKK",
  accra: "ACC",
  nairobi: "NBO",
  johannesburg: "JNB",
  "cape town": "CPT",
  cairo: "CAI",
  casablanca: "CAS",
};

function getHotelbedsProviderBlockReason(baseUrl: string) {
  const apiMode = getHotelbedsApiMode();
  const normalizedBaseUrl = baseUrl.trim().toLowerCase();
  const usesTestBaseUrl = normalizedBaseUrl.includes("api.test.hotelbeds.com");

  try {
    assertProductionLiveProvider("Hotelbeds", apiMode);

    if (apiMode === "test") {
      assertSandboxProviderAllowed("Hotelbeds");
    }
  } catch {
    return "provider_mode_not_allowed";
  }

  if (isProductionProviderMode() && usesTestBaseUrl) {
    return "provider_mode_not_allowed";
  }

  if (!isProductionProviderMode() && usesTestBaseUrl) {
    try {
      assertSandboxProviderAllowed("Hotelbeds");
    } catch {
      return "provider_mode_not_allowed";
    }
  }

  return undefined;
}

export function searchHotelbedsHotels(search: HotelSearchParams): Promise<ProviderResult<NormalizedHotelResult>> {
  if (!process.env.HOTELBEDS_API_KEY || !process.env.HOTELBEDS_SECRET) {
    return Promise.resolve(skippedProvider("Hotelbeds", "no_live_hotel_provider"));
  }

  const baseUrl = process.env.HOTELBEDS_BASE_URL || "https://api.test.hotelbeds.com";
  const blockReason = getHotelbedsProviderBlockReason(baseUrl);
  if (blockReason) {
    return Promise.resolve(skippedProvider("Hotelbeds", blockReason));
  }

  const destinationCode = DESTINATION_CODES[search.destination.trim().toLowerCase()];
  if (!destinationCode) {
    return Promise.resolve(skippedProvider("Hotelbeds", "unsupported_destination"));
  }

  return runProvider("Hotelbeds", async () => {
    const apiKey = process.env.HOTELBEDS_API_KEY as string;
    const secret = process.env.HOTELBEDS_SECRET as string;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHash("sha256").update(`${apiKey}${secret}${timestamp}`).digest("hex");

    const payload = {
      stay: {
        checkIn: search.checkIn,
        checkOut: search.checkOut,
      },
      occupancies: [
        {
          rooms: search.rooms,
          adults: search.guests,
          children: 0,
        },
      ],
      destination: { code: destinationCode },
    };

    const data = await fetchJson<HotelbedsAvailabilityResponse>(
      `${baseUrl}/hotel-api/1.0/hotels`,
      {
        method: "POST",
        headers: {
          "Api-key": apiKey,
          "X-Signature": signature,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      14000,
    );

    return (data.hotels?.hotels || [])
      // Hotelbeds availability responses used here do not include dependable
      // property image content. Keep image enrichment centralized in
      // normalizeHotelResult so missing images become generic premium fallbacks.
      // A future low-risk enhancement can hydrate real property images from the
      // Hotelbeds Content API before this normalization step.
      .map((hotel) => normalizeHotelResult("Hotelbeds", hotel, search))
      .filter(Boolean) as NormalizedHotelResult[];
  });
}
