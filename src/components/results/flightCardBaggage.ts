const UNAVAILABLE_BAGGAGE_PATTERNS = [
  /\b(?:baggage|bag) (?:details?|information|allowance) (?:is |are )?(?:not supplied|not provided|unavailable|not available|missing|unknown)\b/i,
  /\b(?:not supplied|not provided) (?:by|from) (?:the )?provider\b/i,
  /\b(?:review|check) baggage (?:details |information |allowance )?(?:with|on) (?:the )?(?:external )?provider\b/i,
  /\breviewed on the external provider\b/i,
  /\bshown by the external provider\b/i,
  /\breviewed externally\b/i,
  /\brules vary\b/i,
  /\bvary by fare\b/i,
] as const;

export function isUnavailableBaggageInformation(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) return true;
  return UNAVAILABLE_BAGGAGE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function formatFlightCardBaggage(
  value: string | null | undefined,
  labels: { checkProvider: string; carryOnIncluded: string },
) {
  if (isUnavailableBaggageInformation(value)) return labels.checkProvider;
  if (/carry-on included/i.test(value!)) return labels.carryOnIncluded;
  return value!.trim();
}
