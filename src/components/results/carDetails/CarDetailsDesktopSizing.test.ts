import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const client = readFileSync(
  new URL("../CarDetailsClient.tsx", import.meta.url),
  "utf8",
);
const hero = readFileSync(
  new URL("./CarDetailsHero.tsx", import.meta.url),
  "utf8",
);
const layout = readFileSync(
  new URL("../../../app/cars/details/[id]/layout.tsx", import.meta.url),
  "utf8",
);
const route = readFileSync(
  new URL("../../../app/cars/details/[id]/page.tsx", import.meta.url),
  "utf8",
);

test("standalone desktop Cars Details body is centered at a production-ready width without changing the site header", () => {
  assert.match(
    client,
    /className="page-shell py-0 lg:py-6 lg:max-w-\[1080px\]" data-car-details-body-shell/,
  );
  assert.match(
    route,
    /data-car-details-desktop-header>[\s\S]*?<AppHeader[\s\S]*?flushDesktopBottom[\s\S]*?hideDesktopTravelNav/,
  );
  assert.doesNotMatch(client, /<AppHeader\b/);
});

test("standalone desktop overview uses centered single-column sizing", () => {
  assert.match(client, /lg:max-w-\[1080px\] lg:space-y-5/);
  assert.match(hero, /data-car-details-desktop-overview/);
  assert.match(hero, /hidden lg:flex lg:flex-col lg:items-center lg:p-5/);
  assert.doesNotMatch(hero, /lg:grid-cols-\[minmax\(0,1fr\)_320px\]/);
  assert.match(hero, /data-car-details-desktop-overview-image/);
  assert.match(hero, /h-\[250px\]/);
  assert.match(hero, /max-w-\[680px\]/);
  assert.match(hero, /sizes="680px"/);
  assert.match(hero, /max-w-\[820px\] text-center/);
  assert.doesNotMatch(hero, /data-car-details-desktop-overview-summary/);
  assert.match(client, /lg:max-w-\[900px\]/);
  assert.match(client, /max-w-\[720px\]/);
});

test("desktop width polish does not rewrite sticky or section-scroll behavior", () => {
  assert.match(client, /target\?\.scrollIntoView\(\{/);
  assert.match(client, /behavior: window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches/);
  assert.match(client, /new ResizeObserver\(scheduleDesktopScrollState\)/);
  assert.match(client, /window\.addEventListener\("scroll", scheduleDesktopScrollState/);
  assert.match(layout, /\[data-car-details-scroll-section\] \{\s*scroll-margin-top: 5\.5rem;/);
  assert.match(client, /desktopSectionBarStuck/);
});

test("mobile and guided hero dimensions remain unchanged", () => {
  assert.match(hero, /h-\[clamp\(11rem,50vw,14rem\)\] pb-3/);
  assert.match(hero, /"lg:max-w-\[760px\]"/);
  assert.match(hero, /lg:h-\[clamp\(20rem,32vw,27rem\)\] lg:rounded-xl lg:bg-white/);
});
