import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync("src/app/admin/searches/page.tsx", "utf8");

test("Searches landing page is a four-card two-column workspace", () => {
  assert.match(workspace, /grid grid-cols-2 gap-5/);
  assert.match(workspace, /max-w-\[1180px\]/);
  for (const title of ["Search Activity", "Journeys", "Provider Handoffs", "Referral Attribution"]) {
    assert.equal(workspace.includes(title), true, title);
  }
});

test("Searches workspace cards use pointer affordance and purple hover border without CTA text", () => {
  assert.match(workspace, /cursor-pointer/);
  assert.match(workspace, /hover:border-violet-600/);
  assert.match(workspace, /focus-visible:border-violet-600/);
  assert.doesNotMatch(workspace, />Open</);
  assert.doesNotMatch(workspace, /Admin operations/);
  assert.doesNotMatch(workspace, /Review recorded search activity through the safe admin read contract/);
});


test("legacy filtered Searches URLs forward into Search Activity", () => {
  assert.match(workspace, /redirect\("\/admin\/searches\/activity\?" \+ legacy\.toString\(\)\)/);
  assert.match(workspace, /new URLSearchParams\(\)/);
  assert.match(workspace, /if \(legacy\.size > 0\)/);
});
