import { searchLifecycle } from "../../../../../src/shared/search/lifecycle";
type Product = "flight" | "hotel" | "car";

/** Never render upstream warning or error text, including from an older API. */
export function searchUnavailableMessage(product: Product) {
  const name = product === "flight" ? "Flight" : product === "hotel" ? "Hotel" : "Car";
  return `${name} search is temporarily unavailable. Please try again.`;
}

export function presentSearchResults(
  product: Product,
  resultCount: number,
  response: { status?: string; warningCategory?: string; completed?: boolean; nextCursor?: string | null },
): { status: "ready" | "empty" | "error" | "loading"; message: string } {
  // A failed supplier cannot hide valid offers from another supplier.
  if (resultCount > 0) return { status: "ready", message: "" };
  if (response.warningCategory === "unsupported_search") {
    return { status: "error", message: "These search options aren't supported. Please change your search." };
  }
  const lifecycle=searchLifecycle({count:resultCount,status:response.status,completed:response.completed,continuation:Boolean(response.nextCursor)});
  if(lifecycle === "searching" || lifecycle === "pending-authorization") return {status:"loading",message:""};
  if (lifecycle === "unavailable" || response.warningCategory === "provider_unavailable") {
    return { status: "error", message: searchUnavailableMessage(product) };
  }
  return { status: "empty", message: "" };
}
