import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const form = readFileSync("src/components/search/DealsSearchForm.tsx", "utf8");
const page = readFileSync("src/app/deals/page.tsx", "utf8");
const compactStart = form.indexOf("const compactMobileControls");
const compactEnd = form.indexOf("\n  return (", compactStart);
const compact = form.slice(compactStart, compactEnd);

test("Packages route selects a dedicated landing presentation while Deals keeps desktop landing", () => {
  assert.match(page, /usePathname/);
  assert.match(
    page,
    /pathname === "\/packages" \? "packages-landing" : "desktop-landing"/,
  );
  assert.match(form, /\| "packages-landing"/);
  assert.match(
    form,
    /presentation === "desktop-landing" \|\| isPackagesLanding/,
  );
  assert.match(form, /isPackagesLanding \? "hidden sm:contents" : "contents"/);
});

test("standalone mobile Packages has the approved identity without homepage product tabs", () => {
  const identity = compact.slice(
    compact.indexOf("{isPackagesLanding ? ("),
    compact.indexOf(
      '<fieldset className="min-w-0',
      compact.indexOf("{isPackagesLanding ? ("),
    ),
  );
  assert.match(compact, /data-packages-identity-icon/);
  assert.match(compact, /<PackagesIcon/);
  assert.match(compact, /h-6 w-7 text-\[#004BB8\]/);
  assert.match(
    compact,
    /rounded-lg bg-\[#004BB8\]\/8[\s\S]*text-\[16px\] font-semibold[\s\S]*\{t\("deals"\)\}/,
  );
  assert.doesNotMatch(identity, /h-px|border-b|border-bottom/);
  assert.doesNotMatch(compact, /Flights \| Hotels \| Cars \| Packages/);
});

test("standalone package mode rail keeps four canonical icon-labelled choices", () => {
  for (const [mode, label] of [
    ["hotel-flight", "Flight + Hotel"],
    ["flight-car", "Flight + Car"],
    ["hotel-car", "Hotel + Car"],
    ["hotel-flight-car", "Flight + Hotel + Car"],
  ]) {
    assert.match(
      form,
      new RegExp(`mode: "${mode}", text: "${label.replaceAll("+", "\\+")}"`),
    );
  }
  for (const utility of [
    "overflow-x-auto",
    "overflow-y-hidden",
    "overscroll-x-contain",
    "touch-pan-x",
    "[&::-webkit-scrollbar]:hidden",
  ]) {
    assert.ok(compact.includes(utility));
  }
  assert.match(
    compact,
    /isPackagesLanding \? \([\s\S]*?Building2[\s\S]*?Plane[\s\S]*?CarFront/,
  );
  assert.match(compact, /after:h-\[2px\][\s\S]*after:bg-\[#075ee8\]/);
  assert.doesNotMatch(compact, /rounded-full border-2 px-4/);
});

test("trip radios expose only supported canonical values and disable Multi-city", () => {
  assert.match(compact, /\["round-trip", "one-way"\] as const/);
  assert.match(compact, /setDealsFlightTripType\(value\)/);
  assert.match(
    compact,
    /role="radio"[\s\S]*aria-disabled="true"[\s\S]*disabled[\s\S]*t\("multiCity"\)/,
  );
  assert.doesNotMatch(compact, /setDealsFlightTripType\("multi-city"\)/);
});

test("mobile Packages fields use label then left icon and value with one canonical swap", () => {
  const helper = form.slice(
    form.indexOf("const compactPackageFieldContent"),
    compactStart,
  );
  assert.ok(helper.indexOf("{label}") < helper.indexOf("{icon}"));
  assert.ok(helper.indexOf("{icon}") < helper.indexOf("{value}"));
  assert.match(form, /h-\[62px\] rounded-\[10px\]/);
  assert.match(compact, /t\("origin"\)[\s\S]*?<MapPin/);
  assert.match(compact, /t\("destination"\)[\s\S]*?<MapPin/);
  assert.match(compact, /t\("travelDates"\)[\s\S]*?<Calendar/);
  assert.match(compact, /deals\.travelersRoomsLabel[\s\S]*?<UserRound/);
  assert.match(
    form,
    /h-4 w-4 shrink-0[\s\S]*isPackagesLanding \? "text-slate-500"/,
  );
  assert.doesNotMatch(
    form,
    /compactValueIconClassName = `[^`]*text-\[#075ee8\]/,
  );
  assert.equal((compact.match(/<ArrowRightLeft/g) ?? []).length, 1);
  assert.match(compact, /onClick=\{swapDealsFlightAirports\}/);
});

test("standalone mobile Packages alone uses the short localized destination placeholder", () => {
  assert.match(
    compact,
    /search\.flightDestinationText \|\|[\s\S]*?isPackagesLanding[\s\S]*?"flightSearchDestinationPlaceholderShort"[\s\S]*?: "deals\.destinationLabel"/,
  );
  assert.match(
    compact,
    /displayedHotelDestination \|\|[\s\S]*?isPackagesLanding[\s\S]*?"flightSearchDestinationPlaceholderShort"[\s\S]*?: "deals\.destinationLabel"/,
  );
  assert.match(
    form,
    /presentation === "mobile-homepage" \|\| isPackagesLanding/,
  );
  assert.match(form, /isPackagesLanding \? "hidden sm:contents" : "contents"/);
});

test("standalone mobile CTA and card geometry are scoped without changing homepage", () => {
  assert.match(form, /rounded-\[16px\][\s\S]*sm:rounded-3xl/);
  assert.match(
    compact,
    /isPackagesLanding \? "h-\[50px\] rounded-\[10px\]" : "h-12 rounded-\[11px\]"/,
  );
  assert.match(compact, /\{t\("deals.searchButton"\)\}/);
  assert.match(form, /presentation === "mobile-homepage"\s*\? "w-full"/);
  assert.match(
    form,
    /presentation === "mobile-homepage" \? compactMobileControls/,
  );
});

test("mobile Packages uses moderate field, rail, trip row, and CTA sizing", () => {
  assert.match(form, /h-\[62px\] rounded-\[10px\] px-4 py-2\.5/);
  assert.match(form, /text-\[16px\] leading-5/);
  assert.match(compact, /h-\[46px\] gap-1\.5 px-2 text-\[13px\]/);
  assert.match(
    compact,
    /className="flex min-h-11 items-center justify-between/,
  );
  assert.match(compact, /h-\[50px\]/);
  assert.doesNotMatch(compact, /h-\[78px\]|text-\[18px\]|h-\[54px\]/);
});

test("mobile hero is bounded and card clearance is measured independently", () => {
  assert.match(page, /className="relative h-96 overflow-visible/);
  assert.match(page, /bottom-\[calc\(-1_\*_var\(--deals-search-outside\)\)\]/);
  assert.match(page, /Math\.max\(0, height - insideHeight\)/);
  assert.match(page, /pt-\[calc\(var\(--deals-search-outside\)\+3rem\)\]/);
  assert.doesNotMatch(
    page,
    /sm:h-\[calc\(2\.5rem\+var\(--deals-search-inside\)\)\]/,
  );
});

test("desktop Packages polish stays scoped to the Packages landing presentation", () => {
  assert.match(
    form,
    /isPackagesLanding \? "lg:h-\[70px\] lg:min-h-\[70px\] lg:cursor-pointer"/,
  );
  assert.match(form, /lg:absolute lg:end-0 lg:top-2/);
  assert.match(form, /lg:min-h-\[48px\] lg:pe-\[188px\]/);
  assert.match(form, /checked:border-\[#075EE8\] checked:bg-\[#075EE8\]/);
  assert.match(form, /isPackagesLanding \? "text-white" : "text-\[#2563eb\]"/);
  assert.match(form, /lg:me-1 lg:self-center lg:text-slate-500/);
  assert.match(form, /lg:h-\[48px\] lg:min-h-\[48px\] lg:min-w-\[164px\]/);
  assert.match(form, /isPackagesLanding \? "lg:py-5" : "lg:py-6"/);
});

test("desktop Packages removes its trip selector and the vacated row spacing only at lg", () => {
  assert.match(
    form,
    /aria-label=\{t\("tripType"\)\}[\s\S]*?isPackagesLanding \? "lg:hidden" : ""/,
  );
  assert.match(form, /isPackagesLanding \? "lg:mt-0 lg:h-\[70px\]"/);
  assert.doesNotMatch(form, /isPackagesLanding \? "lg:mt-\[14px\]/);
  assert.match(compact, /\["round-trip", "one-way"\] as const/);
  assert.match(form, /search\.flightTripType/);
});

test("desktop Packages fields place neutral icons in value rows", () => {
  const originDestination = form.slice(
    form.indexOf('{(["origin", "destination"] as const).map'),
    form.indexOf("<DealsDestinationPopover", form.indexOf('{(["origin", "destination"] as const).map')),
  );
  const dates = form.slice(
    form.indexOf('<span className={label}>{t("travelDates")}</span>'),
    form.indexOf("{primaryPackageControls}"),
  );
  const travelers = form.slice(
    form.indexOf("data-deals-package-travellers"),
    form.indexOf("data-deals-package-cabin"),
  );
  const cabin = form.slice(
    form.indexOf("data-deals-package-cabin"),
    form.indexOf("!isDesktopLanding", form.indexOf("data-deals-package-cabin")),
  );

  assert.ok(originDestination.indexOf("{t(kind)}") < originDestination.lastIndexOf("<MapPin"));
  assert.ok(dates.indexOf("travelDates") < dates.lastIndexOf("<Calendar"));
  assert.ok(travelers.indexOf("travelersControlLabel") < travelers.lastIndexOf("<UserRound"));
  assert.ok(cabin.indexOf("deals.cabinClass") < cabin.lastIndexOf("<Plane"));
  for (const fieldMarkup of [originDestination, dates, travelers, cabin]) {
    assert.match(fieldMarkup, /h-4 w-4 shrink-0 text-slate-500/);
  }
  assert.match(form, /flex min-w-0 items-center gap-2/);
});

test("desktop Packages uses exact dedicated Travelers/Rooms copy", () => {
  assert.match(
    form,
    /isPackagesLanding[\s\S]*?deals\.desktopPackages\.travelersRoomsLabel[\s\S]*?: "deals\.travellersRooms"/,
  );
  const english = readFileSync("src/lib/i18n/en.ts", "utf8");
  assert.match(
    english,
    /"deals\.desktopPackages\.travelersRoomsLabel": "Travelers\/Rooms"/,
  );
  assert.doesNotMatch(english, /desktopPackages[^\n]*Travellers/);
  assert.doesNotMatch(english, /desktopPackages[^\n]*Travelers \/ Rooms/);
});

test("desktop Packages stay-date override is a visible semantic checkbox", () => {
  const checkbox = form.slice(
    form.lastIndexOf("<label", form.indexOf("data-deals-change-stay-dates")),
    form.indexOf("{supportsStayDateOverride && !search.stayDatesLinked"),
  );
  assert.match(checkbox, /<label[\s\S]*cursor-pointer/);
  assert.match(checkbox, /<input[\s\S]*type="checkbox"[\s\S]*checked=\{!search\.stayDatesLinked\}/);
  assert.match(checkbox, /onChange=\{\(event\) =>/);
  assert.match(checkbox, /h-\[18px\] w-\[18px\] rounded-\[4px\] border-\[1\.5px\] border-slate-500 bg-white/);
  assert.match(checkbox, /checked:border-\[#075EE8\] checked:bg-\[#075EE8\]/);
  assert.match(checkbox, /<Check[\s\S]*isPackagesLanding \? "text-white"/);
  assert.match(form, /lg:rounded-\[8px\]/);
});
