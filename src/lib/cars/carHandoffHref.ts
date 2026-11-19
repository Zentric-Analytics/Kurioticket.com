/** Send car provider clicks through the verified, server-owned handoff route. */
export function carHandoffHref(resultId: string, offerId: string, sourcePage: "car-results" | "car-details") {
  const params = new URLSearchParams({ resultId, offerId, sourcePage });
  return `/api/cars/handoff?${params.toString()}`;
}
