import assert from "node:assert/strict";
import test from "node:test";

import { mobileApiError, mobileApiSuccess } from "./response";

test("mobileApiSuccess returns a data envelope", async () => {
  const response = mobileApiSuccess({ available: true });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), {
    data: {
      available: true,
    },
  });
});

test("mobileApiError returns required stable error fields", async () => {
  const response = mobileApiError(
    {
      code: "MOBILE_TEMPORARILY_UNAVAILABLE",
      message: "Please try again later.",
    },
    { status: 503 },
  );

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), {
    error: {
      code: "MOBILE_TEMPORARILY_UNAVAILABLE",
      message: "Please try again later.",
    },
  });
});

test("mobileApiError includes retryAfterSeconds only when provided", async () => {
  const response = mobileApiError(
    {
      code: "MOBILE_RATE_LIMITED",
      message: "Please wait before trying again.",
      retryAfterSeconds: 60,
    },
    { status: 429 },
  );

  assert.deepEqual(await response.json(), {
    error: {
      code: "MOBILE_RATE_LIMITED",
      message: "Please wait before trying again.",
      retryAfterSeconds: 60,
    },
  });
});

test("mobileApiError does not copy internal diagnostic fields", async () => {
  const response = mobileApiError({
    code: "MOBILE_INTERNAL_ERROR",
    message: "Something went wrong.",
    stack: "Error: leaked stack",
    sql: "select * from users",
    providerPayload: { token: "secret" },
  } as Parameters<typeof mobileApiError>[0] & Record<string, unknown>);

  const payload = await response.json() as { error: Record<string, unknown> };

  assert.deepEqual(Object.keys(payload.error), ["code", "message"]);
  assert.equal(Object.hasOwn(payload.error, "stack"), false);
  assert.equal(Object.hasOwn(payload.error, "sql"), false);
  assert.equal(Object.hasOwn(payload.error, "providerPayload"), false);
});
