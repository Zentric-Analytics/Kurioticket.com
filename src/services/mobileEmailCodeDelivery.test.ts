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

type TokenRow = { identifier: string; token: string; expires: Date };
function deliveryStore() {
  const rows: TokenRow[] = [];
  const tx = {
    verificationToken: {
      findFirst: async ({ where }: { where: { identifier: string } }) =>
        rows.find((row) => row.identifier === where.identifier) || null,
      deleteMany: async ({
        where,
      }: {
        where: { identifier: string | { in: string[] }; token?: string };
      }) => {
        let count = 0;
        for (let i = rows.length - 1; i >= 0; i--) {
          const matches =
            typeof where.identifier === "string"
              ? rows[i].identifier === where.identifier
              : where.identifier.in.includes(rows[i].identifier);
          if (matches && (!where.token || rows[i].token === where.token)) {
            rows.splice(i, 1);
            count++;
          }
        }
        return { count };
      },
      create: async ({ data }: { data: TokenRow }) => {
        rows.push({ ...data });
        return data;
      },
    },
  };
  const db = {
    $transaction: async (fn: (value: typeof tx) => Promise<unknown>) => fn(tx),
  } as unknown as NonNullable<Parameters<typeof sendMobileEmailCode>[1]>["db"];
  return { rows, db };
}
const deliveryInput = {
  userId: "delivery-user",
  identifier: "delivery-code",
  purpose: "current" as const,
  email: "test@example.com",
  name: null,
};
const unavailable = async () => {
  throw new Error("mail unavailable");
};
const delivered = (async () => ({ id: "delivered" })) as NonNullable<
  Parameters<typeof sendMobileEmailCode>[1]
>["send"];

test("failed automatic delivery releases the allowance and permits an immediate first send", async () => {
  const { rows, db } = deliveryStore();
  for (let attempt = 0; attempt < 4; attempt++) {
    await assert.rejects(
      sendMobileEmailCode(deliveryInput, { db, send: unavailable }),
      /mail unavailable/,
    );
    assert.equal(rows.length, 0);
  }
  assert.deepEqual(
    await sendMobileEmailCode(deliveryInput, { db, send: delivered }),
    { cooldownSeconds: 30, resendLimitReached: false },
  );
  assert.equal(
    JSON.parse(
      rows.find((row) => row.identifier !== deliveryInput.identifier)!.token,
    ).resends,
    0,
  );
});

test("failed resend restores the previous allowance without resurrecting the old code", async () => {
  const { rows, db } = deliveryStore();
  await sendMobileEmailCode(deliveryInput, { db, send: delivered });
  const rate = rows.find((row) => row.identifier !== deliveryInput.identifier)!;
  rate.token = JSON.stringify({
    ...JSON.parse(rate.token),
    resends: 2,
    nextAt: Date.now() - 1,
  });
  const previous = { ...rate };
  await assert.rejects(
    sendMobileEmailCode(deliveryInput, { db, send: unavailable }),
    /mail unavailable/,
  );
  assert.deepEqual(rows, [previous]);
  assert.deepEqual(
    await sendMobileEmailCode(deliveryInput, { db, send: delivered }),
    { cooldownSeconds: 30, resendLimitReached: false },
  );
});

test("late delivery failure preserves a newer reservation and verification code", async () => {
  const { rows, db } = deliveryStore();
  const send = async () => {
    const rate = rows.find(
      (row) => row.identifier !== deliveryInput.identifier,
    )!;
    rate.token = JSON.stringify({
      ...JSON.parse(rate.token),
      reservation: "newer-reservation",
      resends: 1,
    });
    rows.find((row) => row.identifier === deliveryInput.identifier)!.token =
      "newer-code";
    throw new Error("late failure");
  };
  await assert.rejects(
    sendMobileEmailCode(deliveryInput, { db, send }),
    /late failure/,
  );
  assert.equal(rows.length, 2);
  assert.equal(
    rows.find((row) => row.identifier === deliveryInput.identifier)!.token,
    "newer-code",
  );
  assert.equal(
    JSON.parse(
      rows.find((row) => row.identifier !== deliveryInput.identifier)!.token,
    ).reservation,
    "newer-reservation",
  );
});
