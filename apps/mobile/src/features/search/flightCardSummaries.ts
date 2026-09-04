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
  const explicitlyIncluded = /\binclud(?:e|ed|es)\b|complimentary|free (?:carry[- ]?on|checked (?:bag|baggage))/i.test(value);
  const incompleteItinerary = /not (?:supplied|provided|available)|unknown|unspecified/i.test(value);

  if (incompleteItinerary) return null;
  if (excluded && explicitlyIncluded && !/^(?:no (?:bag|baggage)|(?:bag|baggage) not included)/i.test(value)) return null;
  if (excluded) return "Not included";
  if (!explicitlyIncluded) return null;
  if (carryOn && checked) return "Included";
  if (carryOn) return "Carry-on included";
  if (checked) return "Checked bag included";
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
