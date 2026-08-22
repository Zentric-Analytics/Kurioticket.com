import assert from "node:assert/strict";
import test from "node:test";
import { startProfileSessionReconciliation, type ProfileSessionState } from "./profileSessionReconciliation";

const session = { user: { id: "user-1" } };
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function harness({ initialSession = null as typeof session | null, guest = false } = {}) {
  const states: ProfileSessionState[] = [];
  let listener: (value: typeof session | null) => void = () => {};
  const stop = startProfileSessionReconciliation({
    readSession: async () => initialSession,
    readOnboardingCompleted: async () => guest,
    subscribeSession: (next) => {
      listener = next;
      return () => { listener = () => {}; };
    },
    onState: (state) => states.push(state),
  });
  return { states, stop, publish: (value: typeof session | null) => listener(value) };
}

test("Profile initial session hydrates authenticated", async () => {
  const profile = harness({ initialSession: session });
  await flush();
  assert.deepEqual(profile.states, ["authenticated"]);
  profile.stop();
});

test("Profile initial completed onboarding hydrates guest", async () => {
  const profile = harness({ guest: true });
  await flush();
  assert.deepEqual(profile.states, ["guest"]);
  profile.stop();
});

test("mounted guest Profile reacts immediately to a new session", async () => {
  const profile = harness({ guest: true });
  await flush();
  profile.publish(session);
  assert.deepEqual(profile.states, ["guest", "authenticated"]);
  profile.stop();
});

test("authenticated Profile reconciles a cleared session to guest", async () => {
  const profile = harness({ initialSession: session, guest: true });
  await flush();
  profile.publish(null);
  await flush();
  assert.deepEqual(profile.states, ["authenticated", "guest"]);
  profile.stop();
});

test("stale initial hydration cannot overwrite a newer session event", async () => {
  let resolveSession!: (value: typeof session | null) => void;
  let resolveGuest!: (value: boolean) => void;
  const states: ProfileSessionState[] = [];
  let listener: (value: typeof session | null) => void = () => {};
  const stop = startProfileSessionReconciliation({
    readSession: () => new Promise((resolve) => { resolveSession = resolve; }),
    readOnboardingCompleted: () => new Promise((resolve) => { resolveGuest = resolve; }),
    subscribeSession: (next) => { listener = next; return () => { listener = () => {}; }; },
    onState: (state) => states.push(state),
  });
  listener(session);
  resolveSession(null);
  resolveGuest(true);
  await flush();
  assert.deepEqual(states, ["authenticated"]);
  stop();
});
