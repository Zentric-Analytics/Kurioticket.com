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
  assert.match(editor, /<CmsExpandingTextField label="Image" value=\{fields\.image/);
  assert.match(editor, /<CmsExpandingTextField label="Image alt text" value=\{fields\.imageAlt/);
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
  assert.match(combobox, /onPointerDown=\{toggleOnPointerDown\}/);
  assert.match(combobox, /if \(open\) dismiss\(\)/);
  assert.match(combobox, /createPortal\(/);
  assert.match(combobox, /overscroll-contain/);
  assert.match(combobox, /preventScroll: true/);
  assert.match(combobox, /document\.addEventListener\("scroll", dismissOnScroll, true\)/);
  assert.match(combobox, /scrollTop/);
  assert.doesNotMatch(combobox, /scrollIntoView/);
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


test("destination image URL and alt text fields wrap while preserving single-string CMS payloads", () => {
  const expanding = readFileSync("src/components/admin/CmsExpandingTextField.tsx", "utf8");
  assert.match(expanding, /wrap="soft"/);
  assert.match(expanding, /\[overflow-wrap:anywhere\]/);
  assert.match(expanding, /useLayoutEffect/);
  assert.match(expanding, /scrollHeight/);
  assert.match(expanding, /ResizeObserver/);
  assert.match(expanding, /replace\(\/\[\\r\\n\]\+\/g, " "\)/);
  assert.match(editor, /grid max-w-\[512px\] gap-4 sm:grid-cols-3 sm:items-start/);
  assert.match(editor, /<span className="block min-h-5 text-\[13px\] font-medium leading-5/);
  assert.match(combobox, /<label className="block min-h-5 whitespace-nowrap text-\[13px\] font-medium leading-5/);
});
