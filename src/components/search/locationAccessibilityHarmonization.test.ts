import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");

test("mobile flight picker exposes one keyboard-operable combobox/listbox relationship", () => {
  const source = read("./MobileAirportPicker.tsx");
  assert.match(source, /role="combobox"/);
  assert.match(source, /aria-controls=\{listboxId\}/);
  assert.match(source, /aria-activedescendant=\{activeId\}/);
  assert.match(source, /role="listbox"/);
  assert.match(source, /role="option"/);
  assert.match(source, /event\.key === "ArrowDown"/);
  assert.match(source, /event\.key === "Enter"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /role="status" aria-live="polite"/);
});

test("mobile hotel picker provides equivalent keyboard selection and announcements", () => {
  const source = read("./HotelDestinationMobilePicker.tsx");
  for (const contract of [/role="combobox"/, /role="listbox"/, /role="option"/, /aria-activedescendant=\{activeId\}/, /event\.key === "Escape"/, /event\.key === "Enter"/, /role="status"/]) assert.match(source, contract);
});

test("car permissive text remains announced as unverified with full keyboard semantics", () => {
  const source = read("./CarLocationAutocomplete.tsx");
  assert.match(source, /aria-describedby=\{statusId\}/);
  assert.match(source, /role="status"/);
  assert.match(source, /strings\.unverifiedTypedLocation/);
  assert.match(source, /event\.key === "Home"/);
  assert.match(source, /event\.key === "End"/);
});

test("mobile sheet shells restore focus to launchers and preserve Escape close", () => {
  const flightShell = read("./FlightMobilePickerShell.tsx");
  assert.match(flightShell, /launcherRef/);
  assert.match(flightShell, /focus\(/);
  assert.match(flightShell, /Escape/);
  assert.match(read("./HotelMobilePickerShell.tsx"), /<FlightMobilePickerShell \{\.\.\.props\} \/>/);
});

test("packages keep existing accessible flight combobox and listbox contract", () => {
  const source = read("./DealsSearchForm.tsx");
  assert.match(source, /role="combobox"/);
  assert.match(source, /aria-activedescendant/);
  assert.match(source, /role="listbox"/);
});
