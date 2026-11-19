import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createPasskeyFieldRecovery, emailFieldError } from "./passkeyFieldRecovery";
import { isIOSPreviewPasskeyEnabled } from "./previewPasskeySignIn";

const cancelled = { stage: "authorization_error", domain: "com.apple.AuthenticationServices.AuthorizationError", code: 1001 };
function harness() {
  let challenge = "initial";
  let allowed = true;
  let requests = 0;
  let refresh: () => Promise<void> = async () => { challenge = `fresh-${requests}`; };
  const timers = new Set<() => void>();
  const recovery = createPasskeyFieldRecovery({
    currentChallenge: () => challenge,
    canRearm: () => allowed,
    refresh: async () => { requests++; await refresh(); },
    schedule: (callback, delay) => {
      assert.equal(delay, 750);
      timers.add(callback);
      return () => { timers.delete(callback); };
    },
  });
  return {
    recovery, timers,
    get requests() { return requests; },
    setAllowed(value: boolean) { allowed = value; },
    setChallenge(value: string) { challenge = value; },
    setRefresh(value: () => Promise<void>) { refresh = value; },
    async tick() { const batch = [...timers]; timers.clear(); batch.forEach((callback) => callback()); for (let i = 0; i < 8; i++) await Promise.resolve(); },
  };
}

test("empty native Preview blur never shows an email error, even if previously touched", () => {
  for (const touched of [false, true]) for (const email of ["", "   "]) {
    assert.equal(emailFieldError(email, touched, true), undefined);
  }
});

test("manually entered invalid email validates on blur or submit; valid input clears it", () => {
  assert.equal(emailFieldError("invalid", false, true), undefined);
  assert.equal(emailFieldError("invalid", true, true), "Enter a valid email address.");
  assert.equal(emailFieldError("person@example.com", true, true), undefined);
  assert.equal(emailFieldError("", true, true, true), "Enter a valid email address.");
  assert.equal(emailFieldError("   ", true, true, true), "Enter a valid email address.");
});

test("Android, web and non-Preview keep their original validation and do not re-arm", async () => {
  for (const [platform, preview] of [["android", true], ["web", true], ["ios", false]] as const) {
    const enabled = isIOSPreviewPasskeyEnabled(platform, preview);
    assert.equal(enabled, false);
    assert.equal(emailFieldError("", true, enabled), "Enter a valid email address.");
    const state = harness(); state.setAllowed(enabled);
    state.recovery.diagnostic(cancelled); state.recovery.interact(); await state.tick();
    assert.equal(state.requests, 0);
  }
});

test("explicit AuthenticationServices cancellation re-arms once after a dismissal delay", async () => {
    const state = harness(); state.recovery.diagnostic(cancelled);
    assert.equal(state.requests, 0);
    assert.equal(state.timers.size, 1);
    await state.tick(); assert.equal(state.requests, 1);
});

test("unknown, failed, not-handled, invalid and foreign native errors never re-arm", async () => {
  for (const event of [
    ...[1000, 1002, 1003, 1004, 1005, 9999, undefined].map((code) => ({ ...cancelled, code })),
    { ...cancelled, domain: undefined }, { ...cancelled, domain: "OtherErrorDomain" },
    { ...cancelled, stage: "unexpected_credential" },
  ]) {
    const state = harness();
    for (let i = 0; i < 5; i++) {
      state.recovery.diagnostic(event); state.recovery.interact(); await state.tick();
    }
    assert.equal(state.requests, 0);
    assert.equal(state.timers.size, 0);
  }
});

test("repeated diagnostics and autofill start events cannot create a retry loop", async () => {
  const state = harness();
  for (let i = 0; i < 20; i++) state.recovery.diagnostic(cancelled);
  assert.equal(state.timers.size, 1);
  await state.tick();
  for (let i = 0; i < 20; i++) {
    state.recovery.diagnostic({ stage: "autofill_started" });
    state.recovery.diagnostic(cancelled);
    await state.tick();
  }
  assert.equal(state.requests, 1);
  state.recovery.interact(); await state.tick();
  assert.equal(state.requests, 2);
  await state.tick(); assert.equal(state.requests, 2);
});

test("an in-flight refresh ignores duplicate events and touches", async () => {
  const state = harness(); let finish!: () => void;
  state.setRefresh(() => new Promise<void>((resolve) => { finish = resolve; }));
  state.recovery.diagnostic(cancelled); await state.tick();
  state.recovery.diagnostic(cancelled); state.recovery.interact(); await state.tick();
  assert.equal(state.requests, 1);
  finish(); await state.tick(); assert.equal(state.requests, 1);
});

