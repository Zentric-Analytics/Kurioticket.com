import type { ActivityRow } from "./adminIdentityJourney";
import { pageViewInfo, publicPageViewPath } from "./pageViewCatalog";

/** Project only closed catalogue values. Raw metadata and private URLs never
 * enter the admin view. The stored page ID is not a customer-provided link. */
export function toAdminPageView(event: { id: string; createdAt: Date; metadata: unknown }, environment: "staging" | "production"): ActivityRow | null {
  const meta = event.metadata;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const item = meta as Record<string, unknown>;
  const page = pageViewInfo(item.pageKey);
  if (!page || (item.transport !== "web" && item.transport !== "native") || item.environment !== environment) return null;
  const transport = item.transport;
  const previous = pageViewInfo(item.previousPageKey);
  const path = transport === "web" ? page.webPath : page.nativePath;
  const previousPath = previous ? transport === "web" ? previous.webPath : previous.nativePath : null;
  const platform = ["iOS app", "Android app", "iOS app (reported)", "Android app (reported)", "Native app", "Mobile web (reported)", "Website", "Desktop web (reported)"].find(value => value === item.platform) ?? "Unknown";
  const safePath = transport === "web" ? publicPageViewPath(item.pageKey) : null;
  return { id: "e-" + event.id, stage: "PAGE_VIEW", label: page.label, detail: [path, platform].join(" · "), product: page.product, at: event.createdAt,
    pageView: { path, previousPath, transport, platform,
      href: safePath ? (environment === "staging" ? "https://staging.kurioticket.com" : "https://kurioticket.com") + safePath : null } };
}
