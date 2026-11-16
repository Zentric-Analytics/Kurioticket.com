type ReorderRow = { key: string; draftPayload: unknown };
export function cmsReorderLabel(row: ReorderRow, section: "destinations" | "flight-routes") {
  const raw = row.draftPayload && typeof row.draftPayload === "object" && !Array.isArray(row.draftPayload)
    ? row.draftPayload as Record<string, unknown> : {};
  const title = section === "destinations" ? raw.city : raw.title;
  const route = raw.originCode && raw.destinationCode ? `${raw.originCode} → ${raw.destinationCode}` : row.key;
  return [title || (section === "destinations" ? "Destination" : "Flight route"), raw.country, route].filter(Boolean).join(" · ");
}
export function sameCmsOrder(current: readonly string[], original: readonly string[]) {
  return current.length === original.length && current.every((id, index) => id === original[index]);
}

// Draft order is what editors change; public readers continue using the
// independent publishedSortOrder snapshot until each item is published.
export function sortCmsFaqDirectory<T extends { sortOrder: number; key: string; id: string }>(items: readonly T[]) {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key) || a.id.localeCompare(b.id));
}
