import {
  canonicalizeDealsFlightItineraryV2,
  canonicalizeDealsFlightFareV2,
  type DealsFlightFareV2,
  type DealsFlightItineraryV2,
} from "./dealsTripPlanV2";

export const DEALS_FLIGHT_RUNTIME_STORAGE_KEY =
  "kurioticket:deals:v2:flight-runtime";
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
      typeof candidate.sourcePrice === "number" &&
      candidate.sourcePrice > 0 &&
      typeof candidate.sourceCurrency === "string"
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
) {
  const raw = storage.getItem(DEALS_FLIGHT_RUNTIME_STORAGE_KEY);
  if (!raw) return null;
  const parsed = parseDealsFlightRuntimeV2(raw, searchKey, tripType, now);
  if (!parsed) storage.removeItem(DEALS_FLIGHT_RUNTIME_STORAGE_KEY);
  return parsed;
}
export function writeDealsFlightRuntimeV2(
  storage: Pick<Storage, "setItem">,
  runtime: DealsFlightRuntimeV2,
) {
  storage.setItem(DEALS_FLIGHT_RUNTIME_STORAGE_KEY, JSON.stringify(runtime));
}
export function clearDealsFlightRuntimeV2(
  storage: Pick<Storage, "removeItem">,
) {
  storage.removeItem(DEALS_FLIGHT_RUNTIME_STORAGE_KEY);
}
