export function nearbyFarePriceSize(value: string) {
  const length = value.replace(/\s/g, "").length;
  if (length >= 13) return "extra-long";
  if (length >= 10) return "long";
  return "default";
}
