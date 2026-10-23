import assert from "node:assert/strict";
import test from "node:test";

import { adminNavigation, adminNavigationGroups, getAdminNavForRole, getAdminHeaderGroups, isAdminNavItemActive } from "@/lib/adminNavigation";

const originalLabels = ["Overview", "Users", "Providers", "Searches", "Journeys", "Provider Handoffs", "Referral Attribution", "Trips", "Flight Status", "Content", "Flights", "Hotels", "Cars", "Support", "Deletion Requests", "Logs", "System", "Email Delivery", "Notifications & Alerts", "Settings", "Homepage Fare Operations"];

test("admin navigation restores the original flat module order", () => {
  assert.deepEqual(adminNavigation.map((item) => item.label), originalLabels);
  assert.equal(adminNavigation.some((item) => ["Operations", "Monitoring", "Platform"].includes(item.label)), false);
});

test("admin navigation exposes parent workspaces in the header", () => {
  assert.deepEqual(adminNavigationGroups, [
    { label: "Operations", hrefs: ["/admin", "/admin/users", "/admin/searches", "/admin/confirmed-trips", "/admin/support"] },
    { label: "Provider readiness", hrefs: ["/admin/providers"] },
    { label: "Website content", hrefs: ["/admin/content"] },
    { label: "System & security", hrefs: ["/admin/system", "/admin/settings"] },
  ]);
  const visibleHrefs: readonly string[] = adminNavigationGroups.flatMap((group) => group.hrefs);
  for (const href of ["/admin/journeys", "/admin/redirects", "/admin/referral-attribution", "/admin/flight-status", "/admin/account-deletions", "/admin/flights", "/admin/hotels", "/admin/cars", "/admin/logs"]) {
    assert.equal(visibleHrefs.includes(href), false);
  }
});

test("admin navigation preserves role restrictions", () => {
  assert.deepEqual(getAdminNavForRole("SUPPORT"), []);
  assert.deepEqual(getAdminNavForRole("ADMIN").filter((item) => item.parentHref).map((item) => [item.label, item.parentHref]), [["Journeys", "/admin/searches"], ["Provider Handoffs", "/admin/searches"], ["Referral Attribution", "/admin/searches"], ["Flight Status", "/admin/confirmed-trips"], ["Flights", "/admin/providers"], ["Hotels", "/admin/providers"], ["Cars", "/admin/providers"], ["Deletion Requests", "/admin/support"], ["Logs", "/admin/system"], ["Email Delivery", "/admin/system"], ["Notifications & Alerts", "/admin/system"], ["Homepage Fare Operations", "/admin/settings"]]);
  assert.deepEqual(getAdminNavForRole("USER"), []);
});

test("admin navigation activates exact routes and their detail pages", () => {
  assert.equal(isAdminNavItemActive("/admin", "/admin"), true);
  assert.equal(isAdminNavItemActive("/admin", "/admin/users"), false);
  assert.equal(isAdminNavItemActive("/admin/support", "/admin/support/123"), true);
  assert.equal(isAdminNavItemActive("/admin/support", "/admin/supportive"), false);
});


test("horizontal admin navigation keeps child routes under parent workspaces", () => {
  const adminGroups = getAdminHeaderGroups("ADMIN", true);
  const entries = adminGroups.flatMap((group) => group.links);
  const searches = entries.find(({ item }) => item.href === "/admin/searches");
  const providers = entries.find(({ item }) => item.href === "/admin/providers");
  const trips = entries.find(({ item }) => item.href === "/admin/confirmed-trips");
  const support = entries.find(({ item }) => item.href === "/admin/support");
  const system = entries.find(({ item }) => item.href === "/admin/system");
  const settings = entries.find(({ item }) => item.href === "/admin/settings");
  assert.deepEqual(searches?.children.map((item) => item.href), ["/admin/journeys", "/admin/redirects", "/admin/referral-attribution"]);
  assert.deepEqual(providers?.children.map((item) => item.href), ["/admin/flights", "/admin/hotels", "/admin/cars"]);
  assert.deepEqual(trips?.children.map((item) => item.href), ["/admin/flight-status"]);
  assert.deepEqual(support?.children.map((item) => item.href), ["/admin/account-deletions"]);
  assert.deepEqual(system?.children.map((item) => item.href), ["/admin/logs", "/admin/email-delivery", "/admin/notifications"]);
  assert.deepEqual(settings?.children.map((item) => item.href), ["/admin/homepage-fares"]);
  assert.equal(entries.some(({ item }) => item.href === "/admin/redirects"), false);
  assert.equal(entries.some(({ item }) => item.href === "/admin/flights"), false);
  const supportEntries = getAdminHeaderGroups("SUPPORT").flatMap((group) => group.links);
  assert.deepEqual(supportEntries.map(({ item }) => item.label), []);
  assert.deepEqual(getAdminHeaderGroups("USER"), []);
});
