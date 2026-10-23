import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contentPage = readFileSync("src/app/admin/content/page.tsx", "utf8");
const systemPage = readFileSync("src/app/admin/system/page.tsx", "utf8");
const settingsPage = readFileSync("src/app/admin/settings/page.tsx", "utf8");
const homepageFarePage = readFileSync("src/app/admin/homepage-fares/page.tsx", "utf8");
const refreshCard = readFileSync("src/components/admin/HomepageFaresRefreshCard.tsx", "utf8");
const statusApi = readFileSync("src/app/api/admin/homepage-fares/status/route.ts", "utf8");
const refreshApi = readFileSync("src/app/api/admin/homepage-fares/refresh/route.ts", "utf8");

test("public content management exposes homepage and FAQ CMS areas while fare operations stay separate", () => {
  assert.match(contentPage, /title="Public Content Management"/);

  for (const section of [
    "Homepage destination cards",
    "Flight route cards",
    "Hotel destination cards",
    "FAQs",
  ]) {
    assert.match(contentPage, new RegExp(section));
  }

  assert.match(contentPage, /getCmsContentScopeSummary/);
  assert.match(contentPage, /Manage FAQs/);
  assert.match(contentPage, /Manage destinations/);
  assert.match(contentPage, /Manage flight routes/);
  assert.match(contentPage, /Manage hotel destinations/);
  assert.match(contentPage, /Homepage CMS overview/);
  assert.match(contentPage, /CMS managed/);
  assert.match(contentPage, /Setup required/);
  assert.match(contentPage, /href: "\/admin\/content\/faqs"/);
  assert.doesNotMatch(contentPage, /HomepageFaresRefreshCard/);
  assert.doesNotMatch(contentPage, /Upload image|Approve content/i);
});

test("homepage fare operations are separated from content, system and settings", () => {
  assert.doesNotMatch(contentPage, /HomepageFaresRefreshCard/);
  assert.doesNotMatch(systemPage, /HomepageFaresRefreshCard/);
  assert.doesNotMatch(settingsPage, /HomepageFaresRefreshCard/);
  assert.match(settingsPage, /Feature Controls/);
  assert.match(homepageFarePage, /title="Homepage Fare Operations"/);
  assert.match(homepageFarePage, /HomepageFaresRefreshCard/);
  assert.match(homepageFarePage, /href="\/admin\/settings"/);
  assert.match(contentPage, /href="\/admin\/homepage-fares"[\s\S]*Homepage fare operations/);
  assert.doesNotMatch(contentPage, /href="\/admin\/settings"[\s\S]{0,300}Homepage fare operations/);
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
