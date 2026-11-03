import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { homepageCmsListNavigation, faqCmsListNavigation, contentEditorHref } from "@/lib/adminContentNavigation";

const contentPage = readFileSync("src/app/admin/content/page.tsx", "utf8");
const systemPage = readFileSync("src/app/admin/system/page.tsx", "utf8");
const settingsPage = readFileSync("src/app/admin/settings/page.tsx", "utf8");
const homepageFarePage = readFileSync("src/app/admin/homepage-fares/page.tsx", "utf8");
const refreshCard = readFileSync("src/components/admin/HomepageFaresRefreshCard.tsx", "utf8");
const statusApi = readFileSync("src/app/api/admin/homepage-fares/status/route.ts", "utf8");
const refreshApi = readFileSync("src/app/api/admin/homepage-fares/refresh/route.ts", "utf8");

test("public content management exposes homepage and FAQ CMS areas while fare operations stay separate", () => {
  assert.match(contentPage, /<ContentPageFrame title="Content"/);

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
  assert.doesNotMatch(contentPage, /Homepage CMS overview|Homepage fare operations|CMS Health/);
  assert.match(contentPage, /contentScopeStatus\(destinationSummary\)/);
  assert.match(contentPage, /contentScopeStatus\(flightSummary\)/);
  assert.match(contentPage, /contentScopeStatus\(hotelSummary\)/);
  assert.match(contentPage, /publishedContentCount\(destinationSummary\)/);
  assert.match(contentPage, /Published CMS records/);
  assert.match(contentPage, /Review homepage CMS setup/);
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
  assert.doesNotMatch(contentPage, /\/admin\/homepage-fares/);
  assert.match(settingsPage, /href="\/admin\/homepage-fares"/);
  assert.match(settingsPage, /Homepage Fare Operations/);
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

test("content overview groups three homepage areas and FAQs without hiding actions", () => {
  assert.match(contentPage, /const homepageAreas = contentAreas\.filter\(\(area\) => area\.section === "homepage"\)/);
  assert.match(contentPage, /const helpAreas = contentAreas\.filter\(\(area\) => area\.section === "help"\)/);
  assert.equal((contentPage.match(/section: "homepage" as const/g) ?? []).length, 3);
  assert.equal((contentPage.match(/section: "help" as const/g) ?? []).length, 1);
  assert.match(contentPage, /aria-labelledby="homepage-content-heading"/);
  assert.match(contentPage, /aria-labelledby="help-content-heading"/);
  assert.match(contentPage, /sm:grid-cols-2 lg:grid-cols-3/);
  assert.match(contentPage, /ContentSectionHeading>Homepage content/);
  assert.match(contentPage, /ContentSectionHeading>Help &amp; information/);
  assert.match(contentPage, /ContentStatusPill status=\{area\.status\}/);
  assert.doesNotMatch(contentPage, /Content management shortcuts/);
  assert.match(contentPage, /href=\{area\.href\}/);
  assert.match(contentPage, /\{area\.note\}/);
  assert.match(contentPage, /\{area\.status\}/);
  assert.match(contentPage, /\{area\.value\}/);
});

test("Content published count uses the published scope, not a draft's scope", () => {
  const cms = readFileSync("src/services/cmsContentService.ts", "utf8");
  assert.match(cms, /publishedInScope/);
  assert.match(cms, /db\.cmsContentItem\.count\(\{/);
  assert.match(cms, /publishedMarket: parsedMarket\.data/);
  assert.match(cms, /publishedLocale: parsedLocale\.data/);
  assert.match(cms, /publishedPayload: \{ not: Prisma\.DbNull \}/);
  assert.match(contentPage, /summary\.publishedInScope/);
});

test("Content returns to the actual source and only retains allowlisted filters", () => {
  const direct = homepageCmsListNavigation("destinations", { market: "US", status: "PUBLISHED", q: "Paris", cursor: "page_one" });
  assert.equal(direct.backHref, "/admin/content");
  assert.equal(direct.listHref, "/admin/content/homepage/destinations?market=US&status=PUBLISHED&cursor=page_one&q=Paris");
  assert.equal(contentEditorHref("/admin/content/homepage/destinations/new", direct.query),
    "/admin/content/homepage/destinations/new?market=US&status=PUBLISHED&cursor=page_one&q=Paris");

  const fromOverview = homepageCmsListNavigation("flight-routes", { market: "US", from: "overview" });
  assert.equal(fromOverview.backHref, "/admin/content/homepage");
  assert.equal(fromOverview.backLabel, "Back to homepage content");
  assert.equal(fromOverview.listHref, "/admin/content/homepage/flight-routes?market=US&from=overview");

  const unsafe = homepageCmsListNavigation("hotel-destinations", {
    market: "invalid", status: "not-valid", cursor: "https://example.com", from: "https://example.com",
  });
  assert.equal(unsafe.listHref, "/admin/content/homepage/hotel-destinations?market=GLOBAL");
  assert.equal(unsafe.backHref, "/admin/content");

  const faq = faqCmsListNavigation({ status: "DRAFT", cursor: "next-2", q: "how to fly", category: "General" });
  assert.equal(faq.listHref, "/admin/content/faqs?status=DRAFT&cursor=next-2&q=how+to+fly&category=General");
  assert.equal(faqCmsListNavigation({ status: "invalid", cursor: "../admin/system" }).listHref, "/admin/content/faqs");
});

test("Content's nested pages use the preserved return context", () => {
  const files = [
    "src/app/admin/content/homepage/[section]/page.tsx",
    "src/app/admin/content/homepage/[section]/new/page.tsx",
    "src/app/admin/content/homepage/[section]/[id]/page.tsx",
    "src/app/admin/content/faqs/page.tsx",
    "src/app/admin/content/faqs/new/page.tsx",
    "src/app/admin/content/faqs/[id]/page.tsx",
  ].map(path => readFileSync(path, "utf8"));
  for (const content of files) assert.match(content, /nav\.(?:backHref|listHref|query)/);
  const homepageEditor = readFileSync("src/components/admin/HomepageCmsEditor.tsx", "utf8");
  const faqEditor = readFileSync("src/components/admin/FaqCmsEditor.tsx", "utf8");
  assert.match(homepageEditor, /listQuery \? "\?" \+ listQuery/);
  assert.match(faqEditor, /listQuery \? "\?" \+ listQuery/);
  assert.match(readFileSync("src/components/admin/HomepageCmsListClient.tsx", "utf8"), /window\.history\.replaceState/);
  assert.match(readFileSync("src/components/admin/FaqCmsListClient.tsx", "utf8"), /window\.history\.replaceState/);
  assert.match(readFileSync("src/components/admin/CmsCreateLink.tsx", "utf8"), /useSearchParams/);
});

test("Content management uses consistent arrow back links and clean page framing", () => {
  const frame = readFileSync("src/components/admin/ContentWorkspace.tsx", "utf8");
  assert.match(frame, /ArrowLeft size=\{14\}/);
  assert.match(frame, /href=\{backHref\}/);
  assert.match(frame, /max-w-\[1138px\]/);
  assert.match(frame, /<ContentSectionHeading/);
  const pages = [
    "src/app/admin/content/homepage/page.tsx",
    "src/app/admin/content/homepage/[section]/page.tsx",
    "src/app/admin/content/homepage/[section]/new/page.tsx",
    "src/app/admin/content/homepage/[section]/[id]/page.tsx",
    "src/app/admin/content/faqs/page.tsx",
    "src/app/admin/content/faqs/new/page.tsx",
    "src/app/admin/content/faqs/[id]/page.tsx",
  ];
  for (const page of pages) {
    const source = readFileSync(page, "utf8");
    assert.match(source, /<ContentPageFrame/);
    assert.match(source, /backHref=/);
    assert.doesNotMatch(source, /<AdminLinkButton[^>]*>Back/);
  }
  const home = readFileSync("src/components/admin/HomepageCmsEditor.tsx", "utf8");
  const faq = readFileSync("src/components/admin/FaqCmsEditor.tsx", "utf8");
  for (const source of [home, faq]) {
    assert.match(source, /ContentSectionHeading/);
    assert.match(source, /lg:grid-cols-\[minmax\(0,1fr\)_320px\]/);
    assert.match(source, /ContentStatusPill/);
    assert.doesNotMatch(source, /<AdminSectionCard/);
  }
});
