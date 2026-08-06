export type DealsHandoffRequestMode = "legacy" | "guided" | "invalid";

export function parseDealsHandoffRequestMode(
  value: string | string[] | undefined,
): DealsHandoffRequestMode {
  if (value === undefined) return "legacy";
  return value === "guided" ? "guided" : "invalid";
}
