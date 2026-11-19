import assert from "node:assert/strict";
import test from "node:test";
import { createProviderHandoffMetadata } from "./providerHandoffClient";
import { createJourneyEventSender, readJourneySelection, rememberJourneySelection } from "./journeyEventClient";

const searchId = "78e1de9e-6dfe-494f-9fdb-83726d83bf64";
const actionId = "46080b3a-d572-400e-bd8a-7de5d07cb2a5";

test("one handoff retains the actual original search ID and the same UUID through retried dispatches", () => {
  let generated = 0;
  const metadata = createProviderHandoffMetadata(() => searchId, () => { generated += 1; return actionId; });
  assert.deepEqual(metadata(), { handoffId: actionId, requestId: searchId });
  assert.deepEqual(metadata(), { handoffId: actionId, requestId: searchId });
  assert.equal(generated, 1);
});

test("context-free and malformed search references stay uncorrelated without synthesizing a search ID", () => {
  for (const requestId of [null, undefined, "", "mobile-search-123", `${searchId}:hotel`, ` ${searchId}`, "https://provider.test"]) {
    assert.deepEqual(createProviderHandoffMetadata(() => requestId, () => actionId)(), { handoffId: actionId });
  }
});

test("withdrawal or replaced search context drops correlation permanently while preserving the handoff receipt", () => {
  let requestId: string | null = searchId;
  const metadata = createProviderHandoffMetadata(() => requestId, () => actionId);
  requestId = null;
  assert.deepEqual(metadata(), { handoffId: actionId });
  requestId = searchId;
  assert.deepEqual(metadata(), { handoffId: actionId }, "a retried old action cannot regain attribution");
});

test("web selection context is actor-scoped, expires, and cannot survive an account or consent generation change", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  let allowed = true;
  const sender = createJourneyEventSender({ allowed: () => allowed, eventId: () => actionId, request: async () => Response.json({ accepted: true }) });
  sender.setContext("guest");
  sender.setConsent(true);
  rememberJourneySelection("flight", "original-result", searchId, "guest", storage, 1000);
  const prepare = (now = 1001, actor = "guest") => {
    const context = sender.captureContext();
    return createProviderHandoffMetadata(() => context !== null && sender.captureContext() === context
      ? readJourneySelection("flight", "original-result", actor, storage, now) : null, () => actionId);
  };
  assert.equal(prepare()().requestId, searchId);
  assert.equal(prepare(1000 + 30 * 60_000)().requestId, undefined);
  assert.equal(prepare(1001, "user:other")().requestId, undefined);
  const pendingAction = prepare();
  sender.setContext("user:other"); sender.setConsent(true);
  assert.equal(pendingAction().requestId, undefined);
  sender.setContext("guest"); sender.setConsent(true);
  const beforeRefusal = prepare();
  allowed = false; sender.setConsent(false);
  allowed = true; sender.setConsent(true);
  assert.equal(beforeRefusal().requestId, undefined, "even an unobserved withdrawal/regrant invalidates the old action");
});

test("unconfirmed consent and later grants do not retrospectively correlate a handoff", () => {
  let current: string | null = null;
  const metadata = createProviderHandoffMetadata(() => current, () => actionId);
  current = searchId;
  assert.deepEqual(metadata(), { handoffId: actionId });
});

test("unavailable UUID or optional storage cannot block the provider action", () => {
  const unavailable = () => { throw new Error("unavailable"); };
  assert.deepEqual(createProviderHandoffMetadata(unavailable, () => actionId)(), { handoffId: actionId });
  assert.deepEqual(createProviderHandoffMetadata(() => searchId, unavailable)(), { requestId: searchId });
  assert.deepEqual(createProviderHandoffMetadata(() => null, () => "invalid")(), {});
});

test("separate logical actions receive separate receipts even for the same search", () => {
  let sequence = 0;
  const createId = () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;
  assert.notEqual(createProviderHandoffMetadata(() => searchId, createId)().handoffId,
    createProviderHandoffMetadata(() => searchId, createId)().handoffId);
});
