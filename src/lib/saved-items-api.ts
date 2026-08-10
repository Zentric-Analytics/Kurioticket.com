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

export type SavedDiscoveryApiItem = {
  type: "search";
  id: string;
  searchType: "flight" | "hotel";
  label: string | null;
  origin: string | null;
  destination: string | null;
  query: unknown;
  createdAt: string;
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
};

export type SavedDiscoveryApiResult = {
  ok: boolean;
  status: number;
  duplicate?: boolean;
  items?: SavedDiscoveryApiItem[];
  item?: SavedDiscoveryApiItem;
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

export type SavedDiscoverySearchMetadata = {
  tripType?: string;
  cabinClass?: string;
  travelerCount?: number;
  currency?: string;
  price?: number;
};

export type SavedDiscoveryFlightSearch = {
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

export type SavedDiscoveryDisplayDetails = {
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
  search?: SavedDiscoverySearchMetadata;
};

export function getSavedDiscoveryLocalId(item: SavedDiscoveryApiItem): string {
  if (item.query && typeof item.query === "object" && "localId" in item.query && typeof item.query.localId === "string" && item.query.localId.trim()) return item.query.localId;
  return item.label || item.id;
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

export async function fetchBackendSavedDiscoveries(signal?: AbortSignal): Promise<SavedDiscoveryApiResult> {
  try {
    const response = await fetch("/api/dashboard/saved?type=search", { method: "GET", headers: { Accept: "application/json" }, signal });
    const payload = await readJson(response);
    if (!response.ok) return { ok: false, status: response.status, error: getError(payload, "Unable to load saved items.") };
    const items = payload && typeof payload === "object" && "items" in payload && Array.isArray(payload.items)
      ? payload.items.filter((item): item is SavedDiscoveryApiItem => Boolean(item && typeof item === "object" && "type" in item && item.type === "search" && "id" in item && typeof item.id === "string"))
      : [];
    return { ok: true, status: response.status, items };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { ok: false, status: 0, error: "Unable to load saved items." };
  }
}

export async function saveBackendDiscovery(localId: string, display?: SavedDiscoveryDisplayDetails, flightSearch?: SavedDiscoveryFlightSearch): Promise<SavedDiscoveryApiResult> {
  try {
    const origin = flightSearch?.origin ?? display?.originCode ?? null;
    const destination = flightSearch?.destination ?? display?.destinationCode ?? display?.destinationCity ?? localId;
    const response = await fetch("/api/dashboard/saved", {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ type: "search", searchType: "flight", label: display?.title ?? localId, origin, destination, query: { ...(flightSearch ?? {}), ...display, localId } }),
    });
    const payload = await readJson(response);
    if (!response.ok) return { ok: false, status: response.status, duplicate: response.status === 409, error: getError(payload, "Unable to save item.") };
    const item = payload && typeof payload === "object" && "item" in payload ? payload.item : undefined;
    return { ok: true, status: response.status, item: item as SavedDiscoveryApiItem | undefined };
  } catch { return { ok: false, status: 0, error: "Unable to save item." }; }
}

export async function deleteBackendDiscovery(backendId: string): Promise<SavedDiscoveryApiResult> {
  try {
    const response = await fetch("/api/dashboard/saved", { method: "DELETE", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ type: "search", id: backendId }) });
    const payload = await readJson(response);
    if (!response.ok) return { ok: false, status: response.status, error: getError(payload, "Unable to delete saved item.") };
    return { ok: true, status: response.status };
  } catch { return { ok: false, status: 0, error: "Unable to delete saved item." }; }
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

