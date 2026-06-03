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

type HotelbedsContentImage = {
  path?: string;
  order?: string | number;
  visualOrder?: string | number;
  type?: {
    code?: string;
    description?: { content?: string } | string;
  };
};

type HotelbedsContentHotel = {
  code?: string | number;
  images?: HotelbedsContentImage[];
};

type HotelbedsContentDetailsResponse = {
  hotel?: HotelbedsContentHotel;
};

type HotelbedsImageEnrichment = {
  imageUrl: string;
  rawImagePath: string;
  rawImageJsonPath: string;
};

const HOTELBEDS_GIATA_IMAGE_BASE_URL = "https://photos.hotelbeds.com/giata/bigger/";
const hotelbedsContentImageCache = new Map<string, HotelbedsImageEnrichment | null>();

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

    const headers = createHotelbedsHeaders(apiKey, secret);

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
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      14000,
    );

    const availabilityHotels = data.hotels?.hotels || [];
    const contentImageByHotelCode = await getHotelbedsContentImages(baseUrl, headers, availabilityHotels);

    return availabilityHotels
      .map((hotel) =>
        normalizeHotelResult(
          "Hotelbeds",
          applyHotelbedsContentImage(hotel, contentImageByHotelCode),
          search,
        ),
      )
      .filter(Boolean) as NormalizedHotelResult[];
  });
}

function createHotelbedsHeaders(apiKey: string, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHash("sha256").update(`${apiKey}${secret}${timestamp}`).digest("hex");

  return {
    "Api-key": apiKey,
    "X-Signature": signature,
    Accept: "application/json",
  };
}

async function getHotelbedsContentImages(
  baseUrl: string,
  headers: ReturnType<typeof createHotelbedsHeaders>,
  availabilityHotels: unknown[],
) {
  const hotelCodes = [
    ...new Set(
      availabilityHotels
        .map((hotel) => getHotelbedsHotelCode(hotel))
        .filter((code): code is string => Boolean(code)),
    ),
  ];

  const entries = await Promise.all(
    hotelCodes.map(async (hotelCode) => [
      hotelCode,
      await getHotelbedsContentImage(baseUrl, headers, hotelCode),
    ] as const),
  );

  return new Map(entries);
}

async function getHotelbedsContentImage(
  baseUrl: string,
  headers: ReturnType<typeof createHotelbedsHeaders>,
  hotelCode: string,
): Promise<HotelbedsImageEnrichment | null> {
  if (hotelbedsContentImageCache.has(hotelCode)) {
    return hotelbedsContentImageCache.get(hotelCode) ?? null;
  }

  const params = new URLSearchParams({
    language: "ENG",
    useSecondaryLanguage: "True",
  });

  try {
    const data = await fetchJson<HotelbedsContentDetailsResponse>(
      `${baseUrl}/hotel-content-api/1.0/hotels/${encodeURIComponent(hotelCode)}/details?${params.toString()}`,
      { headers },
      10000,
    );
    const image = selectHotelbedsContentImage(data.hotel?.images);
    hotelbedsContentImageCache.set(hotelCode, image);
    return image;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Hotelbeds content image error";
    console.warn(`[travel:Hotelbeds] Unable to hydrate image for hotel ${hotelCode}: ${message}`);
    hotelbedsContentImageCache.set(hotelCode, null);
    return null;
  }
}

function selectHotelbedsContentImage(images: HotelbedsContentImage[] | undefined): HotelbedsImageEnrichment | null {
  const rankedImages = (images || [])
    .filter((image) => Boolean(normalizeHotelbedsImagePath(image.path)))
    .sort((a, b) => imageRank(a) - imageRank(b));
  const selected = rankedImages[0];
  const rawImagePath = normalizeHotelbedsImagePath(selected?.path);

  if (!rawImagePath) return null;

  return {
    imageUrl: `${HOTELBEDS_GIATA_IMAGE_BASE_URL}${rawImagePath}`,
    rawImagePath,
    rawImageJsonPath: "hotel.images[*].path",
  };
}

function imageRank(image: HotelbedsContentImage) {
  const visualOrder = numericOrder(image.visualOrder);
  const order = numericOrder(image.order);
  const typeRank = image.type?.code === "GEN" ? 0 : image.type?.code === "HAB" ? 2 : 1;

  return (visualOrder === 0 ? -10000 : visualOrder * 100) + typeRank * 10 + order;
}

function numericOrder(value: string | number | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 9999;
}

function normalizeHotelbedsImagePath(path: string | undefined) {
  const normalized = path?.trim().replace(/^\/+/, "");
  if (!normalized || normalized.includes("\0") || normalized.includes("..")) return undefined;
  return normalized;
}

function applyHotelbedsContentImage(
  hotel: unknown,
  contentImageByHotelCode: Map<string, HotelbedsImageEnrichment | null>,
) {
  const hotelCode = getHotelbedsHotelCode(hotel);
  const contentImage = hotelCode ? contentImageByHotelCode.get(hotelCode) : null;

  if (!contentImage || !isRecord(hotel)) return hotel;

  return {
    ...hotel,
    imageUrl: contentImage.imageUrl,
    rawSupplierImageField: contentImage.rawImageJsonPath,
    rawSupplierImagePath: contentImage.rawImagePath,
  };
}

function getHotelbedsHotelCode(hotel: unknown) {
  if (!isRecord(hotel)) return undefined;
  const code = hotel.code;
  return typeof code === "string" || typeof code === "number" ? String(code) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
