import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const detailSource = read("src/features/search/ApprovedDetailScreen.tsx");
const resultsSource = read("src/features/search/ApprovedResultsScreen.tsx");
const canonicalHook = read("src/storage/useCanonicalSaved.ts");
const flightHook = read("src/storage/useSavedFlights.ts");
const flightDetail = detailSource.slice(detailSource.indexOf("function FlightDetail"), detailSource.indexOf("function HotelDetail"));
const hotelDetail = detailSource.slice(detailSource.indexOf("function HotelDetail"), detailSource.indexOf("const detailIcons"));

test("flight detail reflects canonical saved state and toggles the displayed result", () => {
  assert.match(flightDetail, /useSavedFlights\(\)/);
  assert.match(flightDetail, /savedFlights\.has\(result\.id\)/);
  assert.match(flightDetail, /onPress=\{\(\) => toggleSavedFlight\(result\)\}/);
  assert.match(flightDetail, /accessibilityRole="button"/);
  assert.match(flightDetail, /accessibilityLabel=\{saved \? `Remove \$\{result\.airlineName\} flight from saved` : `Save \$\{result\.airlineName\} flight`\}/);
  assert.match(flightDetail, /accessibilityState=\{\{ selected: saved \}\}/);
});

test("hotel detail replaces the passive heart with a canonical saved button", () => {
  assert.match(hotelDetail, /useCanonicalSaved\(\)/);
  assert.match(hotelDetail, /item\.type === "hotel"[\s\S]*?\.id === result\.id/);
  assert.match(hotelDetail, /<Pressable[\s\S]*?accessibilityLabel=\{saved \? `Remove \$\{result\.name\} hotel from saved` : `Save \$\{result\.name\} hotel`\}/);
  assert.match(hotelDetail, /accessibilityState=\{\{ selected: saved \}\}/);
  assert.match(hotelDetail, /onPress=\{\(\) => void canonical\.toggleHotel\(result, params\)\}/);
  assert.match(hotelDetail, /<FlowIcon name="heart" fill=\{saved \? ui\.blue : "white"\}/);
});

test("result cards and detail actions share the same repositories", () => {
  assert.match(resultsSource, /function FlightCard[\s\S]*?useSavedFlights\(\)/);
  assert.match(flightDetail, /useSavedFlights\(\)/);
  assert.match(resultsSource, /function HotelCard[\s\S]*?useCanonicalSaved\(\)/);
  assert.match(hotelDetail, /useCanonicalSaved\(\)/);
  assert.match(flightHook, /savedRepositoryFor\(userId\)\.toggleFlight\(flight\)/);
});

test("guest hotel detail taps use the existing favorite sign-in flow", () => {
  assert.match(canonicalHook, /favoriteAction\(userId\) === "sign-in"/);
  assert.match(canonicalHook, /showFavoriteSignInPrompt\("\/saved"\);[\s\S]*?return;/);
  assert.match(flightHook, /favoriteAction\(userId\) === "sign-in"[\s\S]*?showFavoriteSignInPrompt\("\/saved"\)/);
});
