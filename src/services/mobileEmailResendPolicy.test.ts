import assert from "node:assert/strict";
import test from "node:test";
import { MOBILE_EMAIL_CODE_TTL_MS, MobileEmailResendError, reserveMobileEmailSend } from "./mobileEmailResendPolicy";

test("every resend retains the 30-second cooldown without an attempt cap", () => {
  let state = reserveMobileEmailSend(null, 0);
  assert.deepEqual(state, { resends: 0, nextAt: 30_000, lockedUntil: 0 });
  for (let resend = 1; resend <= 10; resend++) {
    const now = resend * 30_000;
    assert.throws(() => reserveMobileEmailSend(state, now - 1), (e: unknown) => e instanceof MobileEmailResendError && e.retryAfterSeconds === 1 && !e.maximumReached);
    state = reserveMobileEmailSend(state, now);
    assert.deepEqual(state, { resends: resend, nextAt: now + 30_000, lockedUntil: 0 });
  }
});

test("existing one-minute locks reduce to the ordinary cooldown", () => {
  const previous = { resends: 3, nextAt: 150_000, lockedUntil: 150_000 };
  assert.throws(() => reserveMobileEmailSend(previous, 119_000), (e: unknown) => e instanceof MobileEmailResendError && e.retryAfterSeconds === 1 && !e.maximumReached);
  assert.deepEqual(reserveMobileEmailSend(previous, 120_000), { resends: 4, nextAt: 150_000, lockedUntil: 0 });
});

test("mobile verification codes have exactly five minutes of validity", () => {
  assert.equal(MOBILE_EMAIL_CODE_TTL_MS, 300_000);
});
