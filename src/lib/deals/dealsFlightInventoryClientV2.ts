import { z } from "zod";
import {
  canonicalizeDealsFlightItineraryV2,
  type DealsFlightItineraryV2,
} from "./dealsTripPlanV2";
import type { DealsFlightFareChoiceV2 } from "@/services/travel/dealsFlightInventoryV2";

export type DealsFlightInventoryErrorCode =
  | "MALFORMED_REQUEST"
  | "NO_INVENTORY"
  | "UNKNOWN_INVENTORY"
  | "INVENTORY_EXPIRED"
  | "STALE_SEARCH"
  | "STORAGE_UNAVAILABLE"
  | "PROVIDER_TEMPORARILY_UNAVAILABLE"
  | "FEATURE_DISABLED"
  | "RATE_LIMITED"
  | "INVALID_SELECTION"
  | "NETWORK_FAILURE"
  | "MALFORMED_RESPONSE";

export class DealsFlightInventoryClientError extends Error {
  constructor(
    readonly code: DealsFlightInventoryErrorCode,
    readonly retryable: boolean,
  ) {
    super(code);
    this.name = "DealsFlightInventoryClientError";
  }
}

export type DealsFlightSearchRequestV2 = {
  tripType: "round-trip" | "one-way";
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  travelers: number;
  adults: number;
  children: number;
  infants: number;
  cabinClass: "economy" | "business" | "first";
  currency: string;
};

const record = z.record(z.string(), z.unknown());
const envelope = z.object({ status: z.string(), code: z.string().optional() });
const fareSchema = z
  .object({
    fareKey: z.string().startsWith("flight-fare-v3:"),
    brand: z.string().min(1).optional(),
    cabinClass: z.enum(["economy", "business", "first"]),
    baggageInfo: z.string().optional(),
    refundInfo: z.string().optional(),
    sourcePrice: z.number().positive(),
    sourceCurrency: z.string().regex(/^[A-Z]{3}$/),
    offerExpiresAt: z.number().nonnegative().optional(),
  })
  .strict();
const knownCodes = new Set<DealsFlightInventoryErrorCode>([
  "MALFORMED_REQUEST",
  "NO_INVENTORY",
  "UNKNOWN_INVENTORY",
  "INVENTORY_EXPIRED",
  "STALE_SEARCH",
  "STORAGE_UNAVAILABLE",
  "PROVIDER_TEMPORARILY_UNAVAILABLE",
  "FEATURE_DISABLED",
  "RATE_LIMITED",
  "INVALID_SELECTION",
]);
const retryableCodes = new Set<DealsFlightInventoryErrorCode>([
  "NO_INVENTORY",
  "UNKNOWN_INVENTORY",
  "INVENTORY_EXPIRED",
  "STALE_SEARCH",
  "STORAGE_UNAVAILABLE",
  "PROVIDER_TEMPORARILY_UNAVAILABLE",
  "RATE_LIMITED",
  "NETWORK_FAILURE",
]);

function choices(value: unknown, direction: "outbound" | "return") {
  if (!Array.isArray(value)) return null;
  const parsed = value.map(canonicalizeDealsFlightItineraryV2);
  return parsed.some((item) => !item || item.direction !== direction)
    ? null
    : (parsed as DealsFlightItineraryV2[]);
}

async function post(path: string, body: unknown, signal?: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new DealsFlightInventoryClientError("NETWORK_FAILURE", true);
  }
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new DealsFlightInventoryClientError("MALFORMED_RESPONSE", false);
  }
  const base = envelope.safeParse(value);
  if (!base.success)
    throw new DealsFlightInventoryClientError("MALFORMED_RESPONSE", false);
  if (
    !response.ok ||
    base.data.status === "error" ||
    base.data.status === "unavailable"
  ) {
    const code = knownCodes.has(base.data.code as DealsFlightInventoryErrorCode)
      ? (base.data.code as DealsFlightInventoryErrorCode)
      : "MALFORMED_RESPONSE";
    throw new DealsFlightInventoryClientError(code, retryableCodes.has(code));
  }
  return record.parse(value);
}

export async function createFlightInventory(
  request: DealsFlightSearchRequestV2,
  signal?: AbortSignal,
) {
  const value = await post("/api/deals/v2/flights/inventory", request, signal);
  if (value.status === "empty" && value.code === "NO_INVENTORY")
    return { status: "empty" as const, outboundChoices: [] };
  const outboundChoices = choices(value.outboundChoices, "outbound");
  if (
    value.status !== "success" ||
    typeof value.inventoryToken !== "string" ||
    value.inventoryToken.length < 32 ||
    typeof value.sourceSearchKey !== "string" ||
    typeof value.inventoryExpiresAt !== "string" ||
    !Number.isFinite(Date.parse(value.inventoryExpiresAt)) ||
    !outboundChoices
  )
    throw new DealsFlightInventoryClientError("MALFORMED_RESPONSE", false);
  return {
    status: "success" as const,
    inventoryToken: value.inventoryToken,
    sourceSearchKey: value.sourceSearchKey,
    inventoryExpiresAt: value.inventoryExpiresAt,
    outboundChoices,
  };
}

type Selection = {
  inventoryToken: string;
  sourceSearchKey: string;
  outboundItineraryKey: string;
};
export async function getFlightReturnChoices(
  request: Selection,
  signal?: AbortSignal,
) {
  const value = await post(
    "/api/deals/v2/flights/inventory/returns",
    request,
    signal,
  );
  const returnChoices = choices(value.returnChoices, "return");
  if (value.status !== "success" || !returnChoices)
    throw new DealsFlightInventoryClientError("MALFORMED_RESPONSE", false);
  return returnChoices;
}
export async function getFlightFareChoices(
  request: Selection & { returnItineraryKey?: string },
  signal?: AbortSignal,
) {
  const value = await post(
    "/api/deals/v2/flights/inventory/fares",
    request,
    signal,
  );
  const parsed = z.array(fareSchema).safeParse(value.fares);
  if (value.status !== "success" || !parsed.success)
    throw new DealsFlightInventoryClientError("MALFORMED_RESPONSE", false);
  return parsed.data as DealsFlightFareChoiceV2[];
}
