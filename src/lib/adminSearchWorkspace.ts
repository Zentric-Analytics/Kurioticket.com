/** The unified Admin Search Activity workspace keeps section-specific filters separate. */
export const searchWorkspaceTabs = [
  { id: "searches", label: "Searches" },
  { id: "journeys", label: "Journeys" },
  { id: "handoffs", label: "Provider Handoffs" },
  { id: "attribution", label: "Referral Attribution" },
] as const;

export type SearchWorkspaceTab = (typeof searchWorkspaceTabs)[number]["id"];
export type SearchWorkspaceParams = Record<string, string | string[] | undefined>;
export const searchWorkspacePath = "/admin/searches/activity";

const sectionFilters: Record<SearchWorkspaceTab, readonly string[]> = {
  searches: ["range", "environment", "product", "status", "identity", "userId", "visitorId", "provider", "from", "to", "cursor", "limit"],
  journeys: ["range", "environment", "product", "identity", "userId", "visitorId", "provider", "stage", "from", "to", "cursor", "limit"],
  handoffs: ["environment", "product", "identity", "userId", "visitorId", "provider", "correlation", "from", "to", "cursor", "limit"],
  attribution: ["days"],
};

export function searchWorkspaceTab(value: string | string[] | undefined): SearchWorkspaceTab {
  return value === "journeys" || value === "handoffs" || value === "attribution" ? value : "searches";
}

/** Retain only filters that belong to the destination's strict backend contract.
 * No caller-provided redirect path or other query key is accepted.
 */
export function searchWorkspaceHref(tab: SearchWorkspaceTab, raw: SearchWorkspaceParams = {}) {
  const params = new URLSearchParams();
  if (tab !== "searches") params.set("tab", tab);
  for (const key of sectionFilters[tab]) {
    const value = raw[key];
    if (typeof value === "string" && value.length <= 2048) params.set(key, value);
    else if (Array.isArray(value)) for (const part of value) if (typeof part === "string" && part.length <= 2048) params.append(key, part);
  }
  const query = params.toString();
  return searchWorkspacePath + (query ? "?" + query : "");
}
