/**
 * Compact visual preview for the Provider Handoffs Route / Property column.
 * The original string remains in the record and is used for tooltip/details.
 */
export function adminHandoffRoutePreview(route: string | null | undefined): string {
  if (!route) return "—";
  const characters = Array.from(route);
  return characters.length > 10 ? characters.slice(0, 10).join("") + "…" : route;
}
