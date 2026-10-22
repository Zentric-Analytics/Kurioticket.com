import type { Prisma } from "@/generated/prisma/client";
import { lockVisitorAccount, lockVisitorCredential } from "@/services/visitorActivityIdentity";

/**
 * Retire credentials before User foreign keys are cleared by permanent deletion.
 * Historical activity and consent evidence are retained, not silently purged.
 * Call in the same transaction as user.delete so a failed deletion rolls back
 * retirement too. Claims and attributed writes take this account lock first.
 */
export async function retireAccountVisitors(tx: Prisma.TransactionClient, userId: string, now = new Date()) {
  const account = await lockVisitorAccount(tx, userId);
  if (!account) return { visitorsRetired: 0 };
  if (account.status !== "DELETED") throw new Error("Visitor retirement requires a deleted account.");

  const associated = await tx.visitor.findMany({
    where: { OR: [
      { currentUserId: userId },
      { identityLinks: { some: { userId } } },
      // Signed-in activity may precede the browser/native merge request.
      { searchHistory: { some: { userId } } },
      { redirectLogs: { some: { userId } } },
      { analyticsEvents: { some: { userId } } },
    ] },
    select: { id: true, tokenHash: true },
    orderBy: { id: "asc" },
  });

  let visitorsRetired = 0;
  for (const associatedVisitor of associated) {
    // Match explicit grant/withdrawal ordering as well as activity row locking.
    await lockVisitorCredential(tx, associatedVisitor.tokenHash);
    await tx.$queryRaw`SELECT "id" FROM "Visitor" WHERE "id" = ${associatedVisitor.id} FOR UPDATE`;
    const visitor = await tx.visitor.findUnique({
      where: { id: associatedVisitor.id },
      select: { currentUserId: true, consentStatus: true, trackingDisabledAt: true, identityLinks: { select: { userId: true } } },
    });
    if (!visitor || (visitor.consentStatus === "WITHDRAWN" && visitor.trackingDisabledAt !== null
      && visitor.currentUserId === null && visitor.identityLinks.length === 0)) continue;

    await tx.visitor.update({
      where: { id: associatedVisitor.id },
      data: {
        consentStatus: "WITHDRAWN",
        trackingDisabledAt: visitor.trackingDisabledAt ?? now,
        currentUserId: null,
      },
    });
    await tx.visitorIdentityLink.deleteMany({ where: { visitorId: associatedVisitor.id } });
    if (visitor.consentStatus !== "WITHDRAWN") {
      await tx.visitorConsent.create({ data: {
        visitorId: associatedVisitor.id,
        purpose: "ANALYTICS",
        status: "WITHDRAWN",
        recordedAt: now,
      } });
    }
    visitorsRetired += 1;
  }
  return { visitorsRetired };
}
