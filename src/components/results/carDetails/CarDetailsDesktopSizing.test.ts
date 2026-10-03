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
  assert.match(client, /space-y-0 lg:mx-auto lg:w-full lg:max-w-\[1080px\]/);
  assert.match(hero, /data-car-details-desktop-overview/);
  assert.match(
    hero,
    /hidden lg:flex lg:flex-col lg:items-center lg:px-0 lg:pb-1 lg:pt-0/,
  );
  assert.match(
    hero,
    /data-car-details-layered-surface=\{reserveMobileControlSafeZone \? "hero" : undefined\}/,
  );
  assert.match(
    hero,
    /lg:max-w-\[900px\][\s\S]*?lg:rounded-\[22px\][\s\S]*?lg:bg-\[#F7F9FC\]/,
  );
  assert.doesNotMatch(hero, /lg:grid-cols-\[minmax\(0,1fr\)_320px\]/);
  assert.match(hero, /data-car-details-desktop-overview-image/);
  assert.match(hero, /h-\[250px\]/);
  assert.match(hero, /max-w-\[680px\]/);
  assert.match(hero, /sizes="680px"/);
  assert.match(hero, /max-w-\[820px\] text-center/);
  assert.doesNotMatch(hero, /data-car-details-desktop-overview-summary/);
  assert.match(client, /lg:max-w-\[900px\]/);
  assert.match(client, /max-w-\[640px\]/);
});

test("desktop tabs switch panels in place instead of scrolling through stacked sections", () => {
  assert.match(client, /data-car-details-desktop-tab-panels/);
  assert.match(client, /id="car-desktop-compare-panel"/);
  assert.match(client, /id="car-desktop-pickup-panel"/);
  assert.match(client, /id="car-desktop-location-panel"/);
  assert.doesNotMatch(client, /target\?\.scrollIntoView\(\{/);
  assert.doesNotMatch(client, /scheduleDesktopScrollState|desktopSectionBarStuck/);
  assert.doesNotMatch(client, /data-car-details-desktop-linear-sections/);
});

test("mobile and guided hero dimensions remain unchanged", () => {
  assert.match(hero, /h-\[clamp\(11rem,50vw,14rem\)\] pb-3/);
  assert.match(hero, /"lg:max-w-\[760px\]"/);
  assert.match(hero, /lg:h-\[clamp\(20rem,32vw,27rem\)\] lg:rounded-xl lg:bg-white/);
});
