import {
  canonicalizeDealsFlightItineraryV2,
  canonicalizeDealsFlightFareV2,
  type DealsFlightFareV2,
  type DealsFlightItineraryV2,
} from "./dealsTripPlanV2";

export const DEALS_FLIGHT_RUNTIME_STORAGE_KEY =
  "kurioticket:deals:v2:flight-runtime";
export type DealsFlightStorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: "STORAGE_UNAVAILABLE" };
export type DealsFlightRuntimeV2 = {
  version: 1;
  inventoryToken: string;
  sourceSearchKey: string;
  inventoryExpiresAt: string;
  tripType: "round-trip" | "one-way";
  outboundChoices: DealsFlightItineraryV2[];
  returnChoices: DealsFlightItineraryV2[];
  fareChoices: Array<
    DealsFlightFareV2 & {
      sourcePrice: number;
      sourceCurrency: string;
      offerExpiresAt?: number;
    }
  >;
  selectedOutboundKey?: string;
  selectedReturnKey?: string;
  selectedFareKey?: string;
};

const safeText = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : null;
export function parseDealsFlightRuntimeV2(
  raw: string,
  currentSearchKey: string,
  tripType: "round-trip" | "one-way",
  now = Date.now(),
): DealsFlightRuntimeV2 | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const token = safeText(item.inventoryToken),
    sourceSearchKey = safeText(item.sourceSearchKey),
    expires = safeText(item.inventoryExpiresAt);
  if (
    item.version !== 1 ||
    !token ||
    token.length < 32 ||
    sourceSearchKey !== currentSearchKey ||
    !expires ||
    !Number.isFinite(Date.parse(expires)) ||
    Date.parse(expires) <= now ||
    item.tripType !== tripType ||
    !Array.isArray(item.outboundChoices) ||
    !Array.isArray(item.returnChoices) ||
    !Array.isArray(item.fareChoices)
  )
    return null;
  const outboundChoices = item.outboundChoices.map(
    canonicalizeDealsFlightItineraryV2,
  );
  const returnChoices = item.returnChoices.map(
    canonicalizeDealsFlightItineraryV2,
  );
  const fareChoices = item.fareChoices.map((fare) => {
    const canonical = canonicalizeDealsFlightFareV2(fare);
    const candidate = fare as Record<string, unknown>;
    return canonical &&
      canonical.fareKey.startsWith("flight-fare-v3:") &&
      typeof candidate.sourcePrice === "number" &&
      Number.isFinite(candidate.sourcePrice) &&
      candidate.sourcePrice > 0 &&
      typeof candidate.sourceCurrency === "string" &&
      /^[A-Z]{3}$/.test(candidate.sourceCurrency) &&
      (candidate.offerExpiresAt === undefined ||
        (typeof candidate.offerExpiresAt === "number" &&
          Number.isFinite(candidate.offerExpiresAt) &&
          candidate.offerExpiresAt >= 0))
      ? {
          ...canonical,
          sourcePrice: candidate.sourcePrice,
          sourceCurrency: candidate.sourceCurrency,
          ...(typeof candidate.offerExpiresAt === "number"
            ? { offerExpiresAt: candidate.offerExpiresAt }
            : {}),
        }
      : null;
  });
  if (
    outboundChoices.some((x) => !x || x.direction !== "outbound") ||
    returnChoices.some((x) => !x || x.direction !== "return") ||
    fareChoices.some((x) => !x)
  )
    return null;
  const selectedOutboundKey = safeText(item.selectedOutboundKey) ?? undefined,
    selectedReturnKey = safeText(item.selectedReturnKey) ?? undefined,
    selectedFareKey = safeText(item.selectedFareKey) ?? undefined;
  if (
    (selectedOutboundKey &&
      !outboundChoices.some((x) => x!.itineraryKey === selectedOutboundKey)) ||
    (selectedReturnKey &&
      (!selectedOutboundKey ||
        tripType !== "round-trip" ||
        !returnChoices.some((x) => x!.itineraryKey === selectedReturnKey))) ||
    (tripType === "one-way" && selectedReturnKey) ||
    (selectedFareKey &&
      (!selectedOutboundKey ||
        (tripType === "round-trip" && !selectedReturnKey) ||
        !fareChoices.some((x) => x!.fareKey === selectedFareKey)))
  )
    return null;
  return {
    version: 1,
    inventoryToken: token,
    sourceSearchKey,
    inventoryExpiresAt: expires,
    tripType,
    outboundChoices: outboundChoices as DealsFlightItineraryV2[],
    returnChoices: returnChoices as DealsFlightItineraryV2[],
    fareChoices: fareChoices as DealsFlightRuntimeV2["fareChoices"],
    ...(selectedOutboundKey ? { selectedOutboundKey } : {}),
    ...(selectedReturnKey ? { selectedReturnKey } : {}),
    ...(selectedFareKey ? { selectedFareKey } : {}),
  };
}
export function readDealsFlightRuntimeV2(
  storage: Pick<Storage, "getItem" | "removeItem">,
  searchKey: string,
  tripType: "round-trip" | "one-way",
  now = Date.now(),
): DealsFlightStorageResult<DealsFlightRuntimeV2 | null> {
  try {
    const raw = storage.getItem(DEALS_FLIGHT_RUNTIME_STORAGE_KEY);
    if (!raw) return { ok: true, value: null };
    const parsed = parseDealsFlightRuntimeV2(raw, searchKey, tripType, now);
    if (!parsed) storage.removeItem(DEALS_FLIGHT_RUNTIME_STORAGE_KEY);
    return { ok: true, value: parsed };
  } catch {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
}
export function writeDealsFlightRuntimeV2(
  storage: Pick<Storage, "setItem">,
  runtime: DealsFlightRuntimeV2,
): DealsFlightStorageResult<void> {
  try {
    const safeRuntime = parseDealsFlightRuntimeV2(
      JSON.stringify(runtime),
      runtime.sourceSearchKey,
      runtime.tripType,
      0,
    );
    if (!safeRuntime) return { ok: false, code: "STORAGE_UNAVAILABLE" };
    storage.setItem(
      DEALS_FLIGHT_RUNTIME_STORAGE_KEY,
      JSON.stringify(safeRuntime),
    );
    return { ok: true, value: undefined };
  } catch {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
}
export function clearDealsFlightRuntimeV2(
  storage: Pick<Storage, "removeItem">,
): DealsFlightStorageResult<void> {
  try {
    storage.removeItem(DEALS_FLIGHT_RUNTIME_STORAGE_KEY);
    return { ok: true, value: undefined };
  } catch {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
}
