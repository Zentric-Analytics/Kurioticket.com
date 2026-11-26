/** Safe car-specific copy shared by the website and native clients.
 * Never infer verified rental eligibility from generic sandbox offers.
 */
export const CAR_SANDBOX_AGE_NOTICE =
  "Sandbox car results do not verify driver age, rental eligibility or age-related fees.";

export type CarUnsupportedCategory = "unsupported_search" | "unsupported_location";

/** Only blame the location if the reported unsupported reasons all identify
 * a location problem. Unknown/mixed categories use neutral options copy.
 */
export function carUnsupportedCategory(reasons: readonly unknown[]): CarUnsupportedCategory {
  return reasons.length > 0 && reasons.every(reason => reason === "unsupported_location")
    ? "unsupported_location" : "unsupported_search";
}

export function carUnsupportedSearchMessage(category: unknown): string {
  return category === "unsupported_location"
    ? "These rental locations could not be verified or are unsupported. Select the locations again, then search."
    : "The available providers cannot search these rental options. Please change your search.";
}
