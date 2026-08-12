import {
  canonicalizeDealsFlightItineraryV2,
  canonicalizeDealsFlightFareV2,
  type DealsFlightFareV2,
  type DealsFlightItineraryV2,
} from "./dealsTripPlanV2";
import type { DealsCabinClass } from "./dealsSearchParams";

export const DEALS_FLIGHT_RUNTIME_STORAGE_KEY =
  "kurioticket:deals:v2:flight-runtime";

export type DealsFlightFareBrandOptionV2 = {
  brandOptionKey: string;
  fareBrandName: string;
  cabinClass?: DealsCabinClass;
  ownerNames: string[];
  indicativeFromPrice?: number;
  indicativeCurrency?: string;
};

export type DealsFlightRuntimeV2 = {
  version: 1 | 2;
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
  fareBrandOptions?: DealsFlightFareBrandOptionV2[];
  selectedBrandOptionKey?: string;
  selectedReturnKey?: string;
  selectedFareKey?: string;
};

export type DealsFlightStorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: "STORAGE_UNAVAILABLE" };

const safeText = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : null;

const isDealsCabinClass = (value: unknown): value is DealsCabinClass =>
  value === "economy" || value === "business" || value === "first";

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
  const token = safeText(item.inventoryToken);
  const sourceSearchKey = safeText(item.sourceSearchKey);
  const expires = safeText(item.inventoryExpiresAt);
  const parsedExpiry = expires ? Date.parse(expires) : Number.NaN;
  if (
    (item.version !== 1 && item.version !== 2) ||
    !token ||
    token.length < 32 ||
    sourceSearchKey !== currentSearchKey ||
    !expires ||
    !Number.isFinite(parsedExpiry) ||
    parsedExpiry <= now ||
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
  const fareChoices = item.fareChoices.map((value) => {
    const canonical = canonicalizeDealsFlightFareV2(value);
    const candidate = value as Record<string, unknown>;
    const expiresAt = candidate.offerExpiresAt;
    return canonical &&
      canonical.fareKey.startsWith("flight-fare-v3:") &&
      typeof candidate.sourcePrice === "number" &&
      Number.isFinite(candidate.sourcePrice) &&
      candidate.sourcePrice > 0 &&
      typeof candidate.sourceCurrency === "string" &&
      /^[A-Z]{3}$/.test(candidate.sourceCurrency) &&
      (expiresAt === undefined ||
        (typeof expiresAt === "number" &&
          Number.isFinite(expiresAt) &&
          expiresAt >= 0))
      ? {
          ...canonical,
          sourcePrice: candidate.sourcePrice,
          sourceCurrency: candidate.sourceCurrency,
          ...(typeof expiresAt === "number"
            ? { offerExpiresAt: expiresAt }
            : {}),
        }
      : null;
  });
  if (
    outboundChoices.some(
      (choice) => !choice || choice.direction !== "outbound",
    ) ||
    returnChoices.some((choice) => !choice || choice.direction !== "return") ||
    fareChoices.some((choice) => !choice)
  )
    return null;

  const selectedOutboundKey = safeText(item.selectedOutboundKey) ?? undefined;
  const fareBrandOptions = (() => {
    if (item.version === 1)
      return item.fareBrandOptions === undefined ? [] : null;
    if (!Array.isArray(item.fareBrandOptions)) return null;
    return item.fareBrandOptions.map(
      (value): DealsFlightFareBrandOptionV2 | null => {
        if (!value || typeof value !== "object" || Array.isArray(value))
          return null;
        const option = value as Record<string, unknown>;
        if (
          Object.keys(option).some(
            (key) =>
              ![
                "brandOptionKey",
                "fareBrandName",
                "cabinClass",
                "ownerNames",
                "indicativeFromPrice",
                "indicativeCurrency",
              ].includes(key),
          )
        )
          return null;
        const brandOptionKey = safeText(option.brandOptionKey);
        const fareBrandName = safeText(option.fareBrandName);
        const owners = option.ownerNames;
        const price = option.indicativeFromPrice;
        const currency = option.indicativeCurrency;
        const validCabin =
          option.cabinClass === undefined ||
          isDealsCabinClass(option.cabinClass);
        if (
          !brandOptionKey?.startsWith("flight-brand-v1:") ||
          !fareBrandName ||
          !validCabin ||
          !Array.isArray(owners) ||
          owners.length === 0 ||
          owners.some((owner) => !safeText(owner)) ||
          (price === undefined) !== (currency === undefined) ||
          (price !== undefined &&
            (typeof price !== "number" ||
              !Number.isFinite(price) ||
              price <= 0)) ||
          (currency !== undefined &&
            (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)))
        )
          return null;
        return {
          brandOptionKey,
          fareBrandName,
          ...(isDealsCabinClass(option.cabinClass)
            ? { cabinClass: option.cabinClass }
            : {}),
          ownerNames: owners as string[],
          ...(typeof price === "number"
            ? {
                indicativeFromPrice: price,
                indicativeCurrency: currency as string,
              }
            : {}),
        };
      },
    );
  })();
  if (!fareBrandOptions || fareBrandOptions.some((option) => !option))
    return null;
  const selectedBrandOptionKey =
    safeText(item.selectedBrandOptionKey) ?? undefined;
  const selectedReturnKey = safeText(item.selectedReturnKey) ?? undefined;
  const selectedFareKey = safeText(item.selectedFareKey) ?? undefined;
  if (
    (selectedOutboundKey &&
      !outboundChoices.some(
        (choice) => choice!.itineraryKey === selectedOutboundKey,
      )) ||
    (selectedReturnKey &&
      (!selectedOutboundKey ||
        tripType !== "round-trip" ||
        !returnChoices.some(
          (choice) => choice!.itineraryKey === selectedReturnKey,
        ))) ||
    (tripType === "one-way" && selectedReturnKey) ||
    (item.version === 1 && selectedBrandOptionKey) ||
    (tripType === "one-way" &&
      (selectedBrandOptionKey || fareBrandOptions.length)) ||
    (selectedBrandOptionKey &&
      (!selectedOutboundKey ||
        tripType !== "round-trip" ||
        !fareBrandOptions.some(
          (option) => option!.brandOptionKey === selectedBrandOptionKey,
        ))) ||
    (selectedFareKey &&
      (!selectedOutboundKey ||
        (tripType === "round-trip" && !selectedReturnKey) ||
        !fareChoices.some((choice) => choice!.fareKey === selectedFareKey)))
  )
    return null;

  return {
    version: item.version,
    inventoryToken: token,
    sourceSearchKey,
    inventoryExpiresAt: expires,
    tripType,
    outboundChoices: outboundChoices as DealsFlightItineraryV2[],
    ...(item.version === 2
      ? { fareBrandOptions: fareBrandOptions as DealsFlightFareBrandOptionV2[] }
      : {}),
    returnChoices: returnChoices as DealsFlightItineraryV2[],
    fareChoices: fareChoices as DealsFlightRuntimeV2["fareChoices"],
    ...(selectedOutboundKey ? { selectedOutboundKey } : {}),
    ...(selectedBrandOptionKey ? { selectedBrandOptionKey } : {}),
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
): DealsFlightStorageResult<DealsFlightRuntimeV2> {
  const canonical = parseDealsFlightRuntimeV2(
    JSON.stringify(runtime),
    runtime.sourceSearchKey,
    runtime.tripType,
    0,
  );
  if (!canonical) return { ok: false, code: "STORAGE_UNAVAILABLE" };
  try {
    storage.setItem(
      DEALS_FLIGHT_RUNTIME_STORAGE_KEY,
      JSON.stringify(canonical),
    );
    return { ok: true, value: canonical };
  } catch {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
}

export function clearDealsFlightRuntimeV2(
  storage: Pick<Storage, "removeItem">,
): DealsFlightStorageResult<null> {
  try {
    storage.removeItem(DEALS_FLIGHT_RUNTIME_STORAGE_KEY);
    return { ok: true, value: null };
  } catch {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
}
