import type { DisplayPrice } from "../currency/displayCurrency";

const compactUnits = [
  { value: 1_000_000_000_000, suffix: "T" },
  { value: 1_000_000_000, suffix: "B" },
  { value: 1_000_000, suffix: "M" },
] as const;

function currencyAffixes(amount: number, currency: string) {
  const fallback = { prefix: `${currency} `, suffix: "" };

  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    });

    // Some Hermes versions implement NumberFormat without formatToParts.
    if (typeof formatter.formatToParts !== "function") return fallback;

    const parts = formatter.formatToParts(amount);
    const firstNumber = parts.findIndex((part) => part.type === "integer");
    let lastNumber = -1;

    // A reverse loop keeps this compatible with older Hermes runtimes.
    for (let index = parts.length - 1; index >= 0; index -= 1) {
      const type = parts[index]?.type;
      if (
        type === "integer" ||
        type === "group" ||
        type === "decimal" ||
        type === "fraction"
      ) {
        lastNumber = index;
        break;
      }
    }

    if (firstNumber === -1 || lastNumber === -1) return fallback;

    return {
      prefix: parts.slice(0, firstNumber).map((part) => part.value).join(""),
      suffix: parts.slice(lastNumber + 1).map((part) => part.value).join(""),
    };
  } catch {
    return fallback;
  }
}

function compactNumber(amount: number) {
  let unit = compactUnits.find((candidate) => amount >= candidate.value);
  if (!unit) {
    const thousands = Math.round(amount / 1_000);
    if (thousands < 1_000) return `${thousands}K`;
    unit = compactUnits[compactUnits.length - 1];
  }

  const scaled = amount / unit.value;
  const maximumFractionDigits = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
  }).format(scaled)}${unit.suffix}`;
}

/** Formats a resolved display fare for the DateStrip's constrained tile only. */
export function formatDateStripPrice(price: DisplayPrice) {
  const amount = Math.abs(price.amount);
  const formatted = amount < 100_000
    ? price.formatted
    : (() => {
        const { prefix, suffix } = currencyAffixes(amount, price.currency);
        const sign = price.amount < 0 ? "-" : "";
        return `${prefix}${sign}${compactNumber(amount)}${suffix}`;
      })();
  let accessibilityLabel = price.formatted;
  try {
    accessibilityLabel = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: price.currency,
      currencyDisplay: "name",
      maximumFractionDigits: 0,
    }).format(price.amount);
  } catch {
    // The already-resolved full price remains a useful, non-compact label.
  }

  return { formatted, accessibilityLabel };
}
