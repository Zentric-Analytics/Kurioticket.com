import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { adminNavigation, adminNavigationGroups, getAdminNavForRole, getAdminHeaderGroups, getAdminWorkspaceSections, isAdminWorkspaceSectionActive, isAdminNavItemActive } from "@/lib/adminNavigation";

const originalLabels = ["Overview", "Users", "Providers", "Search Activity", "Trips", "Trip monitoring", "Content", "Homepage destinations", "Flight routes", "Hotel destinations", "FAQs", "Homepage Fares", "Hotels", "Cars", "Support", "Deletion Requests", "Audit Logs", "System", "Platform Health", "CMS Health", "Email Delivery", "Settings", "Visitor Journeys", "Platforms & Devices", "Provider Handoffs", "Referral Attribution"];

test("admin navigation restores the flat module order without a duplicate Flights workspace", () => {
  assert.deepEqual(adminNavigation.map((item) => item.label), originalLabels);
  assert.equal(adminNavigation.some((item) => item.href === "/admin/flights"), false);
  assert.equal(adminNavigation.some((item) => ["Operations", "Monitoring", "Platform"].includes(item.label)), false);
});

test("admin navigation exposes parent workspaces in the header", () => {
  assert.deepEqual(adminNavigationGroups, [
    { label: "Operations", hrefs: ["/admin", "/admin/users", "/admin/searches/activity", "/admin/confirmed-trips", "/admin/support"] },
    { label: "Provider readiness", hrefs: ["/admin/providers"] },
    { label: "Website content", hrefs: ["/admin/content"] },
    { label: "System & security", hrefs: ["/admin/system", "/admin/platform-health", "/admin/settings"] },
  ]);
  const visibleHrefs: readonly string[] = adminNavigationGroups.flatMap((group) => group.hrefs);
  for (const href of ["/admin/journeys", "/admin/redirects", "/admin/referral-attribution", "/admin/flight-status", "/admin/flights", "/admin/account-deletions", "/admin/hotels", "/admin/cars", "/admin/logs", "/admin/email-delivery", "/admin/homepage-fares"]) {
    assert.equal(visibleHrefs.includes(href), false);
  }
});

test("admin navigation preserves role restrictions", () => {
  assert.deepEqual(getAdminNavForRole("SUPPORT"), []);
  assert.deepEqual(getAdminNavForRole("ADMIN").filter((item) => item.parentHref).map((item) => [item.label, item.parentHref]), [
    ["Trip monitoring", "/admin/confirmed-trips"],
    ["Homepage destinations", "/admin/content"], ["Flight routes", "/admin/content"],
    ["Hotel destinations", "/admin/content"], ["FAQs", "/admin/content"],
    ["Homepage Fares", "/admin/providers"],
    ["Hotels", "/admin/providers"], ["Cars", "/admin/providers"], ["Deletion Requests", "/admin/support"],
    ["Audit Logs", "/admin/system"], ["CMS Health", "/admin/system"], ["Email Delivery", "/admin/system"],
    ["Visitor Journeys", "/admin/users"], ["Platforms & Devices", "/admin/users"], ["Provider Handoffs", "/admin/searches/activity"],
    ["Referral Attribution", "/admin/providers"],
  ]);
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
  const homepageFares = entries.find(({ item }) => item.href === "/admin/homepage-fares");
  const settings = entries.find(({ item }) => item.href === "/admin/settings");
  assert.deepEqual(searches?.children.map((item) => item.href), ["/admin/redirects"]);
  assert.deepEqual(entries.find(({ item }) => item.href === "/admin/users")?.children.map(item => item.href), ["/admin/journeys", "/admin/users/platforms-devices"]);
  assert.deepEqual(providers?.children.map((item) => item.href), ["/admin/homepage-fares", "/admin/hotels", "/admin/cars", "/admin/referral-attribution"]);
  assert.deepEqual(trips?.children.map((item) => item.href), ["/admin/confirmed-trips/monitoring"]);
  assert.deepEqual(entries.find(({ item }) => item.href === "/admin/content")?.children.map(item => item.href), [
    "/admin/content/homepage/destinations", "/admin/content/homepage/flight-routes",
    "/admin/content/homepage/hotel-destinations", "/admin/content/faqs",
  ]);
  assert.deepEqual(support?.children.map((item) => item.href), ["/admin/account-deletions"]);
  assert.deepEqual(system?.children.map((item) => item.href), ["/admin/logs", "/admin/system/cms-health", "/admin/email-delivery"]);
  assert.equal(entries.filter(({ item }) => item.href === "/admin/platform-health").length, 1, "Platform Health belongs in the horizontal navbar");
  assert.equal(homepageFares, undefined, "Homepage Fares must not appear in the admin header");
  assert.deepEqual(settings?.children.map((item) => item.href), ["/admin/preview-testers"], "staging-only Team Access is owned by Settings");
  assert.equal(entries.some(({ item }) => item.href === "/admin/flights"), false);
  assert.equal(entries.some(({ item }) => item.href === "/admin/redirects"), false);
  const supportEntries = getAdminHeaderGroups("SUPPORT").flatMap((group) => group.links);
  assert.deepEqual(supportEntries.map(({ item }) => item.label), []);
  assert.deepEqual(getAdminHeaderGroups("USER"), []);
});

