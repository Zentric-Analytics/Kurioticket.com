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

test("standalone Car details owns exactly one page wrapper and passes the desktop back control into the sticky experience toolbar", () => {
  assert.equal(standaloneSource.match(/<main\b/g)?.length, 1);
  assert.equal(standaloneSource.match(/page-shell py-0 lg:py-6/g)?.length, 1);
  assert.equal(
    standaloneSource.match(/data-car-details-desktop-back-link/g)?.length,
    1,
  );
  assert.equal(
    standaloneSource.match(
      /bg-transparent lg:pb-16/g,
    )?.length,
    1,
  );
  assert.match(standaloneSource, /presentation="standalone-content"/);
  assert.match(standaloneSource, /desktopBackControl={/);
  assert.doesNotMatch(standaloneSource, /data-car-details-desktop-controls/);
  assert.match(standaloneSource, /standalone-disabled-provider/);
});

test("CarDetailsExperience uses one Hotels-style sticky desktop section handoff without duplicate booking controls", () => {
  assert.doesNotMatch(experienceSource, /<main\b/);
  assert.doesNotMatch(experienceSource, /page-shell/);
  assert.match(experienceSource, /data-car-details-experience/);
  assert.match(experienceSource, /data-car-details-desktop-controls/);
  assert.doesNotMatch(experienceSource, /data-car-details-desktop-sticky-controls/);
  assert.match(
    experienceSource,
    /hidden h-16 w-full items-center border-b border-transparent bg-\[#F5F7FB\] lg:flex lg:bg-\[#F8FAFC\]/,
  );
  assert.match(experienceSource, /\{desktopBackControl\}/);
  assert.match(experienceSource, /desktopSectionBarStuck/);
  assert.match(experienceSource, /new ResizeObserver\(scheduleDesktopScrollState\)/);
  assert.match(experienceSource, /window\.addEventListener\("scroll", scheduleDesktopScrollState/);
  assert.match(experienceSource, /data-car-details-scroll-section="compare"/);
  assert.match(experienceSource, /data-car-details-scroll-section="pickup"/);
  assert.match(experienceSource, /data-car-details-scroll-section="location"/);
  assert.match(experienceSource, /data-car-details-utility-placement="hero"/);
  assert.match(experienceSource, /data-car-details-utility-placement="tabs"/);
  assert.match(
    experienceSource,
    /data-car-details-utility-placement="hero"[\s\S]*?<CarHeroActions[\s\S]*?desktop/,
  );
  assert.match(
    experienceSource,
    /data-car-details-utility-placement="tabs"[\s\S]*?<CarHeroActions[\s\S]*?desktop/,
  );
  assert.doesNotMatch(experienceSource, /DesktopCompactBookingAction/);
  assert.doesNotMatch(experienceSource, /data-car-details-desktop-compact-/);
  assert.doesNotMatch(experienceSource, /data-car-details-desktop-context/);
  assert.match(experienceSource, /desktopBackControl={desktopBackControl}/);
  assert.doesNotMatch(
    layoutSource,
    /\[data-car-details-booking-rail\][\s\S]*?position: sticky/,
  );
  assert.doesNotMatch(experienceSource, /data-car-details-bottom-booking-bar/);
  assert.doesNotMatch(layoutSource, /data-car-details-bottom-booking-bar/);
  assert.match(layoutSource, /\[data-car-details-scroll-section\] \{\s*scroll-margin-top: 5\.5rem;/);
  assert.match(
    layoutSource,
    /main:has\(\[data-car-details-experience\]\) \{\s*background: #F8FAFC !important;/,
  );
  assert.match(
    layoutSource,
    /\[data-car-details-section-nav\] \{\s*background: #F8FAFC !important;/,
  );
  assert.match(
    layoutSource,
    /\[data-car-price-comparison\],[\s\S]*?\[data-car-location-section\] \{\s*background: #F8FAFC !important;/,
  );
  assert.match(
    experienceSource,
    /presentation === "guided-content" \? "mt-6" : ""/,
  );
});

test("standalone desktop tabs place panel content in the former heading position", () => {
  assert.match(
    experienceSource,
    /<div className="min-h-\[240px\]" data-car-details-section-panels>/,
  );
  assert.match(
    layoutSource,
    /\[data-car-details-section-panels\] \{\s*margin-top: 0 !important;/,
  );
  assert.match(
    layoutSource,
    /#car-pickup-panel \{\s*padding-top: 0\.75rem;/,
  );
  const navSource = readFileSync(
    new URL("./CarDetailsSectionNav.tsx", import.meta.url),
    "utf8",
  );
  assert.match(navSource, /lg:sticky lg:top-0/);
  assert.match(
    navSource,
    /desktopStuck \? "lg:grid lg:grid-cols-\[auto_minmax\(0,1fr\)_auto\] lg:items-stretch lg:gap-4/,
  );
  assert.match(
    navSource,
    /desktopStuck \? "relative col-start-2 row-start-1 justify-self-center translate-x-0" : "absolute left-0 top-0 translate-x-0"/,
  );
  assert.match(navSource, /data-balanced={desktopStuck \? "true" : "false"}/);
  assert.doesNotMatch(navSource, /left-1\/2 -translate-x-1\/2/);
  assert.match(
    navSource,
    /border-\[#192024\] text-\[#192024\]/,
  );
  assert.match(
    navSource,
    /border-transparent text-\[#59636A\] hover:text-\[#004BB8\]/,
  );
  assert.doesNotMatch(navSource, /max-w-\[640px\]/);
  assert.doesNotMatch(navSource, /bg-\[#075EE8\].*lg:h-\[3px\]/);
  assert.match(navSource, /data-car-details-desktop-sticky-actions/);
  assert.match(navSource, /desktopBackControl\?: ReactNode/);
  assert.match(navSource, /data-car-details-desktop-sticky-back/);
  assert.match(
    navSource,
    /desktopStuck \? "relative col-start-1 row-start-1 flex min-h-16 items-center self-stretch translate-x-0 translate-y-0 opacity-100" : "pointer-events-none absolute left-0 top-1\/2 -translate-x-1 -translate-y-1\/2 opacity-0"/,
  );
  assert.match(
    navSource,
    /desktopStuck \? "relative col-start-3 row-start-1 flex min-h-16 items-center self-stretch justify-self-end translate-x-0 translate-y-0 opacity-100" : "pointer-events-none absolute right-0 top-1\/2 translate-x-1 -translate-y-1\/2 opacity-0"/,
  );
  assert.match(navSource, /desktopStuck \? desktopBackControl : null/);
  assert.match(navSource, /desktopStuck \? desktopUtilityActions : null/);
  assert.match(navSource, /data-car-details-desktop-sticky-backdrop/);
  assert.match(
    navSource,
    /fixed inset-x-0 top-0 z-0 hidden h-16 border-b border-slate-200 bg-\[#F8FAFC\]\/95/,
  );
  assert.match(
    navSource,
    /desktopStuck \? "opacity-100 shadow-\[0_6px_20px_rgba\(15,23,42,0\.07\)\] backdrop-blur-xl" : "opacity-0"/,
  );
  assert.match(
    navSource,
    /desktopStuck \? "lg:border-b lg:border-transparent lg:bg-transparent" : "lg:border-b lg:border-slate-200 lg:bg-\[#F8FAFC\]"/,
  );
  assert.doesNotMatch(
    layoutSource,
    /data-car-details-desktop-actions[\s\S]*?position:\s*absolute/,
  );
  assert.match(
    experienceSource,
    /data-car-pickup-return-section[\s\S]*?lg:rounded-none[\s\S]*?lg:bg-transparent[\s\S]*?lg:shadow-none/,
  );
  assert.match(
    experienceSource,
    /lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent[\s\S]*?data-car-location-timeline/,
  );
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
