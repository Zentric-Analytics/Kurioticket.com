import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const content = readFileSync(
  new URL("../../data/carsLandingContent.ts", import.meta.url),
  "utf8",
);
const searchBar = source.slice(
  source.indexOf("function CarsSearchBar"),
  source.indexOf("function CarsMobilePickerDialogs"),
);

test("desktop Cars uses the approved coastal convertible hero and exact copy", () => {
  assert.match(
    content,
    /\/images\/premium\/cars\/kurioticket-cars-hero-coastal-convertible-001\.jpg/,
  );
  assert.match(source, /t\("carsDesktopHeroTitle"\)/);
  assert.match(source, /t\("carsDesktopHeroBody"\)/);
  assert.match(source, /object-cover object-\[50%_52%\]/);
  assert.doesNotMatch(source, /cars-search-heading[\s\S]{0,800}from-slate-950\/70/);
});

test("desktop Cars field row follows the approved order and moderate geometry", () => {
  const markers = [
    'carsSearch.pickupLocationLabel',
    'carsSearch.returnLocationLabel',
    'carsSearch.rentalDatesLabel',
    'carsSearch.pickupReturnTimeLabel',
    'carsSearch.driverAgeLabel',
    'type="submit"',
  ];
  let previous = -1;
  for (const marker of markers) {
    const index = searchBar.indexOf(marker);
    assert.ok(index > previous, `${marker} should retain the approved order`);
    previous = index;
  }

  assert.match(searchBar, /data-testid="cars-desktop-field-grid"/);
  assert.match(searchBar, /sm:h-\[52px\]/);
  assert.match(searchBar, /sm:rounded-\[9px\]/);
  assert.match(searchBar, /bg-\[#075EE8\]/);
  assert.doesNotMatch(searchBar, /sm:flex[\s\S]{0,500}\{t\("cars"\)\}/);
});

test("return location is a distinct desktop field only when enabled", () => {
  assert.match(
    searchBar,
    /values\.returnToDifferentLocation \? \([\s\S]*?carsSearch\.returnLocationLabel[\s\S]*?dropoffLocationDesktop/,
  );
  assert.match(searchBar, /className="hidden sm:block sm:border-e/);
  assert.match(
    source,
    /if \(key === "returnToDifferentLocation" && value === false\) \{[\s\S]*?next\.dropoffLocation = ""/,
  );
  assert.doesNotMatch(searchBar, /onClick=\{onClearSearch\}|\{t\("clearAll"\)\}/);
});

test("desktop date, time, and age summaries match the approved hierarchy", () => {
  assert.match(source, /carsSearch\.rentalDays/);
  assert.match(source, /formatCarTimeLabel\(pickupTime, intlLocale\)/);
  assert.match(
    searchBar,
    /desktopDriverAgeLauncherRef[\s\S]*?carsSearch\.driverAgeAnyAge/,
  );
  assert.match(searchBar, /carsSearch\.differentReturnLocation/);
});
