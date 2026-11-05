import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getCmsAirportSuggestions,
  getCmsCitySuggestions,
  getCmsCountrySuggestions,
} from "@/lib/adminCmsLocationOptions";

const editor = readFileSync("src/components/admin/HomepageCmsEditor.tsx", "utf8");
const combobox = readFileSync("src/components/admin/CmsLocationCombobox.tsx", "utf8");
const preview = readFileSync("src/components/admin/HomepageDestinationDraftPreview.tsx", "utf8");

test("country suggestions reuse public country records and provide a canonical code", () => {
  const [germany] = getCmsCountrySuggestions("Germany");
  assert.equal(germany.value, "Germany");
  assert.equal(germany.countryCode, "DE");
  assert.deepEqual(getCmsCountrySuggestions("unknown-country-xyz"), []);
});

test("city suggestions are searchable and prioritize selected country without overwriting manually typed values", () => {
  const madrid = getCmsCitySuggestions("Madrid", "ES");
  assert.ok(madrid.some((option) => option.title === "Madrid" && option.countryCode === "ES"));
  const london = getCmsCitySuggestions("London");
  assert.ok(london.some((option) => option.title === "London" && option.countryCode === "GB"));
});

test("airport suggestions use existing shared IATA airport data with explicit manual fallback", () => {
  const [madrid] = getCmsAirportSuggestions("MAD");
  assert.equal(madrid.value, "MAD");
  assert.match(madrid.title, /Madrid/);
  const manual = getCmsAirportSuggestions("ZZZ");
  assert.ok(manual.some((option) => option.value === "ZZZ" && option.manual));
  assert.ok(getCmsAirportSuggestions("a").every((option) => !option.manual));
});

test("homepage destinations use searchable selectors without restructuring the editor", () => {
  assert.match(editor, /<CmsLocationCombobox label="City" kind="city"/);
  assert.match(editor, /<CmsLocationCombobox label="Country" kind="country"/);
  assert.match(editor, /<CmsLocationCombobox label="Origin IATA" kind="airport"/);
  assert.match(editor, /<CmsLocationCombobox label="Destination IATA" kind="airport"/);
  assert.match(editor, /onSelect=\{selectCountry\}/);
  assert.match(editor, /onSelect=\{selectCity\}/);
  assert.match(editor, /grid max-w-\[512px\] gap-4 sm:grid-cols-3/);
  assert.match(editor, /<TextField label="Image" name="image"/);
  assert.match(editor, /<TextField label="Image alt text" name="imageAlt"/);
  assert.match(editor, /<CmsEditorActions/);
  assert.match(editor, /focus:border-\[#004BB8\]\/40/);
});

test("combobox supports keyboard selection and never saves or publishes automatically", () => {
  assert.match(combobox, /role="combobox"/);
  assert.match(combobox, /role="listbox"/);
  assert.match(combobox, /event\.key === "ArrowDown"/);
  assert.match(combobox, /event\.key === "ArrowUp"/);
  assert.match(combobox, /event\.key === "Escape"/);
  assert.match(combobox, /event\.key === "Enter"/);
  assert.doesNotMatch(combobox, /fetch\(|publish\(|saveDraft\(/);
});

test("visual preview shows the unsaved CMS draft, route, image and publication state", () => {
  assert.match(editor, /section === "destinations" \? \(/);
  assert.match(editor, /<HomepageDestinationDraftPreview/);
  assert.match(editor, /payload=\{currentPayload\}/);
  assert.match(preview, /src=\{src\}/);
  assert.match(preview, /alt=\{alt\}/);
  assert.match(preview, /Unsaved edits/);
  assert.match(preview, /Saving a draft does not publish it/);
  assert.match(preview, /marketName/);
});