test("System diagnostic pages keep their canonical System owner while Platform Health is independently reachable", () => {
  for (const href of ["/admin/logs", "/admin/system/cms-health", "/admin/email-delivery"]) {
    const item = getAdminNavForRole("ADMIN").find(entry => entry.href === href);
    assert.ok(item);
    assert.equal(item.parentHref, "/admin/system");
  }
  assert.equal(getAdminNavForRole("ADMIN").find(entry => entry.href === "/admin/platform-health")?.parentHref, undefined);
  assert.ok(getAdminHeaderGroups("ADMIN").flatMap(group => group.links).some(entry => entry.item.href === "/admin/platform-health"));
  assert.ok(!getAdminWorkspaceSections("/admin/system", "ADMIN")?.links.some(link => link.href === "/admin/platform-health"));
});

test("Notifications has one Settings sidebar owner rather than a duplicate global nav destination", () => {
  assert.equal(getAdminNavForRole("ADMIN").some(item => item.href === "/admin/notifications"), false);
  assert.equal(getAdminNavForRole("ADMIN").some(item => item.href === "/admin/settings/notifications"), false);
  const system = getAdminHeaderGroups("ADMIN").flatMap(group => group.links).find(entry => entry.item.href === "/admin/system")!;
  assert.equal(isAdminNavItemActive(system.item.href, "/admin/settings/notifications"), false);
  assert.equal(system.children.some(child => isAdminNavItemActive(child.href, "/admin/settings/notifications")), false);
  assert.equal(isAdminNavItemActive("/admin/settings", "/admin/settings/notifications"), true);
});

test("secondary routes are owned by a single parent workspace", () => {
  const expectations = [
    ["/admin/users", ["Users Directory", "Visitor Journeys", "Platforms & Devices"]],
    ["/admin/journeys/fixture", ["Users Directory", "Visitor Journeys", "Platforms & Devices"]],
    ["/admin/users/platforms-devices", ["Users Directory", "Visitor Journeys", "Platforms & Devices"]],
    ["/admin/searches/activity", ["Search Records", "Provider Handoffs"]],
    ["/admin/redirects", ["Search Records", "Provider Handoffs"]],
    ["/admin/support", ["Support Tickets", "Deletion Requests"]],
    ["/admin/account-deletions/fixture", ["Support Tickets", "Deletion Requests"]],
    ["/admin/confirmed-trips", ["Trips Directory", "Trip Monitoring"]],
    ["/admin/confirmed-trips/monitoring", ["Trips Directory", "Trip Monitoring"]],
    ["/admin/confirmed-trips/records", ["Trips Directory", "Trip Monitoring"]],
    ["/admin/content", ["Content Overview", "Homepage Destinations", "Flight Routes", "Hotel Destinations", "FAQs"]],
    ["/admin/content/faqs", ["Content Overview", "Homepage Destinations", "Flight Routes", "Hotel Destinations", "FAQs"]],
    ["/admin/content/homepage/destinations", ["Content Overview", "Homepage Destinations", "Flight Routes", "Hotel Destinations", "FAQs"]],
    ["/admin/providers", ["Provider Health", "Hotels", "Cars", "Homepage Fares", "Referral Attribution"]],
    ["/admin/hotels", ["Provider Health", "Hotels", "Cars", "Homepage Fares", "Referral Attribution"]],
    ["/admin/homepage-fares/routes", ["Provider Health", "Hotels", "Cars", "Homepage Fares", "Referral Attribution"]],
    ["/admin/referral-attribution", ["Provider Health", "Hotels", "Cars", "Homepage Fares", "Referral Attribution"]],
    ["/admin/system", ["System Overview", "Audit Logs", "CMS Health", "Email Delivery"]],
    ["/admin/email-delivery", ["System Overview", "Audit Logs", "CMS Health", "Email Delivery"]],
  ] as const;
  for (const [path, labels] of expectations) {
    assert.deepEqual(getAdminWorkspaceSections(path, "ADMIN")?.links.map((link) => link.label), [...labels], path);
  }
  assert.equal(getAdminWorkspaceSections("/admin/platform-health", "ADMIN"), null, "Standalone Platform Health is not a System subsection");
  assert.equal(getAdminWorkspaceSections("/admin/settings", "ADMIN"), null);
  assert.equal(getAdminWorkspaceSections("/admin/confirmed-trips/monitoring", "ADMIN")?.label, "Trips");
  assert.equal(getAdminWorkspaceSections("/admin/content", "ADMIN")?.label, "Content");
  assert.equal(getAdminWorkspaceSections("/admin/users", "SUPPORT"), null);
  assert.equal(getAdminWorkspaceSections("/admin/system", "USER"), null);
});
test("staging-only Team Access remains separate from permanently available routes", () => {
  assert.equal(getAdminNavForRole("ADMIN", false).some(item => item.href === "/admin/preview-testers"), false);
  assert.equal(getAdminNavForRole("ADMIN", true).find(item => item.href === "/admin/preview-testers")?.parentHref, "/admin/settings");
  assert.equal(getAdminHeaderGroups("ADMIN", true).some(group => group.links.some(entry => entry.item.href === "/admin/preview-testers")), false);
});

