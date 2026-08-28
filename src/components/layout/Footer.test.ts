import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const footer = readFileSync(new URL("./Footer.tsx", import.meta.url), "utf8");
const resultsPage = readFileSync(
  new URL("../../app/flights/results/page.tsx", import.meta.url),
  "utf8",
);
const hotelResultsPage = readFileSync(
  new URL("../../app/hotels/results/page.tsx", import.meta.url),
  "utf8",
);
const carResultsPage = readFileSync(
  new URL("../../app/cars/results/page.tsx", import.meta.url),
  "utf8",
);

test("Footer defaults to the complete navigation and brand/legal presentation", () => {
  assert.match(footer, /variant = "full"/);
  assert.match(footer, /variant === "full"/);
  assert.match(footer, /footerContactUs/);
  assert.match(footer, /footerDiscover/);
  assert.match(footer, /footerTermsSettings/);
  assert.match(footer, /footerAboutKurioticket/);
  assert.match(footer, /<KurioticketLogo/);

  const sectionHeadings = [
    "footerContactUs",
    "footerDiscover",
    "footerTermsSettings",
    "footerAboutKurioticket",
  ];
  sectionHeadings.reduce((previousIndex, heading) => {
    const index = footer.indexOf(`heading: t.${heading}`);
    assert.ok(index > previousIndex, `${heading} should retain its section order`);
    return index;
  }, -1);
});

test("mobile full Footer uses one accessible, single-open accordion", () => {
  assert.match(
    footer,
    /type FooterSectionId = "contact" \| "discover" \| "terms-settings" \| "about"/,
  );
  assert.match(
    footer,
    /useState<FooterSectionId \| null>\(null\)/,
    "all sections should start collapsed",
  );
  assert.match(footer, /<div className="border-t border-slate-200 lg:hidden">/);
  assert.match(footer, /footerSections\.map\(\(section\) =>/);
  assert.match(footer, /<button[\s\S]*?type="button"/);
  assert.match(footer, /aria-expanded=\{isOpen\}/);
  assert.match(footer, /aria-controls=\{panelId\}/);
  assert.match(footer, /footer-mobile-panel-\$\{section\.id\}/);
  assert.match(footer, /footer-mobile-trigger-\$\{section\.id\}/);
  assert.match(footer, /<ChevronDown/);
  assert.match(footer, /min-h-11/);
  assert.match(footer, /isOpen \? "rotate-180" : ""/);
  assert.match(
    footer,
    /setOpenMobileSection\(isOpen \? null : section\.id\)/,
    "selecting a section should replace the single open id or collapse it",
  );
  assert.match(
    footer,
    /\{isOpen \? \([\s\S]*?section\.links\.map[\s\S]*?\) : null\}/,
    "closed links should not remain mounted and focusable",
  );
});

test("mobile accordion and expanded desktop navigation have complementary breakpoints", () => {
  assert.match(footer, /className="hidden gap-x-8 gap-y-8 lg:grid/);
  assert.match(footer, /className="border-t border-slate-200 lg:hidden"/);
  assert.match(footer, /lg:grid-cols-\[repeat\(3,minmax\(0,1fr\)\)_minmax\(0,0\.85fr\)\]/);
});

test("Footer preserves every navigation route", () => {
  const hrefs = [
    "/support",
    "/service-guarantee",
    "/more-service-info",
    "/flights",
    "/hotels/results",
    "/cars",
    "/packages",
    "/destinations",
    "/saved",
    "/legal/privacy-policy",
    "/legal/terms-of-service",
    "/legal/cookie-policy",
    "/legal",
    "/about",
    "/how-it-works",
  ];

  for (const href of hrefs) {
    assert.match(footer, new RegExp(`href: "${href}"`));
  }
});

test("Footer owns responsive sizing for the official full wordmark", () => {
  assert.match(
    footer,
    /<KurioticketLogo[\s\S]*?variant="full"[\s\S]*?className="h-7 w-auto sm:h-8 lg:h-9"/,
  );
  assert.doesNotMatch(footer, /markClassName=/);
  assert.doesNotMatch(footer, /textClassName=/);
});

test("brand/legal-only Footer retains shared legal content without upper navigation", () => {
  assert.match(footer, /"brand-legal-only"/);
  assert.match(footer, /footerConfidenceTagline/);
  assert.match(footer, /sellerOfTravelNotice/);
  assert.match(footer, /footerAllRightsReserved/);
  assert.match(footer, /footerPrivacy/);
  assert.match(footer, /footerTerms/);
  assert.match(footer, /footerCookies/);
  assert.match(footer, /variant === "full" \? \(/);
  assert.match(footer, /variant === "full"[\s\S]*?"mt-6 border-t border-slate-200 pt-5 lg:mt-10"[\s\S]*?: "pt-0"/);
  assert.match(footer, /pb-\[env\(safe-area-inset-bottom\)\]/);
});

test("Flight Results explicitly selects the brand/legal-only Footer", () => {
  assert.match(resultsPage, /<Footer variant="brand-legal-only" \/>/);
  assert.equal(resultsPage.match(/<Footer/g)?.length, 1);
});

test("Hotel Results explicitly selects the brand/legal-only Footer", () => {
  assert.match(hotelResultsPage, /<Footer variant="brand-legal-only" \/>/);
  assert.equal(hotelResultsPage.match(/<Footer/g)?.length, 1);
});

test("Cars Results explicitly selects the brand/legal-only Footer", () => {
  assert.match(carResultsPage, /<Footer variant="brand-legal-only" \/>/);
  assert.doesNotMatch(carResultsPage, /<Footer \/>/);
  assert.equal(carResultsPage.match(/<Footer/g)?.length, 1);
});
