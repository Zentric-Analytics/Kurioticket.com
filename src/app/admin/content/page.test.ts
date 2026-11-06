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
  assert.match(contentPage, /<ContentPageFrame title="Content" visuallyHideTitle/);

  for (const section of [
    "Homepage destinations",
    "Flight routes",
    "Hotel destinations",
    "FAQs",
  ]) {
    assert.match(contentPage, new RegExp('title: "' + section + '"'));
  }

  assert.match(contentPage, /getCmsContentScopeSummary/);
  assert.match(contentPage, /getCmsContentMarketOverview/);
  assert.match(contentPage, /title: "FAQs"/);
  assert.match(contentPage, /title: "Homepage destinations"/);
  assert.match(contentPage, /title: "Flight routes"/);
  assert.match(contentPage, /title: "Hotel destinations"/);
  // Technical utilities must not become permanent Content navigation cards.
  // The conditional CMS Health *diagnostic link* is intentional for incomplete markets.
  assert.doesNotMatch(contentPage, /title: "(?:Homepage CMS overview|Homepage fare operations|CMS Health)"/);
  assert.doesNotMatch(contentPage, /href: "\/admin\/system\/cms-health"/);
  assert.match(contentPage, /href="\/admin\/system\/cms-health"/);
  assert.match(contentPage, /contentScopeStatus\(destinationSummary\)/);
  assert.match(contentPage, /if \(summary\.needsSetup\) return "Setup required"/);
  assert.match(contentPage, /summary\?\.available && summary\.active \? summary\.publishedInScope/);
  assert.match(contentPage, /contentScopeStatus\(flightSummary\)/);
  assert.match(contentPage, /contentScopeStatus\(hotelSummary\)/);
  assert.match(contentPage, /publishedContentCount\(destinationSummary\)/);
  assert.match(contentPage, /Published records/);
  assert.match(contentPage, /Review CMS Health/);
  assert.match(contentPage, /href="\/admin\/system\/cms-health"/);
  assert.match(contentPage, /CMS managed/);
  assert.match(contentPage, /Setup required/);
  assert.match(contentPage, /href: "\/admin\/content\/faqs"/);
  assert.doesNotMatch(contentPage, /HomepageFaresRefreshCard/);
  assert.doesNotMatch(contentPage, /Upload image|Approve content/i);
});

