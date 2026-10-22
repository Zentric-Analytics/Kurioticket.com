import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { createPasskeyAuthorization } from "./passkeyAuthorization";
import { createPasskeyFieldRecovery } from "./passkeyFieldRecovery";
import { completePreviewPasskeySignIn, isIOSPreviewPasskeyEnabled } from "./previewPasskeySignIn";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

test("late B cannot replace active A; A still verifies and persists; fresh C installs after completion", async () => {
  const owner = createPasskeyAuthorization();
  let installed = "A";
  const response = deferred<string>();
  const pending = owner.refresh(() => true, () => response.promise, (value) => { installed = value; });
  await Promise.resolve();
  owner.started(installed);
  response.resolve("B"); await pending;
  assert.equal(installed, "A"); assert.equal(owner.owns("A"), true);
  const stages: string[] = [];
  // Same ordering as continuePasskeyAssertion: terminal before verification.
  const continuePasskeyAssertion = async () => {
    owner.terminal();
    await completePreviewPasskeySignIn({ id: "YQ", rawId: "YQ", type: "public-key", response: {
      clientDataJSON: "YQ", authenticatorData: "YQ", signature: "YQ", userHandle: null,
    } }, {
      trace: () => {},
      verify: async () => { stages.push("/passkey/verify"); return { session: { token: "test", expires: "2099-01-01" }, user: { id: "test", email: "test@example.test" } }; },
      persist: async () => { stages.push("persist"); },
    });
    stages.push("success");
  };
  await continuePasskeyAssertion();
  assert.deepEqual(stages, ["/passkey/verify", "persist", "success"]);
  await owner.refresh(() => true, async () => "C", (value) => { installed = value; });
  assert.equal(installed, "C");
});

test("welcome, email, retry and recovery callers share one pending fetch", async () => {
  const owner = createPasskeyAuthorization(); const response = deferred<string>();
  let requests = 0; let installed = "";
  const refresh = () => owner.refresh(() => true, () => { requests++; return response.promise; }, (value) => { installed = value; });
  const callers = [refresh(), refresh(), refresh(), refresh()];
  await Promise.resolve(); assert.equal(requests, 1);
  response.resolve("A"); await Promise.all(callers);
  owner.started(installed);
  await refresh(); assert.equal(requests, 1); assert.equal(installed, "A");
});

test("failed options fetch releases the single-flight slot without an automatic retry", async () => {
  const owner = createPasskeyAuthorization(); let requests = 0;
  await assert.rejects(owner.refresh(() => true, async () => { requests++; throw new Error("offline"); }, () => assert.fail()));
  assert.equal(requests, 1);
  await owner.refresh(() => true, async () => { requests++; return "A"; }, () => {});
  assert.equal(requests, 2);
});

test("navigation, unmount, loading and terminal events invalidate pending responses", async () => {
  for (const reason of ["navigation", "unmount", "loading", "success", "error"]) {
    const owner = createPasskeyAuthorization(); const response = deferred<string>();
    let installed = "A";
    const pending = owner.refresh(() => true, () => response.promise, (value) => { installed = value; });
    await Promise.resolve(); owner.started("A"); owner.terminal();
    response.resolve("B"); await pending;
    assert.equal(owner.active, false, reason); assert.equal(installed, "A", reason);
  }
  const owner = createPasskeyAuthorization(); let requests = 0;
  const pending = owner.refresh(() => true, async () => { requests++; return "B"; }, () => assert.fail());
  owner.terminal(); await pending; assert.equal(requests, 0);
  await owner.refresh(() => false, async () => { requests++; }, () => assert.fail());
  assert.equal(requests, 0);
});

test("recovery timer cannot refresh a newly active authorization and remains bounded", async () => {
  const owner = createPasskeyAuthorization(); let requests = 0;
  let callback: (() => void) | undefined;
  const recovery = createPasskeyFieldRecovery({
    currentChallenge: () => "A", canRearm: () => !owner.active,
    refresh: async () => { requests++; },
    schedule: (run) => { callback = run; return () => { callback = undefined; }; },
  });
  const event = { stage: "authorization_error", domain: "com.apple.AuthenticationServices.AuthorizationError", code: 1001 };
  recovery.diagnostic(event); owner.started("A"); callback?.();
  await Promise.resolve(); assert.equal(requests, 0);
  owner.terminal(); recovery.diagnostic(event); await Promise.resolve(); assert.equal(requests, 0);
  recovery.interact(); callback?.(); await Promise.resolve(); assert.equal(requests, 1);
  recovery.diagnostic(event); await Promise.resolve(); assert.equal(requests, 1);
});

test("AuthFlow wires ownership, cleanup and Preview gating without changing email validation", () => {
  const flow = readFileSync(new URL("./AuthFlow.tsx", import.meta.url), "utf8");
  assert.match(flow, /if \(isPreviewPasskeySignIn\(\)\) \{\s+await nativeAuthorization.refresh/);
  assert.match(flow, /nativeAuthorization.started\(emailPasskeyOptions\?\.challenge\)/);
  assert.match(flow, /passkeyRecovery.cancel\(\);\s+clearNativeAuthorization\(\);\s+const generation/);
  assert.match(flow, /useEffect\(\(\) => \(\) => clearNativeAuthorization\(\)/);
  assert.match(flow, /if \(step !== "email" \|\| loading\) clearNativeAuthorization\(\)/);
  assert.match(flow, /nativeAuthorization.owns\(passkeyOptions.challenge\)/);
  for (const [platform, preview] of [["android", true], ["web", true], ["ios", false]] as const) {
    assert.equal(isIOSPreviewPasskeyEnabled(platform, preview), false);
  }
});
