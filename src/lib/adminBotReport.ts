import { adminCustomDateRange, ADMIN_REPORTING_RANGE_OPTIONS, adminRollingRange } from "./adminReportingRanges";
import { knownCrawler, recognizedCrawler } from "./botRegistry";

export const BOT_DIRECTORY = "/admin/users/bots";
export const BOT_PAGE_SIZE = 25;
export const BOT_GROUPS = [
  { value: "", label: "All" },
  { value: "SEARCH_ENGINE", label: "Search engines" },
  { value: "OTHER_RECOGNIZED", label: "Other Recognized" },
  { value: "UNKNOWN", label: "Unknown" },
] as const;
export const BOT_KINDS = [
  { value: "PAGE", label: "Page requests" },
  { value: "API", label: "API requests" },
  { value: "RESOURCE", label: "Resource requests" },
  { value: "SEARCH_ATTEMPT", label: "Search attempts" },
  { value: "HISTORICAL_SEARCH", label: "Historical searches" },
] as const;
export const BOT_DECISIONS = [
  { value: "ALLOWED", label: "Allowed" },
  { value: "DENIED", label: "Denied" },
  { value: "RATE_LIMITED", label: "Rate-limited" },
  { value: "PENDING", label: "Pending" },
] as const;

export type BotQuery = Record<string, string | string[] | undefined>;
type BotRange = (typeof ADMIN_REPORTING_RANGE_OPTIONS)[number]["value"];

function option<T extends string>(options: readonly { value: T }[], value: unknown) {
  return options.find(item => item.value === value)?.value;
}

export function botFilters(raw: BotQuery, defaultRange: BotRange = "today", now = new Date()) {
  const range = option(ADMIN_REPORTING_RANGE_OPTIONS, raw.range) ?? defaultRange;
  const from = range === "custom" && typeof raw.from === "string" ? raw.from.slice(0, 10) : "";
  const to = range === "custom" && typeof raw.to === "string" ? raw.to.slice(0, 10) : "";
  const query = typeof raw.q === "string" ? raw.q.trim().slice(0, 100) : "";
  const page = typeof raw.page === "string" && /^[1-9]\d{0,8}$/.test(raw.page) ? Number(raw.page) : 1;
  const group = option(BOT_GROUPS, raw.group) ?? "";
  const kind = option(BOT_KINDS, raw.kind);
  const decision = option(BOT_DECISIONS, raw.decision);
  const rolling = range === "today" || range === "7d" || range === "30d" ? adminRollingRange(range, now, "UTC") : null;
  const window = rolling ? { from: new Date(rolling.from), to: new Date(rolling.to) }
    : range === "custom" ? adminCustomDateRange(from, to, now, "UTC") : undefined;
  return { range, from, to, query, page, group, kind, decision, window };
}

export function botDirectoryHref(filters: ReturnType<typeof botFilters>) {
  return botHref(BOT_DIRECTORY, new URLSearchParams(), {
    range: filters.range, from: filters.from, to: filters.to, q: filters.query, group: filters.group,
    page: filters.page > 1 ? String(filters.page) : "",
  });
}

export function botHref(path: string, current: URLSearchParams, changes: Record<string, string>) {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  return params.size ? path + "?" + params.toString() : path;
}

type BotIdentity = { group: string; name: string | null; identityKey?: string };

function declaredToken(bot: BotIdentity) {
  return bot.name ?? (bot.identityKey?.startsWith("UNKNOWN:") ? bot.identityKey.slice("UNKNOWN:".length) : null);
}

export function botName(bot: BotIdentity) {
  if (bot.group !== "UNKNOWN") return knownCrawler(bot.name)?.agent ?? bot.name ?? "Unnamed bot";
  const token = declaredToken(bot);
  if (!token || token === "UNATTRIBUTED") return "Unknown bot";
  return knownCrawler(token)?.agent ?? (/^[A-Z0-9_-]{2,48}(?:BOT|CRAWLER|SPIDER)$/.test(token) ? token : "Unknown bot");
}

/** Keep the full registry ID for navigation and details, not the directory subtitle. */
export function botDirectorySubtitle(bot: { id: string; group: string; owner: string | null }) {
  return bot.group !== "UNKNOWN" && bot.owner ? bot.owner : "Ref: " + bot.id.slice(0, 8);
}

export function botVerification(value: string) {
  return value === "DECLARED" ? "Unverified (self-declared)" : botLabel(value);
}

export function botType(bot: BotIdentity & { category: string | null }) {
  const token = declaredToken(bot);
  const category = recognizedCrawler(token)?.category
    ?? (bot.group === "UNKNOWN" ? null : bot.category);
  const labels: Record<string, string> = {
    search: "Search engine", ai: "AI crawler & retrieval", social: "Social media & Meta",
    google: "Google additional services", seo: "SEO tools", archive: "Archiving", association: "App site association",
  };
  return category ? labels[category] ?? "Unknown" : "Unknown";
}

/** Historical registry entries are not proof of a verified current caller. */
export function botRecordedVerification(bot: { verification: string; requests: bigint }) {
  return bot.verification === "VERIFIED" && bot.requests === BigInt(0)
    ? "Verified (historical searches)" : botVerification(bot.verification);
}

export function botRecordedAccess(bot: { access: string; requests: bigint }) {
  return bot.requests === BigInt(0) ? "Historical record" : botAccessLabel(bot.access);
}

export function botAccessLabel(access: string) {
  return access === "CRAWL_AND_LIMITED_SEARCH" ? "Crawl & limited search"
    : access === "CRAWL_ONLY" ? "Crawl only" : access === "BLOCKED" ? "Blocked" : "Not recorded";
}

export function botLabel(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
}

const utcFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC", day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

export function botTime(value: Date | null | undefined) {
  return value ? utcFormat.format(value) : "Not recorded";
}

const utcDirectoryFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC", day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/** Minute precision is presentation-only; activity evidence retains seconds. */
export function botDirectoryTime(value: Date | null | undefined) {
  return value ? utcDirectoryFormat.format(value) : "Not recorded";
}
