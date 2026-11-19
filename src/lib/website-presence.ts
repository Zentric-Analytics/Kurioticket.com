export const websitePresenceWindowSeconds = 90;
export const websitePresenceHeartbeatMs = 25_000;

export type EligiblePresenceVisitor = {
  currentUserId: string | null;
  consentStatus: string;
  trackingDisabledAt: Date | null;
  identityLinks: ReadonlyArray<{ userId: string }>;
};

/** A current browser account must match its consented visitor's durable identity link. */
export function mayRecordWebsitePresence(visitor: EligiblePresenceVisitor | null, authenticatedUserId: string | null) {
  if (!visitor || visitor.consentStatus !== "GRANTED" || visitor.trackingDisabledAt !== null) return false;
  if (authenticatedUserId === null) {
    return visitor.currentUserId === null && visitor.identityLinks.length === 0;
  }
  return visitor.currentUserId === authenticatedUserId
    && visitor.identityLinks.length === 1
    && visitor.identityLinks[0].userId === authenticatedUserId;
}

/** Only the public website contributes; native screens and admin pages do not. */
export function isPublicWebsitePresenceRoute(pathname: string | null) {
  if (!pathname || !pathname.startsWith("/")) return false;
  return !["/admin", "/api", "/mobile"].some(prefix => pathname === prefix || pathname.startsWith(prefix + "/"));
}

export function checkedPresenceCount(value: number | bigint) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("Invalid website presence aggregate.");
  return n;
}