test("homepage fare operations stay operational while linking to their content source", () => {
  assert.doesNotMatch(contentPage, /HomepageFaresRefreshCard/);
  assert.doesNotMatch(systemPage, /HomepageFaresRefreshCard/);
  assert.doesNotMatch(settingsPage, /HomepageFaresRefreshCard/);
  assert.match(settingsPage, /Feature controls/);
  assert.doesNotMatch(settingsPage, /Homepage Fare Operations|\/admin\/homepage-fares/);
  assert.match(homepageFarePage, /title="Homepage Fare Operations"/);
  assert.match(homepageFarePage, /HomepageFaresRefreshCard/);
  assert.match(homepageFarePage, /href="\/admin\/content\/homepage"/);
  assert.match(homepageFarePage, />\s*Homepage content\s*<\/Link>/);
  assert.match(homepageFarePage, /href="\/admin\/providers\?product=flights"/);
  assert.match(homepageFarePage, />\s*Flight providers\s*<\/Link>/);
  assert.doesNotMatch(homepageFarePage, /href="\/admin\/flights"/);
  assert.doesNotMatch(homepageFarePage, /href="\/admin\/settings"/);
  assert.doesNotMatch(contentPage, /\/admin\/homepage-fares/);
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

test("content overview shows four equal, fully clickable management cards", () => {
  assert.match(contentPage, /<nav aria-label="Content management" className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2">/);
  assert.equal((contentPage.match(/href: "\/admin\/content\/(?:homepage\/(?:destinations|flight-routes|hotel-destinations)|faqs)"/g) ?? []).length, 4);
  assert.match(contentPage, /href=\{area\.href\}/);
  assert.match(contentPage, /className="group focus-ring flex h-full min-w-0 cursor-pointer flex-col gap-3 rounded-lg/);
  assert.match(contentPage, /cursor-pointer/);
  assert.doesNotMatch(contentPage, /min-h-\[178px\]|justify-between gap-6/);
  assert.match(contentPage, /text-\[24px\]/);
  assert.match(contentPage, /flex flex-wrap items-baseline gap-x-2\.5 gap-y-1/);
  assert.match(contentPage, /hover:border-\[#6D28D9\]/);
  assert.match(contentPage, /focus-visible:outline-\[#6D28D9\]/);
  assert.match(contentPage, /area\.value/);
  assert.doesNotMatch(contentPage, /area\.scope|scope: "US market"|scope: "Global"|scope: "English"/);
  assert.match(contentPage, /area\.status !== "CMS managed"/);
  assert.doesNotMatch(contentPage, /ContentSectionHeading|homepageAreas|helpAreas|Manage destinations|Manage FAQs/);
});

test("Content hub centers vertically below the desktop Admin header without changing cards", () => {
  assert.match(contentPage, /min-\[1100px\]:flex min-\[1100px\]:min-h-\[calc\(100dvh-var\(--admin-header-height,120px\)-40px\)\] min-\[1100px\]:items-center/);
  assert.doesNotMatch(contentPage, /100dvh-160px/);
  const shell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");
  assert.match(shell, /contentLanding = pathname === "\/admin\/content"/);
  assert.match(shell, /headerRef = useRef<HTMLElement>\(null\)/);
  assert.match(shell, /import \{ useEffect, useLayoutEffect, useRef, useState \} from "react"/);
  assert.match(shell, /useLayoutEffect\(\(\) => \{\s*if \(!contentLanding/);
  assert.match(shell, /getBoundingClientRect\(\)\.height/);
  assert.match(shell, /new ResizeObserver\(updateHeaderHeight\)/);
  assert.match(shell, /observer\.observe\(header\)/);
  assert.match(shell, /observer\.disconnect\(\)/);
  assert.match(shell, /workspace\.style\.removeProperty\("--admin-header-height"\)/);
  assert.match(contentPage, /mx-auto w-full max-w-\[900px\] space-y-4/);
  assert.match(contentPage, /grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2/);
  assert.match(contentPage, /href=\{area\.href\}/);
  assert.match(contentPage, /<ContentPageFrame title="Content" visuallyHideTitle>/);
  assert.doesNotMatch(contentPage, /min-h-\[178px\]|justify-between gap-6/);
});

test("FAQ directory has no redundant counters before search and status filters", () => {
  const faq = readFileSync("src/app/admin/content/faqs/page.tsx", "utf8");
  assert.doesNotMatch(faq, /ContentMetric/);
  assert.match(faq, /<ContentDirectoryToolbar/);
  assert.match(faq, /<FaqCmsListClient/);
  assert.match(faq, /actions=\{summary\.active \? <CmsCreateLink/);
});

test("Content Add actions use subdued styling and preserve selected filters", () => {
  const create = readFileSync("src/components/admin/CmsCreateLink.tsx", "utf8");
  assert.match(create, /useSearchParams/);
  assert.match(create, /query = searchParams\.toString\(\)/);
  assert.match(create, /href=\{path \+ \(query \? "\?" \+ query : ""\)\}/);
  assert.match(create, /<Plus size=\{15\}/);
  assert.match(create, /bg-\[#111827\]/);
  assert.doesNotMatch(create, /bg-\[#3154EF\]|variant="primary"/);
});

test("Content published count uses the published scope, not a draft's scope", () => {
  const cms = readFileSync("src/services/cmsContentService.ts", "utf8");
  assert.match(cms, /publishedInScope/);
  assert.match(cms, /db\.cmsContentItem\.count\(\{/);
  assert.match(cms, /publishedMarket: parsedMarket\.data/);
  assert.match(cms, /publishedLocale: parsedLocale\.data/);
  assert.match(cms, /publishedPayload: \{ not: Prisma\.DbNull \}/);
  assert.match(contentPage, /summary\.publishedInScope/);
  assert.match(contentPage, /getCmsContentMarketOverview\("HOMEPAGE_DESTINATION", homepageCmsMarkets, homepageCmsLocale\)/);
  assert.match(contentPage, /getCmsContentMarketOverview\("FLIGHT_ROUTE", homepageCmsMarkets, homepageCmsLocale\)/);
});

test("Content returns to the actual source and only retains allowlisted filters", () => {
  const direct = homepageCmsListNavigation("destinations", { market: "US", status: "PUBLISHED", q: "Paris", cursor: "page_one" });
  assert.equal(direct.backHref, "/admin/content");
  assert.equal(direct.listHref, "/admin/content/homepage/destinations?market=US&status=PUBLISHED&q=Paris");
  assert.equal(contentEditorHref("/admin/content/homepage/destinations/new", direct.query),
    "/admin/content/homepage/destinations/new?market=US&status=PUBLISHED&q=Paris");

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

test("Homepage and flight CMS open on real All markets and retain explicit market filters", () => {
  const destination = homepageCmsListNavigation("destinations", {});
  const flight = homepageCmsListNavigation("flight-routes", { from: "overview" });
  assert.equal(destination.market, "ALL");
  assert.equal(destination.listHref, "/admin/content/homepage/destinations?market=ALL");
  assert.equal(flight.market, "ALL");
  assert.equal(flight.listHref, "/admin/content/homepage/flight-routes?market=ALL&from=overview");
  assert.equal(homepageCmsListNavigation("destinations", { market: "NG" }).market, "NG");
  assert.equal(homepageCmsListNavigation("flight-routes", { market: "US" }).market, "US");
  assert.equal(homepageCmsListNavigation("flight-routes", { market: "invalid" }).market, "ALL");
  assert.equal(homepageCmsListNavigation("hotel-destinations", { market: "ALL" }).market, "GLOBAL");

  const listPage = readFileSync("src/app/admin/content/homepage/[section]/page.tsx", "utf8");
  const toolbar = readFileSync("src/components/admin/ContentDirectoryToolbar.tsx", "utf8");
  const service = readFileSync("src/services/cmsContentService.ts", "utf8");
  assert.match(listPage, /defaultMarket = section === "hotel-destinations" \? "GLOBAL" : "ALL"/);
  assert.match(listPage, /allowedMarket === "ALL" \? undefined : allowedMarket/);
  assert.match(listPage, /getCmsContentMarketOverview\(config\.type, homepageCmsMarkets, homepageCmsLocale\)/);
  assert.match(toolbar, /value: "ALL", label: "All markets"/);
  assert.match(toolbar, /market !== "ALL"/);
  assert.match(service, /scope\.market \? \{ market: scope\.market \} : \{\}/);
  assert.match(service, /scope\.market\) predicates\.push/);
  assert.match(listPage, /market=\{section !== "hotel-destinations" \? allowedMarket : undefined\}/);
});

test("New CMS drafts require a valid market but preserve chosen filtered market context", () => {
  const newPage = readFileSync("src/app/admin/content/homepage/[section]/new/page.tsx", "utf8");
  const editor = readFileSync("src/components/admin/HomepageCmsEditor.tsx", "utf8");
  const service = readFileSync("src/services/cmsContentService.ts", "utf8");
  assert.match(newPage, /: "ALL"/);
  assert.match(newPage, /initialMarket=\{market === "ALL" \? "" : market\}/);
  assert.match(newPage, /getCmsContentMarketOverview\(config\.type, homepageCmsMarkets, homepageCmsLocale\)/);
  assert.match(editor, /<option value="">Select market<\/option>/);
  assert.match(editor, /validMarket = section === "hotel-destinations" \|\| markets\.includes\(market\)/);
  assert.match(editor, /const validDraft = validMarket[\\s\\S]*?&& validateClientDraft\\(section, currentPayload, sortOrder\\)[\\s\\S]*?&& routeValidation\\.valid;/);
  assert.match(service, /Choose a supported market before creating this content/);
  assert.match(editor, /<CmsEditorActions/);
  assert.match(editor, /validDraft=\{validDraft\}/);
  assert.equal(homepageCmsListNavigation("flight-routes", { market: "NG", q: "Lagos" }).query, "market=NG&q=Lagos");
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
  const directory = readFileSync("src/components/admin/ContentDirectoryToolbar.tsx", "utf8");
  assert.match(directory, /router\.replace\(url, \{ scroll: false \}\)/);
  assert.match(directory, /window\.addEventListener\("popstate"/);
  assert.match(directory, /setTimeout/);
  assert.match(directory, /<AdminDirectorySelect/);
  assert.doesNotMatch(directory, /Apply filters/);
  for (const path of ["src/components/admin/HomepageCmsListClient.tsx", "src/components/admin/FaqCmsListClient.tsx"]) {
    const list = readFileSync(path, "utf8");
    assert.doesNotMatch(list, /Search this page|Search questions, answers or categories/);
    assert.match(list, /ContentRecordsTable/);
  }
  assert.match(readFileSync("src/components/admin/CmsCreateLink.tsx", "utf8"), /useSearchParams/);
});

test("Content management uses consistent arrow back links and clean page framing", () => {
  const frame = readFileSync("src/components/admin/ContentWorkspace.tsx", "utf8");
  assert.match(frame, /ArrowLeft size=\{14\}/);
  assert.match(frame, /href=\{backHref\}/);
  assert.match(frame, /visuallyHideTitle \? "sr-only"/);
  assert.match(frame, /max-w-\[1138px\]/);
  assert.match(frame, /max-w-\[1500px\]/);
  assert.match(frame, /export function ContentSectionHeading/);
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

test("Content lists search the whole CMS dataset and filters apply instantly", () => {
  const home = readFileSync("src/app/admin/content/homepage/[section]/page.tsx", "utf8");
  const faq = readFileSync("src/app/admin/content/faqs/page.tsx", "utf8");
  const service = readFileSync("src/services/cmsContentService.ts", "utf8");
  const api = readFileSync("src/app/api/admin/content/route.ts", "utf8");
  const toolbar = readFileSync("src/components/admin/ContentDirectoryToolbar.tsx", "utf8");
  for (const source of [home, faq]) {
    assert.match(source, /<ContentPageFrame\s+wide/);
    assert.match(source, /<ContentDirectoryToolbar/);
    assert.match(source, /search: one\(raw\.q\) \|\| undefined/);
    assert.doesNotMatch(source, /<AdminButton[^>]*type="submit">Apply/);
  }
  assert.match(faq, /listAdminCmsFaqCategories/);
  assert.match(faq, /category: one\(raw\.category\) \|\| undefined/);
  assert.match(toolbar, /role="search"/);
  assert.match(toolbar, /method="get"/);
  assert.match(toolbar, /name="status" value=\{status\}/);
  assert.match(toolbar, /name="from" value="overview"/);
  assert.match(toolbar, /<noscript>/);
  assert.equal((toolbar.match(/<form\b/g) ?? []).length, 1);
  assert.equal((toolbar.match(/<\/form>/g) ?? []).length, 1);
  assert.match(toolbar, /aria-label="Content publication status"/);
  assert.match(toolbar, /onValueChange=\{next => navigate/);
  assert.match(toolbar, /<AdminDirectorySelect/);
  assert.match(service, /db\.\$queryRaw/);
  assert.match(service, /jsonb_each_text/);
  assert.match(service, /Prisma\.join\(predicates, " AND "\)/);
  assert.match(service, /scope\.search/);
  assert.match(service, /scope\.category/);
  assert.match(service, /encodeCmsListCursor\(scope/);
  assert.match(api, /search: url\.searchParams\.get\("q"\)/);
  assert.match(api, /category: url\.searchParams\.get\("category"\)/);
});

test("Content landing aggregates distinct published snapshots from every supported CMS market", () => {
  const cms = readFileSync("src/services/cmsContentService.ts", "utf8");
  const helper = cms.slice(
    cms.indexOf("export async function getCmsContentMarketOverview"),
    cms.indexOf("export async function getCmsContentScopeSummary"),
  );
  const homepage = readFileSync("src/services/homepageCmsService.ts", "utf8");
  assert.match(homepage, /homepageCmsMarkets = HOMEPAGE_REFRESH_MARKET_CODES/);
  assert.match(helper, /normalizedMarkets = \[\.\.\.new Set\(markets\)\]/);
  assert.match(helper, /cmsContentScope\.count\(\{/);
  assert.match(helper, /cmsContentItem\.count\(\{/);
  assert.match(helper, /status: "PUBLISHED"/);
  assert.match(helper, /publishedMarket: \{ in: normalizedMarkets \}/);
  assert.match(helper, /publishedLocale: parsedLocale\.data/);
  assert.match(helper, /publishedPayload: \{ not: Prisma\.DbNull \}/);
  assert.match(helper, /needsSetup: scopeCount < normalizedMarkets\.length/);
  assert.match(contentPage, /Some homepage content markets need CMS setup/);
  assert.doesNotMatch(contentPage, /getCmsContentScopeSummary\("HOMEPAGE_DESTINATION", "US"/);
  assert.doesNotMatch(contentPage, /getCmsContentScopeSummary\("FLIGHT_ROUTE", "US"/);
  assert.match(contentPage, /getCmsContentScopeSummary\("HOTEL_DESTINATION", "GLOBAL"/);
  assert.match(contentPage, /getCmsContentScopeSummary\("FAQ", faqCmsScope\.market, faqCmsScope\.locale\)/);
  assert.match(contentPage, />Published records<\/span>/);
});


test("homepage CMS controls share the public personal-details border and focus treatment", () => {
  const profile = readFileSync("src/components/dashboard/DashboardGrid.tsx", "utf8");
  const editor = readFileSync("src/components/admin/HomepageCmsEditor.tsx", "utf8");
  const control = editor.match(/const editorControlClass = "([^"]+)";/)?.[1];
  assert.ok(control, "The homepage CMS should keep one shared control style");

  for (const token of [
    "border border-slate-300",
    "hover:border-slate-400",
    "focus:border-[#004BB8]/40",
    "focus:ring-2",
    "focus:ring-[#004BB8]/15",
  ]) {
    assert.ok(profile.includes(token), `Public personal details must contain ${token}`);
    assert.ok(control.includes(token), `Homepage CMS must match the public treatment: ${token}`);
  }

  assert.doesNotMatch(control, /border-2|border-\[#94A3B8\]|focus:border-\[#6D28D9\]|focus:ring-\[#EDE9FE\]/);
  assert.match(editor, /<AdminInput className=\{editorControlClass\}/);
  assert.match(editor, /<AdminSelect className=\{editorControlClass\}/);
  assert.match(editor, /<AdminTextarea className=\{\`\$\{editorControlClass\}/);
  // Existing compact widths and grouped fields must not be rearranged.
  assert.match(editor, /grid max-w-\[512px\] gap-4 sm:grid-cols-3/);
  assert.match(editor, /className="max-w-\[320px\]"/);
  assert.match(editor, /lg:grid-cols-\[minmax\(0,1fr\)_320px\]/);
});
