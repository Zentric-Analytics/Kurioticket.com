import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");

test("travel preferences are requested only for authenticated flight result screens", () => {
  const preferenceEffect = screen.slice(
    screen.lastIndexOf("useEffect(() => {", screen.indexOf("void readSession().then")),
    screen.indexOf("const visualTest"),
  );
  assert.match(preferenceEffect, /if \(!flightResults\) return/);
  assert.match(preferenceEffect, /if \(!session\) \{[\s\S]*setPreferredAirlineCodes\(\[\]\);[\s\S]*return;/);
  assert.match(preferenceEffect, /travelApi\.travelPreferences\(\)/);
});

test("preference loading is independent from and cannot block the flight search", () => {
  const load = screen.slice(screen.indexOf("const load = useCallback"), screen.indexOf("const edit ="));
  assert.match(load, /travelApi\.searchFlights\(plan\.plan\.payload/);
  assert.doesNotMatch(load, /travelPreferences/);
  assert.match(screen, /catch\(\(\) => \{\s*\/\/ Flight results keep today's behavior if travel preferences are unavailable\./);
});

test("the default waits for usable results and available airline options", () => {
  const application = screen.slice(
    screen.indexOf("const searchKey = plan.plan?.key"),
    screen.indexOf("const activeFilterCount"),
  );
  assert.match(application, /status !== "ready"/);
  assert.match(application, /flightOptions\.airlines\.length === 0/);
  assert.match(application, /normalizePreferredAirlineFilterValues\([\s\S]*preferredAirlineCodes,[\s\S]*flightOptions\.airlines/);
  assert.match(application, /if \(preferredAirlines\.length === 0\) return/);
});

test("an existing explicit airline filter wins over the saved default", () => {
  assert.match(screen, /if \(filters\.airlines\.length > 0\) return/);
  assert.match(screen, /setFilters\(\(current\) => current\.airlines\.length > 0[\s\S]*\? current/);
});

test("the default is attempted once per search so manual clear and same-search retry cannot restore it", () => {
  assert.match(screen, /preferredAirlineDefaultAttemptedSearchKey\.current === searchKey/);
  assert.match(screen, /preferredAirlineDefaultAttemptedSearchKey\.current = searchKey/);
  assert.match(screen, /const currentFlightLoadingIdentity = `\$\{plan\.plan\?\.key \|\| "invalid"\}:\$\{retry\}`/);
  assert.doesNotMatch(screen, /preferredAirlineDefaultAttemptedSearchKey\.current = undefined;[\s\S]{0,120}retry/);
});

test("a new canonical search resets default eligibility along with existing local filters", () => {
  const reset = screen.slice(
    screen.indexOf("if (previousFlightSearchKey.current"),
    screen.indexOf("previousFlightSearchKey.current = plan.plan.key"),
  );
  assert.match(reset, /setFilters\(emptyFlightFilters\(\)\)/);
  assert.match(reset, /setFiltersFlightSearchKey\(plan\.plan\.key\)/);
  assert.match(reset, /preferredAirlineDefaultAttemptedSearchKey\.current = undefined/);
});

test("preference requests and updates are lifecycle guarded", () => {
  assert.match(screen, /let active = true;[\s\S]*if \(!active\) return/);
  assert.match(screen, /if \(active\) setPreferredAirlineCodes/);
  assert.match(screen, /return \(\) => \{ active = false; \}/);
});

test("provider search payload and hotel behavior remain unchanged", () => {
  assert.match(screen, /travelApi\.searchFlights\(plan\.plan\.payload, \{ signal: controller\.signal, requestId \}\)/);
  assert.doesNotMatch(screen, /searchFlights\([^\n]*preferredAirline/);
  assert.match(screen, /if \(!flightResults\) return/);
  assert.doesNotMatch(screen, /homeAirport/);
});
