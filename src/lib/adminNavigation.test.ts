import assert from "node:assert/strict";
import test from "node:test";

import { adminNavigation, adminNavigationGroups, getAdminNavForRole, getAdminHeaderGroups, isAdminNavItemActive } from "@/lib/adminNavigation";

const originalLabels = ["Overview", "Users", "Providers", "Searches", "Journeys", "Provider Handoffs", "Referral Attribution", "Confirmed Trips", "Flight Status", "Content", "Flights", "Hotels", "Cars", "Support", "Deletion Requests", "Logs", "System", "Settings"];

test("admin navigation restores the original flat module order", () => {
  assert.deepEqual(adminNavigation.map((item) => item.label), originalLabels);
  assert.equal(adminNavigation.some((item) => ["Operations", "Monitoring", "Platform"].includes(item.label)), false);
});

test("admin navigation uses the exact original section labels and grouping", () => {
  assert.deepEqual(adminNavigationGroups, [
    { label: "Operations", hrefs: ["/admin", "/admin/users", "/admin/searches", "/admin/journeys", "/admin/redirects", "/admin/referral-attribution", "/admin/confirmed-trips", "/admin/flight-status", "/admin/support", "/admin/account-deletions"] },
    { label: "Provider readiness", hrefs: ["/admin/providers", "/admin/flights", "/admin/hotels", "/admin/cars"] },
    { label: "Website content", hrefs: ["/admin/content"] },
    { label: "System & security", hrefs: ["/admin/logs", "/admin/system", "/admin/settings"] },
  ]);
  const visibleHrefs: readonly string[] = adminNavigationGroups.flatMap((group) => group.hrefs);
  assert.equal(visibleHrefs.includes("/admin/account-deletions"), true);
  assert.equal(visibleHrefs.includes("/admin/redirects"), true);
  assert.equal(visibleHrefs.includes("/admin/confirmed-trips"), true);
  assert.equal(visibleHrefs.includes("/admin/flight-status"), true);
});

test("admin navigation preserves role restrictions", () => {
  assert.deepEqual(getAdminNavForRole("SUPPORT"), []);
  assert.deepEqual(getAdminNavForRole("ADMIN").filter((item) => item.parentHref).map((item) => [item.label, item.parentHref]), [["Journeys", "/admin/searches"], ["Provider Handoffs", "/admin/searches"], ["Referral Attribution", "/admin/searches"], ["Deletion Requests", "/admin/support"]]);
  assert.deepEqual(getAdminNavForRole("USER"), []);
});

test("admin navigation activates exact routes and their detail pages", () => {
  assert.equal(isAdminNavItemActive("/admin", "/admin"), true);
  assert.equal(isAdminNavItemActive("/admin", "/admin/users"), false);
  assert.equal(isAdminNavItemActive("/admin/support", "/admin/support/123"), true);
  assert.equal(isAdminNavItemActive("/admin/support", "/admin/supportive"), false);
});


test("horizontal admin navigation groups preserve child routes and permissions", () => {
  const adminGroups = getAdminHeaderGroups("ADMIN", true);
  const entries = adminGroups.flatMap((group) => group.links);
  const searches = entries.find(({ item }) => item.href === "/admin/searches");
  const support = entries.find(({ item }) => item.href === "/admin/support");
  assert.deepEqual(searches?.children.map((child) => child.href), ["/admin/journeys", "/admin/redirects", "/admin/referral-attribution"]);
  assert.deepEqual(support?.children.map((child) => child.href), ["/admin/account-deletions"]);
  assert.equal(entries.some(({ item }) => item.href === "/admin/redirects"), false);
  assert.equal(entries.some(({ item }) => item.href === "/admin/account-deletions"), false);
  assert.equal(entries.some(({ item }) => item.href === "/admin/preview-testers"), true);
  const supportEntries = getAdminHeaderGroups("SUPPORT").flatMap((group) => group.links);
  assert.deepEqual(supportEntries.map(({ item }) => item.label), ["Overview", "Users", "Searches", "Support"]);
  assert.equal(supportEntries.some(({ children }) => children.length > 0), false);
  assert.deepEqual(getAdminHeaderGroups("USER"), []);
});
