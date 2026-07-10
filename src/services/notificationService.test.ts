import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { __notificationServiceTest, createNotification } from "@/services/notificationService";

afterEach(() => {
  __notificationServiceTest.setSendTransactionalEmailForTesting(null);
  __notificationServiceTest.setSendOptionalEmailForTesting(null);
});

test("createNotification uses optional email sender when optionalEmailCategory is provided", async () => {
  const optionalCalls: Array<{ userId: string; category: string; metadata?: Record<string, unknown> }> = [];
  let transactionalCalls = 0;

  __notificationServiceTest.setSendOptionalEmailForTesting(async (input) => {
    optionalCalls.push({ userId: input.userId, category: input.category, metadata: input.metadata });
    return { skipped: true, reason: "preferences_disabled" };
  });
  __notificationServiceTest.setSendTransactionalEmailForTesting(async () => {
    transactionalCalls += 1;
    return { id: "email-1" };
  });

  await createNotification({
    userId: "user-1",
    title: "Price alert",
    body: "A fare changed.",
    type: "PRICE_ALERT",
    channel: "EMAIL",
    toEmail: "user@example.com",
    optionalEmailCategory: "priceAlerts",
  });

  assert.equal(transactionalCalls, 0);
  assert.deepEqual(optionalCalls, [
    { userId: "user-1", category: "priceAlerts", metadata: { notificationType: "PRICE_ALERT" } },
  ]);
});

test("createNotification keeps system email notification behavior transactional without optional category", async () => {
  const transactionalSubjects: string[] = [];
  let optionalCalls = 0;

  __notificationServiceTest.setSendOptionalEmailForTesting(async () => {
    optionalCalls += 1;
    return { skipped: false, id: "optional-email" };
  });
  __notificationServiceTest.setSendTransactionalEmailForTesting(async (input) => {
    transactionalSubjects.push(input.subject);
    return { id: "email-1" };
  });

  await createNotification({
    userId: "user-1",
    title: "System notice",
    body: "Important account notice.",
    type: "SYSTEM",
    channel: "EMAIL",
    toEmail: "user@example.com",
  });

  assert.equal(optionalCalls, 0);
  assert.deepEqual(transactionalSubjects, ["System notice"]);
});


test("createNotification gates price alert email notifications by default", async () => {
  const optionalCategories: string[] = [];
  let transactionalCalls = 0;

  __notificationServiceTest.setSendOptionalEmailForTesting(async (input) => {
    optionalCategories.push(input.category);
    return { skipped: true, reason: "preferences_disabled" };
  });
  __notificationServiceTest.setSendTransactionalEmailForTesting(async () => {
    transactionalCalls += 1;
    return { id: "email-1" };
  });

  await createNotification({
    userId: "user-1",
    title: "Price alert",
    body: "A fare changed.",
    type: "PRICE_ALERT",
    channel: "EMAIL",
    toEmail: "user@example.com",
  });

  assert.equal(transactionalCalls, 0);
  assert.deepEqual(optionalCategories, ["priceAlerts"]);
});
