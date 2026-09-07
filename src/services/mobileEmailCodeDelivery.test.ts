import assert from "node:assert/strict";
import test from "node:test";
import { sendMobileEmailCode } from "./mobileEmailCodeDelivery";

test("issuing a replacement atomically removes the previous code and persists five-minute expiry", async () => {
  const identifier = "test-code";
  const rows: { identifier: string; token: string; expires: Date }[] = [
    {
      identifier,
      token: "previous-code-hash",
      expires: new Date(Date.now() + 300_000),
    },
  ];
  const events: string[] = [];
  const tx = {
    verificationToken: {
      findFirst: async ({ where }: { where: { identifier: string } }) =>
        rows.find((row) => row.identifier === where.identifier) || null,
      deleteMany: async ({
        where,
      }: {
        where: { identifier: { in: string[] } };
      }) => {
        events.push("invalidate");
        for (let i = rows.length - 1; i >= 0; i--)
          if (where.identifier.in.includes(rows[i].identifier))
            rows.splice(i, 1);
        return { count: 1 };
      },
      create: async ({ data }: { data: (typeof rows)[number] }) => {
        rows.push(data);
        events.push("persist");
        return data;
      },
    },
  };
  const db = {
    $transaction: async (
      fn: (tx: unknown) => Promise<unknown>,
      options: { isolationLevel: string },
    ) => {
      assert.equal(options.isolationLevel, "Serializable");
      return fn(tx);
    },
  } as unknown as NonNullable<Parameters<typeof sendMobileEmailCode>[1]>["db"];
  const before = Date.now();
  const send = async () => {
    events.push("send");
    return { id: "test-delivery" };
  };
  const result = await sendMobileEmailCode(
    {
      userId: "user",
      identifier,
      purpose: "current",
      email: "test@example.com",
      name: null,
    },
    {
      db,
      send: send as NonNullable<
        Parameters<typeof sendMobileEmailCode>[1]
      >["send"],
    },
  );
  assert.deepEqual(result, { cooldownSeconds: 30, resendLimitReached: false });
  assert.deepEqual(events, ["invalidate", "persist", "persist", "send"]);
  assert.ok(!rows.some((row) => row.token === "previous-code-hash"));
  const code = rows.find((row) => row.identifier === identifier)!;
  const rate = rows.find((row) =>
    row.identifier.startsWith("mobile-email-resend:"),
  )!;
  assert.equal(JSON.parse(rate.token).scope, rate.identifier);
  assert.equal(code.token.length, 64);
  assert.ok(
    code.expires.getTime() >= before + 300_000 &&
      code.expires.getTime() <= Date.now() + 300_000,
  );
});
