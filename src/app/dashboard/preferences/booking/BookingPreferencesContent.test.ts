import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bookingPreferencesSource = readFileSync(
  "src/app/dashboard/preferences/booking/BookingPreferencesContent.tsx",
  "utf8",
);
const englishTranslationsSource = readFileSync("src/lib/i18n/en.ts", "utf8");

test("travel preferences empty state message is not rendered for new users", () => {
  assert.equal(
    bookingPreferencesSource.includes(
      "No travel preferences saved yet. Add your defaults below.",
    ),
    false,
  );
  assert.equal(
    bookingPreferencesSource.includes(
      "accountDashboard.preferences.booking.status.empty",
    ),
    false,
  );
  assert.equal(englishTranslationsSource.includes("booking.status.empty"), false);
});

test("travel preferences fields still render with empty preference defaults", () => {
  assert.match(
    bookingPreferencesSource,
    /const emptyPreferences: TravelPreferences = \{\s*homeAirport: "",\s*preferredAirlines: \[\],\s*\};/,
  );
  assert.match(
    bookingPreferencesSource,
    /<AirportPreferenceSelect[\s\S]*id="homeAirport"[\s\S]*value=\{preferences\.homeAirport\}/,
  );
  assert.match(
    bookingPreferencesSource,
    /<AirlinePreferenceMultiSelect[\s\S]*id="preferredAirlines"[\s\S]*values=\{preferences\.preferredAirlines\}/,
  );
});

test("saved travel preference values are still projected from the API response", () => {
  assert.match(
    bookingPreferencesSource,
    /homeAirport: value\?\.homeAirport \?\? emptyPreferences\.homeAirport/,
  );
  assert.match(
    bookingPreferencesSource,
    /normalizeAirlinePreferenceValues\(value\.preferredAirlines\)/,
  );
  assert.match(bookingPreferencesSource, /setPreferences\(nextPreferences\);/);
  assert.match(bookingPreferencesSource, /setInitialPreferences\(nextPreferences\);/);
});

test("travel preferences save behavior remains wired to the existing PATCH endpoint", () => {
  assert.match(bookingPreferencesSource, /method: "PATCH"/);
  assert.match(
    bookingPreferencesSource,
    /body: JSON\.stringify\(projectTravelPreferences\(preferences\)\)/,
  );
  assert.match(
    bookingPreferencesSource,
    /t\["accountDashboard\.preferences\.booking\.status\.saved"\]/,
  );
  assert.match(
    bookingPreferencesSource,
    /t\["accountDashboard\.preferences\.booking\.status\.saveError"\]/,
  );
});

test("travel preferences actions and flight defaults section remain present", () => {
  assert.match(bookingPreferencesSource, /<PreferencesSection/);
  assert.match(bookingPreferencesSource, /<PreferencesActions/);
  assert.match(
    bookingPreferencesSource,
    /t\["accountDashboard\.preferences\.booking\.actions\.revert"\]/,
  );
  assert.match(
    bookingPreferencesSource,
    /t\["accountDashboard\.preferences\.savePreferences"\]/,
  );
});
