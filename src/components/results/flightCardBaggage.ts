export function formatBaggageValue(
  value: string | undefined,
  t: (key: string) => string,
) {
  if (/^baggage details not supplied by the provider$/i.test(value?.trim() ?? "")) {
    return "Not supplied by provider";
  }

  if (
    !value ||
    isProviderReviewCopy(value) ||
    /rules vary|vary by fare/i.test(value)
  ) {
    return t("checkProvider");
  }

  if (/carry-on included/i.test(value)) return t("carryOnIncluded");
  return value;
}

function isProviderReviewCopy(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("reviewed on the external provider") ||
    normalized.includes("shown by the external provider") ||
    normalized.includes("reviewed externally") ||
    normalized.includes("rules vary") ||
    normalized.includes("vary by fare")
  );
}
