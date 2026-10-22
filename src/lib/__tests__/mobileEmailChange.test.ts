import { MobileEmailResendError } from "@/services/mobileEmailResendPolicy";
import assert from "node:assert/strict";
import test from "node:test";
import {
  createMobileEmailChangeHandler,
  type EmailChangeDependencies,
  type EmailChangeMode,
} from "@/lib/mobileEmailChange";
import { EmailVerificationCooldownError } from "@/services/emailVerificationService";
import { claimAccountEmailChangeCode } from "@/services/emailVerificationService";
import { createHash } from "node:crypto";

function setup(overrides: Partial<EmailChangeDependencies> = {}) {
  const calls: string[] = [];
  const dependencies: EmailChangeDependencies = {
    authenticate: async () => ({
      id: "signed-in-user",
      sessionKey: "session-1",
    }),
    user: async (id) => ({
      id,
      email: "old@example.com",
      name: "Alex",
      status: "ACTIVE",
    }),
    owner: async () => null,
    rateLimit: () => {
      calls.push("rate-limit");
    },
    sendCurrentCode: async () => {
      calls.push("send-current");
      return { cooldownSeconds: 60 };
    },
    verifyCurrentCode: async () => {
      calls.push("verify-current");
      return "a".repeat(64);
    },
    hasOwnershipProof: async () => true,
    sendCode: async (input) => {
      assert.equal(input.userId, "signed-in-user");
      assert.equal(input.enforceCooldown, true);
      calls.push("send");
      return { cooldownSeconds: 30 };
    },
    verifyCode: async (input) => {
      assert.equal(input.userId, "signed-in-user");
      assert.equal(input.newEmail, "new@example.com");
      calls.push("verify");
      return "valid";
    },
    commit: async (input) => {
      assert.equal(input.previousEmail, "old@example.com");
      calls.push("commit");
      return true;
    },
    notify: async () => {
      calls.push("notify");
    },
    ...overrides,
  };
  const run = (
    mode: EmailChangeMode,
    body: unknown = {
      newEmail: "NEW@example.com",
      ownershipProof: "a".repeat(64),
      code: "123456",
      userId: "attacker-supplied-id",
    },
  ) =>
    createMobileEmailChangeHandler(
      mode,
      dependencies,
    )(
      new Request("https://example.test/api/mobile/v1/email-change/" + mode, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  return { run, calls };
}

test("both endpoints reject missing sessions before issuing codes or changing accounts", async () => {
  for (const mode of [
    "current-request",
    "current-confirm",
    "request",
    "confirm",
  ] as const) {
    const { run, calls } = setup({ authenticate: async () => null });
    assert.equal((await run(mode)).status, 401);
    assert.deepEqual(calls, []);
  }
});
test("session/database outage returns 503, not a session-expiry response", async () => {
  const { run } = setup({
    authenticate: async () => {
      throw Error("database unavailable");
    },
  });
  assert.equal((await run("request")).status, 503);
});
test("request normalizes email, binds the code to the session user, and never commits", async () => {
  const { run, calls } = setup();
  assert.deepEqual(await (await run("request")).json(), {
    cooldownSeconds: 30,
  });
  assert.deepEqual(calls, ["rate-limit", "send"]);
});
test("invalid, unchanged, and already-used emails do not send codes", async () => {
  for (const email of ["bad", "old@example.com"]) {
    const { run, calls } = setup();
    assert.equal(
      (
        await run("request", {
          newEmail: email,
          ownershipProof: "a".repeat(64),
        })
      ).status,
      400,
    );
    assert.ok(!calls.includes("send"));
  }
  const { run, calls } = setup({ owner: async () => ({ id: "other-user" }) });
  assert.equal((await run("request")).status, 409);
  assert.ok(!calls.includes("send"));
});
test("resend cooldown returns retry information", async () => {
  const { run } = setup({
    sendCode: async () => {
      throw new EmailVerificationCooldownError(23);
    },
  });
  const response = await run("request");
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "23");
  assert.equal((await response.json()).retryAfterSeconds, 23);
});
test("invalid and expired codes cannot mutate the email", async () => {
  for (const result of ["invalid", "expired"] as const) {
    const { run, calls } = setup({ verifyCode: async () => result });
    const response = await run("confirm");
    assert.equal(response.status, 400);
    assert.equal(
      (await response.json()).code,
      result === "expired" ? "EXPIRED_CODE" : "INVALID_CODE",
    );
    assert.ok(!calls.includes("commit"));
  }
});
test("confirmation updates only after verification, then notifies and returns authoritative identity", async () => {
  const { run, calls } = setup();
  assert.deepEqual(await (await run("confirm")).json(), {
    email: "new@example.com",
    userId: "signed-in-user",
  });
  assert.deepEqual(calls, ["rate-limit", "verify", "commit", "notify"]);
});
test("concurrent consumption and unique-email conflicts cannot report success", async () => {
  const stale = setup({ commit: async () => false });
  assert.equal((await stale.run("confirm")).status, 400);
  assert.ok(!stale.calls.includes("notify"));
  const conflict = setup({
    commit: async () => {
      throw Object.assign(Error("conflict"), { code: "P2002" });
    },
  });
  assert.equal((await conflict.run("confirm")).status, 409);
});
test("lost confirmation response can be retried without another mutation or notification", async () => {
  const { run, calls } = setup({
    user: async (id) => ({
      id,
      email: "new@example.com",
      name: "Alex",
      status: "ACTIVE",
    }),
  });
  assert.equal((await run("confirm")).status, 200);
  assert.deepEqual(calls, ["rate-limit"]);
});
test("notification delivery failure does not misreport a completed change", async () => {
  const { run } = setup({
    notify: async () => {
      throw Error("mail unavailable");
    },
  });
  assert.equal((await run("confirm")).status, 200);
});

test("atomic code claim matches the user, new address, exact code hash and current expiry", async () => {
  for (const count of [0, 1]) {
    let where: unknown;
    const tx = {
      verificationToken: {
        deleteMany: async (args: { where: unknown }) => {
          where = args.where;
          return { count };
        },
      },
    } as unknown as Parameters<typeof claimAccountEmailChangeCode>[0];
    const before = Date.now();
    assert.equal(
      await claimAccountEmailChangeCode(tx, {
        userId: "user-1",
        newEmail: "New@Example.com",
        code: "123456",
      }),
      count === 1,
    );
    const clause = where as {
      identifier: string;
      token: string;
      expires: { gt: Date };
    };
    assert.equal(clause.identifier, "email-change:user-1:new@example.com");
    assert.equal(
      clause.token,
      createHash("sha256")
        .update("email-change:user-1:new@example.com:123456")
        .digest("hex"),
    );
    assert.ok(clause.expires.gt.getTime() >= before);
  }
});

test("inactive users and malformed codes never reach confirmation", async () => {
  const inactive = setup({
    user: async (id) => ({
      id,
      email: "old@example.com",
      name: null,
      status: "SUSPENDED",
    }),
  });
  assert.equal((await inactive.run("confirm")).status, 401);
  const invalid = setup();
  assert.equal(
    (
      await invalid.run("confirm", {
        newEmail: "new@example.com",
        code: "12",
        ownershipProof: "a".repeat(64),
      })
    ).status,
    400,
  );
  assert.deepEqual(invalid.calls, []);
});

test("new-address endpoints reject missing, expired or wrong-session ownership proofs", async () => {
  for (const mode of ["request", "confirm"] as const) {
    const missing = setup();
    assert.equal(
      (await missing.run(mode, { newEmail: "new@example.com", code: "123456" }))
        .status,
      403,
    );
    assert.ok(
      !missing.calls.includes("send") && !missing.calls.includes("commit"),
    );
    const invalid = setup({
      hasOwnershipProof: async (context, proof) => {
        assert.equal(context.sessionKey, "session-1");
        assert.equal(context.email, "old@example.com");
        assert.equal(proof, "a".repeat(64));
        return false;
      },
    });
    assert.equal((await invalid.run(mode)).status, 403);
    assert.ok(
      !invalid.calls.includes("send") && !invalid.calls.includes("commit"),
    );
  }
});

test("step one sends only to the authenticated current address, never a supplied replacement or phone", async () => {
  const { run, calls } = setup({
    sendCurrentCode: async (context) => {
      assert.deepEqual(context, {
        userId: "signed-in-user",
        email: "old@example.com",
        sessionKey: "session-1",
      });
      return { cooldownSeconds: 60 };
    },
  });
  const response = await run("current-request", {
    email: "attacker@example.com",
    phoneNumber: "+1234567890",
  });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["rate-limit"]);
});

test("only a correct current-email code issues proof and does not mutate the account", async () => {
  const invalid = setup({ verifyCurrentCode: async () => null });
  assert.equal(
    (await invalid.run("current-confirm", { code: "123456" })).status,
    400,
  );
  const valid = setup();
  assert.deepEqual(
    await (await valid.run("current-confirm", { code: "123456" })).json(),
    { ownershipProof: "a".repeat(64) },
  );
  assert.deepEqual(valid.calls, ["rate-limit", "verify-current"]);
});


test("resend maximum is returned to the app and resets through the advertised delay", async () => {
  const limited = setup({ sendCode: async () => { throw new MobileEmailResendError(60, true); } });
  const response = await limited.run("request");
  assert.equal(response.status, 429);
  assert.equal((await response.json()).code, "MAX_RESENDS");
  const third = setup({ sendCode: async () => ({ cooldownSeconds: 60, resendLimitReached: true }) });
  assert.deepEqual(await (await third.run("request")).json(), { cooldownSeconds: 60, resendLimitReached: true });
});
