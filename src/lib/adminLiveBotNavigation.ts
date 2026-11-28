import { botHref, type BotQuery } from "./adminBotReport";

export const onlineUsersPath = "/admin/users/online";
export const liveBotActivityPath = onlineUsersPath + "/bot-activity";
export const liveBotFilters = [
  { value: "all", label: "All activity" },
  { value: "crawling", label: "Crawling" },
  { value: "searches", label: "Searches" },
] as const;
export type LiveBotFilter = (typeof liveBotFilters)[number]["value"];
export type LiveBotPeriod = "now" | "today";

export function liveBotPeriod(raw: unknown): LiveBotPeriod {
  return raw === "today" ? "today" : "now";
}

export function onlineUsersTabParams(raw: BotQuery) {
  const params = new URLSearchParams();
  for (const key of ["q", "type", "role", "platform", "page"]) {
    const value = raw[key];
    if (typeof value === "string") params.set(key, value);
    if (Array.isArray(value)) value.forEach(entry => params.append(key, entry));
  }
  return params;
}

export function liveBotDirectoryHref(period: LiveBotPeriod, humanFilters = new URLSearchParams()) {
  return botHref(onlineUsersPath, humanFilters, { tab: "active-bot", period });
}
