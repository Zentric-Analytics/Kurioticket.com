import type { CabinClass, FlightSearchParams } from "@/lib/types";

const cabins = new Set<CabinClass>(["economy", "premium-economy", "business", "first"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const count = (params: URLSearchParams, name: string) => {
  const raw = params.get(name);
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
};

export function parseFlightDetailsSearch(params: URLSearchParams): FlightSearchParams | null {
  const tripType = params.get("tripType");
  const origin = params.get("origin")?.trim() ?? "";
  const destination = params.get("destination")?.trim() ?? "";
  const departureDate = params.get("departureDate") ?? "";
  const returnDate = params.get("returnDate") || undefined;
  const cabinClass = params.get("cabinClass") as CabinClass | null;
  const adults = count(params, "adults");
  const children = count(params, "children");
  const infants = count(params, "infants");
  if (
    (tripType !== "one-way" && tripType !== "round-trip") || !origin || !destination ||
    !datePattern.test(departureDate) ||
    (tripType === "round-trip" && (!returnDate || !datePattern.test(returnDate))) ||
    !cabinClass || !cabins.has(cabinClass) || adults === null || adults < 1 ||
    children === null || infants === null
  ) return null;
  return { tripType, origin, destination, departureDate, ...(returnDate ? { returnDate } : {}), adults, children, infants, travelers: adults + children + infants, cabinClass };
}

export function searchRecordToParams(value: unknown) {
  const params = new URLSearchParams();
  if (!value || typeof value !== "object" || Array.isArray(value)) return params;
  for (const [key, entry] of Object.entries(value))
    if (typeof entry === "string") params.set(key, entry);
  return params;
}
