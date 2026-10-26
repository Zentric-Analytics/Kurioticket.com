import type { Prisma } from "@/generated/prisma/client";
import { lockVisitorCredential } from "@/services/visitorActivityIdentity";

export type DisableGuestTrackingResult = "disabled" | "not_found" | "not_eligible" | "already_disabled";

type AdminActor = {
  userId: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
};

/**
 * An Admin may stop tracking one independent, consented guest visitor.
 * This does NOT erase history or delete the visitor; the revocation stays
 * durable and the browser/native client must opt in under a new identity.
 *
 * Run in a transaction. The credential advisory lock and visitor row lock
 * follow the same ordering as visitor-consent withdrawal/attributed writes.
 * The audit and consent evidence must commit with the status change.
 */
export async function disableGuestTrackingAsAdmin(
  tx: Prisma.TransactionClient,
  visitorId: string,
  actor: AdminActor,
  now = new Date(),
  lockCredential: typeof lockVisitorCredential = lockVisitorCredential,
): Promise<DisableGuestTrackingResult> {
  const credential = await tx.visitor.findUnique({
    where: { id: visitorId },
    select: { tokenHash: true },
  });
  if (!credential) return "not_found";

  await lockCredential(tx, credential.tokenHash);
  await tx.$queryRaw`SELECT "id" FROM "Visitor" WHERE "id" = ${visitorId} FOR UPDATE`;

  const visitor = await tx.visitor.findUnique({
    where: { id: visitorId },
    select: {
      consentStatus: true,
      trackingDisabledAt: true,
      currentUserId: true,
      identityLinks: { select: { userId: true } },
    },
  });
  if (!visitor) return "not_found";
  // Never accidentally revoke consent/ownership for a registered account's
  // linked device. It must be managed through the account's privacy workflow.
  if (visitor.currentUserId || visitor.identityLinks.length) return "not_eligible";
  if (visitor.consentStatus === "WITHDRAWN" || visitor.trackingDisabledAt !== null) return "already_disabled";
  if (visitor.consentStatus !== "GRANTED") return "not_eligible";

  const changed = await tx.visitor.updateMany({
    where: {
      id: visitorId,
      consentStatus: "GRANTED",
      trackingDisabledAt: null,
      currentUserId: null,
      identityLinks: { none: {} },
    },
    data: { consentStatus: "WITHDRAWN", trackingDisabledAt: now },
  });
  if (changed.count !== 1) return "not_eligible";

  await tx.visitorConsent.create({
    data: { visitorId, purpose: "ANALYTICS", status: "WITHDRAWN", recordedAt: now },
  });
  await tx.adminAuditLog.create({
    data: {
      adminUserId: actor.userId,
      adminEmail: actor.email.toLowerCase(),
      action: "GUEST_TRACKING_DISABLED",
      targetType: "Visitor",
      targetId: visitorId,
      metadata: { previousStatus: "GRANTED", nextStatus: "WITHDRAWN", initiatedBy: "ADMIN" },
      ...(actor.ipAddress ? { ipAddress: actor.ipAddress } : {}),
      ...(actor.userAgent ? { userAgent: actor.userAgent } : {}),
    },
  });
  return "disabled";
}
