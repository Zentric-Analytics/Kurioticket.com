import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test, { after, before } from "node:test";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  AccountDeletionFinalizationError,
  createAccountDeletionFinalizer,
  redactedDeletionEmail,
} from "../src/services/accountDeletionFinalizationService";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
assert.equal(target.protocol, "postgresql:");
assert.ok(["localhost", "127.0.0.1"].includes(target.hostname));
assert.equal(target.pathname, "/kurioticket_account_deletion_test");
assert.equal(target.search, "");
assert.equal(target.hash, "");

const setupTarget = new URL(target);
setupTarget.pathname = "/postgres";
let createdDatabase = false;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.href }), log: [] });
const finalizer = createAccountDeletionFinalizer({
  database: () => db,
  protectedAdminEmail: () => false,
});

before(async () => {
  const setup = new Client({ connectionString: setupTarget.href });
  await setup.connect();
  try {
    await setup.query('CREATE DATABASE "kurioticket_account_deletion_test"');
    createdDatabase = true;
  } finally {
    await setup.end();
  }
  execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: target.href },
    stdio: "pipe",
  });
});

after(async () => {
  await db.$disconnect();
  if (!createdDatabase) return;
  const setup = new Client({ connectionString: setupTarget.href });
  await setup.connect();
  try {
    await setup.query('DROP DATABASE "kurioticket_account_deletion_test"');
  } finally {
    await setup.end();
  }
});

test("finalization anonymizes account data while preserving the deletion audit record", async () => {
  const email = `${randomUUID()}@account-deletion.test`;
  const user = await db.user.create({
    data: {
      email,
      emailVerified: new Date("2026-10-01T00:00:00Z"),
      name: "Delete Me",
      passwordHash: "hash",
      status: "PENDING_DELETION",
      profile: { create: { fullName: "Delete Me", phoneNumber: "+10000000000" } },
      customizationPreferences: { create: {} },
      travelPreferences: { create: { homeAirport: "LOS" } },
      securitySettings: { create: {} },
    },
  });
  const visitor = await db.visitor.create({
    data: {
      tokenHash: randomUUID(),
      currentUserId: user.id,
      consentStatus: "GRANTED",
      identityLinks: { create: { userId: user.id, source: "SIGN_IN" } },
    },
  });
  const support = await db.supportTicket.create({
    data: { userId: user.id, email, subject: "Deletion", category: "account_deletion" },
  });
  const request = await db.accountDeletionRequest.create({
    data: {
      userId: user.id,
      email,
      status: "READY_FOR_REVIEW",
      deletionScheduledAt: new Date("2026-10-20T00:00:00Z"),
      supportTicketId: support.id,
      userReason: "contains personal reason",
      reviewNotes: "initial",
    },
  });
  await db.savedSearch.create({
    data: { userId: user.id, type: "HOTEL", query: { city: "Lagos" } },
  });
  await db.notification.create({
    data: { userId: user.id, type: "ACCOUNT_UPDATE", title: "x", body: "y" },
  });
  await db.searchHistory.create({
    data: {
      userId: user.id,
      visitorId: visitor.id,
      type: "HOTEL",
      query: { environment: "staging" },
    },
  });
  await db.redirectLog.create({
    data: {
      userId: user.id,
      visitorId: visitor.id,
      type: "HOTEL",
      provider: "Provider",
      destinationUrl: "https://provider.example",
      userType: "registered",
      sourcePage: "/hotels/results",
    },
  });
  await db.analyticsEvent.create({
    data: { userId: user.id, visitorId: visitor.id, type: "SEARCH", name: "test" },
  });
  await db.verificationToken.create({
    data: {
      identifier: `password-reset:${email.toLowerCase()}`,
      token: randomUUID(),
      expires: new Date("2026-11-01T00:00:00Z"),
    },
  });
  await db.newsletterSubscriber.create({
    data: { email: email.toLowerCase(), status: "SUBSCRIBED", source: "account" },
  });

  const result = await finalizer({
    requestId: request.id,
    confirmedEmail: email.toUpperCase(),
    reviewNotes: "Retention obligations reviewed.",
    adminReference: "CASE-123",
    retentionReviewed: true,
    now: new Date("2026-10-22T12:00:00Z"),
  });

  assert.equal(result.request.status, "COMPLETED");
  assert.equal(result.request.email, redactedDeletionEmail(request.id));
  assert.equal(result.cleanupCounts.visitorsRetired, 1);
  assert.equal(result.cleanupCounts.newsletterSubscribersAnonymized, 1);

  const deletedUser = await db.user.findUnique({ where: { id: user.id } });
  assert.ok(deletedUser);
  assert.equal(deletedUser.status, "DELETED");
  assert.equal(deletedUser.email, null);
  assert.equal(deletedUser.name, null);
  assert.equal(deletedUser.passwordHash, null);

  assert.equal(await db.userProfile.count({ where: { userId: user.id } }), 0);
  assert.equal(await db.savedSearch.count({ where: { userId: user.id } }), 0);
  assert.equal(await db.notification.count({ where: { userId: user.id } }), 0);
  assert.equal(await db.verificationToken.count({ where: { identifier: { endsWith: email.toLowerCase() } } }), 0);

  const preservedRequest = await db.accountDeletionRequest.findUnique({ where: { id: request.id } });
  assert.ok(preservedRequest);
  assert.equal(preservedRequest.status, "COMPLETED");
  assert.equal(preservedRequest.userReason, null);
  assert.equal(preservedRequest.adminNotificationId, "CASE-123");

  const detachedSupport = await db.supportTicket.findUnique({ where: { id: support.id } });
  assert.equal(detachedSupport?.userId, null);
  assert.equal(detachedSupport?.email, redactedDeletionEmail(request.id));
  assert.equal((await db.searchHistory.findFirst({ where: { visitorId: visitor.id } }))?.userId, null);
  assert.equal((await db.redirectLog.findFirst({ where: { visitorId: visitor.id } }))?.userId, null);
  assert.equal((await db.analyticsEvent.findFirst({ where: { visitorId: visitor.id } }))?.userId, null);

  const retiredVisitor = await db.visitor.findUnique({
    where: { id: visitor.id },
    include: { identityLinks: true },
  });
  assert.equal(retiredVisitor?.consentStatus, "WITHDRAWN");
  assert.equal(retiredVisitor?.currentUserId, null);
  assert.equal(retiredVisitor?.identityLinks.length, 0);

  const newsletter = await db.newsletterSubscriber.findUnique({
    where: { email: redactedDeletionEmail(request.id) },
  });
  assert.equal(newsletter?.status, "UNSUBSCRIBED");
  assert.equal(newsletter?.source, null);
});

