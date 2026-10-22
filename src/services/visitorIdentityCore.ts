import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { createVisitorToken, hashVisitorToken, isVisitorToken } from "@/lib/visitor-identity";

export type IdentityLinkSource = "SIGN_IN" | "SIGN_UP" | "ACCOUNT_API";
export type VisitorIdentityDatabase = Pick<PrismaClient, "$transaction" | "visitor">;

const identitySelect = {
  id: true,
  currentUserId: true,
  consentStatus: true,
  trackingDisabledAt: true,
  identityLinks: { select: { userId: true } },
  consentRecords: {
    orderBy: { recordedAt: "desc" },
    take: 1,
    select: { policyVersion: true },
  },
} as const;
type Identity = Prisma.VisitorGetPayload<{ select: typeof identitySelect }>;

function hasConsent(visitor: Identity) {
  return visitor.consentStatus === "GRANTED" && visitor.trackingDisabledAt === null;
}

function belongsToContext(visitor: Identity, userId: string | null) {
  return (!visitor.currentUserId || visitor.currentUserId === userId)
    && visitor.identityLinks.every(link => link.userId === userId);
}

function contextWhere(userId: string | null): Prisma.VisitorWhereInput {
  return userId
    ? { OR: [{ currentUserId: null }, { currentUserId: userId }], identityLinks: { none: { userId: { not: userId } } } }
    : { currentUserId: null, identityLinks: { none: {} } };
}

async function lockVisitor(tx: Prisma.TransactionClient, tokenHash: string) {
  // Serialise consent, claim and withdrawal for one identity. Only the hash reaches SQL.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('visitor-identity'), hashtext(${tokenHash}))`;
}

async function createVisitor(tx: Prisma.TransactionClient, policyVersion?: string) {
  const token = createVisitorToken();
  const visitor = await tx.visitor.create({
    data: {
      tokenHash: hashVisitorToken(token),
      consentStatus: "GRANTED",
      consentRecords: { create: { purpose: "ANALYTICS", status: "GRANTED", policyVersion } },
    },
    select: { id: true },
  });
  return { id: visitor.id, token, created: true };
}

async function claimVisitor(tx: Prisma.TransactionClient, id: string, userId: string, source: IdentityLinkSource) {
  // A conditional database write also protects against legacy or concurrent writers.
  const claimed = await tx.visitor.updateMany({
    where: { id, consentStatus: "GRANTED", trackingDisabledAt: null, ...contextWhere(userId) },
    data: { currentUserId: userId, lastSeenAt: new Date() },
  });
  if (claimed.count !== 1) return false;
  await tx.visitorIdentityLink.upsert({
    where: { visitorId_userId: { visitorId: id, userId } },
    create: { visitorId: id, userId, source },
    update: {},
  });
  return true;
}

