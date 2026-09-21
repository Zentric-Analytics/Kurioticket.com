const FLIGHT_CARD_COMPACT_TYPOGRAPHY_THRESHOLD = 10_000_000;

export type FlightCardPriceDisplay = {
  formatted: string;
  size: "normal" | "large" | "compact";
};

/**
 * Produces the full price shown on a FlightCard. Size categories adapt the
 * typography for long values without abbreviating the monetary amount.
 */
export function formatFlightCardPrice({
  amount,
  formatted,
}: {
  amount: number;
  formatted: string;
}): FlightCardPriceDisplay {
  const magnitude = Math.abs(amount);

  return {
    formatted,
    size: magnitude >= FLIGHT_CARD_COMPACT_TYPOGRAPHY_THRESHOLD
      ? "compact"
      : magnitude >= 1_000_000
        ? "large"
        : "normal",
  };
}
