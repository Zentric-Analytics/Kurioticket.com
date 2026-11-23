/**
 * Compact Search Records table text only. The original route label is kept
 * for the detail link and hover/focus descriptions.
 *
 * Count Unicode code points so emoji/accented destinations do not split a
 * surrogate pair when limiting the visible preview to five characters.
 */
export function searchRoutePreview(route: string): string {
  const characters = Array.from(route);
  return characters.length > 5 ? characters.slice(0, 5).join("") + "…" : route;
}
