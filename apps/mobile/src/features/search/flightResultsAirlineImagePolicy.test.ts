import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { airlineInitials, flightResultsAllowRemoteAirlineImages } from "./flightResultsAirlineImagePolicy";

test("Experiment B disables every remote airline image only for iOS Flight Results", () => {
  assert.equal(flightResultsAllowRemoteAirlineImages("ios"), false);
  assert.equal(flightResultsAllowRemoteAirlineImages("android"), true);

  const logo = readFileSync("src/features/search/AirlineLogo.tsx", "utf8");
  const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
  assert.match(logo, /if \(!allowRemoteImages \|\| !visibleUrl/);
  assert.match(logo, /allowRemoteImages\?: boolean/);
  assert.match(screen, /flightResultsAllowRemoteAirlineImages\(Platform\.OS\)/);
  assert.match(screen, /allowRemoteImages=\{allowRemoteAirlineImages\}/);
  assert.equal((screen.match(/flightResultsAllowRemoteAirlineImages\(Platform\.OS\)/g) || []).length, 1);
});

test("the network-free fallback uses deterministic airline initials", () => {
  assert.equal(airlineInitials("Delta Air Lines"), "DA");
  assert.equal(airlineInitials("British Airways"), "BA");
  assert.equal(airlineInitials("Air France"), "AF");
  assert.equal(airlineInitials("KLM"), "KL");
});

test("the policy remains scoped away from hotel and shared provider presentations", () => {
  const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
  const provider = readFileSync("src/features/search/ProviderLogo.tsx", "utf8");
  const detail = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
  assert.match(screen, /const flightResults = product === "flight"/);
  assert.doesNotMatch(provider, /allowRemoteImages/);
  assert.doesNotMatch(detail, /allowRemoteImages/);
});

test("the full FlightCard and virtualized live SectionList remain in place", () => {
  const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
  assert.match(screen, /<SectionList/);
  assert.match(screen, /sections=\{\[\{ data: !flightState \? sorted as FlightResult\[\] : \[\] \}\]\}/);
  assert.match(screen, /initialNumToRender=\{6\}/);
  assert.match(screen, /maxToRenderPerBatch=\{5\}/);
  assert.match(screen, /windowSize=\{7\}/);
  assert.match(screen, /function FlightCard/);
  assert.match(screen, /Airline \$\{result\.airlineName\}/);
  assert.doesNotMatch(screen, /\.slice\(0,\s*\d+\).*results|results\.slice/);
});
