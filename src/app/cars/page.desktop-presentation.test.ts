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
  assert.doesNotMatch(source, /t\("carsDesktopHeroBody"\)/);
  assert.match(source, /bottom-\[-84px\][\s\S]*?lg:bottom-\[-88px\]/);
  assert.doesNotMatch(source, /bottom-\[-64px\]|lg:bottom-\[-68px\]/);
  assert.match(source, /object-cover object-\[50%_52%\]/);
  assert.match(source, /from-white\/62 via-white\/24 to-transparent/);
  assert.doesNotMatch(source, /from-white\/74 via-white\/34/);
  assert.doesNotMatch(source, /brightness-\[/);
  assert.doesNotMatch(
    source,
    /cars-search-heading[\s\S]{0,800}from-slate-950\/70/,
  );
});

test("desktop Cars field row follows the approved order and moderate geometry", () => {
  const markers = [
    "carsSearch.pickupLocationLabel",
    "carsSearch.returnLocationLabel",
    "carsSearch.rentalDatesLabel",
    "carsSearch.pickupReturnTimeLabel",
    "carsSearch.driverAgeLabel",
    'type="submit"',
  ];
  let previous = -1;
  for (const marker of markers) {
    const index = searchBar.indexOf(marker);
    assert.ok(index > previous, `${marker} should retain the approved order`);
    previous = index;
  }

  assert.match(searchBar, /data-testid="cars-desktop-field-grid"/);
  assert.match(searchBar, /sm:h-\[54px\]/);
  assert.match(searchBar, /sm:rounded-\[9px\]/);
  assert.match(searchBar, /bg-\[#075EE8\]/);
  assert.match(searchBar, /_140px_154px\]/);
  assert.match(searchBar, /sm:mx-\[5px\] sm:my-\[5px\]/);
  assert.match(searchBar, /sm:w-\[calc\(100%-10px\)\]/);
  assert.match(
    searchBar,
    /className="flex items-center sm:-mb-0\.5">[\s\S]*?<CarFront[\s\S]*?className="h-5 w-5 text-\[#075EE8\]"[\s\S]*?\{t\("cars"\)\}/,
  );
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
  assert.doesNotMatch(
    searchBar,
    /onClick=\{onClearSearch\}|\{t\("clearAll"\)\}/,
  );
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

test("desktop field labels are text-only and neutral icons lead every value", () => {
  const searchCell = source.slice(source.indexOf("function SearchCell"));
  assert.doesNotMatch(searchCell, /icon[?:]/);

  const pickup = searchBar.slice(
    searchBar.indexOf('label={t("carsSearch.pickupLocationLabel")}'),
    searchBar.indexOf('label={t("carsSearch.returnLocationLabel")}'),
  );
  const returnLocation = searchBar.slice(
    searchBar.indexOf('label={t("carsSearch.returnLocationLabel")}'),
    searchBar.indexOf('label={t("carsSearch.rentalDatesLabel")}'),
  );
  for (const location of [pickup, returnLocation]) {
    assert.match(location, /hidden min-w-0 items-center gap-2 sm:flex/);
    assert.match(location, /h-4 w-4 shrink-0 text-slate-500/);
    assert.ok(
      location.indexOf("<MapPin") <
        location.indexOf("<CarLocationAutocomplete"),
    );
  }

  const rentalDates = source.slice(
    source.indexOf("function RentalDatesField"),
    source.indexOf("function TimeRangeField"),
  );
  const time = source.slice(
    source.indexOf("function TimeRangeField"),
    source.indexOf("function SearchCell"),
  );
  assert.match(rentalDates, /className="h-4 w-4 shrink-0 text-slate-500"/);
  assert.match(time, /className="h-4 w-4 shrink-0 text-slate-500"/);

  const age = searchBar.slice(
    searchBar.indexOf(
      "<button\n                  ref={desktopDriverAgeLauncherRef}",
    ),
    searchBar.indexOf("<DriverAgeDesktopPopover"),
  );
  assert.match(age, /<UserRound[\s\S]*?h-4 w-4 shrink-0 text-slate-500/);
  assert.match(age, /flex min-w-0 items-center gap-2/);
});
