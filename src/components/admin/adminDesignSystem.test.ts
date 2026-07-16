import assert from "node:assert/strict";
import test from "node:test";

import { formatAdminBadgeLabel } from "./adminDesignSystem";

test("formatAdminBadgeLabel converts enum-like labels to human-readable text", () => {
  assert.equal(formatAdminBadgeLabel("READY_FOR_REVIEW"), "Ready For Review");
  assert.equal(formatAdminBadgeLabel("ACTIVE"), "Active");
});

test("formatAdminBadgeLabel preserves already human-readable labels", () => {
  assert.equal(formatAdminBadgeLabel("Not live yet"), "Not live yet");
});
