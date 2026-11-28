import type { JourneyObservedResult } from "./search-journey";

export function safeObservedResult(value: unknown): (JourneyObservedResult & { provenance: "customer_display" }) | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = value as Record<string, unknown>;
  const label = typeof result.label === "string" ? result.label.trim() : "";
  const provider = typeof result.provider === "string" ? result.provider.trim() : "";
  const amount = result.amount;
  const currency = result.currency;
  const basis = result.priceBasis;
  if (!label || label.length > 120 || !provider || provider.length > 100
    || /[\u0000-\u001f\u007f<>]/.test(label + provider)
    || typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || amount > 1e9
    || typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)
    || (basis !== "total" && basis !== "per_night" && basis !== "per_day")) return null;
  const total = result.totalAmount;
  return {
    label, provider, amount, currency, priceBasis: basis,
    ...(typeof total === "number" && Number.isFinite(total) && total > 0 && total <= 1e9 ? { totalAmount: total } : {}),
    provenance: "customer_display",
  };
}
