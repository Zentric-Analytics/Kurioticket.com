import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("responsive web shell exposes the explicit shared travellers variant", () => {
  const source = readFileSync(new URL("./FlightMobilePickerShell.tsx", import.meta.url), "utf8");
  assert.match(source, /pickerMarker\?: "flight-date" \| "traveler-cabin" \| "shared-travellers"/);
  assert.match(source, /data-mobile-shared-travellers-picker=/);
  assert.match(source, /pickerMarker === "shared-travellers"/);
});
