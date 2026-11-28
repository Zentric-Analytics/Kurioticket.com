import { customerPageProvenance } from "./activityTrackingContract";
import type { ActivityRow } from "./adminIdentityJourney";
import { pageViewInfo, publicPageViewPath } from "./pageViewCatalog";

/** Display names only: reported and session-attributed platforms share the
 * same label in admin records. The original stored metadata is untouched. */
function platformDisplayName(value: unknown): string {
  switch (value) {
    case "iOS app":
    case "iOS app (reported)": return "iOS app";
    case "Android app":
    case "Android app (reported)": return "Android app";
    case "Mobile web":
    case "Mobile web (reported)": return "Mobile web";
    case "Desktop web":
    case "Desktop web (reported)": return "Desktop web";
    case "Native app": return "Native app";
    case "Website": return "Website";
    default: return "Unknown";
  }
}

/** Project only closed catalogue values. Raw metadata and private URLs never
 * enter the admin view. The stored page ID is not a customer-provided link. */
export function toAdminPageView(event: { id: string; createdAt: Date; metadata: unknown; userId?: string | null }, environment: "staging" | "production"): ActivityRow | null {
  const meta = event.metadata;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const item = meta as Record<string, unknown>;
  const page = pageViewInfo(item.pageKey);
  if (!page || (item.transport !== "web" && item.transport !== "native") || item.environment !== environment) return null;
  const transport = item.transport;
  const previous = pageViewInfo(item.previousPageKey);
  const path = transport === "web" ? page.webPath : page.nativePath;
  if (!path) return null;
  const previousPath = previous ? transport === "web" ? previous.webPath : previous.nativePath : null;
  const platform = platformDisplayName(item.platform);
  const safePath = transport === "web" ? publicPageViewPath(item.pageKey) : null;
  // Prefer the server-recorded marker. For rows created before that marker,
  // use the original event's stored userId, never the current Visitor owner.
  const originalIdentity = item.originalIdentity === "guest" || item.originalIdentity === "registered"
    ? item.originalIdentity
    : event.userId === undefined ? undefined : customerPageProvenance(event.userId).originalIdentity;
  return { id: "e-" + event.id, stage: "PAGE_VIEW", interface: "customer", originalIdentity,
    label: page.label, detail: [path, platform].join(" · "), product: page.product, at: event.createdAt,
    pageView: { path, previousPath, transport, platform, interface: "customer", originalIdentity,
      href: safePath ? (environment === "staging" ? "https://staging.kurioticket.com" : "https://kurioticket.com") + safePath : null } };
}
