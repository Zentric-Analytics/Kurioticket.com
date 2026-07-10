import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { __emailServiceTest, emailPreferencesUpdatedEmail, sendOptionalEmail } from "@/services/emailService";
import { __emailPreferencesServiceTest, emailPreferenceDefaults } from "@/services/emailPreferencesService";

afterEach(() => {
  __emailServiceTest.setSendTransactionalEmailForTesting(null);
  __emailPreferencesServiceTest.setPrismaClientForTesting(null);
});

function mockPreferences(notificationPreferences: unknown) {
  __emailPreferencesServiceTest.setPrismaClientForTesting({
    travelPreferences: {
      async findUnique() {
        return { notificationPreferences };
      },
    },
  });
}

test("sendOptionalEmail skips blocked preferences without calling transactional sender", async () => {
  let sendCalls = 0;
  mockPreferences({ email: { ...emailPreferenceDefaults, receiveOptionalEmails: false, priceAlerts: true } });
  __emailServiceTest.setSendTransactionalEmailForTesting(async () => {
    sendCalls += 1;
    return { id: "email-1" };
  });

  const result = await sendOptionalEmail({
    userId: "user-1",
    category: "priceAlerts",
    to: "user@example.com",
    subject: "Price alert",
    html: "<p>Alert</p>",
    template: "price_alert",
  });

  assert.deepEqual(result, { skipped: true, reason: "preferences_disabled" });
  assert.equal(sendCalls, 0);
});

test("sendOptionalEmail calls transactional sender and includes optional category metadata when allowed", async () => {
  const sendInputs: Array<{ metadata?: Record<string, unknown>; template?: string }> = [];
  mockPreferences({ email: { ...emailPreferenceDefaults, receiveOptionalEmails: true, priceAlerts: true } });
  __emailServiceTest.setSendTransactionalEmailForTesting(async (input) => {
    sendInputs.push({ metadata: input.metadata, template: input.template });
    return { id: "email-1" };
  });

  const result = await sendOptionalEmail({
    userId: "user-1",
    category: "priceAlerts",
    to: "user@example.com",
    subject: "Price alert",
    html: "<p>Alert</p>",
    template: "price_alert",
    metadata: { source: "test" },
  });

  assert.deepEqual(result, { skipped: false, id: "email-1" });
  assert.equal(sendInputs.length, 1);
  assert.deepEqual(sendInputs[0].metadata, { source: "test", optionalEmailCategory: "priceAlerts" });
  assert.equal(sendInputs[0].template, "price_alert");
});

test("emailPreferencesUpdatedEmail safely escapes dynamic values and renders changed sections", () => {
  const html = emailPreferencesUpdatedEmail({
    name: "<Bisola>",
    enabledLabels: ["Product <updates>"],
    disabledLabels: ["Price & alerts"],
    changedAt: new Date("2026-07-10T18:30:00.000Z"),
    preferencesUrl: "https://example.com/dashboard/preferences/email?x=<script>",
    masterDisabled: true,
  });

  assert.match(html, /Hi &lt;Bisola&gt;/);
  assert.match(html, /Product &lt;updates&gt;/);
  assert.match(html, /Price &amp; alerts/);
  assert.match(html, /dashboard\/preferences\/email\?x=&lt;script&gt;/);
  assert.match(html, /Changed on:/);
  assert.match(html, /individual email-category choices have been preserved/);
  assert.doesNotMatch(html, /<Bisola>/);
});

test("emailPreferencesUpdatedEmail renders natural master off wording separately from category lists", () => {
  const html = emailPreferencesUpdatedEmail({
    enabledLabels: [],
    disabledLabels: [],
    changedAt: new Date("2026-07-10T18:30:00.000Z"),
    preferencesUrl: "https://example.com/dashboard/preferences/email",
    masterStatusChange: "disabled",
    masterDisabled: true,
  });

  assert.match(html, /All optional emails have been turned off/);
  assert.match(html, /individual email-category choices have been preserved/);
  assert.doesNotMatch(html, /<li>Optional emails<\/li>/);
});

test("emailPreferencesUpdatedEmail renders natural master on wording", () => {
  const html = emailPreferencesUpdatedEmail({
    enabledLabels: [],
    disabledLabels: [],
    changedAt: new Date("2026-07-10T18:30:00.000Z"),
    preferencesUrl: "https://example.com/dashboard/preferences/email",
    masterStatusChange: "enabled",
    masterDisabled: false,
  });

  assert.match(html, /Optional emails have been turned back on/);
  assert.doesNotMatch(html, /individual email-category choices have been preserved/);
  assert.doesNotMatch(html, /<li>Optional emails<\/li>/);
});
