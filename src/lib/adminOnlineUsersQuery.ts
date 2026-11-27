import type { OnlineIdentityRow } from "./adminOnlineUsersSnapshot";

export const onlineUsersIdentityTypes = ["ALL", "registered", "guest"] as const;
export const onlineUsersRoles = ["ALL", "USER", "SUPPORT", "ADMIN"] as const;
export const onlineUsersPlatforms = ["ALL", "website", "desktop_web", "mobile_web", "ios", "android", "unclassified"] as const;
export type OnlineUsersFilters = {
  q: string;
  type: (typeof onlineUsersIdentityTypes)[number];
  role: (typeof onlineUsersRoles)[number];
  platform: (typeof onlineUsersPlatforms)[number];
};
export type OnlineUsersQuery = OnlineUsersFilters & { page: number };
export const defaultOnlineUsersQuery: OnlineUsersQuery = { q: "", type: "ALL", role: "ALL", platform: "ALL", page: 1 };
const keys = ["q", "type", "role", "platform", "page"] as const;

/** URL state is the applied view. Draft edits and periodic roster refreshes do
 * not change it, so an identity drill-down and browser Back restore the view. */
export function parseAdminOnlineUsersQuery(params: { getAll(name: string): string[] }):
  { ok: true; query: OnlineUsersQuery } | { ok: false; error: string } {
  const raw: Partial<Record<(typeof keys)[number], string>> = {};
  for (const key of keys) {
    const values = params.getAll(key);
    if (values.length > 1) return { ok: false, error: "Repeated filters are not supported." };
    if (values.length) raw[key] = values[0];
  }
  const q = (raw.q ?? "").trim();
  const type = raw.type ?? "ALL", role = raw.role ?? "ALL", platform = raw.platform ?? "ALL";
  const page = raw.page ?? "1";
  if (q.length > 120 || /[\u0000-\u001f\u007f]/.test(raw.q ?? ""))
    return { ok: false, error: "Enter up to 120 ordinary search characters." };
  if (!(onlineUsersIdentityTypes as readonly string[]).includes(type)
    || !(onlineUsersRoles as readonly string[]).includes(role)
    || !(onlineUsersPlatforms as readonly string[]).includes(platform))
    return { ok: false, error: "Choose a supported identity, role and platform." };
  if (!/^[1-9]\d{0,6}$/.test(page) || Number(page) > 1_000_000)
    return { ok: false, error: "Choose a valid results page." };
  return { ok: true, query: { q, type: type as OnlineUsersFilters["type"], role: role as OnlineUsersFilters["role"],
    platform: platform as OnlineUsersFilters["platform"], page: Number(page) } };
}

export function adminOnlineUsersHref(query: OnlineUsersQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.type !== "ALL") params.set("type", query.type);
  if (query.role !== "ALL") params.set("role", query.role);
  if (query.platform !== "ALL") params.set("platform", query.platform);
  if (query.page !== 1) params.set("page", String(query.page));
  return "/admin/users/online" + (params.size ? "?" + params : "");
}

export function matchesAdminOnlineUser(row: OnlineIdentityRow, filters: OnlineUsersFilters): boolean {
  if (filters.type !== "ALL" && row.kind !== filters.type) return false;
  if (filters.role !== "ALL" && row.role !== filters.role) return false;
  if (filters.platform !== "ALL" && !(filters.platform === "website"
    ? row.platforms.some(value => value === "desktop_web" || value === "mobile_web")
    : row.platforms.includes(filters.platform))) return false;
  const term = filters.q.trim().toLowerCase();
  if (!term) return true;
  const searchable = row.kind === "guest" ? ["guest session", row.locationLabel]
    : [row.name, row.email, row.id, row.locationLabel];
  return searchable.some(value => value?.toLowerCase().includes(term));
}
