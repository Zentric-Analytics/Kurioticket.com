import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { __accountNotificationServiceTest, recordAccountEvent, recordAccountEventSafely } from "@/services/accountNotificationService";

afterEach(() => __accountNotificationServiceTest.setCreateEvent(null));

test("material security events use transactional email and safe metadata", async () => {
  const calls: Array<Record<string, unknown>> = [];
  __accountNotificationServiceTest.setCreateEvent(async (input) => { calls.push(input); return { notification: { id: "notification-1" }, created: true, email: { skipped: false, id: "email-1" } } as never; });
  await recordAccountEvent({ userId: "user-1", email: "user@example.com", eventKey: "security:passkey-added:passkey-1", type: "SECURITY_UPDATE", title: "Passkey added", body: "A passkey was added.", actionPath: "/settings", metadata: { passkeyId: "passkey-1" } });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.email, { kind: "transactional", to: "user@example.com" });
  assert.deepEqual(calls[0]?.metadata, { passkeyId: "passkey-1" });
  assert.equal(JSON.stringify(calls[0]).includes("publicKey"), false);
  assert.equal(JSON.stringify(calls[0]).includes("recoveryCodes"), false);
  assert.equal(JSON.stringify(calls[0]).includes("password"), false);
});

test("missing email preserves the in-app event without optional email", async () => {
  let captured: Record<string, unknown> | null = null;
  __accountNotificationServiceTest.setCreateEvent(async (input) => { captured = input; return {} as never; });
  await recordAccountEvent({ userId: "user-1", email: null, eventKey: "account-deletion:request-1:requested", type: "ACCOUNT_UPDATE", title: "Deletion requested", body: "Request received.", actionPath: "/settings" });
  assert.deepEqual(captured?.email, { kind: "none" });
});

test("follow-up notification failure does not throw after a successful mutation", async () => {
  __accountNotificationServiceTest.setCreateEvent(async () => { throw new Error("database unavailable"); });
  assert.equal(await recordAccountEventSafely({ userId: "user-1", email: "user@example.com", eventKey: "security:2fa-enabled:transition-1", type: "SECURITY_UPDATE", title: "2FA enabled", body: "2FA was enabled.", actionPath: "/settings" }), null);
});
