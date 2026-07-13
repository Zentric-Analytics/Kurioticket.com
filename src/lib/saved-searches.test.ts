import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { parseSavedFlightSearchQuery, parseSavedHotelSearchQuery } from "@/lib/saved-searches";

test("valid flight rerun URL preserves supported values without raw JSON", () => {
  const parsed = parseSavedFlightSearchQuery({
    tripType: "round-trip",
    origin: "JFK",
    destination: "LAX",
    departureDate: "2026-08-01",
    returnDate: "2026-08-10",
    adults: 2,
    children: 1,
    infants: 0,
    cabinClass: "business",
    ignored: "nope",
  });

  assert.ok(parsed);
  assert.equal(parsed.href, "/flights/results?tripType=round-trip&origin=JFK&destination=LAX&departureDate=2026-08-01&adults=2&children=1&infants=0&travelers=3&cabinClass=business&returnDate=2026-08-10");
  assert.doesNotMatch(parsed.href, /ignored|%7B|query=/);
});

test("malformed query disables rerun", () => {
  assert.equal(parseSavedFlightSearchQuery({ origin: "JFK", destination: "LAX" }), null);
});

test("valid hotel search reconstructs existing hotel results URL", () => {
  const parsed = parseSavedHotelSearchQuery({ destination: "Paris", checkIn: "2026-08-01", checkOut: "2026-08-03", guests: 2, rooms: 1 });
  assert.ok(parsed);
  assert.equal(parsed.href, "/hotels/results?destination=Paris&checkIn=2026-08-01&checkOut=2026-08-03&guests=2&rooms=1");
});

test("saved page fetches searches separately and keeps saved routes behavior", () => {
  const apiSource = readFileSync("src/lib/saved-trips-api.ts", "utf8");
  const componentSource = readFileSync("src/components/saved/SavedTripsAndRecentSearches.tsx", "utf8");

  assert.match(apiSource, /fetch\("\/api\/dashboard\/saved\?type=search"/);
  assert.match(apiSource, /fetch\("\/api\/dashboard\/saved\?type=trip"/);
  assert.match(componentSource, /Saved routes/);
  assert.match(componentSource, /Saved searches/);
  assert.match(componentSource, /setSavedSearchesError/);
  assert.match(componentSource, /savedTrips\.length === 0/);
});

test("saved search cards include required rendering states and accessible actions", () => {
  const source = readFileSync("src/components/saved/SavedTripsAndRecentSearches.tsx", "utf8");

  for (const text of ["Flight search", "Hotel search", "Departure", "Return", "Trip type", "Travelers", "Cabin", "Created"]) {
    assert.match(source, new RegExp(text));
  }
  assert.match(source, /We can’t reopen this saved search\. Run the search again and save it\./);
  assert.match(source, /Unknown origin/);
  assert.match(source, /Unknown destination/);
  assert.match(source, /No saved searches yet/);
  assert.match(source, /aria-label=\{`Rerun/);
  assert.match(source, /aria-label=\{`Delete saved search/);
  assert.match(source, /min-h-11/);
  assert.match(source, /sm:flex-row/);
});

test("delete success and failure paths are isolated to saved searches", () => {
  const apiSource = readFileSync("src/lib/saved-trips-api.ts", "utf8");
  const componentSource = readFileSync("src/components/saved/SavedTripsAndRecentSearches.tsx", "utf8");

  assert.match(apiSource, /body: JSON\.stringify\(\{ type: "search", id \}\)/);
  assert.match(componentSource, /setDeletingSavedSearchIds/);
  assert.match(componentSource, /setSavedSearches\(\(current\) =>[\s\S]*filter\(\(item\) => item\.id !== search\.id\)/);
  assert.match(componentSource, /setSavedSearchesError\(result\.error/);
  assert.doesNotMatch(componentSource, /deleteBackendTrip\(search\.id\)/);
});
