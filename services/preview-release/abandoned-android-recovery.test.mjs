import test from "node:test";
import assert from "node:assert/strict";
import { parseAuthorizedAbandonedAndroidRecovery } from "./abandoned-android-recovery.mjs";

test("recovery authorization is disabled when no recovery env is present", () => {
  assert.equal(parseAuthorizedAbandonedAndroidRecovery({}), null);
});

test("recovery authorization requires all exact fields and explicit approval", () => {
  assert.throws(() => parseAuthorizedAbandonedAndroidRecovery({
    PREVIEW_ANDROID_RECOVERY_ACTION_ID: "59139",
  }), /incomplete/);
  assert.throws(() => parseAuthorizedAbandonedAndroidRecovery({
    PREVIEW_ANDROID_RECOVERY_ACTION_ID: "59139",
    PREVIEW_ANDROID_RECOVERY_SOURCE_SHA: "f8cf3a18a8b31defe82953fba5d1d95f9357dd68",
    PREVIEW_ANDROID_RECOVERY_FINGERPRINT: "0a082f2685713cea16a553eccfcaa687b36a340e",
    PREVIEW_ANDROID_RECOVERY_APPROVED: "false",
  }), /explicit/);
});

test("recovery authorization accepts only the exact approved Android reservation", () => {
  assert.deepEqual(parseAuthorizedAbandonedAndroidRecovery({
    PREVIEW_ANDROID_RECOVERY_ACTION_ID: "59139",
    PREVIEW_ANDROID_RECOVERY_SOURCE_SHA: "f8cf3a18a8b31defe82953fba5d1d95f9357dd68",
    PREVIEW_ANDROID_RECOVERY_FINGERPRINT: "0a082f2685713cea16a553eccfcaa687b36a340e",
    PREVIEW_ANDROID_RECOVERY_APPROVED: "true",
  }), {
    actionId: "59139",
    sourceSha: "f8cf3a18a8b31defe82953fba5d1d95f9357dd68",
    fingerprint: "0a082f2685713cea16a553eccfcaa687b36a340e",
  });
});
