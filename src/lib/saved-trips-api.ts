export type SavedHotelApiItem = {
  type: "hotel";
  id: string;
  provider: string;
  hotelName: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  currency: string;
  payload: unknown;
  createdAt: string;
};

export type SavedTripApiItem = {
  type: "trip";
  id: string;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  destination: string | null;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
  savedSearchId?: string | null;
  detailedSearch?: {
    origin: string; destination: string; tripType: string; departureDate: string; returnDate: string | null; adults: number; children: number; infants: number; travelers: number; cabinClass: string; currency: string | null; href: string;
  } | null;
  isWatching?: boolean;
  routeWatchStatus?: "ACTIVE" | "PAUSED" | "EXPIRED" | "ERROR" | null;
  routeWatchId?: string | null;
  lastCheckedAt?: string | null;
  nextCheckAt?: string | null;
  routeWatchUnavailableReason?: "invalid" | "expired" | null;
};

export type PublicSavedSearch = {
  type: "search";
  id: string;
  searchType: "flight" | "hotel";
  label: string | null;
  origin: string | null;
  destination: string | null;
  checkIn: string | null;
  checkOut: string | null;
  query: unknown;
  createdAt: string;
  isWatching?: boolean;
  routeWatchStatus?: "ACTIVE" | "PAUSED" | "EXPIRED" | "ERROR";
  routeWatchId?: string;
  lastCheckedAt?: string | null;
  nextCheckAt?: string | null;
  routeWatchUnavailableReason?: "invalid" | "expired";
};

export type SavedTripApiResult = {
  ok: boolean;
  status: number;
  duplicate?: boolean;
  items?: SavedTripApiItem[];
  item?: SavedTripApiItem;
  error?: string;
};

export type SavedHotelApiResult = {
  ok: boolean;
  status: number;
  duplicate?: boolean;
  items?: SavedHotelApiItem[];
  item?: SavedHotelApiItem;
  error?: string;
};

export type SavedSearchApiResult = {
  ok: boolean;
  status: number;
  items?: PublicSavedSearch[];
  error?: string;
};

export type SavedTripSearchMetadata = {
  tripType?: string;
  cabinClass?: string;
  travelerCount?: number;
  currency?: string;
  price?: number;
};

export type SavedTripFlightSearch = {
  tripType: "round-trip" | "one-way";
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  adults: number;
  children: number;
  infants: number;
  travelers: number;
  cabinClass: "economy" | "business" | "first";
  currency?: string;
};

export type SavedTripDisplayDetails = {
  title?: string;
  route?: string;
  note?: string;
  originCode?: string;
  destinationCode?: string;
  originCity?: string;
  destinationCity?: string;
  image?: string;
  imageAlt?: string;
  href?: string | object;
  search?: SavedTripSearchMetadata;
};

export function getSavedTripLocalId(item: SavedTripApiItem): string {
  if (
    item.payload &&
    typeof item.payload === "object" &&
    "localId" in item.payload &&
    typeof item.payload.localId === "string" &&
    item.payload.localId.trim()
  ) {
    return item.payload.localId;
  }

  return item.name;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getError(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return fallback;
}

export async function fetchBackendSavedHotels(
  signal?: AbortSignal,
): Promise<SavedHotelApiResult> {
  try {
    const response = await fetch("/api/dashboard/saved?type=hotel", {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
    const payload = await readJson(response);

    if (!response.ok) {
      return { ok: false, status: response.status, error: getError(payload, "Unable to load saved hotels.") };
    }

    const items =
      payload &&
      typeof payload === "object" &&
      "items" in payload &&
      Array.isArray(payload.items)
        ? payload.items.filter((item): item is SavedHotelApiItem =>
            Boolean(
              item &&
                typeof item === "object" &&
                "type" in item &&
                item.type === "hotel" &&
                "id" in item &&
                typeof item.id === "string" &&
                "hotelName" in item &&
                typeof item.hotelName === "string",
            ),
          )
        : [];

    return { ok: true, status: response.status, items };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { ok: false, status: 0, error: "Unable to load saved hotels." };
  }
}

export async function saveBackendHotel(input: {
  provider: string;
  hotelName: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  currency: string;
  payload: Record<string, unknown>;
}): Promise<SavedHotelApiResult> {
  try {
    const response = await fetch("/api/dashboard/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ type: "hotel", ...input }),
    });
    const payload = await readJson(response);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        duplicate: response.status === 409,
        error: getError(payload, "Unable to save hotel."),
      };
    }

    const item = payload && typeof payload === "object" && "item" in payload ? payload.item : undefined;
    return { ok: true, status: response.status, item: item as SavedHotelApiItem | undefined };
  } catch {
    return { ok: false, status: 0, error: "Unable to save hotel." };
  }
}

export async function deleteBackendHotel(backendId: string): Promise<SavedHotelApiResult> {
  try {
    const response = await fetch("/api/dashboard/saved", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ type: "hotel", id: backendId }),
    });
    const payload = await readJson(response);

    if (!response.ok) {
      return { ok: false, status: response.status, error: getError(payload, "Unable to delete saved hotel.") };
    }

    return { ok: true, status: response.status };
  } catch {
    return { ok: false, status: 0, error: "Unable to delete saved hotel." };
  }
}

