import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const form = readFileSync(
  new URL("./DealsSearchForm.tsx", import.meta.url),
  "utf8",
);
const mobilePickerShell = readFileSync(
  new URL("./FlightMobilePickerShell.tsx", import.meta.url),
  "utf8",
);

test("Deals planner renders coordinated product rows and a final travellers row", () => {
  assert.match(form, /aria-labelledby="deals-flight-heading"/);
  assert.match(form, /htmlFor="deals-flight-cabin"/);
  assert.match(form, /aria-labelledby="deals-hotel-heading"/);
  assert.match(form, /aria-labelledby="deals-car-heading"/);
  assert.match(form, /data-deals-travellers-row/);
  assert.match(form, /\{t\("deals\.travellersRooms"\)\}/);
  assert.match(form, /data-deals-travellers-row[\s\S]*\{searchDealsButton\}/);
  assert.doesNotMatch(form, /\{t\("deals\.travelersCabinLabel"\)\}/);
});

test("the large-screen Deals layout keeps every control in compact heading rails", () => {
  assert.match(
    form,
    /<fieldset[^>]*lg:grid[^>]*lg:grid-cols-\[minmax\(0,1fr\)_auto\]/,
  );
  assert.match(
    form,
    /data-deals-product-selector[\s\S]{0,120}lg:flex-nowrap[\s\S]{0,120}lg:justify-end/,
  );
  assert.match(
    form,
    /data-deals-heading-rail="flight"[\s\S]*data-deals-field-content="flight"/,
  );
  assert.match(
    form,
    /data-deals-heading-rail="stay"[\s\S]*data-deals-field-content="stay"/,
  );
  assert.match(
    form,
    /data-deals-heading-rail="car"[\s\S]*data-deals-field-content="car"/,
  );
  assert.match(
    form,
    /data-deals-heading-rail="travellers"[\s\S]*data-deals-travellers-actions[\s\S]*\{searchDealsButton\}/,
  );
});

test("the compact layout preserves touch targets and full-width guided preview", () => {
  const connectedSegmentDeclaration = form.match(
    /const connectedSegment =\s*\n\s*"([^"]+)"/,
  );

  assert.ok(connectedSegmentDeclaration);
  assert.match(connectedSegmentDeclaration[1], /lg:min-h-14/);
  assert.doesNotMatch(connectedSegmentDeclaration[1], /lg:min-h-\[68px\]/);
  assert.match(
    form,
    /data-deals-product=\{product\}[\s\S]{0,300}className=\{`[^`]*min-h-11/,
  );
  assert.match(form, /type="submit"[\s\S]{0,180}min-h-12/);
  assert.match(
    form,
    /className="w-full lg:col-span-2">\{guidedPreviewPanel\}<\/div>/,
  );
});

test("the approved primary row field labels are explicit", () => {
  assert.match(form, /t\(kind\)/);
  assert.match(form, /\{t\("deals\.cabinClass"\)\}/);
  assert.match(form, /\{t\("deals\.pickup"\)\}/);
  assert.match(form, /\{t\("deals\.returnLocation"\)\}/);
  assert.match(form, /\{t\("deals\.sameAsPickup"\)\}/);
  assert.match(form, /\{t\("deals\.carOptions"\)\}/);
});

test("the desktop return-location editor labels and focuses its input", () => {
  assert.match(
    form,
    /const carReturnLocationInputRef = useRef<HTMLInputElement>\(null\)/,
  );
  assert.match(
    form,
    /htmlFor="deals-car-desktop-return-location-input"[\s\S]{0,100}\{t\("deals\.returnLocation"\)\}/,
  );
  assert.match(
    form,
    /ref=\{carReturnLocationInputRef\}[\s\S]{0,100}id="deals-car-desktop-return-location-input"/,
  );
  assert.match(
    form,
    /if \([\s\S]{0,100}!carReturnLocationOpen[\s\S]{0,100}window\.matchMedia\("\(min-width: 640px\)"\)\.matches/,
  );
  assert.match(
    form,
    /requestAnimationFrame\(\(\) => \{[\s\S]{0,100}carReturnLocationInputRef\.current\?\.focus\(\{ preventScroll: true \}\);[\s\S]{0,100}carReturnLocationInputRef\.current\?\.select\(\)/,
  );
});

test("the shared travellers picker keeps its mobile behavior without an unsupported marker", () => {
  assert.match(
    form,
    /onClick=\{\(\) =>[\s\S]{0,80}travelersOpen[\s\S]{0,80}dismissDesktopTravelers\(\)[\s\S]{0,80}openTravelers\(\)/,
  );
  assert.match(
    form,
    /<FlightMobilePickerShell[\s\S]*?open=\{mobileTravelersOpen\}[\s\S]*?onClose=\{closeMobileTravelers\}[\s\S]*?>[\s\S]*?\{travelersPicker\}[\s\S]*?<\/FlightMobilePickerShell>/,
  );
  assert.match(form, /commitTravelers\(true\);[\s\S]{0,40}requestClose\(\);/);
  assert.match(form, /id="deals-desktop-travellers"/);
  assert.match(form, /titleId="deals-mobile-travellers-title"/);
  assert.match(form, /dialogId="deals-mobile-travellers"/);
  assert.doesNotMatch(form, /hotelGuests(?:Open|Picker|Launcher)/);
  assert.doesNotMatch(form, /pickerMarker="shared-travellers"/);
});

test("the mobile picker shell retains only its implemented marker semantics", () => {
  assert.match(
    mobilePickerShell,
    /pickerMarker\?: "flight-date" \| "traveler-cabin";/,
  );
  assert.match(
    mobilePickerShell,
    /pickerMarker === "flight-date" \? "true" : undefined/,
  );
  assert.match(
    mobilePickerShell,
    /pickerMarker === "traveler-cabin" \? "true" : undefined/,
  );
  assert.doesNotMatch(mobilePickerShell, /shared-travellers/);
});
