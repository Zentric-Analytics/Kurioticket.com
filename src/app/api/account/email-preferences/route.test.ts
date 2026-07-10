import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
  __emailPreferencesRouteTest,
  emailPreferenceDefaults,
  emailPreferencesSchema,
  getEmailPreferenceChanges,
  getSavedEmailPreferences,
  GET,
  mergeEmailNotificationPreferences,
  normalizeEmailPreferences,
  PATCH,
} from "@/app/api/account/email-preferences/route";

afterEach(() => {
  __emailPreferencesRouteTest.setPrismaForTesting(null);
  __emailPreferencesRouteTest.setAuthenticatedUserForTesting(null);
  __emailPreferencesRouteTest.setSendTransactionalEmailForTesting(null);
});

test("email preference normalization returns defaults for missing or malformed values", () => {
  assert.deepEqual(emailPreferenceDefaults, {
    receiveOptionalEmails: false,
    priceAlerts: false,
    savedTripReminders: false,
    routeWatchUpdates: false,
    travelInspiration: false,
    productUpdates: false,
    dealsRecommendations: false,
  });
  assert.deepEqual(normalizeEmailPreferences(null), emailPreferenceDefaults);
  assert.deepEqual(normalizeEmailPreferences([]), emailPreferenceDefaults);
  assert.deepEqual(getSavedEmailPreferences(null), {
    hasPreferences: false,
    preferences: emailPreferenceDefaults,
  });
});

test("email preference normalization merges saved booleans over defaults only", () => {
  assert.deepEqual(
    normalizeEmailPreferences({
      receiveOptionalEmails: false,
      priceAlerts: "no",
      savedTripReminders: false,
      routeWatchUpdates: true,
      extra: true,
    }),
    {
      ...emailPreferenceDefaults,
      receiveOptionalEmails: false,
      savedTripReminders: false,
      routeWatchUpdates: true,
    },
  );
});

test("saved email preferences are read from nested notificationPreferences.email", () => {
  assert.deepEqual(
    getSavedEmailPreferences({
      emailUpdates: false,
      priceAlertEmails: false,
      travelInspirationEmails: true,
      email: {
        receiveOptionalEmails: false,
        priceAlerts: false,
        productUpdates: false,
      },
    }),
    {
      hasPreferences: true,
      preferences: {
        ...emailPreferenceDefaults,
        receiveOptionalEmails: false,
        priceAlerts: false,
        productUpdates: false,
      },
    },
  );
});


test("email preferences PATCH schema rejects missing, non-boolean, and unknown keys", () => {
  assert.equal(emailPreferencesSchema.safeParse({ ...emailPreferenceDefaults, extra: true }).success, false);
  assert.equal(emailPreferencesSchema.safeParse({ ...emailPreferenceDefaults, priceAlerts: "true" }).success, false);

  const missingProductUpdates = { ...emailPreferenceDefaults } as Partial<typeof emailPreferenceDefaults>;
  delete missingProductUpdates.productUpdates;
  assert.equal(emailPreferencesSchema.safeParse(missingProductUpdates).success, false);
});

test("email notification merge preserves existing legacy notification keys", () => {
  assert.deepEqual(
    mergeEmailNotificationPreferences(
      {
        emailUpdates: false,
        priceAlertEmails: true,
        travelInspirationEmails: false,
        email: { receiveOptionalEmails: false },
      },
      emailPreferenceDefaults,
    ),
    {
      emailUpdates: false,
      priceAlertEmails: true,
      travelInspirationEmails: false,
      email: emailPreferenceDefaults,
    },
  );
});

