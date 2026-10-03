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
  assert.doesNotMatch(experienceSource, /data-car-details-scroll-section="rental"/);
  assert.doesNotMatch(experienceSource, /current === "rental"/);
  assert.doesNotMatch(experienceSource, /setActiveTab\([^\n]*"rental"/);
  assert.match(experienceSource, /data-car-details-desktop-linear-sections/);
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
    /main:has\(\[data-car-details-experience\]\) \{\s*background: #EEF2F7 !important;/,
  );
  assert.match(
    layoutSource,
    /\[data-car-details-section-nav\] \{\s*background: transparent !important;/,
  );
  assert.match(
    experienceSource,
    /presentation === "guided-content" \? "mt-6" : "car-details-standalone-typography"/,
  );
});

test("standalone desktop navigation hands off to the Expedia-inspired linear sections", () => {
  assert.match(
    experienceSource,
    /<div className="min-h-\[240px\]" data-car-details-section-panels>/,
  );
  assert.match(
    layoutSource,
    /\[data-car-details-section-panels\] \{\s*margin-top: 0 !important;/,
  );
  assert.match(experienceSource, /data-car-details-mobile-section-panels/);
  assert.match(experienceSource, /data-car-details-desktop-section="compare"/);
  assert.match(experienceSource, /data-car-details-desktop-section="pickup"/);
  assert.match(experienceSource, /data-car-details-desktop-section="location"/);
  assert.doesNotMatch(experienceSource, /data-car-details-desktop-section="rental"/);
  const navSource = readFileSync(
    new URL("./CarDetailsSectionNav.tsx", import.meta.url),
    "utf8",
  );
  assert.match(navSource, /lg:sticky lg:top-0/);
  assert.match(
    navSource,
    /desktopStuck \? "lg:grid lg:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\] lg:items-stretch lg:gap-3/,
  );
  assert.match(
    navSource,
    /desktopStuck \? "relative col-start-2 row-start-1 justify-self-center translate-x-0" : "absolute left-1\/2 top-0 -translate-x-1\/2"/,
  );
  assert.match(navSource, /data-balanced={desktopStuck \? "true" : "false"}/);
  assert.match(navSource, /left-1\/2 top-0 -translate-x-1\/2/);
  assert.match(
    navSource,
    /car-details-desktop-selected-info-type[\s\S]*?border-\[#075EE8\] text-\[#07133B\]/,
  );
  assert.match(
    navSource,
    /border-transparent text-\[#526174\] hover:text-\[#142033\]/,
  );
  const cssSource = readFileSync(
    new URL("../../../app/globals.css", import.meta.url),
    "utf8",
  );
  assert.match(
    cssSource,
    /\.car-details-desktop-selected-info-type \{[\s\S]*?font-family: var\(--font-sans\);[\s\S]*?font-size: 15px;[\s\S]*?line-height: 20px;[\s\S]*?font-weight: 700;[\s\S]*?letter-spacing: -0\.003em;[\s\S]*?font-variation-settings: "wght" 700;/,
  );
  assert.doesNotMatch(navSource, /max-w-\[640px\]/);
  assert.doesNotMatch(navSource, /bg-\[#075EE8\].*lg:h-\[3px\]/);
  assert.match(navSource, /data-car-details-desktop-sticky-actions/);
  assert.match(navSource, /export type CarDetailsTab = "compare" \| "pickup" \| "location"/);
  assert.match(navSource, /const mobileTabs = tabs;/);
  assert.doesNotMatch(navSource, /id: "rental"|labels\.rental/);
  assert.match(navSource, /desktopBackControl\?: ReactNode/);
  assert.match(navSource, /data-car-details-desktop-sticky-back/);
  assert.match(
    navSource,
    /desktopStuck \? "relative col-start-1 row-start-1 flex min-h-\[48px\] items-center self-stretch justify-self-start translate-x-0 translate-y-0 opacity-100" : "pointer-events-none absolute left-0 top-1\/2 -translate-x-1 -translate-y-1\/2 opacity-0"/,
  );
  assert.match(
    navSource,
    /desktopStuck \? "relative col-start-3 row-start-1 flex min-h-\[48px\] items-center self-stretch justify-self-end translate-x-0 translate-y-0 opacity-100" : "pointer-events-none absolute right-0 top-1\/2 translate-x-1 -translate-y-1\/2 opacity-0"/,
  );
  assert.match(navSource, /desktopStuck \? desktopBackControl : null/);
  assert.match(navSource, /desktopStuck \? desktopUtilityActions : null/);
  assert.match(navSource, /data-car-details-desktop-sticky-backdrop/);
  assert.match(
    navSource,
    /fixed inset-x-0 top-0 z-0 hidden h-\[48px\] bg-\[#EEF2F7\]\/92/,
  );
  assert.match(
    navSource,
    /desktopStuck \? "opacity-100 shadow-\[0_5px_16px_rgba\(15,23,42,0\.055\)\] backdrop-blur-xl" : "opacity-0"/,
  );
  assert.match(
    navSource,
    /desktopStuck \? "lg:grid[\s\S]*?lg:bg-transparent" : "lg:block lg:bg-transparent"/,
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

test("standalone desktop Cars details use a layered Flight-inspired canvas without changing mobile ownership", () => {
  assert.match(layoutSource, /background: #EEF2F7 !important/);
  assert.match(experienceSource, /data-car-details-layered-surface=\{showDesktopOfferList \? "compare" : undefined\}/);
  assert.match(experienceSource, /data-car-details-layered-surface="pickup"/);
  assert.match(experienceSource, /data-car-details-layered-surface="location"/);
  assert.match(experienceSource, /data-car-details-inner-surface="pickup-return"/);
  assert.match(experienceSource, /data-car-details-inner-surface="location-identity"/);
  assert.match(experienceSource, /hidden lg:block lg:space-y-5 lg:pb-8 lg:pt-4/);
  assert.match(experienceSource, /data-car-details-desktop-location-details/);
  assert.doesNotMatch(
    experienceSource,
    /data-car-details-desktop-location-details[^\n]*rounded-\[/,
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

test("standalone desktop Cars details use a centered single-column composition", () => {
  assert.match(
    experienceSource,
    /presentation === "standalone-content" \? "lg:grid-cols-1 lg:gap-0" : "lg:grid-cols-\[minmax\(0,1fr\)_320px\]/,
  );
  assert.match(
    experienceSource,
    /presentation === "standalone-content" \? "space-y-0 lg:mx-auto lg:w-full lg:max-w-\[900px\] lg:space-y-5"/,
  );
  assert.match(
    experienceSource,
    /mx-auto flex w-full max-w-\[820px\] items-center justify-between px-2/,
  );

  const navSource = readFileSync(
    new URL("./CarDetailsSectionNav.tsx", import.meta.url),
    "utf8",
  );
  assert.match(navSource, /lg:mx-auto lg:mt-3 lg:max-w-\[760px\]/);
  assert.match(navSource, /lg:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/);
  assert.match(navSource, /absolute left-1\/2 top-0 -translate-x-1\/2/);
  assert.match(navSource, /data-car-details-compact-sticky-tabs/);
  assert.match(navSource, /rounded-\[14px\][^"]*bg-white\/95/);
  assert.doesNotMatch(navSource, /data-car-details-desktop-nav-rule/);
  assert.doesNotMatch(navSource, /lg:border-b lg:border-slate-200/);
});
