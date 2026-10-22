import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const clientSource = readFileSync(
  new URL("../CarDetailsClient.tsx", import.meta.url),
  "utf8",
);
const guidedSource = readFileSync(
  new URL("../deals/DealsCarDetailsStage.tsx", import.meta.url),
  "utf8",
);
const layoutSource = readFileSync(
  new URL("../../../app/cars/details/[id]/layout.tsx", import.meta.url),
  "utf8",
);

const experienceSource = clientSource.slice(
  clientSource.indexOf("export function CarDetailsExperience"),
  clientSource.indexOf("export function CarDetailsClient"),
);
const standaloneSource = clientSource.slice(
  clientSource.indexOf("export function CarDetailsClient"),
);

test("standalone Car details owns one page wrapper and passes desktop controls into the integrated hero", () => {
  assert.equal(standaloneSource.match(/<main\b/g)?.length, 1);
  assert.equal(standaloneSource.match(/page-shell py-0 lg:py-6/g)?.length, 1);
  assert.equal(
    standaloneSource.match(/data-car-details-desktop-back-link/g)?.length,
    1,
  );
  assert.match(standaloneSource, /presentation="standalone-content"/);
  assert.match(standaloneSource, /desktopBackControl={/);
  assert.doesNotMatch(standaloneSource, /data-car-details-desktop-controls/);
  assert.match(standaloneSource, /standalone-disabled-provider/);
});

test("CarDetailsExperience keeps hero controls and restores compact sticky Back Save and Share handoff", () => {
  assert.doesNotMatch(experienceSource, /<main\b/);
  assert.match(experienceSource, /data-car-details-experience/);
  assert.match(experienceSource, /data-car-details-desktop-hero-controls/);
  assert.match(
    experienceSource,
    /data-car-details-desktop-hero-controls[\s\S]*?\{desktopBackControl\}[\s\S]*?data-car-details-utility-placement="hero"[\s\S]*?<CarHeroActions[\s\S]*?desktop/,
  );
  assert.match(experienceSource, /data-car-details-utility-placement="tabs"/);
  assert.match(experienceSource, /desktopSectionBarStuck/);
  assert.match(experienceSource, /scheduleDesktopScrollState/);
  assert.match(experienceSource, /new ResizeObserver\(scheduleDesktopScrollState\)/);
  assert.match(experienceSource, /target\?\.scrollIntoView\(\{/);
  assert.doesNotMatch(experienceSource, /DesktopCompactBookingAction/);
  assert.doesNotMatch(experienceSource, /data-car-details-bottom-booking-bar/);
  assert.match(
    layoutSource,
    /main:has\(\[data-car-details-experience\]\) \{\s*background: #F7F9FC !important;/,
  );
});

test("standalone desktop Cars tabs scroll to vertically stacked sections while mobile keeps in-place panels", () => {
  assert.match(
    experienceSource,
    /<div className="min-h-\[240px\]" data-car-details-section-panels>/,
  );
  assert.match(experienceSource, /data-car-details-mobile-section-panels/);
  assert.match(experienceSource, /data-car-details-desktop-linear-sections/);
  assert.doesNotMatch(experienceSource, /data-car-details-desktop-tab-panels/);
  assert.match(experienceSource, /target\?\.scrollIntoView\(\{/);
  assert.match(experienceSource, /behavior: window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches/);

  for (const tab of ["compare", "pickup", "location"]) {
    assert.match(
      experienceSource,
      new RegExp(
        `data-car-details-scroll-section="${tab}"[\\s\\S]*?data-car-details-desktop-section="${tab}"`,
      ),
    );
  }

  const navSource = readFileSync(
    new URL("./CarDetailsSectionNav.tsx", import.meta.url),
    "utf8",
  );
  assert.match(navSource, /data-car-details-compact-sticky-tabs/);
  assert.match(navSource, /lg:sticky lg:top-0/);
  assert.match(navSource, /data-car-details-desktop-sticky-back/);
  assert.match(navSource, /data-car-details-desktop-sticky-actions/);
  assert.match(navSource, /data-car-details-desktop-sticky-backdrop/);
  assert.match(navSource, /min-h-\[46px\]/);
  assert.match(navSource, /onClick=\{\(\) => onTabChange\(tab\.id\)\}/);
});

test("standalone desktop Cars keeps the parent card while giving each scroll section its own child card", () => {
  assert.match(layoutSource, /background: #F7F9FC !important/);
  assert.match(
    experienceSource,
    /data-car-details-desktop-section-card="compare"/,
  );
  assert.match(
    experienceSource,
    /data-car-details-desktop-section-card="pickup"/,
  );
  assert.match(
    experienceSource,
    /data-car-details-desktop-section-card="location"/,
  );
  assert.equal(
    experienceSource.match(/lg:max-w-\[680px\] lg:rounded-\[14px\] lg:border lg:border-\[#E0E7EF\] lg:bg-white lg:shadow-\[0_3px_12px_rgba\(7,19,59,0\.05\)\]/g)?.length,
    3,
  );
  assert.match(
    clientSource,
    /data-car-details-flight-panel=\{showDesktopOfferList \? "compare" : undefined\}/,
  );
  assert.match(experienceSource, /data-car-details-flight-panel="pickup"/);
  assert.match(experienceSource, /data-car-details-flight-panel="location"/);
  assert.doesNotMatch(experienceSource, /data-car-details-desktop-inner-card/);
});

test("guided Car details renders content-only experience with guided headings", () => {
  assert.doesNotMatch(guidedSource, /<main\b/);
  assert.doesNotMatch(guidedSource, /DetailsBackLink/);
  assert.doesNotMatch(guidedSource, /border-b border-border bg-white lg:pb-14/);
  assert.match(guidedSource, /presentation="guided-content"/);
  assert.match(guidedSource, /modelHeadingLevel=\{2\}/);
  assert.match(guidedSource, /sectionHeadingLevel=\{3\}/);
  assert.match(guidedSource, /itemHeadingLevel=\{4\}/);
});

test("standalone desktop Cars keeps the 900px parent card with background tabs and separated scroll cards", () => {
  assert.match(
    experienceSource,
    /presentation === "standalone-content" \? "lg:grid-cols-1 lg:gap-0"/,
  );
  assert.match(
    experienceSource,
    /presentation === "standalone-content" \? "space-y-0 lg:mx-auto lg:w-full lg:max-w-\[900px\] lg:rounded-\[22px\] lg:border lg:border-\[#DFE6EF\] lg:bg-\[#F7F9FC\] lg:pb-6 lg:shadow-/,
  );
  assert.match(
    experienceSource,
    /data-car-details-desktop-parent-card=\{presentation === "standalone-content" \? "true" : undefined\}/,
  );
  assert.match(experienceSource, /data-car-details-desktop-hero-controls/);
  assert.match(experienceSource, /<CarDetailsSectionNav/);
  assert.match(experienceSource, /data-car-details-desktop-linear-sections/);
  assert.doesNotMatch(experienceSource, /data-car-details-desktop-inner-card/);

  const navSource = readFileSync(
    new URL("./CarDetailsSectionNav.tsx", import.meta.url),
    "utf8",
  );
  assert.match(navSource, /lg:max-w-\[680px\]/);
  assert.match(navSource, /data-car-details-compact-sticky-tabs/);
  assert.match(navSource, /data-surface=\{desktopStuck \? "sticky-bar" : "background"\}/);
  assert.match(navSource, /lg:sticky lg:top-0/);
  assert.match(navSource, /lg:mt-3/);
});

