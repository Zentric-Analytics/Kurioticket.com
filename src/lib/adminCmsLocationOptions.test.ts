import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getCmsAirportSuggestions,
  getCmsCitySuggestions,
  getCmsCountrySuggestions,
  getCmsHotelDestinationSuggestions,
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
  assert.match(combobox, /browseAllHotels/);
  assert.match(combobox, /if \(kind !== "hotel" \|\| !onSelect\) onChange\(option\.value\)/);
  assert.match(combobox, /setBrowseAllHotels\(kind === "hotel"\)/);
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

test("CMS search fields keep a typing cursor while the dropdown arrow is an accessible pointer control", () => {
  assert.match(combobox, /className=\{inputClass \+ " cursor-text"\}/);
  assert.match(combobox, /type="button"\s+disabled=\{disabled\}\s+aria-label=\{\(open \? "Close" : "Open"\) \+ " " \+ label \+ " suggestions"\}/);
  assert.match(combobox, /aria-haspopup="listbox"/);
  assert.match(combobox, /aria-expanded=\{open\}/);
  assert.match(combobox, /className="absolute inset-y-0 right-0 inline-flex w-9 cursor-pointer/);
  assert.match(combobox, /onPointerDown=\{\(event\) => event\.preventDefault\(\)\}/);
  assert.match(combobox, /onClick=\{\(\) => \{\s*if \(open\) \{\s*dismiss\(\);\s*return;/);
  assert.match(combobox, /inputRef\.current\?\.focus\(\{ preventScroll: true \}\);\s*show\(\);/);
  // Preserve tapping the input to toggle, typing, keyboard suggestions and selecting options.
  assert.match(combobox, /onPointerDown=\{toggleOnPointerDown\}/);
  assert.match(combobox, /onChange=\{\(event\) => \{/);
  assert.match(combobox, /event\.key === "ArrowDown"/);
  assert.match(combobox, /event\.key === "Enter"/);
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
  assert.match(preview, /<aside className="h-fit min-w-0">/);
  assert.doesNotMatch(preview, /lg:sticky|lg:top-24/);
});


test("destination image URL and alt text fields wrap while preserving single-string CMS payloads", () => {
  const expanding = readFileSync("src/components/admin/CmsExpandingTextField.tsx", "utf8");
  assert.match(expanding, /wrap="soft"/);
  assert.match(expanding, /\[overflow-wrap:anywhere\]/);
  assert.match(expanding, /useLayoutEffect/);
  assert.match(expanding, /scrollHeight/);
  assert.match(expanding, /ResizeObserver/);
  assert.match(expanding, /onChange=\{\(event\) => onChange/);
  assert.match(editor, /grid max-w-\[512px\] gap-4 sm:grid-cols-3 sm:items-start/);
  assert.match(editor, /<span className="block min-h-5 text-\[13px\] font-medium leading-5/);
  assert.match(combobox, /<label className="block min-h-5 whitespace-nowrap text-\[13px\] font-medium leading-5/);
});


test("canonical hotel destination search uses the real ID and never substitutes the label", () => {
  const catalog = [
    { canonicalId: "hotel:london", label: "London · United Kingdom", name: "London", country: "United Kingdom", countryCode: "GB", kind: "city", searchValue: "London" },
    { canonicalId: "hotel:paris", label: "Paris · France", name: "Paris", country: "France", countryCode: "FR", kind: "city", searchValue: "Paris" },
  ];
  const suggestions = getCmsHotelDestinationSuggestions(catalog, "Paris");
  assert.deepEqual(suggestions.map((option) => option.value), ["hotel:paris"]);
  assert.equal(suggestions[0].title, "Paris · France");
  assert.deepEqual(getCmsHotelDestinationSuggestions(catalog, "nonsense"), []);
});

test("flight routes keep paired city and IATA fields with the same responsive grid", () => {
  assert.match(editor, /section === "flight-routes" \? \(/);
  assert.match(editor, /<CmsLocationCombobox label="Origin city" kind="city"/);
  assert.match(editor, /<CmsLocationCombobox label="Origin IATA" kind="airport"/);
  assert.match(editor, /<CmsLocationCombobox label="Destination city" kind="city"/);
  assert.match(editor, /<CmsLocationCombobox label="Destination IATA" kind="airport"/);
  assert.match(editor, /grid max-w-\[496px\] gap-4 sm:grid-cols-\[minmax\(0,1fr\)_160px\] sm:items-start/);
  assert.match(editor, /<CmsExpandingTextField label="Image" value=\{fields.image/);
  assert.match(editor, /<CmsExpandingTextField label="Image alt text" value=\{fields.imageAlt/);
  assert.match(editor, /<AdminTextarea className=\{\`\$\{editorControlClass\} h-auto min-h-24\`\}/);
});

test("hotel destinations use searchable canonical selection and preserve type and country code", () => {
  assert.match(editor, /<CmsLocationCombobox[\s\S]*?label="Canonical hotel destination"[\s\S]*?kind="hotel"/);
  assert.match(editor, /selectedValue=\{fields.canonicalId \?\? ""\}/);
  assert.match(editor, /hotelOptions=\{hotelOptions\}/);
  assert.match(editor, /onSelect=\{\(option\) => applyHotelOption\(option.value\)\}/);
  assert.match(editor, /setField\("canonicalId", ""\)/);
  assert.match(editor, /<CmsLocationCombobox label="Country" kind="country"/);
  assert.match(editor, /<Field label="Kind" className="max-w-\[160px\]">/);
  assert.match(editor, /"airport-area", "custom"/);
  assert.match(editor, /<CmsExpandingTextField label="Image \(optional\)" value=\{fields.image/);
  assert.match(editor, /<CmsExpandingTextField label="Image alt text \(optional\)" value=\{fields.imageAlt/);
  assert.match(editor, /canonicalId: fields.canonicalId\?\.trim\(\)/);
});

test("flight and hotel previews match the visual, non-sticky homepage preview", () => {
  const visual = readFileSync("src/components/admin/CmsRouteHotelDraftPreview.tsx", "utf8");
  assert.match(editor, /<CmsRouteHotelDraftPreview/);
  assert.match(editor, /payload=\{currentPayload\}/);
  assert.match(editor, /publishedVersion=\{item\?\.publishedVersion\}/);
  assert.match(visual, /<aside className="h-fit min-w-0">/);
  assert.doesNotMatch(visual, /lg:sticky|lg:top-24/);
  assert.match(visual, /<PreviewImage key=\{imageUrl \?\? "no-image"\}/);
  assert.match(visual, /payload.routeNote/);
  assert.match(visual, /payload.searchValue/);
  assert.match(visual, /unsaved/);
  assert.match(visual, /Saving a draft does not publish it/);
});

test("hotel CMS canonical search protects the mapped destination and uses visible image overrides", () => {
  const backend = readFileSync("src/services/cmsContentService.ts", "utf8");
  const helper = readFileSync("src/lib/cmsHotelIntegrity.ts", "utf8");
  const api = readFileSync("src/app/api/content/homepage/route.ts", "utf8");
  const listing = readFileSync("src/app/admin/content/homepage/[section]/page.tsx", "utf8");

  for (const contract of [
    "getCmsHotelMetadataMismatch",
    "assertUniqueHotelCanonicalId",
    "assertHotelIdentityNotChanged",
    "assertHotelNotUsedByPublishedHomepage",
    "assertPublishedHomepageHasHotel",
  ]) assert.match(backend, new RegExp(contract));

  assert.match(helper, /countryCode/);
  assert.match(helper, /searchValue/);
  assert.match(api, /hotelDestination\.image \?/);
  assert.match(api, /image: hotelDestination\.image/);
  assert.match(api, /hotelDestination\.imageAlt\?\.trim\(\) \|\| destination\.imageAlt/);
  assert.match(listing, /left\.sortOrder - right\.sortOrder/);

  assert.match(editor, /item\?\.publishedVersion != null/);
  assert.match(editor, /selectedHotelIdRef = useRef\(text\(saved\.canonicalId\)\)/);
  assert.match(editor, /previousCanonicalId && previousCanonicalId !== option\.canonicalId \? \{ image: "", imageAlt: "" \}/);
  assert.match(editor, /setConflict\(staleVersion\)/);
  assert.match(editor, /: serverError\)/);
  assert.match(editor, /changed since it was opened\|changed concurrently\|refresh before/);
  assert.match(editor, /create a new draft to manage a different destination/);
  assert.match(editor, /Directory order/);
  assert.match(editor, /Existing destinations cannot be duplicated/);
  assert.match(editor, /Country, country code, type and search value come from the canonical catalogue/);
});
