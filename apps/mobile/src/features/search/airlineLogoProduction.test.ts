import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const logo = readFileSync("src/features/search/AirlineLogo.tsx", "utf8");
const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const filterSheet = readFileSync("src/features/search/FlightFilterSheet.tsx", "utf8");
const detailScreen = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
const nativeFlightDetails = readFileSync("src/features/search/NativeFlightDetails.tsx", "utf8");

test("Flight Results use provider logos without a platform image policy", () => {
  assert.match(screen, /<AirlineLogo[\s\S]*?logoUrl=\{result\.airlineLogo\}/);
  assert.doesNotMatch(screen, /flightResultsAllowRemoteAirlineImages|allowRemoteAirlineImages|allowRemoteImages|airlineInitials|airlineImagePolicy/);
  assert.doesNotMatch(logo, /allowRemoteImages|fallbackText/);
  assert.doesNotMatch(screen, /Platform\.OS\s*===\s*["']ios["'][\s\S]{0,120}(?:AirlineLogo|airline image)/i);
});

test("Flight Filter airline rows match the current Web text-only treatment", () => {
  assert.doesNotMatch(filterSheet, /<AirlineLogo|r\.airlineLogo|logoUrl=/);
});

test("Flight Results use the compact result logo tile without changing Details presentation", () => {
  assert.match(screen, /<AirlineLogo[\s\S]*?logoUrl=\{result\.airlineLogo\}[\s\S]*?variant="compact-result-card"/);
  assert.doesNotMatch(filterSheet, /variant="compact-result-card"/);
  assert.doesNotMatch(detailScreen, /variant="compact-result-card"/);
  assert.doesNotMatch(nativeFlightDetails, /variant="compact-result-card"/);
  assert.match(nativeFlightDetails, /variant="result-card"/);
  assert.match(logo, /variant = "default"/);
});

test("Results get a 36px logo tile while existing result-card consumers stay 42px", () => {
  assert.match(logo, /logo: \{[\s\S]*?width: 32,[\s\S]*?height: 32/);
  assert.match(logo, /tile: \{[\s\S]*?width: 32,[\s\S]*?height: 32/);
  assert.match(logo, /resultCardTile: \{[\s\S]*?width: 42,[\s\S]*?height: 42,[\s\S]*?borderRadius: 10,[\s\S]*?borderWidth: 1/);
  assert.match(logo, /compactResultCardTile: \{[\s\S]*?width: 36,[\s\S]*?height: 36,[\s\S]*?borderRadius: 8,[\s\S]*?borderWidth: 1/);
  assert.match(logo, /resultCardArtwork: \{ width: 32, height: 32 \}/);
  assert.match(logo, /const isResultCard = variant === "result-card" \|\| variant === "compact-result-card"/);
  assert.match(logo, /const resultCardTileStyle = isCompactResultCard \? styles\.compactResultCardTile : styles\.resultCardTile/);
  assert.match(logo, /resizeMode="contain"/);
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
  const header = screen.slice(screen.indexOf("function FlightResultsHeader"), screen.indexOf("function HotelResultsHeader"));
  const list = screen.slice(screen.indexOf("<Animated.SectionList"), screen.indexOf('testID="flight-results-scroll-indicator"', screen.indexOf("<Animated.SectionList")));
  assert.match(screen, /function FlightCard/);
  assert.match(screen, /<Animated\.SectionList/);
  assert.match(header, /accessibilityLabel="Flight result filters"[\s\S]*?\{filterRail\}/);
  assert.match(screen, /if \(status === "loading" \|\| hotelCurrencyPending\) return <NativeBrandedSearchLoading product=\{product\}/);
  assert.match(list, /renderItem[\s\S]*?<FlightResultsSummaryRow[\s\S]*?<FlightCard/);
  assert.doesNotMatch(list, /renderSectionHeader|stickySectionHeadersEnabled|\{filterRail\}/);
  assert.match(screen, /<FlightPriceAlert/);
  assert.match(screen, /<FlightSortSheet/);
  assert.match(screen, /<FlightFilterSheet/);
});
