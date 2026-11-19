import assert from "node:assert/strict";
import test from "node:test";
import { createRevokeOthersHandler } from "./route";

const req = () => new Request("https://test", { method: "POST", body: JSON.stringify({ userId: "victim", currentSessionId: "victim-session" }) });

test("other-session revocation derives the owner and preserved session from the bearer", async () => {
  assert.equal((await createRevokeOthersHandler({ authenticate: async () => null, revokeOthers: async () => assert.fail() })(req())).status, 401);
  let args: string[] = [];
  const response = await createRevokeOthersHandler({
    authenticate: async () => ({ id: "authoritative-current", user: { id: "owner" } }),
    revokeOthers: async (userId, currentId) => { args = [userId, currentId]; return 2; },
  })(req());
  assert.equal(response.status, 200);
  assert.deepEqual(args, ["owner", "authoritative-current"]);
});

test("other-session revocation fails closed without leaking server errors", async () => {
  const response = await createRevokeOthersHandler({
    authenticate: async () => ({ id: "current", user: { id: "owner" } }),
    revokeOthers: async () => { throw new Error("database secret"); },
  })(req());
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret/);
});
