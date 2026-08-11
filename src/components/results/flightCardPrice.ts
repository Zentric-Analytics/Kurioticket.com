const FLIGHT_CARD_COMPACT_THRESHOLD = 10_000_000;

export type FlightCardPriceDisplay = {
  formatted: string;
  size: "normal" | "large" | "compact";
};

/**
 * Produces the constrained price shown on a FlightCard. Exact prices below
 * eight digits are preserved; only exceptionally long amounts use compact
 * notation. Full values remain available to details and accessibility copy.
 */
export function formatFlightCardPrice({
  amount,
  currency,
  formatted,
  locale,
}: {
  amount: number;
  currency: string;
  formatted: string;
  locale?: string;
}): FlightCardPriceDisplay {
  const magnitude = Math.abs(amount);

  if (magnitude < FLIGHT_CARD_COMPACT_THRESHOLD) {
    return {
      formatted,
      size: magnitude >= 1_000_000 ? "large" : "normal",
    };
  }

  return {
    formatted: new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
      notation: "compact",
      compactDisplay: "short",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(amount),
    size: "compact",
  };
}
