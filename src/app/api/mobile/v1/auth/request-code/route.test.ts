import assert from "node:assert/strict";
import test from "node:test";

import { createRequestCodeHandler } from "./route";

function request(email: string) {
  return new Request("https://staging.kurioticket.com/api/mobile/v1/auth/request-code", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `${Date.now()}.${Math.random()}` },
    body: JSON.stringify({ email }),
  });
}

test("mobile request-code permits an approved external preview tester", async () => {
  const sent: string[] = [];
  const handler = createRequestCodeHandler({
    canUseCredentials: async (email) => email === "approved@gmail.com",
    findUser: async () => ({ name: "Preview Tester" }),
    sendCode: async ({ email }) => {
      sent.push(email);
      return { cooldownSeconds: 60 };
    },
  });

  const response = await handler(request("approved@gmail.com"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, cooldownSeconds: 60 });
  assert.deepEqual(sent, ["approved@gmail.com"]);
});

test("mobile request-code keeps the generic denial for an unapproved external address", async () => {
  const handler = createRequestCodeHandler({
    canUseCredentials: async () => false,
    findUser: async () => assert.fail("a denied address must not reach the user lookup"),
    sendCode: async () => assert.fail("a denied address must not receive a code"),
  });

  const response = await handler(request("unknown@gmail.com"));
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Preview access is restricted." });
});
