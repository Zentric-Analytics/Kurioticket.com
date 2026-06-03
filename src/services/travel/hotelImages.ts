export type HotelImageContext = {
  destination?: string;
  location?: string;
  hotelName?: string;
  providerId?: string;
};

// Unsplash Source License: https://unsplash.com/license. These curated hotel/travel
// images are used only as generic metasearch fallbacks when a provider does not
// return a validated property image.
export const PREMIUM_HOTEL_FALLBACK_IMAGES = [
  {
    url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=85",
    keywords: ["beach", "resort", "cancun", "miami", "honolulu", "dubai"],
  },
  {
    url: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1000&q=85",
    keywords: ["city", "downtown", "central", "new york", "london", "chicago", "toronto"],
  },
  {
    url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=85",
    keywords: ["pool", "warm", "resort", "las vegas", "phoenix", "bangkok"],
  },
  {
    url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=85",
    keywords: ["suite", "business", "airport", "transit", "houston", "dallas", "atlanta"],
  },
  {
    url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1000&q=85",
    keywords: ["boutique", "europe", "paris", "rome", "madrid", "barcelona", "amsterdam"],
  },
  {
    url: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1000&q=85",
    keywords: ["room", "quiet", "seattle", "vancouver", "boston", "san francisco"],
  },
];

export function normalizeHotelImageUrl(candidate: unknown, context: HotelImageContext = {}): string {
  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    if (isSafeHttpsImageUrl(trimmed)) return trimmed;
  }

  return selectPremiumHotelFallbackImage(context);
}

export function isSafeHttpsImageUrl(candidate: string): boolean {
  if (!candidate) return false;

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && Boolean(url.hostname) && !candidate.includes("\u0000");
  } catch {
    return false;
  }
}

export function selectPremiumHotelFallbackImage(context: HotelImageContext = {}): string {
  const lookupText = [context.destination, context.location, context.hotelName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const keywordMatch = PREMIUM_HOTEL_FALLBACK_IMAGES.find((image) =>
    image.keywords.some((keyword) => lookupText.includes(keyword)),
  );

  if (keywordMatch) return keywordMatch.url;

  const stableKey = [context.destination, context.location, context.hotelName, context.providerId]
    .filter(Boolean)
    .join("|");
  const index = stableKey ? stableHash(stableKey) % PREMIUM_HOTEL_FALLBACK_IMAGES.length : 0;

  return PREMIUM_HOTEL_FALLBACK_IMAGES[index].url;
}

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}
