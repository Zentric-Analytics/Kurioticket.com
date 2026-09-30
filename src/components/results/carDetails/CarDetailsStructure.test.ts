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

test("CarDetailsExperience uses one Hotels-style sticky desktop section handoff", () => {
  assert.doesNotMatch(experienceSource, /<main\b/);
  assert.doesNotMatch(experienceSource, /page-shell/);
  assert.match(experienceSource, /data-car-details-experience/);
  assert.match(experienceSource, /data-car-details-desktop-controls/);
  assert.doesNotMatch(experienceSource, /data-car-details-desktop-sticky-controls/);
  assert.match(
    experienceSource,
    /hidden h-16 w-full items-center border-b border-transparent bg-\[#F5F7FB\] lg:flex/,
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
  assert.doesNotMatch(experienceSource, /data-car-details-desktop-context/);
  assert.match(experienceSource, /desktopBackControl={desktopBackControl}/);
  assert.doesNotMatch(
    layoutSource,
    /\[data-car-details-booking-rail\][\s\S]*?position: sticky/,
  );
  assert.match(
    layoutSource,
    /\[data-car-details-bottom-booking-bar\][\s\S]*?margin-top: 3rem;[\s\S]*?background: #FFFFFF;/,
  );
  assert.doesNotMatch(
    layoutSource,
    /\[data-car-details-bottom-booking-bar\][\s\S]*?position:\s*(?:sticky|fixed)/,
  );
  assert.match(layoutSource, /\[data-car-details-scroll-section\] \{\s*scroll-margin-top: 5\.5rem;/);
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
    /desktopStuck \? "left-1\/2 -translate-x-1\/2" : "left-0 translate-x-0"/,
  );
  assert.match(navSource, /data-centered={desktopStuck \? "true" : "false"}/);
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
    /desktopStuck \? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-1 opacity-0"/,
  );
  assert.match(
    navSource,
    /desktopStuck \? "translate-x-0 opacity-100" : "pointer-events-none translate-x-1 opacity-0"/,
  );
  assert.match(navSource, /desktopStuck \? desktopBackControl : null/);
  assert.match(navSource, /desktopStuck \? desktopUtilityActions : null/);
  assert.match(
    navSource,
    /lg:bg-\[#F5F7FB\]\/95 lg:shadow-\[0_6px_20px_rgba\(15,23,42,0\.07\)\] lg:backdrop-blur-xl/,
  );
  assert.doesNotMatch(
    layoutSource,
    /data-car-details-desktop-actions[\s\S]*?position:\s*absolute/,
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
