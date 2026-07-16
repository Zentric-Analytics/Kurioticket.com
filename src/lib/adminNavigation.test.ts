import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { adminNavigation, isAdminNavItemActive } from "@/lib/adminNavigation";

const navLabels = adminNavigation.map((item) => item.label);
const navHrefs = adminNavigation.map((item) => item.href);
const shell = readFileSync("src/components/admin/AdminPageShell.tsx", "utf8");
const accountDeletionsPage = readFileSync("src/app/admin/account-deletions/page.tsx", "utf8");
const redirectsPage = readFileSync("src/app/admin/redirects/page.tsx", "utf8");
const logsPage = readFileSync("src/app/admin/logs/page.tsx", "utf8");
const bookingsPage = readFileSync("src/app/admin/bookings/page.tsx", "utf8");

function itemByHref(href: string) {
  const item = adminNavigation.find((candidate) => candidate.href === href);
  assert.ok(item, `Expected ${href} to be in admin navigation`);
  return item;
}

test("admin navigation inventory exposes existing workflows without restoring legacy product pages", () => {
  assert.ok(navLabels.includes("Account Deletions"));
  assert.ok(navLabels.includes("Provider Handoffs"));
  assert.ok(navLabels.includes("Providers"));
  assert.ok(navLabels.includes("Searches"));
  assert.ok(navLabels.includes("Admin Logs"));
  assert.ok(navLabels.includes("Support"));
  assert.ok(navLabels.includes("Users"));
  assert.ok(navLabels.includes("Content Inventory"));
  assert.equal(navLabels.includes("Content"), false);
  assert.equal(itemByHref("/admin/content").label, "Content Inventory");

  assert.equal(navLabels.includes("Bookings"), false);
  assert.equal(navHrefs.includes("/admin/bookings"), false);
  assert.match(bookingsPage, /export default function AdminBookingsPage/);
  assert.match(bookingsPage, /title="Booking Operations"/);

  assert.equal(navHrefs.includes("/admin/flights"), false);
  assert.equal(navHrefs.includes("/admin/hotels"), false);
  assert.equal(navHrefs.includes("/admin/cars"), false);
});

test("admin navigation order and labels preserve ownership boundaries", () => {
  assert.equal(navLabels.indexOf("Support"), navLabels.indexOf("Users") + 1);
  assert.equal(navLabels.indexOf("Account Deletions"), navLabels.indexOf("Support") + 1);
  assert.equal(navLabels.indexOf("Provider Handoffs"), navLabels.indexOf("Searches") + 1);
  assert.equal(navLabels.indexOf("Admin Logs"), navLabels.indexOf("Provider Handoffs") + 1);
  assert.equal(navLabels.indexOf("Content Inventory"), navLabels.indexOf("Admin Logs") + 1);
  assert.equal(navLabels.indexOf("System"), navLabels.indexOf("Content Inventory") + 1);
  assert.equal(navLabels.includes("Settings"), false);
  assert.equal(navHrefs.includes("/admin/settings"), false);

  assert.equal(itemByHref("/admin/account-deletions").section, "operations");
  assert.equal(itemByHref("/admin/searches").section, "observability");
  assert.equal(itemByHref("/admin/redirects").section, "observability");
  assert.equal(itemByHref("/admin/logs").section, "observability");
  assert.equal(itemByHref("/admin/content").section, "content");
  assert.deepEqual(itemByHref("/admin/content").roles, ["ADMIN"]);
});

test("admin navigation active matching handles nested routes without unrelated prefix matches", () => {
  assert.equal(isAdminNavItemActive("/admin/account-deletions", "/admin/account-deletions"), true);
  assert.equal(isAdminNavItemActive("/admin/account-deletions", "/admin/account-deletions/example-id"), true);
  assert.equal(isAdminNavItemActive("/admin/redirects", "/admin/redirects"), true);
  assert.equal(isAdminNavItemActive("/admin/logs", "/admin/logs"), true);
  assert.equal(isAdminNavItemActive("/admin/content", "/admin/content"), true);
  assert.equal(isAdminNavItemActive("/admin/content", "/admin/content/example-id"), true);
  assert.equal(isAdminNavItemActive("/admin/support", "/admin/support/example-id"), true);
  assert.equal(isAdminNavItemActive("/admin/bookings", "/admin/bookings"), true);

  assert.equal(isAdminNavItemActive("/admin", "/admin/support"), false);
  assert.equal(isAdminNavItemActive("/admin/support", "/admin/supportive"), false);
  assert.equal(isAdminNavItemActive("/admin/logs", "/admin/logs-export"), false);
});

test("admin navigation role metadata does not expose admin-only log workflows to users", () => {
  for (const href of ["/admin/account-deletions", "/admin/redirects", "/admin/logs"]) {
    assert.deepEqual(itemByHref(href).roles, ["ADMIN"]);
  }

  const userVisible = adminNavigation.filter((item) => item.roles.includes("USER"));
  assert.deepEqual(userVisible, []);
});

test("admin page semantics distinguish lifecycle, provider handoff, and audit responsibilities", () => {
  assert.match(accountDeletionsPage, /title="Account Deletions"/);
  assert.match(accountDeletionsPage, /Manage account deletion requests and review lifecycle status\./);

  assert.match(redirectsPage, /title="Provider Handoffs"/);
  assert.match(redirectsPage, /Review outbound redirects from Kurioticket to external providers\./);
  assert.doesNotMatch(redirectsPage, /Redirect Management/);

  assert.match(logsPage, /title="Admin Logs"/);
  assert.match(logsPage, /Review administrative and security-sensitive actions\./);
});

test("admin sidebar keeps mobile and accessibility affordances for added navigation", () => {
  assert.match(shell, /overflow-x-auto/);
  assert.match(shell, /aria-label="Admin navigation"/);
  assert.match(shell, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(shell, /aria-hidden="true"/);
  assert.match(shell, /whitespace-nowrap/);
});
