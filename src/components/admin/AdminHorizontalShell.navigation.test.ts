import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getAdminHeaderGroups, isAdminNavItemActive } from "@/lib/adminNavigation";

const shell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");

test("admin navigation uses existing official brand assets, not a fabricated KT mark", () => {
  assert.match(shell, /import \{ KurioticketLogo \} from/);
  assert.match(shell, /<KurioticketLogo variant="full"/);
  assert.match(shell, /<KurioticketLogo variant="mark"/);
  assert.match(shell, /href="\/admin" onClick=\{close\} aria-label="Kurioticket Admin overview"/);
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

test("navigation keeps the same role-aware subpages and uses a compact fallback before the desktop row overflows", () => {
  assert.match(shell, /min-\[1440px\]:block/);
  assert.match(shell, /min-\[1440px\]:hidden/);
  assert.match(shell, /min-\[1600px\]:gap-2/);
  assert.match(shell, /min-\[1800px\]:gap-3/);
  const groups = getAdminHeaderGroups("ADMIN", true);
  const entries = groups.flatMap(group => group.links);
  const searches = entries.find(({ item }) => item.href === "/admin/searches");
  const support = entries.find(({ item }) => item.href === "/admin/support");
  assert.deepEqual(searches?.children.map(child => child.href), [
    "/admin/journeys", "/admin/redirects", "/admin/referral-attribution",
  ]);
  assert.deepEqual(support?.children.map(child => child.href), ["/admin/account-deletions"]);
  assert.equal(entries.some(({ item }) => item.href === "/admin/preview-testers"), true);
  const supportGroups = getAdminHeaderGroups("SUPPORT");
  assert.deepEqual(supportGroups.flatMap(group => group.links).map(({ item }) => item.label), [
    "Overview", "Users", "Searches", "Support",
  ]);
});
