import assert from "node:assert/strict";
import test from "node:test";
import { acceptCanonicalResults, canonicalResultsWereSilentlyLost } from "./canonicalResultAcceptance";

test("canonical results cannot silently become a genuine empty state", () => {
  const acceptance = acceptCanonicalResults([{ id: "safe" }, { id: "unsafe" }], (result) => result.id === "safe");
  assert.equal(acceptance.canonicalCount, 2);
  assert.deepEqual(acceptance.accepted, [{ id: "safe" }]);
  assert.deepEqual(acceptance.rejectedIds, ["unsafe"]);
  assert.equal(canonicalResultsWereSilentlyLost(acceptance), false);

  const lost = acceptCanonicalResults([{ id: "canonical" }], () => false);
  assert.equal(canonicalResultsWereSilentlyLost(lost), true);
});

test("a canonical zero-result response remains a genuine empty state", () => {
  const empty = acceptCanonicalResults([], () => false);
  assert.equal(empty.canonicalCount, 0);
  assert.equal(canonicalResultsWereSilentlyLost(empty), false);
});

test("partial rejection preserves accepted inventory and rejected diagnostics", () => {
  const acceptance = acceptCanonicalResults(
    [{ id: "safe-a" }, { id: "unsafe" }, { id: "safe-b" }],
    (result) => result.id !== "unsafe",
  );
  assert.equal(acceptance.canonicalCount, 3);
  assert.deepEqual(acceptance.accepted, [{ id: "safe-a" }, { id: "safe-b" }]);
  assert.deepEqual(acceptance.rejectedIds, ["unsafe"]);
  assert.equal(canonicalResultsWereSilentlyLost(acceptance), false);
});
test("malformed rows cannot throw away valid inventory from another supplier", () => {
  const rows = [null, undefined, "invalid", { id: "valid" }] as unknown as { id: string }[];
  const accepted = acceptCanonicalResults(rows, row => row.id === "valid");
  assert.deepEqual(accepted.accepted, [{ id: "valid" }]); assert.equal(accepted.rejectedIds.length, 3);
});
