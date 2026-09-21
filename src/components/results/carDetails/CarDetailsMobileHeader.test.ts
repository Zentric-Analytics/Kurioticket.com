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
const sectionNav = readFileSync(
  new URL("./CarDetailsSectionNav.tsx", import.meta.url),
  "utf8",
);

test("standalone mobile controls live in one persistent, scroll-transparent layer", () => {
  assert.equal(client.match(/data-car-details-mobile-controls/g)?.length, 1);
  assert.doesNotMatch(hero, /data-car-details-mobile-controls/);
  assert.match(
    client,
    /pointer-events-none fixed inset-x-0 top-0 z-40[^"].*lg:hidden/,
  );
  assert.match(client, /pointer-events-auto[^<]*">\{mobileBackControl\}/);
  assert.match(client, /pointer-events-auto[^<]*">\s*<CarHeroActions/);
  assert.match(client, /data-car-details-mobile-back/);
  assert.equal(client.match(/data-car-details-mobile-back/g)?.length, 1);
  assert.match(client, /aria-label="Back to Cars results"/);
});

test("mobile header uses safe areas and protects controls with the Cars canvas", () => {
  for (const safeArea of [
    "env(safe-area-inset-top)",
    "env(safe-area-inset-left)",
    "env(safe-area-inset-right)",
  ]) {
    assert.ok(client.includes(safeArea), `${safeArea} remains in the header`);
  }
  assert.match(
    client,
    /mobileHeaderProtected \? "bg-\[#F5F7FB\]" : "bg-transparent"/,
  );
  assert.match(client, /data-protected=\{mobileHeaderProtected/);
  assert.match(client, /const protectionLead = 16/);
  assert.match(client, /const protectionHysteresis = 12/);
  assert.match(client, /requestAnimationFrame\(syncProtection\)/);
  assert.match(
    client,
    /addEventListener\("scroll", scheduleProtectionSync, \{\s*passive: true/,
  );
});

test("mobile tabs pin below the control zone while desktop keeps top zero", () => {
  assert.match(
    client,
    /\[--car-details-mobile-header-boundary:calc\(env\(safe-area-inset-top\)\+4\.375rem\)\]/,
  );
  assert.match(client, /h-\[var\(--car-details-mobile-header-boundary\)\]/);
  assert.match(sectionNav, /top-\[var\(--car-details-mobile-header-boundary\)\]/);
  assert.doesNotMatch(sectionNav, /safe-area-inset-top|4\.5rem/);
  assert.match(sectionNav, /lg:top-0/);
  assert.match(sectionNav, /z-30/);
  assert.match(client, /data-mobile-car-booking-dock/);
  assert.match(client, /bottom-0 z-\[90\]/);
});

test("save and share stay wired once and desktop actions remain available", () => {
  assert.match(client, /useSavedCar\(car, search\)/);
  assert.match(client, /onClick=\{toggleSavedCar\}/);
  assert.match(client, /aria-pressed=\{isSaved\}/);
  assert.match(client, /navigator\.share/);
  assert.match(client, /navigator\.clipboard\.writeText/);
  assert.match(client, /desktopOverlay=/);
  assert.match(client, /desktop\s*\/\>/);
  assert.match(
    client,
    /guidedMobileActions=\{\s*presentation === "guided-content"/,
  );
});
