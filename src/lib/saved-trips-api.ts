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
};

export type SavedTripApiResult = {
  ok: boolean;
  status: number;
  duplicate?: boolean;
  items?: SavedTripApiItem[];
  item?: SavedTripApiItem;
  error?: string;
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
        name: localId,
        destination: localId,
        payload: { localId },
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
