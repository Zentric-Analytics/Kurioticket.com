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

test("CarDetailsExperience integrates desktop Back Save and Share into the car hero", () => {
  assert.doesNotMatch(experienceSource, /<main\b/);
  assert.match(experienceSource, /data-car-details-experience/);
  assert.doesNotMatch(experienceSource, /data-car-details-desktop-controls/);
  assert.match(experienceSource, /data-car-details-desktop-hero-controls/);
  assert.match(
    experienceSource,
    /data-car-details-desktop-hero-controls[\s\S]*?\{desktopBackControl\}[\s\S]*?data-car-details-utility-placement="hero"[\s\S]*?<CarHeroActions[\s\S]*?desktop/,
  );
  assert.doesNotMatch(experienceSource, /data-car-details-utility-placement="tabs"/);
  assert.doesNotMatch(experienceSource, /desktopSectionBarStuck|scheduleDesktopScrollState|ResizeObserver/);
  assert.doesNotMatch(experienceSource, /target\?\.scrollIntoView/);
  assert.doesNotMatch(experienceSource, /DesktopCompactBookingAction/);
  assert.doesNotMatch(experienceSource, /data-car-details-bottom-booking-bar/);
  assert.match(
    layoutSource,
    /main:has\(\[data-car-details-experience\]\) \{\s*background: #EEF2F7 !important;/,
  );
});

test("standalone desktop Cars tabs switch one content panel in place like Flights", () => {
  assert.match(
    experienceSource,
    /<div className="min-h-\[240px\]" data-car-details-section-panels>/,
  );
  assert.match(experienceSource, /data-car-details-mobile-section-panels/);
  assert.match(experienceSource, /data-car-details-desktop-tab-panels/);
  assert.doesNotMatch(experienceSource, /data-car-details-desktop-linear-sections/);
  assert.doesNotMatch(experienceSource, /scrollIntoView/);

  for (const tab of ["compare", "pickup", "location"]) {
    assert.match(
      experienceSource,
      new RegExp(
        `id="car-desktop-${tab}-panel"[\\s\\S]*?role="tabpanel"[\\s\\S]*?className=\\{activeTab !== "${tab}" \\? "hidden" : ""\\}`,
      ),
    );
  }

  const navSource = readFileSync(
    new URL("./CarDetailsSectionNav.tsx", import.meta.url),
    "utf8",
  );
  assert.match(navSource, /data-car-details-flight-style-tabs/);
  assert.match(navSource, /lg:sticky lg:top-0/);
  assert.match(navSource, /role="tablist"/);
  assert.match(navSource, /role="tab"/);
  assert.match(navSource, /aria-selected=\{selected\}/);
  assert.match(navSource, /aria-controls=\{`car-desktop-\$\{tab\.id\}-panel`\}/);
  assert.match(navSource, /min-h-11 flex-1[\s\S]*?border-b-\[3px\]/);
  assert.match(navSource, /border-\[#075EE8\] text-\[#07133B\]/);
  assert.match(navSource, /onClick=\{\(\) => onTabChange\(tab\.id\)\}/);
  assert.doesNotMatch(
    navSource,
    /desktopStuck|desktopBackControl|desktopUtilityActions|data-car-details-desktop-sticky-back/,
  );
});

test("standalone desktop Cars keeps compact child cards inside the one Flight-style details card", () => {
  assert.match(layoutSource, /background: #EEF2F7 !important/);
  assert.match(
    experienceSource,
    /data-car-details-flight-panel=\{showDesktopOfferList \? "compare" : undefined\}/,
  );
  assert.match(experienceSource, /data-car-details-flight-panel="pickup"/);
  assert.match(experienceSource, /data-car-details-flight-panel="location"/);
  assert.match(experienceSource, /max-w-\[640px\] space-y-2 py-1/);
  assert.match(
    experienceSource,
    /data-car-details-compact-card-group="pickup-return"/,
  );
  assert.match(
    experienceSource,
    /data-car-details-compact-info-card/,
  );
  assert.match(
    experienceSource,
    /max-w-\[720px\][^"]*"[\s\S]*?data-car-details-desktop-location-map/,
  );
  assert.doesNotMatch(experienceSource, /data-car-details-layered-surface="pickup"/);
  assert.doesNotMatch(experienceSource, /data-car-details-layered-surface="location"/);
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

test("standalone desktop Cars details use one full-height card for hero tabs and panel content", () => {
  assert.match(
    experienceSource,
    /presentation === "standalone-content" \? "lg:grid-cols-1 lg:gap-0"/,
  );
  assert.match(
    experienceSource,
    /presentation === "standalone-content" \? "space-y-0 lg:relative lg:mx-auto lg:w-full lg:max-w-\[900px\] lg:rounded-\[13px\] lg:border lg:border-\[#E2E8F0\] lg:bg-white lg:shadow-/,
  );
  assert.match(
    experienceSource,
    /data-car-details-desktop-full-height-card=\{presentation === "standalone-content" \? "true" : undefined\}/,
  );
  assert.match(experienceSource, /data-car-details-desktop-hero-controls/);
  assert.match(experienceSource, /data-car-details-desktop-tab-panels/);
  assert.match(
    experienceSource,
    /className="hidden lg:block lg:min-h-\[280px\] lg:w-full lg:bg-transparent lg:px-5 lg:pb-7"/,
  );

  const navSource = readFileSync(
    new URL("./CarDetailsSectionNav.tsx", import.meta.url),
    "utf8",
  );
  assert.match(navSource, /lg:max-w-none/);
  assert.match(navSource, /max-w-\[760px\]/);
  assert.match(navSource, /data-car-details-flight-style-tabs/);
  assert.match(navSource, /lg:sticky lg:top-0/);
  assert.match(navSource, /lg:border-b lg:border-slate-200 lg:bg-white/);
  assert.doesNotMatch(navSource, /data-car-details-desktop-nav-rule/);
});