test("contextual tabs highlight the actual current subsection, including nested detail routes", () => {
  const examples: Array<[string, string, boolean]> = [
    ["/admin/users", "/admin/users", true],
    ["/admin/journeys/abc", "/admin/journeys", true],
    ["/admin/journeys", "/admin/users", false],
    ["/admin/users/platforms-devices", "/admin/users", false],
    ["/admin/users/platforms-devices", "/admin/users/platforms-devices", true],
    ["/admin/users/user/example123/devices", "/admin/users", false],
    ["/admin/users/user/example123/devices", "/admin/users/platforms-devices", true],
    ["/admin/users/user/example123/activity", "/admin/users", true],
    ["/admin/searches/activity", "/admin/searches/activity", true],
    ["/admin/searches/a1b2c3", "/admin/searches/activity", true],
    ["/admin/redirects/a1b2c3", "/admin/redirects", true],
    ["/admin/redirects", "/admin/searches/activity", false],
    ["/admin/confirmed-trips", "/admin/confirmed-trips", true],
    ["/admin/confirmed-trips/records", "/admin/confirmed-trips", true],
    ["/admin/confirmed-trips/monitoring", "/admin/confirmed-trips/monitoring", true],
    ["/admin/confirmed-trips/monitoring", "/admin/confirmed-trips", false],
    ["/admin/content", "/admin/content", true],
    ["/admin/content/faqs/specific", "/admin/content/faqs", true],
    ["/admin/content/faqs/specific", "/admin/content", false],
    ["/admin/providers", "/admin/providers", true],
    ["/admin/hotels", "/admin/providers", false],
    ["/admin/homepage-fares/routes", "/admin/homepage-fares", true],
    ["/admin/referral-attribution", "/admin/providers?view=attribution", true],
    ["/admin/system", "/admin/system", true],
    ["/admin/platform-health", "/admin/platform-health", true],
    ["/admin/platform-health", "/admin/system", false],
    ["/admin/system/cms-health", "/admin/system", false],
    ["/admin/system/cms-health", "/admin/system/cms-health", true],
    ["/admin/email-delivery", "/admin/logs", false],
  ];
  for (const [path, target, selected] of examples) {
    assert.equal(isAdminWorkspaceSectionActive(path, target), selected, path + " -> " + target);
  }
});

test("Hotel and Car search records remain in Providers, without redirecting to Search Activity or Users", () => {
  for (const [product, path] of [
    ["HOTEL", "src/app/admin/hotels/page.tsx"],
    ["CAR", "src/app/admin/cars/page.tsx"],
  ] as const) {
    const source = readFileSync(path, "utf8");
    assert.equal(source.includes("ProductSearchJumpLink"), false);
    assert.ok(source.includes(`<ProductSearchRecordsPanel product="${product}"`));
    assert.equal(source.includes("/admin/searches/"), false);
    assert.equal(source.includes("/admin/journeys"), false);
  }
});
