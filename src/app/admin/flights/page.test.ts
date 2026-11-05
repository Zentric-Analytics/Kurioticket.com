import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const flightsPage = readFileSync("src/app/admin/flights/page.tsx", "utf8");

test("legacy Flight Operations bookmarks redirect securely to Flight Search Activity", () => {
  assert.match(flightsPage, /await requireAdminSession\("\/admin\/flights"\)/);
  assert.match(flightsPage, /redirect\("\/admin\/searches\/activity\?product=FLIGHT"\)/);
  assert.match(flightsPage, /metadata = \{ title: "Admin Search Activity" \}/);
  assert.doesNotMatch(flightsPage, /AdminPageShell|getFlightOperationsSnapshot|Recent flight searches|View flight providers|Homepage fare operations/);
});
