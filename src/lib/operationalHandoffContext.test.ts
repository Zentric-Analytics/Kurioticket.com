import assert from "node:assert/strict";
import test from "node:test";
import { createOperationalHandoffContext } from "./operationalHandoffContext";

const first = "78e1de9e-6dfe-494f-9fdb-83726d83bf64";
const second = "46080b3a-d572-400e-bd8a-7de5d07cb2a5";
test("operational handoff keeps exact product and result context without any analytics consent", () => {
  const context = createOperationalHandoffContext(() => 1000);
  context.setActor("guest");
  context.remember("guest", "flight", "offer-a", first);
  context.remember("guest", "flight", "offer-b", second);
  assert.deepEqual(context.prepare("guest", "flight", "offer-a")(), { operationalRequestId: first });
  assert.deepEqual(context.prepare("guest", "flight", "offer-b")(), { operationalRequestId: second });
  assert.deepEqual(context.prepare("guest", "hotel", "offer-a")(), {});
  assert.deepEqual(context.prepare("guest", "flight", "direct-link")(), {});
});
test("account changes, replaced or missing context and expiry fail closed", () => {
  let now = 1000;
  const context = createOperationalHandoffContext(() => now);
  context.setActor("account:a");
  context.remember("account:a", "flight", "offer", first);
  const pending = context.prepare("account:a", "flight", "offer");
  context.setActor("account:b");
  context.remember("account:a", "flight", "offer", first);
  assert.deepEqual(context.prepare("account:b", "flight", "offer")(), {});
  context.setActor("account:a");
  context.remember("account:a", "flight", "offer", first);
  assert.deepEqual(pending(), {});
  const replaced = context.prepare("account:a", "flight", "offer");
  context.remember("account:a", "flight", "offer", second);
  assert.deepEqual(replaced(), {});
  context.remember("account:a", "flight", "offer", null);
  assert.deepEqual(context.prepare("account:a", "flight", "offer")(), {});
  context.remember("account:a", "flight", "offer", first);
  const expiring = context.prepare("account:a", "flight", "offer");
  now += 30 * 60_000;
  assert.deepEqual(expiring(), {});
  context.remember("account:a", "flight", "offer", "not-a-search");
  assert.deepEqual(context.prepare("account:a", "flight", "offer")(), {});
});
test("navigation references are bounded and never constitute a durable identity", () => {
  const context = createOperationalHandoffContext(() => 1000);
  context.setActor("guest");
  for (let i = 0; i < 65; i++) context.remember("guest", "flight", "offer-" + i, first);
  assert.deepEqual(context.prepare("guest", "flight", "offer-0")(), {});
  assert.deepEqual(context.prepare("guest", "flight", "offer-64")(), { operationalRequestId: first });
  context.setActor(null);
  assert.deepEqual(context.prepare("guest", "flight", "offer-64")(), {});
});
