import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contentPage = readFileSync("src/app/admin/content/page.tsx", "utf8");
const homepageOperationsPage = readFileSync("src/app/admin/homepage-operations/page.tsx", "utf8");
const adminLayout = readFileSync("src/app/admin/layout.tsx", "utf8");
const systemPage = readFileSync("src/app/admin/system/page.tsx", "utf8");
const settingsPage = readFileSync("src/app/admin/settings/page.tsx", "utf8");
const refreshCard = readFileSync("src/components/admin/HomepageFaresRefreshCard.tsx", "utf8");
const statusApi = readFileSync("src/app/api/admin/homepage-fares/status/route.ts", "utf8");
const refreshApi = readFileSync("src/app/api/admin/homepage-fares/refresh/route.ts", "utf8");

test("Content Inventory retains content sections without homepage fare operations", () => {
  assert.match(contentPage, /title="Content Inventory"/);
  assert.match(contentPage, /Review the public content currently available across Kurioticket\./);
  assert.doesNotMatch(contentPage, /HomepageFaresRefreshCard|homepage fare|Production readiness|Cron status|Public market coverage/i);

  for (const section of [
    "Homepage destination cards",
    "Flight route cards",
    "Hotel destination cards",
    "Car pickup cards",
    "FAQs",
    "Trust messages",
  ]) {
    assert.match(contentPage, new RegExp(section));
  }

  assert.doesNotMatch(contentPage, /Public Content Management/);
  assert.doesNotMatch(contentPage, /Content Management/);
  assert.doesNotMatch(contentPage, /Create content|Edit content|Delete content|Upload image|Approve content/i);
});

test("Homepage Operations route renders the existing operational dashboard", () => {
  assert.match(homepageOperationsPage, /export default function AdminHomepageOperationsPage/);
  assert.match(homepageOperationsPage, /title="Homepage Operations"/);
  assert.match(homepageOperationsPage, /Monitor homepage fare readiness, refresh activity, market coverage and operational health\./);
  assert.match(homepageOperationsPage, /<HomepageFaresRefreshCard \/>/);

  for (const section of [
    "Production readiness dashboard",
    "Global readiness at a glance",
    "Refresh homepage fares",
    "Reload status",
    "Cron status",
    "Public market coverage",
    "Missing routes",
    "Failed routes",
    "Fresh provider-backed fares",
    "Timeout count",
    "Replacement candidates used",
    "Provider calls used",
  ]) {
    assert.match(refreshCard, new RegExp(section, "i"));
  }
});

test("Homepage Operations keeps the existing admin permission boundary", () => {
  assert.match(adminLayout, /requireAdminSession\("\/admin"\)/);
  assert.doesNotMatch(homepageOperationsPage, /requireAdminSession|roles|permissions|authorization/i);
});

test("System page owns settings visibility without restoring homepage fare refresh", () => {
  assert.doesNotMatch(systemPage, /HomepageFaresRefreshCard/);
  assert.match(systemPage, /Admin Configuration/);
  assert.match(systemPage, /Feature Flags/);
  assert.doesNotMatch(systemPage, /homepage fare/i);
  assert.match(settingsPage, /redirect\("\/admin\/system"\)/);
  assert.doesNotMatch(settingsPage, /HomepageFaresRefreshCard/);
});

test("homepage fare refresh component keeps existing client APIs, scopes, and status messaging", () => {
  assert.ok(refreshCard.includes('fetch("/api/admin/homepage-fares/status"'));
  assert.ok(refreshCard.includes('fetch("/api/admin/homepage-fares/refresh"'));
  assert.match(refreshCard, /Loading homepage fare snapshot status/);
  assert.match(refreshCard, /Could not refresh homepage fares/);
  assert.match(refreshCard, /Refresh homepage fares/);
});

test("homepage fare admin APIs preserve authorization, audit logging, and refresh scope behavior", () => {
  assert.match(statusApi, /requireAdminApiSession\(\)/);
  assert.match(statusApi, /readHomepageFareSnapshotStatus\(\)/);

  assert.match(refreshApi, /requireAdminApiSession\(\)/);
  assert.match(refreshApi, /refreshPhase3AHomepageFareSnapshots/);
  assert.match(refreshApi, /writeAdminAuditLog/);
  assert.match(refreshApi, /HOMEPAGE_FARES_REFRESHED/);
  assert.match(refreshApi, /targetType: AUDIT_TARGET_TYPE/);
  for (const scope of ["popular", "discover", "discover-default", "discover-first-6", "all-phase-3a"]) {
    assert.match(refreshApi, new RegExp(scope));
  }
});
