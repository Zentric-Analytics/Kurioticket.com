import assert from "node:assert/strict";
import test from "node:test";
import { MOBILE_EMAIL_CODE_TTL_MS, MobileEmailResendError, reserveMobileEmailSend } from "./mobileEmailResendPolicy";

test("initial send does not count toward three resends, with 30 seconds between sends", () => {
  const initial = reserveMobileEmailSend(null, 0);
  assert.deepEqual(initial, { resends: 0, nextAt: 30_000, lockedUntil: 0 });
  assert.throws(() => reserveMobileEmailSend(initial, 29_000), (e: unknown) => e instanceof MobileEmailResendError && e.retryAfterSeconds === 1 && !e.maximumReached);
  const first = reserveMobileEmailSend(initial, 30_000);
  const second = reserveMobileEmailSend(first, 60_000);
  const third = reserveMobileEmailSend(second, 90_000);
  assert.equal(first.resends, 1);
  assert.equal(second.resends, 2);
  assert.deepEqual(third, { resends: 3, nextAt: 150_000, lockedUntil: 150_000 });
  assert.throws(() => reserveMobileEmailSend(third, 149_999), (e: unknown) => e instanceof MobileEmailResendError && e.maximumReached && e.retryAfterSeconds === 1);
  assert.deepEqual(reserveMobileEmailSend(third, 150_000), { resends: 1, nextAt: 180_000, lockedUntil: 0 });
});

test("mobile verification codes have exactly five minutes of validity", () => {
  assert.equal(MOBILE_EMAIL_CODE_TTL_MS, 300_000);
});
