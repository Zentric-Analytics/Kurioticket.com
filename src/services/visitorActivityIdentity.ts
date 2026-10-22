import type { Prisma, User } from "@/generated/prisma/client";

export type LockedVisitorAccount = Pick<User, "id" | "email" | "role" | "status" | "emailVerified">;

/** Keep account -> visitor ordering across claims, activity writes and retirement. */
export async function lockVisitorAccount(tx: Prisma.TransactionClient, userId: string): Promise<LockedVisitorAccount | null> {
  // NO KEY UPDATE serialises lifecycle changes while permitting an older
  // in-flight activity transaction to finish its account foreign-key check.
  const accounts = await tx.$queryRaw<LockedVisitorAccount[]>`
    SELECT "id", "email", "role", "status", "emailVerified"
    FROM "User" WHERE "id" = ${userId} FOR NO KEY UPDATE
  `;
  return accounts[0] ?? null;
}

export function isEligibleVisitorAccount(account: LockedVisitorAccount | null) {
  return Boolean(account && account.status === "ACTIVE" && account.emailVerified !== null);
}

/** Only the one-way hash, never its browser/native credential, enters SQL. */
export async function lockVisitorCredential(tx: Prisma.TransactionClient, tokenHash: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('visitor-identity'), hashtext(${tokenHash}))`;
}

/** Hold these locks until the consented activity has been written in this transaction. */
export async function lockConsentedVisitor(tx: Prisma.TransactionClient, visitorId: string, userId: string | null): Promise<boolean> {
  if (userId && !isEligibleVisitorAccount(await lockVisitorAccount(tx, userId))) return false;

  await tx.$queryRaw`SELECT "id" FROM "Visitor" WHERE "id" = ${visitorId} FOR UPDATE`;
  const visitor = await tx.visitor.findUnique({
    where: { id: visitorId },
    select: { currentUserId: true, consentStatus: true, trackingDisabledAt: true, identityLinks: { select: { userId: true } } },
  });
  return Boolean(visitor
    && visitor.consentStatus === "GRANTED" && visitor.trackingDisabledAt === null
    && (!visitor.currentUserId || visitor.currentUserId === userId)
    && visitor.identityLinks.every(link => link.userId === userId));
}
