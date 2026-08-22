export type DealsHandoffRequestMode =
  | "legacy"
  | "guided"
  | "guided-v2"
  | "invalid";

export function parseDealsHandoffRequestMode(
  value: string | string[] | undefined,
): DealsHandoffRequestMode {
  if (value === undefined) return "legacy";
  return value === "guided" || value === "guided-v2" ? value : "invalid";
}
