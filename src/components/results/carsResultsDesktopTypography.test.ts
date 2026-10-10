import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const results = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const card = readFileSync(
  new URL("./CarResultCard.tsx", import.meta.url),
  "utf8",
);
const alert = readFileSync(
  new URL("./CarPriceAlertControl.tsx", import.meta.url),
  "utf8",
);
const comparison = readFileSync(
  new URL("./CarPriceComparison.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);
const footer = readFileSync(
  new URL("../layout/Footer.tsx", import.meta.url),
  "utf8",
);
const route = readFileSync(
  new URL("../../app/cars/results/page.tsx", import.meta.url),
  "utf8",
);
test("desktop Cars Results uses a readable, professional typography hierarchy", () => {
  assert.match(results, /lg:text-\[12px\] lg:font-bold lg:uppercase lg:leading-4 lg:tracking-\[0\.05em\] lg:text-\[#475569\]/);
  assert.match(results, /lg:text-\[15px\] lg:font-bold lg:leading-5 lg:tracking-\[-0\.005em\] lg:text-\[#07133B\]/);
  assert.match(results, /data-cars-results-compact-search-summary[\s\S]*?text-\[15px\] font-semibold leading-5 tracking-\[-0\.005em\]/);
  assert.match(results, /sticky-cars-search-title[\s\S]*?text-\[19px\] font-bold leading-6 tracking-\[-0\.012em\]/);
  assert.doesNotMatch(results, /aria-label="Breadcrumb"/);
  assert.match(results, /lg:text-\[14px\] lg:font-semibold lg:leading-5 lg:tracking-\[-0\.005em\]/);
  assert.match(results, /cars-results-desktop-sort-trigger inline-flex h-9/);
});


test("desktop Cars full-search values and filter headings share one enforced rendered typography contract", () => {
  assert.match(
    results,
    /const desktopFullSelectedValueClass =\s*[\s\S]*?"cars-results-desktop-filter-heading-type"/,
  );
  assert.match(
    results,
    /const desktopCompactSelectedValueClass =[\s\S]*?lg:text-\[15px\] lg:font-bold lg:leading-5 lg:tracking-\[-0\.005em\] lg:text-\[#07133B\]/,
  );
  assert.match(
    results,
    /<h3 className="cars-results-desktop-filter-heading-type text-\[15px\] font-bold normal-case leading-5 tracking-\[-0\.003em\] text-slate-950">/,
  );
  assert.match(
    results,
    /cars-results-desktop-filter-heading-type min-w-0 truncate[\s\S]*cars-results-desktop-filter-heading-type--active/,
  );
  assert.match(
    css,
    /\.cars-results-desktop-filter-heading-type \{[\s\S]*?font-family: var\(--font-sans\) !important;[\s\S]*?font-size: 15px !important;[\s\S]*?line-height: 20px !important;[\s\S]*?font-weight: 700 !important;[\s\S]*?letter-spacing: -0\.003em !important;[\s\S]*?color: #020617 !important;[\s\S]*?font-variation-settings: "wght" 700;/,
  );
  assert.match(
    css,
    /input\.cars-results-desktop-filter-heading-type::placeholder \{[\s\S]*?font-weight: 500 !important;[\s\S]*?color: #94a3b8 !important;[\s\S]*?font-variation-settings: "wght" 500;/,
  );
  assert.equal(
    (
      results.match(
        /isCompact \? desktopCompactSelectedValueClass : desktopFullSelectedValueClass/g,
      ) ?? []
    ).length,
    4,
    "pickup location, rental dates, pickup/return time, and driver age preserve distinct full and compact typography",
  );
  assert.match(
    results,
    /lg:placeholder:font-medium lg:placeholder:text-slate-400/,
  );
  assert.match(
    results,
    /!pickupDate && "text-slate-400 lg:font-medium lg:text-slate-400"/,
  );
});

test("desktop Cars filters mirror the stronger mobile hierarchy without changing layout", () => {
  assert.match(results, /truncate text-\[16px\] font-bold leading-6 tracking-\[-0\.006em\] text-\[#07133B\]/);
  assert.match(results, /text-\[15px\] font-bold normal-case leading-5 tracking-\[-0\.003em\] text-slate-950/);
  assert.match(results, /text-\[14px\] font-medium leading-5 transition-all/);
  assert.match(results, /\? "font-semibold text-\[#142033\]"/);
  assert.match(results, /: "text-\[#334155\] hover:bg-slate-50 hover:text-\[#142033\]"/);
  assert.doesNotMatch(results, /text-\[12px\] font-bold uppercase leading-4 tracking-\[0\.11em\]/);
});

test("desktop Cars result cards mirror the mobile weight and category hierarchy", () => {
  assert.equal((card.match(/text-\[19px\] font-bold leading-\[24px\] tracking-\[-0\.012em\] text-\[#07133B\]/g) ?? []).length, 2);
  assert.match(card, /text-\[10px\] font-bold uppercase leading-\[15px\] tracking-\[0\.1em\] text-\[#004BB8\]/);
  assert.match(card, /text-\[13px\] font-semibold leading-\[18px\] tracking-\[-0\.001em\] text-\[#334155\]/);
  assert.match(card, /text-\[13px\] font-semibold leading-\[18px\] tracking-\[-0\.001em\] text-slate-950/);
  assert.match(card, /lg:text-\[13px\] lg:font-semibold lg:leading-\[18px\] lg:tracking-\[-0\.001em\] lg:text-\[#334155\]/);
  assert.doesNotMatch(card, /text-\[19px\] font-semibold leading-\[24px\]/);
  assert.doesNotMatch(card, /text-\[13px\] font-medium normal-case leading-5 tracking-normal/);
  assert.match(card, /desktopSurfaceParity \? "lg:text-\[13px\] lg:leading-5" : ""/);
});

test("desktop Cars sort trigger and dropdown share enforced rendered typography", () => {
  assert.match(
    results,
    /className="cars-results-desktop-sort-label[\s\S]*?\{t\("carsResults\.sortBy"\)\}:/,
  );
  assert.match(
    results,
    /className="cars-results-desktop-sort-trigger inline-flex h-9[\s\S]*?selectedCarSortLabel/,
  );
  assert.match(
    results,
    /data-selected=\{sort === option\.value \? "true" : "false"\}[\s\S]*?className="cars-results-desktop-sort-option/,
  );
  assert.match(
    results,
    /<ChevronDown[\s\S]*?"shrink-0 text-current transition-transform duration-150"/,
  );
  assert.match(
    results,
    /<Check size=\{15\} strokeWidth=\{2\.5\} aria-hidden="true" \/>/,
  );
  assert.match(
    css,
    /\.cars-results-desktop-sort-label \{[\s\S]*?font-size: 15px !important;[\s\S]*?font-weight: 700 !important;[\s\S]*?color: #334155 !important;[\s\S]*?font-variation-settings: "wght" 700;/,
  );
  assert.match(
    css,
    /\.cars-results-desktop-sort-trigger \{[\s\S]*?font-size: 15px !important;[\s\S]*?font-weight: 700 !important;[\s\S]*?color: #020617 !important;[\s\S]*?font-variation-settings: "wght" 700;/,
  );
  assert.match(
    css,
    /\.cars-results-desktop-sort-option \{[\s\S]*?font-size: 15px !important;[\s\S]*?font-weight: 600 !important;[\s\S]*?color: #1e293b !important;[\s\S]*?font-variation-settings: "wght" 600;/,
  );
  assert.match(
    css,
    /\.cars-results-desktop-sort-option\[data-selected="true"\] \{[\s\S]*?background: #eef5ff;[\s\S]*?font-weight: 700 !important;[\s\S]*?font-variation-settings: "wght" 700;/,
  );
});
test("desktop Cars pricing and price tracking keep price emphasis without over-weighting metadata", () => {
  assert.match(comparison, /text-\[21px\] font-bold leading-\[25px\] tracking-\[-0\.012em\]/);
  assert.match(comparison, /text-\[13px\] font-medium leading-5 text-\[#475569\]/);
  assert.match(comparison, /cleanStaticSummary \? "text-\[14px\] tracking-\[-0\.003em\]" : "text-\[14px\] tracking-\[-0\.005em\]"/);
  assert.match(alert, /lg:text-\[14px\] lg:font-bold lg:leading-5 lg:tracking-\[-0\.002em\] lg:text-slate-950/);
});


test("desktop Cars Results keeps footer supporting copy readable without changing other footers", () => {
  assert.match(
    results,
    /<Footer variant="brand-legal-only" className="cars-results-footer-typography" \/>/,
  );
  assert.match(footer, /cars-footer-confidence-tagline/);
  assert.match(footer, /cars-footer-seller-notice/);
  assert.match(footer, /cars-footer-legal-row/);
  assert.match(
    css,
    /\.cars-results-footer-typography \.cars-footer-confidence-tagline,[\s\S]*?font-size: 13px;[\s\S]*?font-weight: 500;/,
  );
  assert.match(
    css,
    /\.cars-results-footer-typography \.cars-footer-seller-notice,[\s\S]*?color: #526174;/,
  );
});

test("mobile typography remains intact while desktop is refined", () => {
  assert.match(card, /text-\[15px\] font-bold leading-\[18px\]/);
  assert.match(results, /text-\[15px\] font-extrabold text-slate-950/);
  assert.match(alert, /text-\[12\.5px\] font-bold leading-4 text-slate-950/);
});

test("desktop Cars Results uses the same Inter foundation as mobile web", () => {
  assert.match(
    css,
    /@media \(min-width: 1024px\)[\s\S]*?\.cars-results-desktop-typeface[\s\S]*?font-family: var\(--font-sans\);/,
  );
  assert.doesNotMatch(
    css,
    /\.cars-results-desktop-typeface[\s\S]*?font-family:[\s\S]*?"Kurioticket Cars Sans"/,
  );
  assert.match(css, /font-synthesis: none;/);
  assert.match(css, /font-kerning: normal;/);
  assert.match(
    route,
    /className="contents cars-results-desktop-typeface"/,
  );
  assert.match(
    results,
    /cars-results-desktop-typeface fixed inset-0 z-\[1200\]/,
  );
  assert.match(
    results,
    /cn\("cars-results-desktop-typeface", carsDesktopPopoverClassName, shellClassName\)/,
  );
});