test("refresh failure does not retry itself or leak a rejection", async () => {
  const state = harness(); state.setRefresh(async () => { throw new Error("offline"); });
  state.recovery.diagnostic(cancelled); await state.tick();
  state.recovery.diagnostic(cancelled); await state.tick();
  assert.equal(state.requests, 1);
});

test("successful assertion, email submit, navigation and cleanup cancel pending re-arm", async () => {
  const state = harness(); state.recovery.diagnostic(cancelled);
  state.recovery.cancel(); await state.tick(); assert.equal(state.requests, 0);
  state.recovery.diagnostic(cancelled); state.setAllowed(false);
  await state.tick(); assert.equal(state.requests, 0);
});

test("cleanup and loading transitions cannot replenish a consumed automatic retry", async () => {
  const state = harness(); state.recovery.diagnostic(cancelled); await state.tick();
  state.recovery.cancel(); state.setAllowed(false); state.recovery.cancel(); state.setAllowed(true);
  state.recovery.diagnostic(cancelled); await state.tick(); assert.equal(state.requests, 1);
  state.recovery.interact(); await state.tick(); assert.equal(state.requests, 2);
});

test("cancelled callbacks cannot clear or execute a newer recovery timer", async () => {
  const state = harness(); state.recovery.diagnostic(cancelled);
  const staleCallback = [...state.timers][0];
  state.recovery.cancel(); state.recovery.interact(); state.recovery.diagnostic(cancelled);
  staleCallback();
  state.recovery.diagnostic(cancelled); assert.equal(state.timers.size, 1);
  state.recovery.cancel(); await state.tick(); assert.equal(state.requests, 0);
});

test("an already refreshed challenge supersedes the scheduled cancellation refresh", async () => {
  const state = harness(); state.recovery.diagnostic(cancelled); state.setChallenge("fresh-from-prefetch");
  await state.tick(); assert.equal(state.requests, 0);
});

test("unrelated native diagnostics never request a challenge", async () => {
  const state = harness();
  for (const stage of ["autofill_started", "invalid_challenge", "unexpected_credential"]) state.recovery.diagnostic({ stage });
  state.recovery.interact(); await state.tick(); assert.equal(state.requests, 0);
});

test("existing Swift terminal event and challenge setter are wired through JS without focus or sheet commands", () => {
  const swift = readFileSync("modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyUsernameView.swift", "utf8");
  const wrapper = readFileSync("src/features/passkeys/NativePasskeyUsernameField.tsx", "utf8");
  const screens = readFileSync("src/features/auth/AuthFormScreens.tsx", "utf8");
  const flow = readFileSync("src/features/auth/AuthFlow.tsx", "utf8");
  assert.match(swift, /emitDiagnostic\(stage: "authorization_error", error: error as NSError\)\s*finishAuthorization\(controller\)/);
  assert.match(swift, /func setChallenge[\s\S]*?reconcileAuthorizationAndFocus\(\)/);
  assert.match(wrapper, /onDiagnostic\?\.\(\{ stage, rpId: diagnosticRpId, domain, code \}\)/);
  assert.match(screens, /onDiagnostic=\{previewNative \? onPasskeyDiagnostic : undefined\}/);
  assert.match(screens, /onTouchStart=\{previewNative \? onCredentialInteraction : undefined\}/);
  assert.match(screens, /if \(!previewNative \|\| email.trim\(\)\) setTouched\(true\)/);
  assert.match(flow, /refresh: refreshPasskeyOptions/);
  assert.match(flow, /canRearm: \(\) => isPreviewPasskeySignIn\(\)/);
  assert.match(flow, /continuePasskeyAssertion[\s\S]*?passkeyRecovery.cancel\(\)/);
  assert.match(flow, /if \(step !== "email" \|\| loading\) passkeyRecovery.cancel\(\);\s*return \(\) => passkeyRecovery.cancel\(\)/);
  assert.match(flow, /const requestCode = [\s\S]*?passkeyRecovery.cancel\(\)/);
  assert.match(flow, /onBack=\{\(\) => \{ passkeyRecovery.cancel\(\)/);
  assert.doesNotMatch(readFileSync("src/features/auth/passkeyFieldRecovery.ts", "utf8"), /\.focus\(|performRequests|setInterval/);
});
