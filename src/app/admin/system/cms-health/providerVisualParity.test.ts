import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const providersPage = readFileSync("src/app/admin/providers/page.tsx", "utf8");
const cmsHealthPage = readFileSync("src/app/admin/system/cms-health/page.tsx", "utf8");
const cmsHealthRow = readFileSync("src/components/admin/CmsScopeHealthRow.tsx", "utf8");
const cmsActions = readFileSync("src/components/admin/CmsScopeHardeningActions.tsx", "utf8");
const adminShell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");

test("CMS Health follows Providers page visual tokens and table density", () => {
  assert.match(providersPage, /bg-white text-\[#020617\]/);
  assert.match(cmsHealthPage, /bg-white text-\[#020617\]/);

  assert.match(providersPage, /text-\[12px\] font-medium uppercase text-\[#475569\]/);
  assert.match(cmsHealthPage, /tableHeadingClass = "px-3 py-3 text-left text-\[12px\] font-medium uppercase text-\[#475569\]"/);

  assert.match(cmsHealthRow, /tableCellClass =/);
  assert.match(cmsHealthPage, /border-\[#D8E1EC\]/);
  assert.match(cmsHealthPage, /divide-y divide-\[#E7ECF5\]/);
  assert.match(cmsHealthRow, /hover:bg-\[#F8FAFC\]/);
  assert.match(cmsHealthRow, /text-\[#64748B\]/);
  assert.match(cmsHealthRow, /border-l-\[3px\] border-\[#004BB8\]/);
  assert.doesNotMatch(cmsHealthPage, />Actions<\/th>/);

  assert.doesNotMatch(cmsHealthPage, /AdminStatusBadge/);
  assert.doesNotMatch(cmsHealthPage, /bg-amber-50\/50|rounded-lg border border-amber-200/);
  assert.match(cmsHealthRow, /CmsScopeHardeningActions/);
  assert.match(cmsHealthRow, /CmsHealthInlineRepair/);
  assert.match(cmsActions, /\{pending \? "Updating…" : "Manage"\}/);
  assert.match(cmsActions, /aria-haspopup="menu"/);
  assert.match(cmsActions, /role="menu"/);
  assert.match(cmsActions, /Normalize draft order/);
  assert.match(cmsActions, /Retire fallback/);
  assert.match(cmsActions, /Reactivate fallback/);
  assert.match(cmsActions, /Resolve published CMS integrity issues first\./);
  assert.match(cmsActions, /role="menuitem"[\s\S]*aria-disabled="true"/);
  assert.match(cmsActions, /summary, a\[href\], button:not\(:disabled\), input, select, textarea/);
  assert.doesNotMatch(cmsActions, /Retire legacy fallback/);
  assert.doesNotMatch(cmsActions, /Reactivate legacy fallback/);
});


test("CMS Health uses the same continuous white Admin workspace as Providers", () => {
  assert.ok(adminShell.includes('pathname === "/admin/system/cms-health"'));
  assert.ok(adminShell.includes('pathname === "/admin/system/cms-health/"'));
  assert.match(adminShell, /whiteWorkspace \? "bg-white" : "bg-\[#f1f5fb\]"/);
});