/** Dependency injection keeps lifecycle tests on the same transactional implementation. */
export function createVisitorIdentityService(getDatabase: () => VisitorIdentityDatabase | null) {
  function requiredDatabase() {
    const db = getDatabase();
    if (!db) throw new Error("Visitor identity storage unavailable.");
    return db;
  }

  async function registerAnalyticsVisitor(input: { token?: string | null; userId?: string | null; policyVersion?: string }) {
    const db = requiredDatabase();
    return db.$transaction(async tx => {
      if (isVisitorToken(input.token)) {
        const tokenHash = hashVisitorToken(input.token);
        await lockVisitor(tx, tokenHash);
        const visitor = await tx.visitor.findUnique({ where: { tokenHash }, select: identitySelect });
        if (visitor && hasConsent(visitor) && belongsToContext(visitor, input.userId ?? null)) {
          // Repeated synchronisation is not a new grant. Record only an explicit policy change.
          if (input.policyVersion && input.policyVersion !== visitor.consentRecords[0]?.policyVersion) {
            await tx.visitorConsent.create({ data: { visitorId: visitor.id, purpose: "ANALYTICS", status: "GRANTED", policyVersion: input.policyVersion } });
          }
          return { id: visitor.id, token: input.token, created: false };
        }
      }
      // Never revive withdrawn identities or transfer an account's browser history.
      // Unknown client-supplied tokens are replaced with server-generated randomness too.
      return createVisitor(tx, input.policyVersion);
    });
  }

  async function getAnalyticsVisitorStatus(token: string | null | undefined, userId: string | null = null) {
    if (!isVisitorToken(token)) return { analyticsTracking: "disabled" as const, linked: false };
    const visitor = await requiredDatabase().visitor.findUnique({ where: { tokenHash: hashVisitorToken(token) }, select: identitySelect });
    const enabled = Boolean(visitor && hasConsent(visitor) && belongsToContext(visitor, userId));
    return { analyticsTracking: enabled ? "enabled" as const : "disabled" as const, linked: Boolean(enabled && visitor?.currentUserId === userId && userId) };
  }

  async function resolveConsentedVisitorId(token: string | null | undefined, userId: string | null = null) {
    if (!isVisitorToken(token)) return null;
    const db = getDatabase();
    if (!db) return null;
    try {
      const where = { tokenHash: hashVisitorToken(token), consentStatus: "GRANTED" as const, trackingDisabledAt: null, ...contextWhere(userId) };
      const visitor = await db.visitor.findFirst({ where, select: { id: true } });
      if (!visitor) return null;
      const updated = await db.visitor.updateMany({ where: { id: visitor.id, ...where }, data: { lastSeenAt: new Date() } });
      return updated.count === 1 ? visitor.id : null;
    } catch {
      // Analytics must not break a search or handoff, or log raw credentials/database payloads.
      return null;
    }
  }

  async function linkVisitorToUser(input: { token: string | null | undefined; userId: string; source: IdentityLinkSource }) {
    if (!isVisitorToken(input.token) || !input.userId) return null;
    return requiredDatabase().$transaction(async tx => {
      const tokenHash = hashVisitorToken(input.token!);
      await lockVisitor(tx, tokenHash);
      const visitor = await tx.visitor.findUnique({ where: { tokenHash }, select: identitySelect });
      if (!visitor || !hasConsent(visitor) || !belongsToContext(visitor, input.userId)) return null;
      return await claimVisitor(tx, visitor.id, input.userId, input.source) ? visitor.id : null;
    });
  }

  async function mergeAnalyticsVisitor(input: { token: string | null | undefined; userId: string; source: IdentityLinkSource }) {
    if (!isVisitorToken(input.token) || !input.userId) return null;
    return requiredDatabase().$transaction(async tx => {
      const tokenHash = hashVisitorToken(input.token!);
      await lockVisitor(tx, tokenHash);
      const visitor = await tx.visitor.findUnique({ where: { tokenHash }, select: identitySelect });
      if (!visitor || !hasConsent(visitor)) return null;
      // Carry the still-granted device choice to a fresh identity on an account switch.
      const target = belongsToContext(visitor, input.userId)
        ? { id: visitor.id, token: input.token!, created: false }
        : await createVisitor(tx, visitor.consentRecords[0]?.policyVersion ?? undefined);
      if (!(await claimVisitor(tx, target.id, input.userId, input.source))) throw new Error("Visitor identity changed.");
      return target;
    });
  }

  async function withdrawAnalyticsConsent(token: string | null | undefined) {
    if (!isVisitorToken(token)) return true;
    return requiredDatabase().$transaction(async tx => {
      const tokenHash = hashVisitorToken(token);
      await lockVisitor(tx, tokenHash);
      const visitor = await tx.visitor.findUnique({ where: { tokenHash }, select: identitySelect });
      if (!visitor || !hasConsent(visitor)) return true;
      await tx.visitor.update({
        where: { id: visitor.id },
        data: { consentStatus: "WITHDRAWN", trackingDisabledAt: new Date(), currentUserId: null },
      });
      await tx.visitorIdentityLink.deleteMany({ where: { visitorId: visitor.id } });
      await tx.visitorConsent.create({ data: { visitorId: visitor.id, purpose: "ANALYTICS", status: "WITHDRAWN" } });
      return true;
    });
  }

  return { registerAnalyticsVisitor, getAnalyticsVisitorStatus, resolveConsentedVisitorId, linkVisitorToUser, mergeAnalyticsVisitor, withdrawAnalyticsConsent };
}
