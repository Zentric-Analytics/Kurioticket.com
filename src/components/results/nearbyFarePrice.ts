import type { DisplayPrice } from "@/lib/currency/formatCurrency";

/** Desktop presentation only; canonical amounts and the full accessible price stay intact. */
export function nearbyFarePrice(price: Pick<DisplayPrice, "amount" | "currency" | "formatted">, locale: string) {
  const length = [...price.formatted.replace(/\s/g, "")].length;
  // Same Intl compact strategy as FlightCard, used only for exceptionally long
  // fare-tile labels. Ordinary and seven-digit symbol prices remain exact.
  const compact = length > 14
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: price.currency,
        notation: "compact",
        compactDisplay: "short",
        maximumFractionDigits: 1,
      }).format(price.amount)
    : price.formatted;
  const visibleLength = [...compact.replace(/\s/g, "")].length;
  return {
    full: price.formatted,
    formatted: compact,
    size: visibleLength >= 12 ? "extra-long" : visibleLength >= 9 ? "long" : "default",
  };
}
