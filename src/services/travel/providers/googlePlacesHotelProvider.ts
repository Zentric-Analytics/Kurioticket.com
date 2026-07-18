import "server-only";

import { getGooglePlacesApiKey } from "@/lib/env";
import type { HotelSearchParams, HotelSourceAttribution, NormalizedHotelResult, ProviderResult } from "@/lib/types";
import { fetchJson, runProvider } from "@/services/travel/providerUtils";

export const GOOGLE_PLACES_HOTEL_ID_PREFIX = "google-places:";
const GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_PLACES_DETAILS_ENDPOINT_PREFIX = "https://places.googleapis.com/v1/places/";
const GOOGLE_PLACES_PROVIDER_NAME = "Google Maps";
const GOOGLE_PLACES_PAGE_SIZE = 20;
const GOOGLE_PLACES_MAX_PAGES = 3;
const GOOGLE_PLACES_MAX_RESULTS = 60;
const GOOGLE_PLACES_TIMEOUT_MS = 10000;

export const GOOGLE_PLACES_TEXT_SEARCH_FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.types,places.primaryTypeDisplayName,places.rating,places.userRatingCount,places.googleMapsUri,places.businessStatus,places.attributions,nextPageToken";
export const GOOGLE_PLACES_DETAILS_FIELD_MASK = "id,displayName,formattedAddress,shortFormattedAddress,types,primaryTypeDisplayName,rating,userRatingCount,googleMapsUri,businessStatus,attributions";

type GooglePlacesLocalizedText = { text: string };
type GooglePlacesAttribution = { provider: string; providerUri?: string };
export type GooglePlacesHotelPlace = {
  id: string;
  displayName: GooglePlacesLocalizedText;
  formattedAddress?: string;
  shortFormattedAddress?: string;
  types?: string[];
  primaryTypeDisplayName?: GooglePlacesLocalizedText;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  businessStatus?: string;
  attributions?: GooglePlacesAttribution[];
};
type GooglePlacesTextSearchResponse = {
  places?: GooglePlacesHotelPlace[];
  nextPageToken?: string;
};

const LODGING_TYPES = new Set([
  "bed_and_breakfast", "budget_japanese_inn", "campground", "camping_cabin", "cottage", "extended_stay_hotel", "farmstay", "guest_house", "hostel", "hotel", "inn", "japanese_inn", "lodging", "motel", "private_guest_room", "resort_hotel",
]);

export function buildGooglePlacesHotelId(placeId: string): string {
  return `${GOOGLE_PLACES_HOTEL_ID_PREFIX}${encodeURIComponent(placeId.trim())}`;
}

export function getGooglePlaceIdFromHotelId(hotelId: string): string | null {
  const trimmed = hotelId.trim();
  if (!trimmed.startsWith(GOOGLE_PLACES_HOTEL_ID_PREFIX)) return null;
  const encoded = trimmed.slice(GOOGLE_PLACES_HOTEL_ID_PREFIX.length);
  if (!encoded) return null;
  try {
    const decoded = decodeURIComponent(encoded).trim();
    return decoded || null;
  } catch {
    return null;
  }
}

export function isGooglePlacesHotelId(hotelId: string): boolean {
  return getGooglePlaceIdFromHotelId(hotelId) !== null;
}

