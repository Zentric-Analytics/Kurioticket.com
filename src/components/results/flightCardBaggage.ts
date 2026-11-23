export function formatBaggageValue(
  value: string | undefined,
  t: (key: string) => string,
) {
  if (/^baggage details not supplied by the provider$/i.test(value?.trim() ?? "")) {
    return t("notSuppliedByProvider");
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


export function formatDesktopBaggageValue(
  value: string | undefined,
  t: (key: string) => string,
) {
  const raw = value?.trim() ?? "";

  if (/^baggage allowance not supplied by (?:the )?provider$/i.test(raw)) {
    return t("notSuppliedByProvider");
  }

  const checkedBagMatch = raw.match(
    /^(\d+)\s+checked bags?\s+up to\s+(\d+(?:\.\d+)?)\s*kg$/i,
  );
  if (checkedBagMatch) {
    const count = Number(checkedBagMatch[1]);
    const unit =
      count === 1
        ? t("flightCard.compactBagSingular")
        : t("flightCard.compactBagPlural");
    return `${count} ${unit} · ${checkedBagMatch[2]} kg`;
  }

  const formatted = formatBaggageValue(value, t);
  return /^see supplied baggage details$/i.test(formatted.trim())
    ? t("seeDetails")
    : formatted;
}
