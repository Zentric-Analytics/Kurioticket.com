import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const range = readFileSync("src/features/flow/DateRangeSheet.tsx", "utf8");
const calendar = readFileSync("src/features/flow/LocalCalendarModal.tsx", "utf8");

test("Edit Flight Search calendars force named English months instead of device numeric locale", () => {
  for (const source of [range, calendar]) {
    assert.match(source, /const FLIGHT_DATE_LOCALE = "en-US"/);
    assert.match(
      source,
      /toLocaleDateString\(FLIGHT_DATE_LOCALE, \{ month: "long", year: "numeric" \}\)/,
    );
    assert.doesNotMatch(
      source,
      /toLocaleDateString\(undefined, \{ month: "long", year: "numeric" \}\)/,
    );
  }
});

test("round-trip date chips also use abbreviated month names from the same explicit locale", () => {
  assert.match(
    range,
    /toLocaleDateString\(FLIGHT_DATE_LOCALE,\{weekday:"short",month:"short",day:"numeric"\}\)/,
  );
});