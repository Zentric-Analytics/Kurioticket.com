import "server-only";

import { getOptionalPrisma } from "@/lib/prisma";
import { hashVisitorToken } from "@/lib/visitor-identity";

type IdentityLinkSource = "SIGN_IN" | "SIGN_UP" | "ACCOUNT_API";

export async function registerAnalyticsVisitor(input: {
  token: string;
  policyVersion?: string;
}) {
  const db = getOptionalPrisma();
  if (!db) return null;

  const tokenHash = hashVisitorToken(input.token);
  const now = new Date();

  return db.$transaction(async (tx) => {
    const visitor = await tx.visitor.upsert({
      where: { tokenHash },
      create: {
        tokenHash,
        consentStatus: "GRANTED",
        firstSeenAt: now,
        lastSeenAt: now,
        consentRecords: {
          create: {
            purpose: "ANALYTICS",
            status: "GRANTED",
            policyVersion: input.policyVersion,
          },
        },
      },
      update: {
        consentStatus: "GRANTED",
        lastSeenAt: now,
        trackingDisabledAt: null,
      },
      select: { id: true },
    });

    return visitor;
  });
}

export async function resolveConsentedVisitorId(token: string | null | undefined) {
  if (!token) return null;
  const db = getOptionalPrisma();
  if (!db) return null;

  const visitor = await db.visitor.findFirst({
    where: {
      tokenHash: hashVisitorToken(token),
      consentStatus: "GRANTED",
      trackingDisabledAt: null,
    },
    select: { id: true },
  });

  if (!visitor) return null;

  await db.visitor.update({
    where: { id: visitor.id },
    data: { lastSeenAt: new Date() },
  });

  return visitor.id;
}

export async function linkVisitorToUser(input: {
  token: string | null | undefined;
  userId: string;
  source: IdentityLinkSource;
}) {
  if (!input.token) return null;
  const db = getOptionalPrisma();
  if (!db) return null;

  const visitor = await db.visitor.findFirst({
    where: {
      tokenHash: hashVisitorToken(input.token),
      consentStatus: "GRANTED",
      trackingDisabledAt: null,
    },
    select: { id: true },
  });

  if (!visitor) return null;

  await db.$transaction([
    db.visitor.update({
      where: { id: visitor.id },
      data: { currentUserId: input.userId, lastSeenAt: new Date() },
    }),
    db.visitorIdentityLink.upsert({
      where: {
        visitorId_userId: {
          visitorId: visitor.id,
          userId: input.userId,
        },
      },
      create: {
        visitorId: visitor.id,
        userId: input.userId,
        source: input.source,
      },
      update: {},
    }),
  ]);

  return visitor.id;
}

export async function withdrawAnalyticsConsent(token: string | null | undefined) {
  if (!token) return false;
  const db = getOptionalPrisma();
  if (!db) return false;

  const visitor = await db.visitor.findFirst({
    where: { tokenHash: hashVisitorToken(token) },
    select: { id: true },
  });
  if (!visitor) return false;

  const now = new Date();
  await db.$transaction([
    db.visitor.update({
      where: { id: visitor.id },
      data: {
        consentStatus: "WITHDRAWN",
        trackingDisabledAt: now,
        currentUserId: null,
      },
    }),
    db.visitorIdentityLink.deleteMany({ where: { visitorId: visitor.id } }),
    db.visitorConsent.create({
      data: {
        visitorId: visitor.id,
        purpose: "ANALYTICS",
        status: "WITHDRAWN",
      },
    }),
  ]);

  return true;
}
