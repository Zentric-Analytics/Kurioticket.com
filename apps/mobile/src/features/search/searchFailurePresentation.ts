type Product = "flight" | "hotel" | "car";

/** Never render upstream warning or error text, including from an older API. */
export function searchUnavailableMessage(product: Product) {
  const name = product === "flight" ? "Flight" : product === "hotel" ? "Hotel" : "Car";
  return `${name} search is temporarily unavailable. Please try again.`;
}

export function presentSearchResults(
  product: Product,
  resultCount: number,
  response: { status?: string; warningCategory?: string },
): { status: "ready" | "empty" | "error"; message: string } {
  // A failed supplier cannot hide valid offers from another supplier.
  if (resultCount > 0) return { status: "ready", message: "" };
  if (response.warningCategory === "unsupported_search") {
    return { status: "error", message: "These search options aren't supported. Please change your search." };
  }
  if (response.status === "unavailable" || response.warningCategory === "provider_unavailable") {
    return { status: "error", message: searchUnavailableMessage(product) };
  }
  return { status: "empty", message: "" };
}
