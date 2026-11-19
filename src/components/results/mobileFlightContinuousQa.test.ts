import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
test("mobile Flight QA measures continuous virtual rows and asserts pagination is absent",()=>{
 const qa=readFileSync("qa/mobile-web/tests/flights.spec.ts","utf8");
 assert.doesNotMatch(qa,/data-mobile-paginated-flight-results/);assert.match(qa,/data-mobile-continuous-flight-results/);assert.match(qa,/data-virtual-results/);assert.match(qa,/data-virtual-index/);assert.match(qa,/paginationPresent\)\.toBe\(false\)/);
});
