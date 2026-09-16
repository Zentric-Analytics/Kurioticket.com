import assert from "node:assert/strict";
import test from "node:test";

import { nativeFareBenefitRows } from "./nativeFareBenefitPresentation";

test("KAYAK completion preserves non-first checked-bag facts ahead of placeholders", () => {
  const rows = nativeFareBenefitRows([
    { category: "baggage", semantic: "positive", text: "1 carry-on included" },
    { category: "baggage", semantic: "negative", text: "second checked bag not included · USD 50.00" },
  ], "one-way", 3, { ensureStandardRows: true });

  assert.deepEqual(rows.map(({ title }) => title), [
    "Carry-on baggage",
    "Checked baggage",
    "Change/refund rules",
  ]);
  assert.equal(rows[1]?.semantic, "negative");
  assert.match(rows[1]?.detail ?? "", /second checked bag not included/i);
  assert.match(rows[1]?.detail ?? "", /USD 50\.00/);
  assert.notEqual(rows[1]?.detail, "Not supplied by provider");
  assert.equal(rows[2]?.detail, "Not supplied by provider");
});
