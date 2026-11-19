import assert from "node:assert/strict";
import test from "node:test";

import { createAccountDeletionReviewCronHandler } from "./route";

function request(token?: string) {
  return new Request("https://staging.kurioticket.com/api/internal/cron/account-deletion-review", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

test("account deletion review cron fails closed when not configured", async () => {
  const handler = createAccountDeletionReviewCronHandler({
    secret: () => "",
    markReady: async () => ({ count: 1 }) as never,
  });
  assert.equal((await handler(request())).status, 503);
});

test("account deletion review cron rejects bad credentials before storage", async () => {
  let touched = false;
  const handler = createAccountDeletionReviewCronHandler({
    secret: () => "correct-secret",
    markReady: async () => {
      touched = true;
      return { count: 1 } as never;
    },
  });
  assert.equal((await handler(request("wrong-secret"))).status, 401);
  assert.equal(touched, false);
});

test("account deletion review cron returns the number advanced", async () => {
  const handler = createAccountDeletionReviewCronHandler({
    secret: () => "correct-secret",
    markReady: async () => ({ count: 3 }) as never,
  });
  const response = await handler(request("correct-secret"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { markedReadyForReview: 3 });
});
