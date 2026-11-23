import assert from "node:assert/strict";
import test from "node:test";
import { shareProductLink } from "./shareProductLink";
const details = { title: "Travel result", url: "https://example.com/travel/details" };
test("native browser sharing reports completion only when the promise resolves", async () => {
  let copies = 0;
  assert.equal(await shareProductLink(details, { share: async () => undefined, copy: async () => { copies++; } }), "shared");
  assert.equal(copies, 0);
});
test("unavailable native sharing falls back to an actual confirmed clipboard copy", async () => {
  let copied = "";
  assert.equal(await shareProductLink(details, {
    share: async () => { throw new Error("NotAllowedError"); },
    copy: async url => { copied = url; },
  }), "copied");
  assert.equal(copied, details.url);
});
test("cancelled share does not attempt copy or claim success", async () => {
  let copied = false;
  assert.equal(await shareProductLink(details, {
    share: async () => { throw Object.assign(new Error("Cancelled"), { name: "AbortError" }); },
    copy: async () => { copied = true; },
  }), "cancelled");
  assert.equal(copied, false);
});
test("copy failure and unsupported browser are reported accurately", async () => {
  assert.equal(await shareProductLink(details, { copy: async () => { throw new Error("Denied"); } }), "unavailable");
  assert.equal(await shareProductLink(details, {}), "unavailable");
});