test("email preference changes compare every explicit boolean key", () => {
  const next = {
    ...emailPreferenceDefaults,
    priceAlerts: !emailPreferenceDefaults.priceAlerts,
    routeWatchUpdates: !emailPreferenceDefaults.routeWatchUpdates,
  };

  assert.deepEqual(getEmailPreferenceChanges(emailPreferenceDefaults, next), [
    {
      key: "priceAlerts",
      previousValue: emailPreferenceDefaults.priceAlerts,
      nextValue: next.priceAlerts,
    },
    {
      key: "routeWatchUpdates",
      previousValue: emailPreferenceDefaults.routeWatchUpdates,
      nextValue: next.routeWatchUpdates,
    },
  ]);
  assert.deepEqual(getEmailPreferenceChanges(emailPreferenceDefaults, { ...emailPreferenceDefaults }), []);
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/account/email-preferences", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

function mockPatchDependencies(input?: {
  existingEmailPreferences?: unknown;
  updatedAt?: Date;
  user?: { email?: string | null; name?: string | null } | null;
  upsertError?: Error;
}) {
  const upserts: unknown[] = [];
  __emailPreferencesRouteTest.setAuthenticatedUserForTesting(async () => ({ id: "user-1" }));
  __emailPreferencesRouteTest.setPrismaForTesting({
    travelPreferences: {
      async findUnique() {
        return {
          notificationPreferences: input?.existingEmailPreferences ?? { email: emailPreferenceDefaults },
          updatedAt: input?.updatedAt ?? new Date("2026-07-10T18:30:00.000Z"),
        };
      },
      async upsert(args: unknown) {
        upserts.push(args);
        if (input?.upsertError) throw input.upsertError;
        const notificationPreferences = (args as { create: { notificationPreferences: unknown } }).create
          .notificationPreferences;
        return { notificationPreferences };
      },
    },
    user: {
      async findUnique() {
        return input?.user === undefined
          ? { email: "registered@example.com", name: "Bisola" }
          : input.user;
      },
    },
  } as never);
  return { upserts };
}

test("PATCH sends one transactional confirmation for a turned off category after saving", async () => {
  const sent: unknown[] = [];
  mockPatchDependencies({
    existingEmailPreferences: { email: { ...emailPreferenceDefaults, priceAlerts: true } },
  });
  __emailPreferencesRouteTest.setSendTransactionalEmailForTesting(async (input) => {
    sent.push(input);
    return { id: "email-1" };
  });

  const response = await PATCH(jsonRequest({ ...emailPreferenceDefaults, priceAlerts: false }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { preferences: { ...emailPreferenceDefaults, priceAlerts: false } });
  assert.equal(sent.length, 1);
  assert.match((sent[0] as { html: string }).html, /Turned off:/);
  assert.match((sent[0] as { html: string }).html, /Price alerts/);
  assert.equal((sent[0] as { to: string }).to, "registered@example.com");
  assert.equal((sent[0] as { template: string }).template, "email_preferences_updated");
});

test("PATCH sends one transactional confirmation for a turned on category", async () => {
  const sent: unknown[] = [];
  mockPatchDependencies({
    existingEmailPreferences: { email: { ...emailPreferenceDefaults, travelInspiration: false } },
  });
  __emailPreferencesRouteTest.setSendTransactionalEmailForTesting(async (input) => {
    sent.push(input);
    return { id: "email-1" };
  });

  await PATCH(jsonRequest({ ...emailPreferenceDefaults, travelInspiration: true }));

  assert.equal(sent.length, 1);
  assert.match((sent[0] as { html: string }).html, /Turned on:/);
  assert.match((sent[0] as { html: string }).html, /Travel inspiration/);
});

test("PATCH summarizes multiple changes in exactly one email", async () => {
  const sent: unknown[] = [];
  mockPatchDependencies({
    existingEmailPreferences: { email: { ...emailPreferenceDefaults, priceAlerts: true } },
  });
  __emailPreferencesRouteTest.setSendTransactionalEmailForTesting(async (input) => {
    sent.push(input);
    return { id: "email-1" };
  });

  await PATCH(
    jsonRequest({
      ...emailPreferenceDefaults,
      priceAlerts: false,
      travelInspiration: true,
      dealsRecommendations: true,
    }),
  );

  assert.equal(sent.length, 1);
  const html = (sent[0] as { html: string }).html;
  assert.match(html, /Price alerts/);
  assert.match(html, /Travel inspiration/);
  assert.match(html, /Deals and recommendations/);
});

test("PATCH confirmation still sends when optional emails are turned off and does not use optional sender", async () => {
  const sent: unknown[] = [];
  mockPatchDependencies({
    existingEmailPreferences: { email: { ...emailPreferenceDefaults, receiveOptionalEmails: true } },
  });
  __emailPreferencesRouteTest.setSendTransactionalEmailForTesting(async (input) => {
    sent.push(input);
    return { id: "email-1" };
  });

  await PATCH(jsonRequest({ ...emailPreferenceDefaults, receiveOptionalEmails: false }));

  assert.equal(sent.length, 1);
  assert.match((sent[0] as { html: string }).html, /All optional emails have been turned off/);
  assert.match((sent[0] as { html: string }).html, /individual email-category choices have been preserved/);
});

test("PATCH confirmation sends when optional emails are turned on", async () => {
  const sent: unknown[] = [];
  mockPatchDependencies({
    existingEmailPreferences: { email: { ...emailPreferenceDefaults, receiveOptionalEmails: false } },
  });
  __emailPreferencesRouteTest.setSendTransactionalEmailForTesting(async (input) => {
    sent.push(input);
    return { id: "email-1" };
  });

  await PATCH(jsonRequest({ ...emailPreferenceDefaults, receiveOptionalEmails: true }));

  assert.equal(sent.length, 1);
  assert.match((sent[0] as { html: string }).html, /Optional emails have been turned back on/);
  assert.doesNotMatch((sent[0] as { html: string }).html, /<li>Optional emails<\/li>/);
});

test("PATCH does not list unchanged children when master switch turns off", async () => {
  const sent: unknown[] = [];
  mockPatchDependencies({
    existingEmailPreferences: { email: { ...emailPreferenceDefaults, receiveOptionalEmails: true } },
  });
  __emailPreferencesRouteTest.setSendTransactionalEmailForTesting(async (input) => {
    sent.push(input);
    return { id: "email-1" };
  });

  await PATCH(jsonRequest({ ...emailPreferenceDefaults, receiveOptionalEmails: false }));

  const html = (sent[0] as { html: string }).html;
  assert.match(html, /All optional emails have been turned off/);
  assert.doesNotMatch(html, /Price alerts/);
  assert.match(html, /individual email-category choices have been preserved/);
});

test("PATCH does not send confirmation for no-op saves", async () => {
  const sent: unknown[] = [];
  mockPatchDependencies();
  __emailPreferencesRouteTest.setSendTransactionalEmailForTesting(async (input) => {
    sent.push(input);
    return { id: "email-1" };
  });

  const response = await PATCH(jsonRequest(emailPreferenceDefaults));

  assert.equal(response.status, 200);
  assert.equal(sent.length, 0);
});

test("PATCH does not send confirmation when database write fails", async () => {
  const sent: unknown[] = [];
  mockPatchDependencies({ upsertError: new Error("write failed") });
  __emailPreferencesRouteTest.setSendTransactionalEmailForTesting(async (input) => {
    sent.push(input);
    return { id: "email-1" };
  });

  const response = await PATCH(jsonRequest({ ...emailPreferenceDefaults, priceAlerts: true }));

  assert.equal(response.status, 500);
  assert.equal(sent.length, 0);
});

test("PATCH succeeds after confirmation delivery failure", async () => {
  mockPatchDependencies({
    existingEmailPreferences: { email: { ...emailPreferenceDefaults, priceAlerts: true } },
  });
  __emailPreferencesRouteTest.setSendTransactionalEmailForTesting(async () => {
    throw new Error("email failed");
  });

  const response = await PATCH(jsonRequest({ ...emailPreferenceDefaults, priceAlerts: false }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { preferences: { ...emailPreferenceDefaults, priceAlerts: false } });
});

test("PATCH skips delivery when authenticated user has no email", async () => {
  const sent: unknown[] = [];
  mockPatchDependencies({
    existingEmailPreferences: { email: { ...emailPreferenceDefaults, priceAlerts: true } },
    user: { email: " ", name: "Bisola" },
  });
  __emailPreferencesRouteTest.setSendTransactionalEmailForTesting(async (input) => {
    sent.push(input);
    return { id: "email-1" };
  });

  const response = await PATCH(jsonRequest({ ...emailPreferenceDefaults, priceAlerts: false }));

  assert.equal(response.status, 200);
  assert.equal(sent.length, 0);
});

test("PATCH recipient comes from authenticated database user and response shape is unchanged", async () => {
  const sent: unknown[] = [];
  mockPatchDependencies({ user: { email: "db-user@example.com", name: "DB User" } });
  __emailPreferencesRouteTest.setSendTransactionalEmailForTesting(async (input) => {
    sent.push(input);
    return { id: "email-1" };
  });

  const response = await PATCH(
    jsonRequest({
      ...emailPreferenceDefaults,
      priceAlerts: false,
      email: "attacker@example.com",
    }),
  );

  assert.equal(response.status, 400);

  const validResponse = await PATCH(jsonRequest({ ...emailPreferenceDefaults, priceAlerts: true }));
  const body = await validResponse.json();
  assert.deepEqual(Object.keys(body), ["preferences"]);
  assert.equal((sent[0] as { to: string }).to, "db-user@example.com");
});

test("PATCH uses deterministic idempotency key for same saved transition", async () => {
  const sent: Array<{ idempotencyKey?: string }> = [];
  mockPatchDependencies({
    updatedAt: new Date("2026-07-10T18:30:00.000Z"),
    existingEmailPreferences: { email: { ...emailPreferenceDefaults, priceAlerts: true } },
  });
  __emailPreferencesRouteTest.setSendTransactionalEmailForTesting(async (input) => {
    sent.push(input);
    return { id: "email-1" };
  });

  await PATCH(jsonRequest({ ...emailPreferenceDefaults, priceAlerts: false }));
  await PATCH(jsonRequest({ ...emailPreferenceDefaults, priceAlerts: false }));

  assert.equal(sent.length, 2);
  assert.equal(sent[0].idempotencyKey, sent[1].idempotencyKey);
  assert.match(sent[0].idempotencyKey || "", /^email-preferences-updated:/);
});

test("GET behavior returns saved normalized email preferences unchanged", async () => {
  mockPatchDependencies({
    existingEmailPreferences: {
      email: {
        ...emailPreferenceDefaults,
        receiveOptionalEmails: false,
        productUpdates: false,
      },
    },
  });

  const response = await GET();
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    hasPreferences: true,
    preferences: {
      ...emailPreferenceDefaults,
      receiveOptionalEmails: false,
      productUpdates: false,
    },
  });
});

test("PATCH awaits the transactional email send before returning", async () => {
  let resolveSend!: () => void;
  let sendResolved = false;
  const sendStarted = new Promise<void>((resolve) => {
    mockPatchDependencies();
    __emailPreferencesRouteTest.setSendTransactionalEmailForTesting(
      (async () => {
        resolve();
        await new Promise<void>((sendResolve) => {
          resolveSend = sendResolve;
        });
        sendResolved = true;
        return { id: "email-1" };
      }) as never,
    );
  });

  const patchPromise = PATCH(jsonRequest({ ...emailPreferenceDefaults, priceAlerts: true }));
  await sendStarted;
  let patchReturned = false;
  patchPromise.then(() => {
    patchReturned = true;
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(patchReturned, false);
  resolveSend();
  const response = await patchPromise;

  assert.equal(response.status, 200);
  assert.equal(sendResolved, true);
});
