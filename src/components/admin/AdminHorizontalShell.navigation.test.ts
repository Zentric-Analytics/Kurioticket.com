import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getAdminHeaderGroups, isAdminNavItemActive } from "@/lib/adminNavigation";

const shell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");

test("official logo stays beside Admin title at every width, never in the navigation row", () => {
  assert.match(shell, /import \{ KurioticketLogo \} from/);
  assert.match(shell, /Official Kurioticket mark stays in the top-left header beside the title at every width/);
  assert.match(shell, /<Link href="\/admin" aria-label="Kurioticket Admin overview"/);
  assert.match(shell, /<KurioticketLogo variant="mark" className="h-11 w-11"/);
  assert.match(shell, /pl-2 pr-4 sm:pr-6 lg:pr-10/);
  const navigation = shell.slice(shell.indexOf("function Navigation("), shell.indexOf("export function AdminHorizontalShell("));
  assert.doesNotMatch(navigation, /KurioticketLogo/);
  assert.equal((shell.match(/<KurioticketLogo\b/g) || []).length, 1);
});

test("selected tabs change only the underline, without text, icon, weight, or background overrides", () => {
  assert.match(shell, /const style = "text-slate-600 hover:bg-slate-50"/);
  assert.match(shell, /const underline = selected/);
  assert.match(shell, /after:h-0\.5 after:rounded-full after:bg-indigo-600/);
  assert.doesNotMatch(shell, /const style = selected \?/);
  assert.doesNotMatch(shell, /bg-indigo-50 text-indigo-700/);
  assert.match(shell, /\+ style \+ underline/g);
  assert.equal(isAdminNavItemActive("/admin", "/admin"), true);
  assert.equal(isAdminNavItemActive("/admin", "/admin/users"), false);
});

test("navigation keeps role-aware child pages and restores desktop tabs before 1100px", () => {
  assert.match(shell, /min-\[1100px\]:block/);
  assert.match(shell, /min-\[1100px\]:hidden/);
  assert.match(shell, /min-\[1600px\]:gap-2/);
  assert.match(shell, /min-\[1800px\]:gap-3/);
  assert.doesNotMatch(shell, /overflow-x-auto overscroll-x-contain/);
  assert.match(shell, /flex w-full flex-wrap items-center/);
  assert.doesNotMatch(shell, /flex min-w-max w-full flex-nowrap/);
  assert.doesNotMatch(shell, /createPortal/);
  assert.match(shell, /Official Kurioticket mark stays in the top-left header beside the title at every width/);
  assert.doesNotMatch(shell, /min-\[1440px\]/);
  const groups = getAdminHeaderGroups("ADMIN", true);
  const entries = groups.flatMap(group => group.links);
  const searches = entries.find(({ item }) => item.href === "/admin/searches");
  const support = entries.find(({ item }) => item.href === "/admin/support");
  assert.deepEqual(searches?.children, []);
  assert.deepEqual(support?.children, []);
  assert.equal(entries.some(({ item }) => item.href === "/admin/preview-testers"), true);
  for (const href of ["/admin/journeys", "/admin/redirects", "/admin/referral-attribution", "/admin/account-deletions"]) {
    assert.equal(entries.some(({ item }) => item.href === href), true);
  }
  // Current dev intentionally hides Admin navigation from support roles.
  assert.deepEqual(getAdminHeaderGroups("SUPPORT"), []);
});
