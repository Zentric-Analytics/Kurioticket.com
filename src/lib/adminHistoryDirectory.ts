import { deviceHistoryHref, parseDeviceHistoryQuery, type DeviceHistoryQuery } from "./adminDeviceHistory";
import { isPageHistoryPlatform, pageHistoryHref, parsePageHistoryQuery, type PageHistoryPlatform } from "./adminPageHistory";
import { validActivityIdentity } from "./adminIdentityActivity";
import type { IdentityKind } from "./adminIdentityJourney";

export type HistorySection = "devices" | "pages";
export type HistoryIdentityTab = "all" | "registered" | "guests";
export const HISTORY_DIRECTORY_PAGE_SIZE = 20;
export const HISTORY_DIRECTORY_LABELS = { devices: "Device & Access", pages: "Pages Visited" } as const;
export type HistoryDirectoryQuery = DeviceHistoryQuery & { q: string; tab: HistoryIdentityTab; platform: PageHistoryPlatform };
export type HistoryDirectoryRow = { kind: IdentityKind; id: string; name: string; email: string | null; count: number; lastSeenAt: Date };
type RawQuery = Record<string, string | string[] | undefined>;
const directoryKeys = ["range", "page", "from", "to", "q", "tab", "platform"] as const;

export function historyDirectoryPath(section: HistorySection) { return "/admin/users/" + section; }

export function parseHistoryDirectoryQuery(section: HistorySection, raw: RawQuery):
  { ok: true; query: HistoryDirectoryQuery } | { ok: false; error: string } {
  if (Object.values(raw).some(Array.isArray)) return { ok: false, error: "Repeated filters are not supported." };
  const parsed = parseDeviceHistoryQuery({ range: raw.range ?? "today", page: raw.page, from: raw.from, to: raw.to });
  if (!parsed.ok) return parsed;
  const q = typeof raw.q === "string" ? raw.q.trim() : "";
  if (q.length > 80 || /[\u0000-\u001f\u007f]/.test(q)) return { ok: false, error: "Enter up to 80 ordinary characters." };
  const tab = raw.tab ?? (section === "devices" ? "registered" : "all");
  if (tab !== "all" && tab !== "registered" && tab !== "guests") return { ok: false, error: "Unsupported identity filter." };
  if (section === "devices" && tab !== "registered") return { ok: false, error: "Device history is available for registered accounts only." };
  const platform = raw.platform ?? "all";
  if (!isPageHistoryPlatform(platform) || (section === "devices" && platform !== "all"))
    return { ok: false, error: "Unsupported platform filter." };
  return { ok: true, query: { ...parsed.query, q, tab, platform } };
}

export function historyDirectoryHref(section: HistorySection, query: HistoryDirectoryQuery, updates: Partial<HistoryDirectoryQuery> = {}) {
  const next = { ...query, ...updates };
  const params = new URLSearchParams({ range: next.range, page: String(next.page) });
  if (next.range === "custom" && next.from && next.to) {
    params.set("from", next.from);
    params.set("to", next.to);
  }
  if (next.q) params.set("q", next.q);
  if (section === "pages") {
    params.set("tab", next.tab);
    if (next.platform !== "all") params.set("platform", next.platform);
  }
  return historyDirectoryPath(section) + "?" + params.toString();
}

/** Only the corresponding internal directory is accepted as a return target.
 * This is navigation context, never authority to read another user's records. */
export function historyDirectoryReturnHref(section: HistorySection, incoming: unknown): string | null {
  if (typeof incoming !== "string" || incoming.length > 1000 || /[\u0000-\u001f\u007f#]/.test(incoming)) return null;
  const [path, search = "", extra] = incoming.split("?");
  if (path !== historyDirectoryPath(section) || extra !== undefined) return null;
  const params = new URLSearchParams(search);
  const raw: RawQuery = {};
  for (const key of directoryKeys) {
    if (params.getAll(key).length > 1) return null;
    const value = params.get(key);
    if (value !== null) raw[key] = value;
  }
  const parsed = parseHistoryDirectoryQuery(section, raw);
  return parsed.ok ? historyDirectoryHref(section, parsed.query) : null;
}

export function historyIdentityHref(section: HistorySection, row: Pick<HistoryDirectoryRow, "kind" | "id">, query: HistoryDirectoryQuery, now: Date): string {
  if (!validActivityIdentity(row.kind, row.id) || (section === "devices" && row.kind !== "user")) throw new Error("Invalid history identity");
  const path = "/admin/users/" + row.kind + "/" + encodeURIComponent(row.id) + "/" + section;
  const back = historyDirectoryHref(section, query);
  if (section === "devices") return deviceHistoryHref(path, { range: query.range, from: query.from, to: query.to, page: 1 }, {}, back);
  // Identity search belongs only to the directory. The detail's search is
  // about routes/screens and must not inherit a person's name or email.
  const parsed = parsePageHistoryQuery({ range: query.range, from: query.from, to: query.to, platform: query.platform, page: "1" }, now);
  if (!parsed.ok) throw new Error("Invalid history window");
  return pageHistoryHref(path, parsed.query, back);
}
