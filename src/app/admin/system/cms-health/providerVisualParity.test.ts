import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const providersPage = readFileSync("src/app/admin/providers/page.tsx", "utf8");
const cmsHealthPage = readFileSync("src/app/admin/system/cms-health/page.tsx", "utf8");
const cmsActions = readFileSync("src/components/admin/CmsScopeHardeningActions.tsx", "utf8");
const adminShell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");

test("CMS Health follows Providers page visual tokens and table density", () => {
  assert.match(providersPage, /bg-white text-\[#020617\]/);
  assert.match(cmsHealthPage, /bg-white text-\[#020617\]/);

  assert.match(providersPage, /text-\[12px\] font-medium uppercase text-\[#475569\]/);
  assert.match(cmsHealthPage, /tableHeadingClass = "px-3 py-3 text-left text-\[12px\] font-medium uppercase text-\[#475569\]"/);

  assert.match(cmsHealthPage, /tableCellClass = "px-3 py-3 align-middle text-\[13px\] text-\[#020617\]"/);
  assert.match(cmsHealthPage, /border-\[#D8E1EC\]/);
  assert.match(cmsHealthPage, /divide-y divide-\[#E7ECF5\]/);
  assert.match(cmsHealthPage, /hover:bg-\[#F8FAFC\]/);
  assert.match(cmsHealthPage, /text-\[#64748B\]/);

  assert.doesNotMatch(cmsHealthPage, /AdminStatusBadge/);
  assert.doesNotMatch(cmsHealthPage, /bg-amber-50\/50|rounded-lg border border-amber-200/);
  assert.match(cmsActions, /size="sm"/);
  assert.match(cmsActions, /className="rounded-lg font-medium"/);
});


test("CMS Health uses the same continuous white Admin workspace as Providers", () => {
  assert.ok(adminShell.includes('pathname === "/admin/system/cms-health"'));
  assert.ok(adminShell.includes('pathname === "/admin/system/cms-health/"'));
  assert.match(adminShell, /whiteWorkspace \? "bg-white" : "bg-\[#f1f5fb\]"/);
});
