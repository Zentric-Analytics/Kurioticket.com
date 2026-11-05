import assert from "node:assert/strict";
import test from "node:test";

import { adminNavigation, adminNavigationGroups, getAdminNavForRole, getAdminHeaderGroups, isAdminNavItemActive } from "@/lib/adminNavigation";

const originalLabels = ["Overview", "Users", "Providers", "Search Activity", "Trips", "Trip monitoring", "Content", "Flights", "Hotels", "Cars", "Support", "Deletion Requests", "Audit Logs", "System", "CMS Health", "Email Delivery", "Notifications & Alerts", "Settings", "Homepage Fare Operations"];

test("admin navigation restores the original flat module order", () => {
  assert.deepEqual(adminNavigation.map((item) => item.label), originalLabels);
  assert.equal(adminNavigation.some((item) => ["Operations", "Monitoring", "Platform"].includes(item.label)), false);
});

test("admin navigation exposes parent workspaces in the header", () => {
  assert.deepEqual(adminNavigationGroups, [
    { label: "Operations", hrefs: ["/admin", "/admin/users", "/admin/searches/activity", "/admin/confirmed-trips", "/admin/support"] },
    { label: "Provider readiness", hrefs: ["/admin/providers", "/admin/flights"] },
    { label: "Website content", hrefs: ["/admin/content"] },
    { label: "System & security", hrefs: ["/admin/system", "/admin/settings"] },
  ]);
  const visibleHrefs: readonly string[] = adminNavigationGroups.flatMap((group) => group.hrefs);
  for (const href of ["/admin/journeys", "/admin/redirects", "/admin/referral-attribution", "/admin/flight-status", "/admin/account-deletions", "/admin/hotels", "/admin/cars", "/admin/logs"]) {
    assert.equal(visibleHrefs.includes(href), false);
  }
});

test("admin navigation preserves role restrictions", () => {
  assert.deepEqual(getAdminNavForRole("SUPPORT"), []);
  assert.deepEqual(getAdminNavForRole("ADMIN").filter((item) => item.parentHref).map((item) => [item.label, item.parentHref]), [["Trip monitoring", "/admin/confirmed-trips"], ["Hotels", "/admin/providers"], ["Cars", "/admin/providers"], ["Deletion Requests", "/admin/support"], ["Homepage Fare Operations", "/admin/flights"]]);
  assert.deepEqual(getAdminNavForRole("USER"), []);
});

test("admin navigation activates exact routes and their detail pages", () => {
  assert.equal(isAdminNavItemActive("/admin", "/admin"), true);
  assert.equal(isAdminNavItemActive("/admin", "/admin/users"), false);
  assert.equal(isAdminNavItemActive("/admin/support", "/admin/support/123"), true);
  assert.equal(isAdminNavItemActive("/admin/support", "/admin/supportive"), false);
  assert.equal(isAdminNavItemActive("/admin/confirmed-trips", "/admin/confirmed-trips/alerts"), true);
  assert.equal(isAdminNavItemActive("/admin/system", "/admin/confirmed-trips/alerts"), false);
  assert.equal(isAdminNavItemActive("/admin/system", "/admin/system/cms-health"), true);
  assert.equal(isAdminNavItemActive("/admin/notifications", "/admin/confirmed-trips/alerts"), false);
});


test("horizontal admin navigation keeps child routes under parent workspaces", () => {
  const adminGroups = getAdminHeaderGroups("ADMIN", true);
  const entries = adminGroups.flatMap((group) => group.links);
  const searches = entries.find(({ item }) => item.href === "/admin/searches/activity");
  const providers = entries.find(({ item }) => item.href === "/admin/providers");
  const trips = entries.find(({ item }) => item.href === "/admin/confirmed-trips");
  const support = entries.find(({ item }) => item.href === "/admin/support");
  const system = entries.find(({ item }) => item.href === "/admin/system");
  const flights = entries.find(({ item }) => item.href === "/admin/flights");
  const settings = entries.find(({ item }) => item.href === "/admin/settings");
  assert.deepEqual(searches?.children.map((item) => item.href), []);
  assert.deepEqual(entries.find(({ item }) => item.href === "/admin/users")?.children.map(item => item.href), []);
  assert.deepEqual(providers?.children.map((item) => item.href), ["/admin/hotels", "/admin/cars"]);
  assert.deepEqual(trips?.children.map((item) => item.href), ["/admin/confirmed-trips/monitoring"]);
  assert.deepEqual(support?.children.map((item) => item.href), ["/admin/account-deletions"]);
  assert.deepEqual(system?.children.map((item) => item.href), []);
  assert.deepEqual(flights?.children.map((item) => item.href), ["/admin/homepage-fares"]);
  assert.deepEqual(settings?.children.map((item) => item.href), []);
  assert.equal(entries.some(({ item }) => item.href === "/admin/redirects"), false);
  const supportEntries = getAdminHeaderGroups("SUPPORT").flatMap((group) => group.links);
  assert.deepEqual(supportEntries.map(({ item }) => item.label), []);
  assert.deepEqual(getAdminHeaderGroups("USER"), []);
});


test("Audit Logs, CMS Health and Email Delivery remain reachable without System child tabs", () => {
  for (const href of ["/admin/logs", "/admin/system/cms-health", "/admin/email-delivery"]) {
    const item = getAdminNavForRole("ADMIN").find(entry => entry.href === href);
    assert.ok(item);
    assert.equal(item.parentHref, undefined);
  }
  assert.equal(getAdminNavForRole("ADMIN").find(item => item.href === "/admin/logs")?.label, "Audit Logs");
});

test("global Alerts remains discoverable without belonging to a System tab or highlighting System", () => {
  const alerts = getAdminNavForRole("ADMIN").find(item => item.href === "/admin/notifications");
  assert.ok(alerts);
  assert.equal(alerts.parentHref, undefined);
  assert.deepEqual(alerts.roles, ["ADMIN"]);
  const system = getAdminHeaderGroups("ADMIN").flatMap(group => group.links).find(entry => entry.item.href === "/admin/system")!;
  assert.equal(isAdminNavItemActive(system.item.href, "/admin/notifications"), false);
  assert.equal(system.children.some(child => isAdminNavItemActive(child.href, "/admin/notifications")), false);
});

test("retired operational report routes remain available without nested menu entries", () => {
  const retired = ["/admin/journeys", "/admin/redirects", "/admin/referral-attribution"];
  for (const href of retired) {
    assert.equal(adminNavigation.some(item => item.href === href), false);
    assert.equal(getAdminHeaderGroups("ADMIN").some(group => group.links.some(link => link.item.href === href || link.children.some(child => child.href === href))), false);
  }
});


test("Flight Operations is a top-level readiness workspace and owns Homepage Fare Operations without activating Providers", () => {
  const flights = getAdminNavForRole("ADMIN").find((item) => item.href === "/admin/flights");
  assert.ok(flights);
  assert.equal(flights.parentHref, undefined);
  const homepageFares = getAdminNavForRole("ADMIN").find((item) => item.href === "/admin/homepage-fares");
  assert.ok(homepageFares);
  assert.equal(homepageFares.parentHref, "/admin/flights");

  const providers = getAdminHeaderGroups("ADMIN")
    .flatMap((group) => group.links)
    .find((entry) => entry.item.href === "/admin/providers");
  assert.ok(providers);
  assert.equal(isAdminNavItemActive(providers.item.href, "/admin/flights"), false);
  assert.equal(providers.children.some((child) => isAdminNavItemActive(child.href, "/admin/flights")), false);
});