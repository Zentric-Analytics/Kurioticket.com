import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "src/components/flights/FlightLandingClient.tsx",
  "utf8",
);
const mobileHeroStart = source.indexOf(
  '<section className="relative isolate z-20 min-h-[24.25rem] overflow-visible bg-slate-950 sm:hidden">',
);
const desktopHeroStart = source.indexOf(
  '<section className="relative hidden overflow-visible pb-28 sm:block lg:pb-32">',
);
const mobileLayout = source.slice(mobileHeroStart, desktopHeroStart);
const mobileSearchWrapperClass = mobileLayout.match(
  /Keep the mobile card in flow[\s\S]*?<div className="([^"]+)">/,
)?.[1];
const followingContent = source.slice(
  source.indexOf('<section className="page-shell', desktopHeroStart),
);

test("mobile Flight landing search stays in flow while overlapping the hero", () => {
  assert.notEqual(mobileHeroStart, -1);
  assert.notEqual(desktopHeroStart, -1);
  assert.match(
    mobileLayout,
    /<\/section>\s*\{\/\* Keep the mobile card in flow[\s\S]*?<div className="page-shell relative z-30 -mt-6 sm:hidden">/,
  );
  assert.match(mobileLayout, /<StandaloneFlightSearchForm/);
  assert.match(mobileLayout, /mobileHeroCard/);
  assert.match(mobileLayout, /presentation="main-flight-landing"/);
  assert.equal(mobileSearchWrapperClass, "page-shell relative z-30 -mt-6 sm:hidden");
  assert.doesNotMatch(source, /bottom-\[-23\.5rem\]/);
});

test("following landing content uses normal spacing instead of a fixed form-height reservation", () => {
  assert.match(
    followingContent,
    /^<section className="page-shell mt-10 sm:mt-32 lg:mt-36">/,
  );
  assert.doesNotMatch(followingContent, /pt-\[28rem\]/);
});
