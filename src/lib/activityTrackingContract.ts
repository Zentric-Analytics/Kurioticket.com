/** Shared vocabulary for activity definitions. Definitions never enable collection. */
export type ActivityInterface = "admin" | "customer";
export type ActivityPlatform = "desktop_web" | "mobile_web" | "ios" | "android";
export type ActivityCategory =
  | "page_visit" | "section_visit" | "interaction" | "business_action"
  | "administrative_action" | "security_audit" | "device_access";
export type ActivityOutcome = "succeeded" | "rejected" | "failed";
export type ActivityEnvironment = "staging" | "production";
export type ActivityIdentityAtOccurrence = "administrator" | "registered" | "guest";
export const optionalAnalyticsPurpose = "optional_analytics";
export const essentialAccountAuditPurpose = "essential_account_audit";

/** Principal and target are distinct. Callers supply a verified server account
 * or eligible Visitor. A route parameter can only describe a separate target. */
export type ActivityActor =
  | { identity: "administrator" | "registered"; userId: string }
  | { identity: "guest"; visitorId: string };

export type ActivityOccurrence = {
  actor: ActivityActor;
  interface: ActivityInterface;
  platform: ActivityPlatform;
  category: ActivityCategory;
  environment: ActivityEnvironment;
  /** Scoped to the verified initiating identity/context. Stable across retries. */
  occurrenceId: string;
  /** Approved catalogue keys, with provenance supplied by the capture adapter. */
  destinationKey?: string;
  previousKey?: string;
  outcome?: ActivityOutcome;
  /** Server-verified association only. */
  association?: { searchHistoryId: string; journeyId: string };
};

export function customerPageProvenance(userId: string | null) {
  return {
    interface: "customer",
    originalIdentity: userId === null ? "guest" : "registered",
  } as const;
}
