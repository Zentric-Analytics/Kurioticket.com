import assert from "node:assert/strict";
import test from "node:test";
import { ownershipIdentifier, ownershipToken, claimEmailOwnershipProof } from "./mobileEmailOwnershipService";

const context = { userId: "user-1", email: "old@example.com", sessionKey: "session-1" };
test("ownership proof is isolated from other users, sessions, addresses and verification purposes", () => {
  const identifier = ownershipIdentifier(context, "proof");
  for (const changed of [{ ...context, userId: "user-2" }, { ...context, sessionKey: "session-2" }, { ...context, email: "new@example.com" }]) {
    assert.notEqual(identifier, ownershipIdentifier(changed, "proof"));
  }
  assert.notEqual(identifier, ownershipIdentifier(context, "code"));
  assert.equal(identifier, ownershipIdentifier({ ...context, email: " OLD@EXAMPLE.COM " }, "proof"));
  assert.ok(!identifier.includes(context.email));
});

test("final save claims only the exact unexpired hashed proof once, using the caller's transaction", async () => {
  const proof = "a".repeat(64);
  const identifier = ownershipIdentifier(context, "proof");
  for (const count of [0, 1]) {
    const tx = { verificationToken: { deleteMany: async ({ where }: { where: { identifier: string; token: string; expires: { gt: Date } } }) => {
      assert.equal(where.identifier, identifier);
      assert.equal(where.token, ownershipToken(identifier, proof));
      assert.notEqual(where.token, proof);
      assert.ok(Math.abs(Date.now() - where.expires.gt.getTime()) < 1000);
      return { count };
    } } } as unknown as Parameters<typeof claimEmailOwnershipProof>[0];
    assert.equal(await claimEmailOwnershipProof(tx, context, proof), count === 1);
  }
});
