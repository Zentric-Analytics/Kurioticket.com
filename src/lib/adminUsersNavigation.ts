import { adminCalendarRange, adminLocalDate, adminStartOfLocalDay } from "./adminLocalTime";
import { adminOnlineUsersHref, parseAdminOnlineUsersQuery } from "./adminOnlineUsersQuery";
import { historyDirectoryReturnHref } from "./adminHistoryDirectory";
import { validActivityIdentity } from "./adminIdentityActivity";
import { encodeActivityJourneyReturn } from "./adminActivityJourneyNavigation";
import { isAdminUsersDirectoryPageValue } from "./adminUsersDirectoryPagination";
import type { RawActivityQuery } from "./adminActivityDateQuery";
import type { PublicEnvironment } from "./stagingSafety";

export const USERS_RETURN_MAX_LENGTH = 2048;
const labels = {
  "/admin/users": "Users directory",
  "/admin/users/online": "Online Users",
  "/admin/users/devices": "Device & Access",
  "/admin/users/pages": "Pages Visited",
} as const;
const directoryChoices: Record<string, readonly string[]> = {
  role: ["ALL", "USER", "SUPPORT", "ADMIN"],
  status: ["ALL", "ACTIVE", "INACTIVE", "UNAVAILABLE", "SUSPENDED", "DELETED", "PENDING_DELETION"],
  tab: ["ALL", "REGISTERED", "GUEST"], identity: ["ALL", "REGISTERED", "GUEST"],
  sort: ["newest", "oldest", "name_asc", "name_desc"],
  date: ["24h", "all", "today", "last7", "last30", "thisMonth", "lastMonth", "last3", "custom"],
};

/** Only Users root views can be an origin. A return URL never supplies identity,
 * consent, environment or query authority to a history reader. */
export function safeAdminUsersReturnHref(input: unknown, timeZone = "UTC"): string | null {
  if (typeof input !== "string" || input.length > USERS_RETURN_MAX_LENGTH || /[\u0000-\u001f\u007f#\\]/.test(input)) return null;
  const [path, search = "", extra] = input.split("?");
  if (!Object.hasOwn(labels, path) || extra !== undefined) return null;
  if (path === "/admin/users/devices" || path === "/admin/users/pages")
    return historyDirectoryReturnHref(path.endsWith("devices") ? "devices" : "pages", input);
  const params = new URLSearchParams(search);
  if (path === "/admin/users/online") {
    const parsed = parseAdminOnlineUsersQuery(params);
    return parsed.ok ? adminOnlineUsersHref(parsed.query) : null;
  }
  const safe = new URLSearchParams();
  for (const key of ["q", ...Object.keys(directoryChoices), "from", "to", "page"]) {
    if (params.getAll(key).length > 1) return null;
    const value = params.get(key);
    if (!value) continue;
    if (/[\u0000-\u001f\u007f]/.test(value)) return null;
    if (key === "q" && value.length <= 120) safe.set(key, value);
    else if (directoryChoices[key]?.includes(value)) safe.set(key, value);
    else if ((key === "from" || key === "to") && /^\d{4}-\d{2}-\d{2}$/.test(value)) safe.set(key, value);
    else if (key === "page" && isAdminUsersDirectoryPageValue(value)) safe.set(key, value);
    else return null;
  }
  if (safe.get("date") === "custom") {
    if (!safe.has("from") || !safe.has("to") || !adminCalendarRange(safe.get("from")!, safe.get("to")!, timeZone)) return null;
  } else {
    safe.delete("from"); safe.delete("to");
  }
  return path + (safe.size ? "?" + safe : "");
}

export function adminUsersActivityReturn(raw: RawActivityQuery, timeZone = "UTC"): { href: string; label: string } {
  const incoming = safeAdminUsersReturnHref(raw.usersReturn, timeZone);
  const legacy = typeof raw.directory === "string" && raw.directory.length <= 1000
    ? safeAdminUsersReturnHref("/admin/users?" + raw.directory, timeZone) : null;
  const href = incoming ?? legacy ?? "/admin/users";
  return { href, label: labels[href.split("?")[0] as keyof typeof labels] };
}

/** Keep the selected reporting period while changing from the directory's
 * identity filter to one identity's activity. Live presence has no historical
 * period, so its activity entry starts Today. Other origin filters stay only
 * in the validated return context. */
export function adminUsersActivityHref(
  kind: "user" | "guest" | "live-guest", id: string, origin: string,
  timeZone = "UTC", now = new Date(),
): string | null {
  if (kind === "live-guest" ? !/^[A-Za-z0-9_-]{43}$/.test(id) : !validActivityIdentity(kind, id)) return null;
  const usersReturn = safeAdminUsersReturnHref(origin, timeZone);
  if (!usersReturn) return null;
  const [path, search = ""] = usersReturn.split("?");
  const incoming = new URLSearchParams(search);
  const selected = path === "/admin/users" ? incoming.get("date") ?? "today"
    : path === "/admin/users/online" ? "today" : incoming.get("range") ?? "today";
  const range = selected === "last7" ? "7d" : selected === "last30" ? "30d" : selected;
  const params = new URLSearchParams({ range, usersReturn });
  if (range === "custom") {
    params.set("from", incoming.get("from")!);
    params.set("to", incoming.get("to")!);
  } else if (["thisMonth", "lastMonth", "last3"].includes(range)) {
    // Older directory bookmarks include month presets. Preserve their exact
    // local month boundaries as a custom period, never widen to All time.
    const month = new Date(adminLocalDate(now, timeZone).slice(0, 7) + "-01T00:00:00Z");
    const boundary = (offset: number) => {
      const day = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + offset, 1));
      return adminStartOfLocalDay(day.toISOString().slice(0, 10), timeZone) ?? day;
    };
    params.set("range", "custom");
    params.set("from", boundary(range === "lastMonth" ? -1 : range === "last3" ? -2 : 0).toISOString());
    params.set("to", boundary(range === "lastMonth" ? 0 : 1).toISOString());
  }
  return "/admin/users/" + kind + "/" + encodeURIComponent(id) + "/activity?" + params;
}

export function adminActivitySearchHref(searchHistoryId: string, environment: PublicEnvironment, returnHref: string): string {
  const query = new URLSearchParams({ environment });
  const context = encodeActivityJourneyReturn(returnHref);
  if (context) query.set("activityReturn", context);
  return "/admin/searches/" + encodeURIComponent(searchHistoryId) + "?" + query;
}
