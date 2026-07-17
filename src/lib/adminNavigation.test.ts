import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  adminHubs,
  adminNavigation,
  getActiveAdminHub,
  getAdminHubDestinations,
  getAdminHubsForRole,
  getAdminNavbarHubsForRole,
  getAdminNavForRole,
  isAdminNavItemActive,
} from "@/lib/adminNavigation";

const shell = readFileSync("src/components/admin/AdminPageShell.tsx", "utf8");
const operationsPage = readFileSync("src/app/admin/operations/page.tsx", "utf8");
const monitoringPage = readFileSync("src/app/admin/monitoring/page.tsx", "utf8");
const platformPage = readFileSync("src/app/admin/platform/page.tsx", "utf8");
const usersPage = readFileSync("src/app/admin/users/page.tsx", "utf8");

function labelsForHub(hub: "operations" | "monitoring" | "platform", role: "ADMIN" | "SUPPORT" | "USER") {
  return getAdminHubDestinations(hub, role).map((item) => item.label);
}

test("admin shell removes the permanent sidebar and 280px reserved desktop grid", () => {
  assert.doesNotMatch(shell, /AdminSidebar/);
  assert.doesNotMatch(shell, /<aside/);
  assert.doesNotMatch(shell, /lg:grid-cols-\[280px_1fr\]/);
  assert.doesNotMatch(shell, /Search users, searches, providers/);
  assert.doesNotMatch(shell, /Notifications unavailable/);
  assert.doesNotMatch(shell, /No notifications/);
});

test("admin navbar exposes the brand as the only visible Overview destination", () => {
  assert.deepEqual(getAdminHubsForRole("ADMIN").map((hub) => hub.label), ["Overview", "Operations", "Monitoring", "Platform"]);
  assert.deepEqual(getAdminNavbarHubsForRole("ADMIN").map((hub) => hub.label), ["Operations", "Monitoring", "Platform"]);
  assert.equal(adminHubs.find((hub) => hub.key === "overview")?.showInNavbar, false);
  assert.match(shell, /Kurioticket Admin/);
  assert.match(shell, /href="\/admin"/);
  assert.match(shell, /aria-label="Go to Admin Overview"/);
  assert.match(shell, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(shell, /const active = pathname === "\/admin"/);
  assert.match(shell, /aria-label="Admin navigation"/);
  assert.doesNotMatch(shell, /sectionLabels/);
});

test("desktop and mobile navigation omit the separate visible Overview item", () => {
  assert.equal(getAdminNavbarHubsForRole("ADMIN").some((hub) => hub.label === "Overview"), false);
  assert.equal(getAdminNavbarHubsForRole("SUPPORT").some((hub) => hub.label === "Overview"), false);
  assert.equal(getAdminNavbarHubsForRole("USER").length, 0);
  assert.match(shell, /const hubs = getAdminNavbarHubsForRole\(safeRole\)/);
  assert.match(shell, /hubs\.map\(\(hub\) => <AdminHubNavLink key=\{hub\.key\} hub=\{hub\} \/>\)/);
  assert.match(shell, /hubs\.map\(\(hub\) => <AdminHubNavLink key=\{hub\.key\} hub=\{hub\} onNavigate=\{\(\) => setMobileOpen\(false\)\} mobile \/>\)/);
  assert.match(shell, /<AdminBrandLink onNavigate=\{\(\) => setMobileOpen\(false\)\} \/>/);
});

test("hub pages contain the correct destination links and flat row affordance", () => {
  assert.deepEqual(labelsForHub("operations", "ADMIN"), ["Users", "Support", "Account Deletions"]);
  assert.deepEqual(labelsForHub("monitoring", "ADMIN"), ["Searches", "Provider Handoffs", "Admin Logs"]);
  assert.deepEqual(labelsForHub("platform", "ADMIN"), ["Providers", "Content Inventory", "System"]);

  for (const page of [operationsPage, monitoringPage, platformPage]) {
    assert.match(page, /ArrowRight/);
    assert.match(page, /border-b border-slate-100/);
    assert.doesNotMatch(page, /AdminMetricCard/);
  }
});

test("active top-level navigation works for hub, child and detail routes", () => {
  assert.equal(getActiveAdminHub("/admin"), "overview");
  assert.equal(getActiveAdminHub("/admin/operations"), "operations");
  assert.equal(getActiveAdminHub("/admin/users"), "operations");
  assert.equal(getActiveAdminHub("/admin/support/123"), "operations");
  assert.equal(getActiveAdminHub("/admin/account-deletions/123"), "operations");
  assert.equal(getActiveAdminHub("/admin/monitoring"), "monitoring");
  assert.equal(getActiveAdminHub("/admin/searches"), "monitoring");
  assert.equal(getActiveAdminHub("/admin/redirects"), "monitoring");
  assert.equal(getActiveAdminHub("/admin/logs"), "monitoring");
  assert.equal(getActiveAdminHub("/admin/platform"), "platform");
  assert.equal(getActiveAdminHub("/admin/providers"), "platform");
  assert.equal(getActiveAdminHub("/admin/content"), "platform");
  assert.equal(getActiveAdminHub("/admin/system"), "platform");
  assert.equal(isAdminNavItemActive("/admin/support", "/admin/supportive"), false);
});

test("role restrictions are preserved and SUPPORT does not see restricted destinations", () => {
  assert.deepEqual(labelsForHub("operations", "SUPPORT"), ["Users", "Support"]);
  assert.deepEqual(labelsForHub("monitoring", "SUPPORT"), ["Searches"]);
  assert.deepEqual(labelsForHub("platform", "SUPPORT"), []);
  assert.deepEqual(getAdminHubsForRole("SUPPORT").map((hub) => hub.label), ["Overview", "Operations", "Monitoring"]);
  assert.deepEqual(getAdminNavbarHubsForRole("SUPPORT").map((hub) => hub.label), ["Operations", "Monitoring"]);
  assert.deepEqual(getAdminHubsForRole("USER"), []);
  assert.equal(getAdminNavForRole("USER").length, 0);
});

test("direct existing admin routes remain unchanged while hub routes are added", () => {
  assert.match(usersPage, /export default async function AdminUsersPage/);
  assert.ok(adminNavigation.some((item) => item.href === "/admin" && item.label === "Overview"));
  assert.ok(adminNavigation.some((item) => item.href === "/admin/users"));
  assert.ok(adminHubs.some((hub) => hub.href === "/admin/operations"));
  assert.ok(adminHubs.some((hub) => hub.href === "/admin/monitoring"));
  assert.ok(adminHubs.some((hub) => hub.href === "/admin/platform"));
});

test("mobile menu is accessible, closes on navigation and profile uses System link", () => {
  assert.match(shell, /aria-expanded=\{mobileOpen\}/);
  assert.match(shell, /aria-controls="admin-mobile-menu"/);
  assert.match(shell, /onNavigate=\{\(\) => setMobileOpen\(false\)\}/);
  assert.match(shell, /min-h-11/);
  assert.match(shell, /AdminProfileMenu/);
  assert.match(shell, /href="\/admin\/system" label="System"/);
  assert.doesNotMatch(shell, /href="\/admin\/settings"/);
});
