import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const logo = readFileSync("src/features/search/AirlineLogo.tsx", "utf8");
const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const filterSheet = readFileSync("src/features/search/FlightFilterSheet.tsx", "utf8");

test("Flight Results use provider logos without a platform image policy", () => {
  assert.match(screen, /<AirlineLogo[\s\S]*?logoUrl=\{result\.airlineLogo\}/);
  assert.doesNotMatch(screen, /flightResultsAllowRemoteAirlineImages|allowRemoteAirlineImages|allowRemoteImages|airlineInitials|airlineImagePolicy/);
  assert.doesNotMatch(logo, /allowRemoteImages|fallbackText/);
  assert.doesNotMatch(screen, /Platform\.OS\s*===\s*["']ios["'][\s\S]{0,120}(?:AirlineLogo|airline image)/i);
});

test("Flight Filter airline rows use the normal provider logo path", () => {
  assert.match(filterSheet, /r\.airlineLogo/);
  assert.match(
    filterSheet,
    /<AirlineLogo\s+airlineName=\{name\}\s+logoUrl=\{[A-Za-z_$][\w$]*\.get\(name\)\}\s*\/>/,
  );
  assert.doesNotMatch(filterSheet, /allowRemoteAirlineImages|allowRemoteImages|fallbackText|airlineInitials/);
});

test("normal SVG and raster logos retain their native render paths and fallback", () => {
  assert.match(logo, /isSvgUrl\(visibleUrl\) \? \(/);
  assert.match(logo, /<SvgUri/);
  assert.match(logo, /<Image/);
  assert.equal(logo.match(/onError=\{\(\) => setFailedUrl\(visibleUrl\)\}/g)?.length, 2);
  assert.match(logo, /if \(!visibleUrl \|\| failed \|\| \(isSvgUrl\(visibleUrl\) && !allowRemoteSvg\)\)/);
  assert.match(logo, /airlineName\.trim\(\)\.slice\(0, fallbackCharacters\)/);
  assert.match(logo, /allowRemoteSvg\?: boolean/);
  assert.match(screen, /EXPO_PUBLIC_DISABLE_REMOTE_AIRLINE_SVG/);
});

test("Flight Result structure and SectionList controls remain intact", () => {
  assert.match(screen, /function FlightCard/);
  assert.match(screen, /<SectionList/);
  assert.match(screen, /stickySectionHeadersEnabled/);
  assert.match(screen, /<PriceAlert/);
  assert.match(screen, /<FlightSortModal/);
  assert.match(screen, /<FlightFilterSheet/);
  assert.match(screen, /ListHeaderComponent=\{\([\s\S]*?\{dateStrip\}[\s\S]*?<PriceAlert/);
});
