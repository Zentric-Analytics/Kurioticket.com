import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");
const hotels = readFileSync("src/app/admin/hotels/page.tsx", "utf8");
const platform = readFileSync("src/components/admin/PlatformHealthDashboard.tsx", "utf8");
const metrics = readFileSync("src/components/admin/PlatformActivitySummary.tsx", "utf8");
const cms = readFileSync("src/app/admin/system/cms-health/page.tsx", "utf8");

test("Platform Health and Hotels share a white workspace and restrained typography", () => {
  assert.match(shell, /pathname === "\/admin\/platform-health"/);
  assert.match(shell, /pathname === "\/admin\/platform-health\/"/);
  assert.match(hotels, /max-w-\[1500px\] bg-white text-\[#020617\]/);
  assert.match(platform, /max-w-\[1500px\] bg-white text-\[#020617\]/);
  assert.match(platform, /border-\[#D8E1EC\]/);
  assert.match(platform, /OperationsSection/);
  assert.match(metrics, /min-w-\[0\]|min-w-0/);
  assert.match(metrics, /grid-cols-2/);
  assert.match(platform, /grid-cols-3/);
});

test("CMS Health presents all four authoritative summary totals horizontally", () => {
  assert.match(cms, /max-w-\[1500px\] bg-white text-\[#020617\]/);
  assert.match(cms, /aria-label="CMS health metrics"/);
  assert.match(cms, /min-w-0 grid-cols-2/);
  for (const value of ["overview.totals.healthy", "overview.totals.unhealthy", "overview.totals.retiredFallback", "overview.totals.scopes"]) {
    assert.ok(cms.includes(value), value);
  }
  assert.match(cms, /overview\.scopes\.filter/);
  assert.match(cms, /<CmsScopeHealthRow/);
  assert.match(cms, /overflow-x-auto/);
  assert.match(cms, /sm:grid-cols-4/);
});
