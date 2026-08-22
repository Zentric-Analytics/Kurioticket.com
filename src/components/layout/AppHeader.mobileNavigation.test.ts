import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const headerSource = readFileSync(
  new URL("./AppHeader.tsx", import.meta.url),
  "utf8",
);
const homepageSource = readFileSync(
  new URL("../../app/page.tsx", import.meta.url),
  "utf8",
);

test("homepage alone requests removal of the below-sm header product rail", () => {
  assert.match(homepageSource, /<AppHeader hideMobileSecondaryNavLinks \/>/);

  const otherCallSites = Array.from(
    homepageSource.matchAll(/<AppHeader[\s\S]*?>/g),
    (match) => match[0],
  );
  assert.deepEqual(otherCallSites, ["<AppHeader hideMobileSecondaryNavLinks />"]);
});

test("header removes the homepage product rail from layout only below sm", () => {
  const mobileRailStart = headerSource.indexOf(
    "{visibleMobilePrimaryNavItems.length > 0 ? (",
  );
  const mobileRail = headerSource.slice(
    mobileRailStart,
    headerSource.indexOf("{mobileMenuOpen ? (", mobileRailStart),
  );

  assert.match(
    mobileRail,
    /hideMobileSecondaryNavLinks && "hidden sm:block"/,
  );
  assert.match(mobileRail, /"md:hidden"/);
  assert.doesNotMatch(mobileRail, /opacity-0|invisible|visibility/);
  assert.match(mobileRail, /visibleMobilePrimaryNavItems\.map/);
});

test("homepage keeps search product tabs and primary header controls", () => {
  assert.match(
    homepageSource,
    /<SearchTabs[\s\S]*?mobileHomepage[\s\S]*?\/>/,
  );
  assert.match(headerSource, /aria-label=\{t\.signIn\}/);
  assert.match(headerSource, /<UserCircle size=\{18\} \/>/);
  assert.match(headerSource, /<Menu size=\{18\} \/>/);
  assert.match(headerSource, /mobileTravelMenuNavItems\.map/);
});

test("desktop product navigation remains independent of the mobile suppression prop", () => {
  const desktopRail = headerSource.slice(
    headerSource.indexOf("{desktopPrimaryNavItems.length > 0 ? ("),
    headerSource.indexOf("{visibleMobilePrimaryNavItems.length > 0 ? ("),
  );

  assert.match(desktopRail, /className="hidden md:block"/);
  assert.match(desktopRail, /desktopPrimaryNavItems\.map/);
  assert.doesNotMatch(desktopRail, /hideMobileSecondaryNavLinks/);
});
