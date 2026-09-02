import assert from "node:assert/strict";
import test from "node:test";

import { createPasswordHandlers } from "./route";
import { AuthRateLimitError } from "@/lib/auth-rate-limit";

const sessionEmail = "account@example.com";
const challenge = {
  kind: "issued" as const,
  challengeId: "challenge-1234567890",
  maskedEmail: "a••••••@example.com",
  expiresInSeconds: 300,
  resendAfterSeconds: 30,
};
const validStartBody = {
  action: "start" as const,
  currentPassword: "current-password",
  newPassword: "new-password",
  confirmPassword: "new-password",
};
const validConfirmBody = {
  action: "confirm" as const,
  challengeId: challenge.challengeId,
  code: "123456",
  newPassword: "new-password",
  confirmPassword: "new-password",
};

function createFixture(email: string | null = sessionEmail) {
  const rateLimitCalls: Array<{ action: string; email?: string }> = [];
  const resetEmails: string[] = [];
  const startCalls: Array<Record<string, unknown>> = [];
  const resendCalls: Array<Record<string, unknown>> = [];
  const confirmCalls: Array<Record<string, unknown>> = [];
  let statusResult = { failureCount: 0, recoveryAvailable: false };
  let startResult: Awaited<ReturnType<NonNullable<Parameters<typeof createPasswordHandlers>[0]>["start"]>> = challenge;
  let resendResult: Awaited<ReturnType<NonNullable<Parameters<typeof createPasswordHandlers>[0]>["resend"]>> = challenge;
  let confirmResult: Awaited<ReturnType<NonNullable<Parameters<typeof createPasswordHandlers>[0]>["confirm"]>> = { kind: "changed" };

  const handlers = createPasswordHandlers({
    requireSecurity: async () => ({
      id: "session-1",
      user: { id: "user-1", email },
    }),
    rateLimit: (options) => {
      rateLimitCalls.push({ action: options.action, email: options.email });
    },
    requestPasswordReset: async (authoritativeEmail) => {
      resetEmails.push(authoritativeEmail);
      return true;
    },
    status: async () => statusResult,
    start: async (input) => {
      startCalls.push(input);
      return startResult;
    },
    resend: async (input) => {
      resendCalls.push(input);
      return resendResult;
    },
    confirm: async (input) => {
      confirmCalls.push(input);
      return confirmResult;
    },
  });

  return {
    handlers,
    rateLimitCalls,
    resetEmails,
    startCalls,
    resendCalls,
    confirmCalls,
    setStatus(result: typeof statusResult) { statusResult = result; },
    setStart(result: typeof startResult) { startResult = result; },
    setResend(result: typeof resendResult) { resendResult = result; },
    setConfirm(result: typeof confirmResult) { confirmResult = result; },
  };
}

function request(method: "GET" | "POST" | "PATCH", body?: unknown) {
  return new Request("https://kurioticket.com/api/mobile/v1/security/password", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("password recovery status is scoped to the authenticated user", async () => {
  const fixture = createFixture();
  fixture.setStatus({ failureCount: 3, recoveryAvailable: true });
  const response = await fixture.handlers.GET(request("GET"));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { failureCount: 3, recoveryAvailable: true });
});

test("legacy signed-in password reset uses the authoritative session email", async () => {
  const fixture = createFixture();
  const response = await fixture.handlers.POST(request("POST", { email: "attacker@example.com" }));

  assert.equal(response.status, 200);
  assert.deepEqual(fixture.rateLimitCalls, [{ action: "mobile-forgot-password", email: sessionEmail }]);
  assert.deepEqual(fixture.resetEmails, [sessionEmail]);
});

test("missing authoritative email is rejected before any password action", async () => {
  const fixture = createFixture(null);
  assert.equal((await fixture.handlers.POST(request("POST"))).status, 401);
  assert.equal((await fixture.handlers.PATCH(request("PATCH", validStartBody))).status, 401);
  assert.deepEqual(fixture.rateLimitCalls, []);
  assert.deepEqual(fixture.startCalls, []);
});

test("password change start ignores client identity and uses the authenticated session", async () => {
  const fixture = createFixture();
  const response = await fixture.handlers.PATCH(request("PATCH", {
    ...validStartBody,
    email: "attacker@example.com",
    userId: "attacker",
    sessionId: "attacker-session",
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), challenge);
  assert.deepEqual(fixture.startCalls, [{
    userId: "user-1",
    sessionId: "session-1",
    email: sessionEmail,
    currentPassword: "current-password",
    newPassword: "new-password",
  }]);
});

test("incorrect current password exposes recovery only when the server says the threshold is reached", async () => {
  const fixture = createFixture();
  fixture.setStart({ kind: "invalid-current", failureCount: 3, recoveryAvailable: true });
  const response = await fixture.handlers.PATCH(request("PATCH", validStartBody));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Current password is incorrect.",
    failureCount: 3,
    recoveryAvailable: true,
  });
});

test("OAuth-only password behavior remains an explicit recovery path", async () => {
  const fixture = createFixture();
  fixture.setStart({ kind: "oauth-only" });
  const response = await fixture.handlers.PATCH(request("PATCH", validStartBody));

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: "Use password reset to create a password for this account.",
  });
});

test("resend carries the server-issued challenge and exact new-password intent", async () => {
  const fixture = createFixture();
  const response = await fixture.handlers.PATCH(request("PATCH", {
    action: "resend",
    challengeId: challenge.challengeId,
    newPassword: "new-password",
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(fixture.resendCalls, [{
    userId: "user-1",
    sessionId: "session-1",
    email: sessionEmail,
    challengeId: challenge.challengeId,
    newPassword: "new-password",
  }]);
});

test("resend cooldown returns canonical Retry-After", async () => {
  const fixture = createFixture();
  fixture.setResend({ kind: "cooldown", retryAfterSeconds: 19 });
  const response = await fixture.handlers.PATCH(request("PATCH", {
    action: "resend",
    challengeId: challenge.challengeId,
    newPassword: "new-password",
  }));

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "19");
});

test("password is committed only by the confirm action after the verification code", async () => {
  const fixture = createFixture();
  const response = await fixture.handlers.PATCH(request("PATCH", validConfirmBody));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.deepEqual(fixture.confirmCalls, [{
    userId: "user-1",
    sessionId: "session-1",
    email: sessionEmail,
    challengeId: challenge.challengeId,
    code: "123456",
    newPassword: "new-password",
  }]);
});

test("incorrect or expired verification code does not report success", async () => {
  const fixture = createFixture();
  fixture.setConfirm({ kind: "invalid-code" });
  const response = await fixture.handlers.PATCH(request("PATCH", validConfirmBody));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "That verification code is incorrect or expired." });
});

test("rate limiting returns the canonical retry-after contract", async () => {
  const handlers = createPasswordHandlers({
    requireSecurity: async () => ({ id: "session-1", user: { id: "user-1", email: sessionEmail } }),
    rateLimit: () => { throw new AuthRateLimitError(37); },
    requestPasswordReset: async () => assert.fail("rate-limited reset must not run"),
    status: async () => ({ failureCount: 0, recoveryAvailable: false }),
    start: async () => assert.fail("rate-limited start must not run"),
    resend: async () => assert.fail("rate-limited resend must not run"),
    confirm: async () => assert.fail("rate-limited confirm must not run"),
  });

  for (const [method, body] of [["POST", undefined], ["PATCH", validStartBody]] as const) {
    const response = await handlers[method](request(method, body));
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "37");
  }
});
