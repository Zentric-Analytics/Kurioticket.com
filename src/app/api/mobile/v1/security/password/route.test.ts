import assert from "node:assert/strict";
import test from "node:test";

import { createPasswordHandlers } from "./route";
import { AuthRateLimitError } from "@/lib/auth-rate-limit";

const sessionEmail = "account@example.com";
const validPasswordBody = {
  currentPassword: "current-password",
  newPassword: "new-password",
  confirmPassword: "new-password",
};

function createFixture(email: string | null = sessionEmail) {
  const rateLimitEmails: Array<string | undefined> = [];
  const resetEmails: string[] = [];
  const passwordEmails: string[] = [];
  let passwordResult: "changed" | "invalid" | "oauth-only" = "changed";

  const handlers = createPasswordHandlers({
    requireSecurity: async () => ({
      id: "session-1",
      user: { id: "user-1", email },
    }),
    rateLimit: (options) => {
      rateLimitEmails.push(options.email);
    },
    requestPasswordReset: async (authoritativeEmail) => {
      resetEmails.push(authoritativeEmail);
      return true;
    },
    updatePassword: async (input) => {
      passwordEmails.push(input.email);
      return passwordResult;
    },
  });

  return {
    handlers,
    rateLimitEmails,
    resetEmails,
    passwordEmails,
    setPasswordResult(result: typeof passwordResult) {
      passwordResult = result;
    },
  };
}

function request(method: "POST" | "PATCH", body?: unknown) {
  return new Request("https://kurioticket.com/api/mobile/v1/security/password", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("password reset passes the authoritative session email to rate limiting and reset service", async () => {
  const fixture = createFixture();
  const response = await fixture.handlers.POST(request("POST"));

  assert.equal(response.status, 200);
  assert.deepEqual(fixture.rateLimitEmails, [sessionEmail]);
  assert.deepEqual(fixture.resetEmails, [sessionEmail]);
});

test("missing authoritative email is rejected without requesting a password reset", async () => {
  const fixture = createFixture(null);
  const response = await fixture.handlers.POST(request("POST"));

  assert.equal(response.status, 401);
  assert.deepEqual(fixture.rateLimitEmails, []);
  assert.deepEqual(fixture.resetEmails, []);
});

test("a submitted client email cannot replace the authoritative session email", async () => {
  const fixture = createFixture();
  const response = await fixture.handlers.POST(
    request("POST", { email: "attacker@example.com" }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(fixture.rateLimitEmails, [sessionEmail]);
  assert.deepEqual(fixture.resetEmails, [sessionEmail]);
});

test("password change uses the authoritative session email", async () => {
  const fixture = createFixture();
  const response = await fixture.handlers.PATCH(
    request("PATCH", { ...validPasswordBody, email: "attacker@example.com" }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(fixture.rateLimitEmails, [sessionEmail]);
  assert.deepEqual(fixture.passwordEmails, [sessionEmail]);
});

test("OAuth-only password reset behavior remains unchanged", async () => {
  const fixture = createFixture();
  fixture.setPasswordResult("oauth-only");
  const response = await fixture.handlers.PATCH(
    request("PATCH", validPasswordBody),
  );

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: "Use password reset to create a password for this account.",
  });
});

test("rate limiting returns the canonical retry-after contract", async () => {
  const handlers = createPasswordHandlers({
    requireSecurity: async () => ({ id: "session-1", user: { id: "user-1", email: sessionEmail } }),
    rateLimit: () => { throw new AuthRateLimitError(37); },
    requestPasswordReset: async () => assert.fail("rate-limited reset must not run"),
    updatePassword: async () => assert.fail("rate-limited change must not run"),
  });

  for (const [method, body] of [["POST", undefined], ["PATCH", validPasswordBody]] as const) {
    const response = await handlers[method](request(method, body));
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "37");
  }
});