export async function fetchBackendSavedTrips(
  signal?: AbortSignal,
): Promise<SavedTripApiResult> {
  try {
    const response = await fetch("/api/dashboard/saved?type=trip", {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
    const payload = await readJson(response);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: getError(payload, "Unable to load saved trips."),
      };
    }

    const items =
      payload &&
      typeof payload === "object" &&
      "items" in payload &&
      Array.isArray(payload.items)
        ? payload.items.filter((item): item is SavedTripApiItem =>
            Boolean(
              item &&
              typeof item === "object" &&
              "type" in item &&
              item.type === "trip" &&
              "id" in item &&
              typeof item.id === "string" &&
              "name" in item &&
              typeof item.name === "string",
            ),
          )
        : [];

    return { ok: true, status: response.status, items };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    return { ok: false, status: 0, error: "Unable to load saved trips." };
  }
}

export async function saveBackendTrip(
  localId: string,
  display?: SavedTripDisplayDetails,
  flightSearch?: SavedTripFlightSearch,
): Promise<SavedTripApiResult> {
  try {
    const response = await fetch("/api/dashboard/saved", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        type: "trip",
        name: display?.title ?? localId,
        destination:
          display?.destinationCity ?? display?.destinationCode ?? localId,
        payload: { ...display, localId },
        ...(flightSearch ? { flightSearch } : {}),
      }),
    });
    const payload = await readJson(response);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        duplicate: response.status === 409,
        error: getError(payload, "Unable to save trip."),
      };
    }

    const item =
      payload && typeof payload === "object" && "item" in payload
        ? payload.item
        : undefined;
    return {
      ok: true,
      status: response.status,
      item: item as SavedTripApiItem | undefined,
    };
  } catch {
    return { ok: false, status: 0, error: "Unable to save trip." };
  }
}

export async function deleteBackendTrip(
  backendId: string,
): Promise<SavedTripApiResult> {
  try {
    const response = await fetch("/api/dashboard/saved", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ type: "trip", id: backendId }),
    });
    const payload = await readJson(response);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: getError(payload, "Unable to delete saved trip."),
      };
    }

    return { ok: true, status: response.status };
  } catch {
    return { ok: false, status: 0, error: "Unable to delete saved trip." };
  }
}

export async function fetchBackendSavedSearches(
  signal?: AbortSignal,
): Promise<SavedSearchApiResult> {
  try {
    const response = await fetch("/api/dashboard/saved?type=search", {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
    const payload = await readJson(response);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: getError(
          payload,
          "Some saved trip details could not be loaded. Please try again.",
        ),
      };
    }

    const items =
      payload &&
      typeof payload === "object" &&
      "items" in payload &&
      Array.isArray(payload.items)
        ? payload.items.filter((item): item is PublicSavedSearch =>
            Boolean(
              item &&
              typeof item === "object" &&
              "type" in item &&
              item.type === "search" &&
              "id" in item &&
              typeof item.id === "string" &&
              "searchType" in item &&
              (item.searchType === "flight" || item.searchType === "hotel"),
            ),
          )
        : [];

    return { ok: true, status: response.status, items };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    return {
      ok: false,
      status: 0,
      error: "Some saved trip details could not be loaded. Please try again.",
    };
  }
}

export async function deleteBackendSavedSearch(
  id: string,
): Promise<SavedSearchApiResult> {
  try {
    const response = await fetch("/api/dashboard/saved", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ type: "search", id }),
    });
    const payload = await readJson(response);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: getError(payload, "Unable to remove saved trip."),
      };
    }

    return { ok: true, status: response.status };
  } catch {
    return { ok: false, status: 0, error: "Unable to remove saved trip." };
  }
}

export type RouteWatchSummary = {
  id: string;
  savedSearchId: string;
  status: "ACTIVE" | "PAUSED" | "EXPIRED" | "ERROR";
  isWatching: boolean;
  lastCheckedAt: string | null;
  nextCheckAt: string | null;
};

export type RouteWatchApiResult = {
  ok: boolean;
  status: number;
  watch?: RouteWatchSummary;
  error?: string;
};

export async function updateRouteWatch(
  savedSearchId: string,
  enabled: boolean,
): Promise<RouteWatchApiResult> {
  try {
    const response = await fetch(`/api/dashboard/saved/${encodeURIComponent(savedSearchId)}/watch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ enabled }),
    });
    const payload = await readJson(response);
    if (!response.ok) return { ok: false, status: response.status, error: getError(payload, "We couldn’t update route watching. Please try again.") };
    const watch = payload && typeof payload === "object" && "watch" in payload ? payload.watch as RouteWatchSummary : undefined;
    return { ok: true, status: response.status, watch };
  } catch {
    return { ok: false, status: 0, error: "We couldn’t update route watching. Please try again." };
  }
}
