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

test("CarDetailsExperience is content-only and owns the standalone sticky desktop toolbar", () => {
  assert.doesNotMatch(experienceSource, /<main\b/);
  assert.doesNotMatch(experienceSource, /page-shell/);
  assert.match(experienceSource, /data-car-details-experience/);
  assert.match(experienceSource, /data-car-details-desktop-sticky-controls/);
  assert.match(
    experienceSource,
    /hidden h-16 w-full items-center border-b border-transparent bg-\[#F5F7FB\] lg:sticky lg:top-0 lg:z-40 lg:flex/,
  );
  assert.match(experienceSource, /\{desktopBackControl\}/);
  assert.doesNotMatch(
    layoutSource,
    /\[data-car-details-desktop-sticky-controls\]::before/,
  );
  assert.match(
    layoutSource,
    /\[data-car-details-booking-rail\][\s\S]*?position: sticky !important;[\s\S]*?bottom: 0;/,
  );
  assert.match(
    experienceSource,
    /data-car-details-desktop-sticky-context/,
  );
  assert.match(
    experienceSource,
    /pointer-events-none absolute left-1\/2 top-1\/2 hidden w-\[52%\] max-w-\[34rem\]/,
  );
  assert.match(
    experienceSource,
    /<CarHeroActions[\s\S]*?desktop/,
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
  assert.match(navSource, /lg:top-16/);
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
