import assert from "node:assert/strict";
import test from "node:test";

import { getCmsDropdownBelow } from "./adminCmsDropdownPosition";

test("a narrow airport list stays exactly aligned with its field", () => {
  const list = getCmsDropdownBelow({ left: 112, bottom: 256, width: 136 }, 844);
  assert.deepEqual(list, { left: 112, top: 255, width: 136, maxHeight: 232 });
});

test("limited space below shortens the list instead of moving it above", () => {
  const list = getCmsDropdownBelow({ left: 16, bottom: 780, width: 343 }, 844);
  assert.equal(list.top, 779);
  assert.equal(list.maxHeight, 56);
  assert.equal(list.left + list.width, 359);
});

test("opening at the viewport edge never produces a negative height or an upward menu", () => {
  for (const bottom of [836, 844, 870]) {
    const list = getCmsDropdownBelow({ left: 24, bottom, width: 320 }, 844);
    assert.equal(list.top, bottom - 1);
    assert.equal(list.maxHeight, 0);
  }
});
