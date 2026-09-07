import assert from "node:assert/strict";
import test from "node:test";
import {
  createMobileEmailChangeHandler,
  type EmailChangeDependencies,
} from "@/lib/mobileEmailChange";
import { EmailVerificationCooldownError } from "@/services/emailVerificationService";
import { claimAccountEmailChangeCode } from "@/services/emailVerificationService";
import { createHash } from "node:crypto";

function setup(overrides: Partial<EmailChangeDependencies> = {}) {
  const calls: string[] = [];
  const dependencies: EmailChangeDependencies = {
    authenticate: async () => ({ id: "signed-in-user" }),
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
    mode: "request" | "confirm",
    body: unknown = {
      newEmail: "NEW@example.com",
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
  for (const mode of ["request", "confirm"] as const) {
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
    assert.equal((await run("request", { newEmail: email })).status, 400);
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
    (await invalid.run("confirm", { newEmail: "new@example.com", code: "12" }))
      .status,
    400,
  );
  assert.deepEqual(invalid.calls, []);
});
