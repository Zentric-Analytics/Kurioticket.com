import definitions from "../../config/activity-tracking/definitions.json";
import type { ActivityEnvironment, ActivityOccurrence, ActivityPlatform } from "@/lib/activityTrackingContract";

const canonicalPageTemplates = new Set(definitions.routes.admin.deferred.map(
  (source) => source.replace(/^src\/app/, "").replace(/\/page\.[jt]sx?$/, ""),
));
const workspaceSections: readonly string[] = definitions.adminBehavioralSections.workspace;
const pageSections: Readonly<Record<string, readonly string[]>> = definitions.adminBehavioralSections.routes;

export function adminBehavioralDestinationKey(routeTemplate: string, section?: string): string | null {
  if (!canonicalPageTemplates.has(routeTemplate)) return null;
  if (section === undefined) return routeTemplate;
  if (workspaceSections.includes(section) || pageSections[routeTemplate]?.includes(section)) {
    return `${routeTemplate}#${section}`;
  }
  return null;
}

type AdminBehavioralNavigation = ActivityOccurrence & {
  actor: { identity: "administrator"; userId: string };
  interface: "admin";
  category: "page_visit" | "section_visit";
  platform: Extract<ActivityPlatform, "desktop_web" | "mobile_web">;
  destinationKey: string;
};

type VerifiedAdminBehavioralScope = {
  actorUserId: string;
  accountSessionId: string;
  environment: ActivityEnvironment;
  platform: AdminBehavioralNavigation["platform"];
  approval: {
    status: "approved";
    purpose: "admin_workspace_navigation";
    noticeReference: string;
    viewerPermission: string;
    retentionPolicyReference: string;
    destinationKeys: ReadonlySet<string>;
  };
};

type CommittedAdminDestination = {
  occurrenceId: string;
  routeTemplate: string;
  section?: string;
  /** From the verified Admin context at commitment. Kept out of the event. */
  accountSessionIdAtOccurrence: string;
};

/** This service has no live producer, permission adapter or storage adapter.
 * A later server integration must resolve the scope through authenticated Admin
 * access and an approved employee policy. Customer consent cannot supply it.
 */
export function createAdminBehavioralNavigationRecorder(dependencies: {
  resolveVerifiedScope?: () => Promise<VerifiedAdminBehavioralScope | null>;
  /** An adapter must append atomically or acknowledge a same-occurrence replay. */
  appendOnce: (event: AdminBehavioralNavigation) => Promise<"recorded" | "duplicate">;
}) {
  return async function recordCommittedDestination(destination: CommittedAdminDestination) {
    const scope = await dependencies.resolveVerifiedScope?.();
    if (!scope || scope.accountSessionId !== destination.accountSessionIdAtOccurrence) return "disabled";
    const approval = scope.approval;
    if (approval.status !== "approved" || approval.purpose !== "admin_workspace_navigation"
      || !approval.noticeReference.trim() || !approval.viewerPermission.trim() || !approval.retentionPolicyReference.trim()) return "disabled";

    const key = adminBehavioralDestinationKey(destination.routeTemplate, destination.section);
    if (key === null || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(destination.occurrenceId)) return "invalid";
    if (!approval.destinationKeys.has(key)) return "disabled";

    return dependencies.appendOnce({
      actor: { identity: "administrator", userId: scope.actorUserId },
      interface: "admin",
      platform: scope.platform,
      category: destination.section === undefined ? "page_visit" : "section_visit",
      environment: scope.environment,
      occurrenceId: destination.occurrenceId.toLowerCase(),
      destinationKey: key,
    });
  };
}
