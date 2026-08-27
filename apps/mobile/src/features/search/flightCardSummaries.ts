const normalized = (value?: string) => value?.trim().toLowerCase() || "";

export function summarizeFareRules(refundInfo?: string) {
  const value = normalized(refundInfo);
  if (!value) return null;
  if (/non[- ]?refundable|not refundable|no refunds?|refunds? (?:are )?not (?:allowed|permitted)/i.test(value)) return null;
  if (/refundable|free (?:cancellation|refund)|refund (?:allowed|available|permitted)/i.test(value)) {
    return "Refundable";
  }
  return null;
}

export function summarizeBaggage(baggageInfo?: string) {
  const value = normalized(baggageInfo);
  if (!value) return null;

  const carryOn = /carry[- ]?on|cabin (?:bag|baggage)|hand (?:bag|baggage)/i.test(value);
  const checked = /checked (?:bag|baggage)|\b\d+\s*(?:x\s*)?(?:piece|pc)s?\b/i.test(value);
  const excluded = /no (?:bag|baggage)|not included|excluded/i.test(value);

  if (carryOn && checked && !excluded) return "Bags included";
  if (carryOn && !excluded) return "Carry-on";
  if (checked && !excluded) return "Checked bag";
  if (excluded) return "Not included";
  return null;
}

export function formatCabinClass(cabinClass?: string) {
  const value = cabinClass?.trim();
  if (!value) return "Review fare";

  return value
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}
