import assert from "node:assert/strict";
import test from "node:test";

import { adminNavigation, adminNavigationGroups, getAdminNavForRole, isAdminNavItemActive } from "@/lib/adminNavigation";

const originalLabels = ["Overview", "Users", "Providers", "Searches", "Content", "Flights", "Hotels", "Cars", "Support", "Logs", "System", "Settings"];

test("admin navigation restores the original flat module order", () => {
  assert.deepEqual(adminNavigation.map((item) => item.label), originalLabels);
  assert.equal(adminNavigation.some((item) => ["Operations", "Monitoring", "Platform"].includes(item.label)), false);
});

test("admin navigation uses the exact original section labels and grouping", () => {
  assert.deepEqual(adminNavigationGroups, [
    { label: "Operations", hrefs: ["/admin", "/admin/users", "/admin/searches", "/admin/support"] },
    { label: "Provider readiness", hrefs: ["/admin/providers", "/admin/flights", "/admin/hotels", "/admin/cars"] },
    { label: "Website content", hrefs: ["/admin/content"] },
    { label: "System & security", hrefs: ["/admin/logs", "/admin/system", "/admin/settings"] },
  ]);
  const visibleHrefs = adminNavigationGroups.flatMap((group) => group.hrefs);
  assert.equal(visibleHrefs.includes("/admin/account-deletions"), false);
  assert.equal(visibleHrefs.includes("/admin/redirects"), false);
});

test("admin navigation preserves role restrictions", () => {
  assert.deepEqual(getAdminNavForRole("SUPPORT").map((item) => item.label), ["Overview", "Users", "Searches", "Support"]);
  assert.deepEqual(getAdminNavForRole("USER"), []);
});

test("admin navigation activates exact routes and their detail pages", () => {
  assert.equal(isAdminNavItemActive("/admin", "/admin"), true);
  assert.equal(isAdminNavItemActive("/admin", "/admin/users"), false);
  assert.equal(isAdminNavItemActive("/admin/support", "/admin/support/123"), true);
  assert.equal(isAdminNavItemActive("/admin/support", "/admin/supportive"), false);
});