test("finalization refuses missing review evidence and changed accounts", async () => {
  const email = `${randomUUID()}@account-deletion.test`;
  const user = await db.user.create({
    data: { email, emailVerified: new Date(), status: "ACTIVE" },
  });
  const request = await db.accountDeletionRequest.create({
    data: {
      userId: user.id,
      email,
      status: "READY_FOR_REVIEW",
      deletionScheduledAt: new Date("2026-10-20T00:00:00Z"),
    },
  });

  await assert.rejects(
    finalizer({
      requestId: request.id,
      confirmedEmail: email,
      reviewNotes: "",
      adminReference: "",
      retentionReviewed: false,
      now: new Date("2026-10-22T12:00:00Z"),
    }),
    (error: unknown) =>
      error instanceof AccountDeletionFinalizationError &&
      error.code === "REVIEW_REQUIRED",
  );

  await assert.rejects(
    finalizer({
      requestId: request.id,
      confirmedEmail: email,
      reviewNotes: "reviewed",
      adminReference: "CASE-456",
      retentionReviewed: true,
      now: new Date("2026-10-22T12:00:00Z"),
    }),
    (error: unknown) =>
      error instanceof AccountDeletionFinalizationError &&
      error.code === "ACCOUNT_CHANGED",
  );

  assert.equal(
    (await db.accountDeletionRequest.findUnique({ where: { id: request.id } }))?.status,
    "READY_FOR_REVIEW",
  );
});
