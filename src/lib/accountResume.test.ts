import assert from "node:assert/strict";
import test from "node:test";
import { observeAccountResume } from "./accountResume";
test("browser resume coalesces focus/visibility and respects hidden tabs and cleanup", () => {
  let time = 0, refreshes = 0;
  const handlers = new Map<string, () => void>();
  const target = { addEventListener: (name: string, fn: () => void) => handlers.set(name, fn), removeEventListener: (name: string) => handlers.delete(name) };
  const page = { ...target, visibilityState: "visible" };
  const stop = observeAccountResume(() => { refreshes++; }, target as never, page as never, () => time);
  handlers.get("focus")!(); handlers.get("visibilitychange")!(); assert.equal(refreshes, 1);
  time = 300; page.visibilityState = "hidden"; handlers.get("focus")!(); assert.equal(refreshes, 1);
  page.visibilityState = "visible"; handlers.get("visibilitychange")!(); assert.equal(refreshes, 2);
  stop(); assert.equal(handlers.size, 0);
});
