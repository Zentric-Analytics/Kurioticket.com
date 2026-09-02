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
