import type { Prisma } from "@/generated/prisma/client";
import type { PageHistoryPlatform } from "./adminPageHistory";

export type RecordedDevicePlatform = Exclude<PageHistoryPlatform, "all"> | "web" | "native" | "unknown";
export const recordedDevicePlatformLabels: Record<RecordedDevicePlatform, string> = {
  ios: "iOS app", android: "Android app", desktop: "Desktop web", mobile: "Mobile web",
  web: "Website", native: "Mobile app", unknown: "Unknown",
};
const mobileParts = ["iPhone", "iPad", "Android"];
const desktopParts = ["computer"];
const desktopSuffix = "Mac";

export function accountDevicePlatform(session: { client: string; platform: string | null; deviceLabel: string | null }): RecordedDevicePlatform {
  if (session.client === "MOBILE") return session.platform === "ios" || session.platform === "android" ? session.platform : "native";
  if (session.client !== "WEB") return "unknown";
  const label = session.deviceLabel ?? "";
  if (label === "Mobile device" || mobileParts.some(part => label.includes(part))) return "mobile";
  if (label === "Desktop device" || desktopParts.some(part => label.includes(part)) || label.endsWith(desktopSuffix)) return "desktop";
  return "web";
}

/** Same rules as the displayed platform; missing device class stays unknown. */
export function accountDevicePlatformWhere(platform?: PageHistoryPlatform): Prisma.AccountSessionWhereInput {
  const mobile: Prisma.AccountSessionWhereInput = { OR: [{ deviceLabel: "Mobile device" }, ...mobileParts.map(part => ({ deviceLabel: { contains: part } }))] };
  if (platform === "ios" || platform === "android") return { client: "MOBILE", platform };
  if (platform === "mobile") return { client: "WEB", ...mobile };
  if (platform === "desktop") return { client: "WEB", AND: [
    { OR: [{ deviceLabel: "Desktop device" }, ...desktopParts.map(part => ({ deviceLabel: { contains: part } })), { deviceLabel: { endsWith: desktopSuffix } }] },
    { NOT: mobile },
  ] };
  return {};
}

export function pageViewDevicePlatform(platform: unknown, transport: unknown): RecordedDevicePlatform {
  if (transport === "native") {
    if (platform === "iOS app" || platform === "iOS app (reported)") return "ios";
    if (platform === "Android app" || platform === "Android app (reported)") return "android";
    return "native";
  }
  if (transport === "web") {
    if (platform === "Mobile web" || platform === "Mobile web (reported)") return "mobile";
    if (platform === "Desktop web" || platform === "Desktop web (reported)") return "desktop";
    return "web";
  }
  return "unknown";
}
