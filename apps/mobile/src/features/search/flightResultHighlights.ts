import type { FlightResult } from "../../api/travelApi";

export type FlightResultHighlight = "Best" | "Cheapest" | "Fastest";

const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;

/** Derives scarce labels from the displayed set without changing its order. */
export function deriveFlightResultHighlights(
  displayedResults: readonly FlightResult[],
  normalizePrice: (result: FlightResult) => number | null,
) {
  const highlights = new Map<string, FlightResultHighlight>();
  const firstBy = (value: (result: FlightResult) => number | null, direction: "min" | "max") => {
    let selected: FlightResult | undefined;
    let selectedValue: number | null = null;
    for (const result of displayedResults) {
      const candidate = finite(value(result));
      if (candidate == null) continue;
      if (selectedValue == null || (direction === "min" ? candidate < selectedValue : candidate > selectedValue)) {
        selected = result;
        selectedValue = candidate;
      }
    }
    return selected;
  };

  const best = firstBy((result) => finite(result.valueScore), "max");
  const cheapest = firstBy(normalizePrice, "min");
  const fastest = firstBy((result) => finite(result.durationMinutes), "min");

  // Priority is authoritative value ranking, normalized fare, then duration.
  if (best) highlights.set(best.id, "Best");
  if (cheapest && !highlights.has(cheapest.id)) highlights.set(cheapest.id, "Cheapest");
  if (fastest && !highlights.has(fastest.id)) highlights.set(fastest.id, "Fastest");
  return highlights;
}
