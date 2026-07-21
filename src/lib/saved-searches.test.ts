import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  parseSavedFlightSearchQuery,
  parseSavedHotelSearchQuery,
} from "@/lib/saved-searches";

test("valid detailed saved trip can reopen search without raw JSON", () => {
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
  assert.equal(
    parsed.href,
    "/flights/results?tripType=round-trip&origin=JFK&destination=LAX&departureDate=2026-08-01&adults=2&children=1&infants=0&travelers=3&cabinClass=business&returnDate=2026-08-10",
  );
  assert.doesNotMatch(parsed.href, /ignored|%7B|query=/);
});

test("malformed exact-search record remains visible but rerun is disabled", () => {
  assert.equal(
    parseSavedFlightSearchQuery({ origin: "JFK", destination: "LAX" }),
    null,
  );

  const source = readFileSync(
    "src/components/saved/SavedTripsAndRecentSearches.tsx",
    "utf8",
  );
  assert.match(source, /We can’t reopen this saved trip/);
  assert.match(source, /Reopen unavailable/);
});

test("valid hotel trip reconstructs existing hotel results URL", () => {
  const parsed = parseSavedHotelSearchQuery({
    destination: "Paris",
    checkIn: "2026-08-01",
    checkOut: "2026-08-03",
    guests: 2,
    rooms: 1,
  });
  assert.ok(parsed);
  assert.equal(
    parsed.href,
    "/hotels/results?destination=Paris&checkIn=2026-08-01&checkOut=2026-08-03&guests=2&rooms=1",
  );
});

test("saved page has one unified saved trips section and no saved searches heading", () => {
  const apiSource = readFileSync("src/lib/saved-trips-api.ts", "utf8");
  const componentSource = readFileSync(
    "src/components/saved/SavedTripsAndRecentSearches.tsx",
    "utf8",
  );

  assert.match(apiSource, /fetch\("\/api\/dashboard\/saved\?type=search"/);
  assert.match(apiSource, /fetch\("\/api\/dashboard\/saved\?type=trip"/);
  assert.match(componentSource, /id="saved-trips-heading"/);
  assert.match(componentSource, /Saved trips/);
  assert.doesNotMatch(componentSource, />Saved searches</);
  assert.doesNotMatch(componentSource, /No saved searches yet/);
  assert.match(componentSource, /No saved trips yet/);
  assert.match(
    componentSource,
    /Save a route or travel search to find it here later\./,
  );
});

test("SavedTrip and detailed SavedSearch-backed cards render under Saved trips with accessible mobile-visible actions", () => {
  const source = readFileSync(
    "src/components/saved/SavedTripsAndRecentSearches.tsx",
    "utf8",
  );

  for (const text of [
    "Departure",
    "Return",
    "Trip type",
    "Travelers",
    "Cabin",
    "Check-in",
    "Check-out",
    "Guests",
    "Created",
  ]) {
    assert.match(source, new RegExp(text));
  }
  assert.match(source, /key=\{`trip-/);
  assert.match(source, /key=\{`search-/);
  assert.match(source, /aria-label=\{`Reopen search for/);
  assert.match(source, /aria-label=\{`Remove saved trip/);
  assert.match(source, /min-h-11/);
  assert.match(source, /sm:flex-row/);
});

test("correct delete payloads are retained for trip and search records", () => {
  const apiSource = readFileSync("src/lib/saved-trips-api.ts", "utf8");
  const componentSource = readFileSync(
    "src/components/saved/SavedTripsAndRecentSearches.tsx",
    "utf8",
  );

  assert.match(
    apiSource,
    /body: JSON\.stringify\(\{ type: "trip", id: backendId \}\)/,
  );
  assert.match(apiSource, /body: JSON\.stringify\(\{ type: "search", id \}\)/);
  assert.match(componentSource, /deleteBackendTrip\(backendId\)/);
  assert.match(componentSource, /deleteBackendSavedSearch\(search\.id\)/);
  assert.doesNotMatch(componentSource, /deleteBackendTrip\(search\.id\)/);
});

test("search-detail load failure does not hide trip cards", () => {
  const source = readFileSync(
    "src/components/saved/SavedTripsAndRecentSearches.tsx",
    "utf8",
  );
  assert.match(
    source,
    /Some saved trip details could not be loaded\. Please try again\./,
  );
  assert.match(source, /savedTrips\.map/);
  assert.match(source, /visibleSavedSearches\.map/);
});

test("safe deduplication requires route, dates, and trip type evidence; insufficient matches remain visible", () => {
  const source = readFileSync(
    "src/components/saved/SavedTripsAndRecentSearches.tsx",
    "utf8",
  );

  assert.match(source, /normalizedMatch\(tripSearch\.origin, parsed\.origin\)/);
  assert.match(source, /tripSearch\.departureDate === parsed\.departureDate/);
  assert.match(source, /tripSearch\.tripType === parsed\.tripType/);
  assert.match(source, /if \(!tripSearch\) return false/);
  assert.match(source, /visibleSavedSearches = savedSearches\.filter/);
});
