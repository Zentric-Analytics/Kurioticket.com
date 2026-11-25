export const PLATFORM_ACCESS_PAGE_SIZE = 20;
export type PlatformAccessRange = "today" | "7d" | "30d" | "all";
export type PlatformAccessFilter = "all" | "web" | "ios" | "android" | "other";
export type PlatformAccessQuery = { range: PlatformAccessRange; platform: PlatformAccessFilter; page: number };

export function parsePlatformAccessQuery(raw: Record<string, string | string[] | undefined>): PlatformAccessQuery | null {
  if (Object.values(raw).some(Array.isArray)) return null;
  const range = raw.range ?? "today";
  const platform = raw.platform ?? "all";
  const page = raw.page ?? "1";
  if (!["today", "7d", "30d", "all"].includes(String(range))
    || !["all", "web", "ios", "android", "other"].includes(String(platform))
    || typeof page !== "string" || !/^[1-9]\d{0,5}$/.test(page)) return null;
  return { range: range as PlatformAccessRange, platform: platform as PlatformAccessFilter, page: Number(page) };
}

export function platformAccessHref(query: PlatformAccessQuery, page: number) {
  return "/admin/platforms/devices?" + new URLSearchParams({
    range: query.range, platform: query.platform, page: String(page),
  });
}
