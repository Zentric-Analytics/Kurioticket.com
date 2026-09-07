import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const logo = readFileSync("src/features/search/AirlineLogo.tsx", "utf8");
const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const filterSheet = readFileSync("src/features/search/FlightFilterSheet.tsx", "utf8");
const detailScreen = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");

test("Flight Results use provider logos without a platform image policy", () => {
  assert.match(screen, /<AirlineLogo[\s\S]*?logoUrl=\{result\.airlineLogo\}/);
  assert.doesNotMatch(screen, /flightResultsAllowRemoteAirlineImages|allowRemoteAirlineImages|allowRemoteImages|airlineInitials|airlineImagePolicy/);
  assert.doesNotMatch(logo, /allowRemoteImages|fallbackText/);
  assert.doesNotMatch(screen, /Platform\.OS\s*===\s*["']ios["'][\s\S]{0,120}(?:AirlineLogo|airline image)/i);
});

test("Flight Filter airline rows match the current Web text-only treatment", () => {
  assert.doesNotMatch(filterSheet, /<AirlineLogo|r\.airlineLogo|logoUrl=/);
});

test("only Flight Results opt into the result-card logo presentation", () => {
  assert.match(screen, /<AirlineLogo[\s\S]*?logoUrl=\{result\.airlineLogo\}[\s\S]*?variant="result-card"/);
  assert.doesNotMatch(filterSheet, /variant="result-card"/);
  assert.doesNotMatch(detailScreen, /variant="result-card"/);
  assert.match(logo, /variant = "default"/);
});

test("result-card logos share one bounded premium tile while defaults remain 32px", () => {
  assert.match(logo, /logo: \{[\s\S]*?width: 32,[\s\S]*?height: 32/);
  assert.match(logo, /tile: \{[\s\S]*?width: 32,[\s\S]*?height: 32/);
  assert.match(logo, /resultCardTile: \{[\s\S]*?width: 42,[\s\S]*?height: 42,[\s\S]*?borderRadius: 10,[\s\S]*?borderWidth: 1/);
  assert.match(logo, /resultCardArtwork: \{ width: 32, height: 32 \}/);
  assert.match(logo, /width=\{isResultCard \? 32 : "100%"\}/);
  assert.match(logo, /style=\{isResultCard \? styles\.resultCardArtwork : styles\.image\}/);
  assert.match(logo, /resizeMode="contain"/);
  assert.match(logo, /isResultCard \? styles\.resultCardTile : styles\.tile/);
  assert.match(logo, /isResultCard \? \[styles\.resultCardTile, resultCardTileColors\] : styles\.logo/);
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
  assert.match(screen, /<Animated\.SectionList/);
  assert.match(screen, /<Animated\.SectionList[\s\S]*?renderSectionHeader[\s\S]*?\{filterRail\}/);
  assert.match(screen, /if \(status === "loading"\) return <NativeBrandedSearchLoading product=\{product\}/);
  assert.match(screen, /<Animated\.SectionList[\s\S]*?ListHeaderComponent=\{flightDateStrip\}[\s\S]*?renderSectionHeader[\s\S]*?renderItem[\s\S]*?<FlightResultsSummaryRow[\s\S]*?<FlightCard/);
  assert.match(screen, /renderSectionHeader[\s\S]*?stickySectionHeadersEnabled/);
  assert.match(screen, /<PriceAlert/);
  assert.match(screen, /<FlightSortSheet/);
  assert.match(screen, /<FlightFilterSheet/);
});