function isHttpUrl(value?: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isUsableStatus(status?: string) {
  return status === undefined || status === "OPERATIONAL";
}

function hasAcceptedLodgingType(types?: string[]) {
  return Array.isArray(types) && types.some((type) => LODGING_TYPES.has(type));
}

function normalizeRating(value?: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 5 ? value : null;
}

function normalizeReviewCount(value?: number) {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function normalizeAttributions(attributions?: GooglePlacesAttribution[]): HotelSourceAttribution[] | undefined {
  if (!Array.isArray(attributions)) return undefined;
  const normalized = attributions
    .map((attribution) => {
      const provider = attribution.provider.trim();
      if (!provider) return null;
      return {
        provider,
        ...(isHttpUrl(attribution.providerUri) ? { providerUri: attribution.providerUri?.trim() } : {}),
      };
    })
    .filter((attribution): attribution is HotelSourceAttribution => attribution !== null);
  return normalized.length ? normalized : undefined;
}

export function normalizeGooglePlacesHotel(place: GooglePlacesHotelPlace): NormalizedHotelResult | null {
  const placeId = place.id.trim();
  const name = place.displayName.text.trim();
  const location = (place.formattedAddress || place.shortFormattedAddress || "").trim();
  if (!placeId || !name || !location || !hasAcceptedLodgingType(place.types) || !isUsableStatus(place.businessStatus)) return null;
  const rating = normalizeRating(place.rating);
  const reviewCount = normalizeReviewCount(place.userRatingCount);
  return {
    id: buildGooglePlacesHotelId(placeId),
    provider: GOOGLE_PLACES_PROVIDER_NAME,
    name,
    location,
    rating: rating ?? 0,
    ...(rating !== null ? { reviewScore: rating } : {}),
    ...(reviewCount !== undefined ? { reviewCount } : {}),
    roomType: place.primaryTypeDisplayName?.text.trim() || "Hotel",
    amenities: [],
    cancellationInfo: "Live room and cancellation details are not available through Google Maps.",
    dataSource: "live",
    inventoryKind: "discovery",
    valueScore: 0,
    travelConfidenceScore: 0,
    arrivalSuitabilityScore: 0,
    recommendationReasons: [],
    badges: [],
    ...(isHttpUrl(place.googleMapsUri) ? { sourceUrl: place.googleMapsUri?.trim() } : {}),
    ...(normalizeAttributions(place.attributions) ? { sourceAttributions: normalizeAttributions(place.attributions) } : {}),
  };
}

function headers(apiKey: string, fieldMask: string) {
  return { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": fieldMask };
}

export function searchGooglePlacesHotels(search: HotelSearchParams): Promise<ProviderResult<NormalizedHotelResult>> {
  return runProvider(GOOGLE_PLACES_PROVIDER_NAME, async () => {
    const apiKey = getGooglePlacesApiKey();
    if (!apiKey) return [];
    const textQuery = `hotels in ${search.destination.trim()}`;
    const results: NormalizedHotelResult[] = [];
    const seen = new Set<string>();
    let pageToken: string | undefined;

    for (let page = 0; page < GOOGLE_PLACES_MAX_PAGES && seen.size < GOOGLE_PLACES_MAX_RESULTS; page += 1) {
      const body = { textQuery, pageSize: GOOGLE_PLACES_PAGE_SIZE, rankPreference: "RELEVANCE", ...(pageToken ? { pageToken } : {}) };
      const data = await fetchJson<GooglePlacesTextSearchResponse>(GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT, {
        method: "POST",
        headers: headers(apiKey, GOOGLE_PLACES_TEXT_SEARCH_FIELD_MASK),
        body: JSON.stringify(body),
      }, GOOGLE_PLACES_TIMEOUT_MS);

      for (const place of data.places || []) {
        const placeId = place.id.trim();
        if (!placeId || seen.has(placeId)) continue;
        seen.add(placeId);
        const normalized = normalizeGooglePlacesHotel(place);
        if (normalized) results.push(normalized);
        if (seen.size >= GOOGLE_PLACES_MAX_RESULTS) break;
      }
      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }
    return results;
  });
}

export async function getGooglePlacesHotelDetails(hotelId: string): Promise<NormalizedHotelResult | null> {
  const placeId = getGooglePlaceIdFromHotelId(hotelId);
  if (!placeId) return null;
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) throw new Error("Missing Google Places API key.");
  const data = await fetchJson<GooglePlacesHotelPlace>(`${GOOGLE_PLACES_DETAILS_ENDPOINT_PREFIX}${encodeURIComponent(placeId)}`, {
    method: "GET",
    headers: headers(apiKey, GOOGLE_PLACES_DETAILS_FIELD_MASK),
  }, GOOGLE_PLACES_TIMEOUT_MS);
  if (data.id !== placeId) return null;
  return normalizeGooglePlacesHotel(data);
}
