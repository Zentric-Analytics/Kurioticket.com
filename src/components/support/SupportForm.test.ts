import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/support/SupportForm.tsx", "utf8");

test("SupportForm handles network and JSON parsing failures safely", () => {
  assert.match(source, /try \{\n\s+const response = await fetch\("\/api\/support\/tickets"/);
  assert.match(source, /try \{\n\s+data = await response\.json\(\);/);
  assert.match(source, /catch \(error\) \{\n\s+console\.warn\("\[support\] Unable to submit support request"/);
  assert.match(source, /setStatus\(t\("supportFormErrorFallback"\)\);/);
});
