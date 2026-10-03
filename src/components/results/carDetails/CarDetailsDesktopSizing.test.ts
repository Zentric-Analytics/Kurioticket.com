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

test("standalone desktop keeps the 900px parent card with a 680px amenities and section rail", () => {
  assert.match(
    client,
    /space-y-0 lg:mx-auto lg:w-full lg:max-w-\[900px\] lg:rounded-\[22px\] lg:border lg:border-\[#DFE6EF\] lg:bg-\[#F7F9FC\] lg:pb-6/,
  );
  assert.match(client, /data-car-details-desktop-parent-card/);
  assert.doesNotMatch(client, /data-car-details-desktop-inner-card/);
  assert.match(hero, /data-car-details-desktop-overview/);
  assert.match(hero, /data-car-details-desktop-overview-image/);
  assert.match(hero, /h-\[250px\]/);
  assert.match(hero, /sizes="680px"/);
  assert.match(
    hero,
    /max-w-\[680px\] grid-cols-4 gap-x-6 gap-y-2 px-2 py-1/,
  );
  assert.match(client, /data-car-details-desktop-linear-sections/);
  assert.equal(
    client.match(/data-car-details-desktop-section-card=/g)?.length,
    3,
  );
  assert.match(client, /max-w-\[640px\]/);
  assert.doesNotMatch(hero, /data-car-details-desktop-overview-summary/);
});

test("desktop tabs scroll through stacked sections and keep the compact sticky handoff", () => {
  assert.match(client, /data-car-details-desktop-linear-sections/);
  assert.match(client, /data-car-details-scroll-section="compare"/);
  assert.match(client, /data-car-details-scroll-section="pickup"/);
  assert.match(client, /data-car-details-scroll-section="location"/);
  assert.match(client, /target\?\.scrollIntoView\(\{/);
  assert.match(client, /scheduleDesktopScrollState/);
  assert.match(client, /desktopSectionBarStuck/);
  assert.doesNotMatch(client, /data-car-details-desktop-tab-panels/);
});

test("mobile and guided hero dimensions remain unchanged", () => {
  assert.match(hero, /h-\[clamp\(11rem,50vw,14rem\)\] pb-3/);
  assert.match(hero, /"lg:max-w-\[760px\]"/);
  assert.match(hero, /lg:h-\[clamp\(20rem,32vw,27rem\)\] lg:rounded-xl lg:bg-white/);
});
