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
    /pathname === "\/packages"[\s\S]*\?[\s\S]*"packages-landing"[\s\S]*:[\s\S]*"desktop-landing"/,
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

test("mobile Packages moves directly from package modes to Origin without trip-type controls", () => {
  const packageRailEnd = compact.indexOf("</fieldset>");
  const routeFieldsStart = compact.indexOf(
    'data-testid="mobile-homepage-deals-route-fields"',
  );
  const betweenRailAndRouteFields = compact.slice(packageRailEnd, routeFieldsStart);

  assert.ok(packageRailEnd >= 0 && routeFieldsStart > packageRailEnd);
  assert.doesNotMatch(betweenRailAndRouteFields, /tripType|round-trip|one-way|multiCity/);
  assert.doesNotMatch(betweenRailAndRouteFields, /role="radiogroup"|role="radio"/);
  assert.match(compact.slice(routeFieldsStart), /t\("origin"\)[\s\S]*?<MapPin/);
  assert.match(form, /search\.flightTripType/);
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

test("mobile Packages uses moderate field, rail, and CTA sizing with no vacated trip-row space", () => {
  assert.match(form, /h-\[62px\] rounded-\[10px\] px-4 py-2\.5/);
  assert.match(form, /text-\[16px\] leading-5/);
  assert.match(compact, /h-\[46px\] gap-1\.5 px-2 text-\[13px\]/);
  assert.doesNotMatch(compact, /className="flex min-h-11 items-center justify-between/);
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

test("Packages hero lowers only the mobile crop and preserves tablet and desktop positions", () => {
  assert.match(
    page,
    /pathname === "\/packages" \? "object-\[center_66%\] sm:object-\[center_52%\] lg:object-\[center_62%\]"/,
  );
  assert.match(page, /className=\{`object-cover/);
  assert.match(page, /packagesHeroImage[\s\S]*kurioticket-packages-hero-tropical-resort-001\.jpg/);
});

test("desktop Packages polish stays scoped to the Packages landing presentation", () => {
  assert.match(
    form,
    /isPackagesLanding \? "lg:h-\[70px\] lg:min-h-\[70px\] lg:cursor-pointer"/,
  );
  assert.match(form, /lg:absolute lg:end-0 lg:top-2/);
  assert.match(form, /lg:min-h-\[48px\] lg:pe-\[200px\]/);
  assert.match(form, /checked:border-\[#075EE8\] checked:bg-\[#075EE8\]/);
  assert.match(form, /isPackagesLanding \? "text-white" : "text-\[#2563eb\]"/);
  assert.match(form, /lg:me-1 lg:self-center lg:text-slate-500/);
  assert.match(
    form,
    /lg:h-\[48px\] lg:min-h-\[48px\] lg:w-\[188px\] lg:min-w-\[188px\] lg:flex-nowrap[\s\S]*lg:whitespace-nowrap/,
  );
  assert.match(form, /isPackagesLanding \? "lg:py-5" : "lg:py-6"/);
});

test("desktop Packages CTA keeps its complete label and icon on one line without changing mobile", () => {
  const submit = form.slice(
    form.indexOf("const searchDealsButton ="),
    form.indexOf("const primaryPackageControls ="),
  );
  assert.match(submit, /lg:w-\[188px\]/);
  assert.match(submit, /lg:min-w-\[188px\]/);
  assert.match(submit, /lg:flex-nowrap[\s\S]*lg:whitespace-nowrap/);
  assert.match(
    submit,
    /<Search[\s\S]*aria-hidden="true"[\s\S]*isPackagesLanding \? "lg:shrink-0"/,
  );
  assert.match(
    submit,
    /<span className=\{isPackagesLanding \? "lg:whitespace-nowrap" : undefined\}>[\s\S]*deals\.searchButton/,
  );
  assert.match(compact, /isPackagesLanding \? "h-\[50px\] rounded-\[10px\]"/);
  assert.doesNotMatch(compact, /w-\[188px\]|min-w-\[188px\]/);
});

test("desktop Packages removes its trip selector and the vacated row spacing only at lg", () => {
  assert.match(
    form,
    /aria-label=\{t\("tripType"\)\}[\s\S]*?isPackagesLanding \? "lg:hidden" : ""/,
  );
  assert.match(form, /isPackagesLanding \? "lg:mt-0 lg:h-\[70px\]"/);
  assert.doesNotMatch(form, /isPackagesLanding \? "lg:mt-\[14px\]/);
  assert.doesNotMatch(compact, /\["round-trip", "one-way"\] as const/);
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
  assert.match(checkbox, /htmlFor="deals-change-stay-dates"/);
  assert.match(checkbox, /<input[\s\S]*type="checkbox"[\s\S]*checked=\{!search\.stayDatesLinked\}/);
  assert.match(checkbox, /id="deals-change-stay-dates"/);
  assert.match(checkbox, /onChange=\{\(event\) =>/);
  assert.match(checkbox, /customizeInheritedField\(current, "stayDates"/);
  assert.match(checkbox, /relinkInheritedField\(current, "stayDates"\)/);
  assert.match(checkbox, /h-\[18px\] w-\[18px\] rounded-\[4px\] border-\[1\.5px\] border-slate-500 bg-white/);
  assert.match(checkbox, /checked:border-\[#075EE8\] checked:bg-\[#075EE8\]/);
  assert.match(checkbox, /<Check[\s\S]*pointer-events-none[\s\S]*isPackagesLanding \? "text-white"/);
  assert.match(form, /isPackagesLanding \? "lg:rounded-\[12px\]" : "lg:rounded-\[8px\]"/);
  assert.doesNotMatch(form, /isPackagesLanding \? "lg:rounded-(?:2xl|3xl)"/);
});

test("desktop Packages custom stay-date flow renders its launcher and existing calendar", () => {
  const actions = form.slice(
    form.indexOf("<section data-deals-search-actions"),
    form.indexOf("{warning}"),
  );
  assert.match(actions, /supportsStayDateOverride && !search\.stayDatesLinked/);
  assert.match(actions, /data-deals-stay-dates/);
  assert.match(actions, /ref=\{stayDatesLauncherRef\}/);
  assert.match(actions, /onClick=\{\(\) =>[\s\S]*openHotelDates\(\)/);
  assert.match(actions, /h-\[66px\] w-\[320px\][\s\S]*rounded-\[8px\][\s\S]*border border-\[#DEE5ED\][\s\S]*bg-white/);
  assert.match(actions, /cursor-pointer[\s\S]*hover:border-slate-400/);
  assert.match(
    actions,
    /<button[\s\S]*\{t\("deals\.datesForStay"\)\}[\s\S]*<Calendar[\s\S]*className="h-4 w-4 shrink-0 text-slate-500"[\s\S]*\{hotelDatesSummary\}[\s\S]*<\/button>/,
  );
  assert.equal((actions.match(/\{t\("deals\.datesForStay"\)\}/g) ?? []).length, 1);
  assert.doesNotMatch(actions, /\{hotelDatesSummary\}[\s\S]*<Calendar/);
  assert.match(form, /id="deals-hotel-desktop-dates"/);
  assert.match(form, /anchorRef=\{desktopHotelDatesLauncherRef\}/);
  assert.match(
    form,
    /const desktopHotelDatesLauncherRef =[\s\S]*\? stayDatesLauncherRef[\s\S]*: hotelDatesLauncherRef/,
  );
  assert.match(form, /!desktopHotelDatesLauncherRef\.current\?\.contains\(target\)/);
  assert.match(form, /minimumDesktopWidth=\{isPackagesLanding \? 640 : 1024\}/);
  assert.match(
    form,
    /function DealsHotelDatesPopover\(\{[\s\S]*?minimumDesktopWidth = 1024,[\s\S]*?minimumDesktopWidth\?: number;/,
  );
  assert.match(form, /window\.matchMedia\(`\(min-width: \$\{minimumWidth\}px\)`\)/);
  assert.match(form, /packagesLanding=\{isPackagesLanding\}/);
  assert.match(form, /width=\{packagesLanding \? 580 : 600\}/);
  assert.match(form, /desiredHeight=\{packagesLanding \? 430 : 540\}/);
  assert.match(form, /align=\{packagesLanding \? "start" : "end"\}/);
  assert.match(form, /packagesSurface=\{packagesLanding\}/);
});

test("desktop Packages submit hit target is constrained to the visible CTA", () => {
  const submit = form.slice(
    form.indexOf("const searchDealsButton ="),
    form.indexOf("const primaryPackageControls ="),
  );
  assert.match(
    submit,
    /isDesktopLanding && isPackagesLanding[\s\S]*lg:absolute lg:end-0 lg:top-2 lg:h-\[48px\] lg:w-\[188px\]/,
  );
  assert.match(submit, /lg:pointer-events-none/);
  assert.match(submit, /lg:pointer-events-auto lg:h-\[48px\]/);
  assert.doesNotMatch(
    submit,
    /isDesktopLanding && isPackagesLanding[\s\S]*\? `flex w-full \$\{packageSearchDesktopClasses\}/,
  );
});

test("desktop Packages submit keeps its translated icon and label on one line", () => {
  const submit = form.slice(
    form.indexOf("const searchDealsButton ="),
    form.indexOf("const primaryPackageControls ="),
  );
  assert.match(submit, /lg:min-w-\[188px\] lg:flex-nowrap/);
  assert.match(submit, /lg:whitespace-nowrap lg:px-5/);
  assert.match(
    submit,
    /<Search[\s\S]*aria-hidden="true"[\s\S]*className=\{`h-4 w-4 \$\{isPackagesLanding \? "lg:shrink-0" : ""\}`\}[\s\S]*\/>/,
  );
  assert.match(
    submit,
    /<span className=\{isPackagesLanding \? "lg:whitespace-nowrap" : undefined\}>[\s\S]*"deals\.searchButton"/,
  );
  assert.doesNotMatch(submit, /truncate|text-ellipsis|overflow-hidden/);
});

test("desktop Packages mode tabs render every included product icon in label order", () => {
  const helper = form.slice(
    form.indexOf("function PackageModeIcons"),
    form.indexOf("const field ="),
  );
  assert.match(helper, /mode === "hotel-flight"[\s\S]*\[Plane, "flight"\], \[Building2, "hotel"\]/);
  assert.match(helper, /mode === "flight-car"[\s\S]*\[Plane, "flight"\], \[CarFront, "car"\]/);
  assert.match(helper, /mode === "hotel-car"[\s\S]*\[Building2, "hotel"\], \[CarFront, "car"\]/);
  assert.match(helper, /\[Plane, "flight"\], \[Building2, "hotel"\], \[CarFront, "car"\]/);
  assert.match(helper, /aria-hidden="true"[\s\S]*gap-\[2px\][\s\S]*text-slate-600/);
  assert.match(helper, /className="h-\[14px\] w-\[14px\]"/);
  assert.match(form, /<PackageModeIcons mode=\{option\.mode\} \/>/);
  assert.match(form, /whitespace-nowrap[\s\S]*min-w-\[174px\]/);
});

test("Packages hero alignment uses the measured desktop selector boundary", () => {
  assert.match(page, /querySelector<HTMLElement>\([\s\S]*data-deals-desktop-package-selector/);
  assert.match(page, /selectorRect\.bottom - searchRect\.top/);
  assert.match(page, /pathname === "\/packages"[\s\S]*packagesDesktopInsideHeight/);
  assert.match(page, /pathname === "\/packages" \? "lg:translate-y-\[var\(--deals-search-outside\)\]"/);
  assert.doesNotMatch(page, /pathname === "\/packages" \? "lg:translate-y-\[56%\]"/);
});

test("desktop Packages renders one visible identity above its mode tabs", () => {
  const desktop = form.slice(
    form.indexOf('<div className={isPackagesLanding ? "hidden sm:contents"'),
    form.indexOf("data-deals-desktop-package-selector"),
  );
  assert.match(desktop, /data-deals-packages-identity/);
  assert.match(desktop, /<PackagesIcon[\s\S]*data-packages-identity-icon/);
  assert.match(desktop, /\{t\("deals"\)\}/);
  assert.match(desktop, /h-\[42px\][\s\S]*rounded-\[8px\][\s\S]*bg-\[#004BB8\]\/8[\s\S]*text-\[16px\][\s\S]*lg:inline-flex/);
  assert.equal((desktop.match(/data-deals-packages-identity/g) ?? []).length, 1);
});

test("desktop Packages pickers share one restrained anchored surface contract", () => {
  assert.match(form, /packagesSurface \? "rounded-\[10px\] border-\[#DEE5ED\] shadow-\[0_14px_36px_rgba\(15,23,42,0\.14\)\]"/);
  assert.match(form, /viewportPadding: 16/);
  assert.match(form, /gap: 8/);
  assert.match(form, /width=\{isPackagesLanding \? 420 : 390\}/);
  assert.match(form, /desiredHeight=\{packagesLanding \? 320 : 352\}/);
});

test("desktop Packages airport fields stay clean until two characters are entered", () => {
  assert.match(form, /const showDesktopPanel =[\s\S]*?!isPackagesLanding \|\| query\.length >= 2/);
  assert.match(form, /openFlightAirport\(kind, false, value\)/);
  assert.match(form, /if \(value\.trim\(\)\.length < 2\) \{[\s\S]*?setAirportLists[\s\S]*?setFlightOriginLoading\(false\)[\s\S]*?setFlightDestinationLoading\(false\)/);
});

test("desktop Packages dates, travelers, and cabin use moderate common-shell geometry", () => {
  assert.match(form, /width=\{packagesLanding \? 580 : 660\}/);
  assert.match(form, /desiredHeight=\{packagesLanding \? 430 : 540\}/);
  assert.match(form, /desiredHeight=\{packagesLanding \? 410 : 460\}/);
  assert.match(form, /width=\{isPackagesLanding \? 232 : 248\}/);
  assert.match(form, /packagesSurface=\{isPackagesLanding\}/);
  assert.match(form, /lg:min-h-\[52px\]/);
  assert.match(form, /lg:h-8 lg:w-8/);
});

test("desktop Packages cabin remains a compact committing listbox", () => {
  const cabinPopover = form.slice(form.indexOf("open={isDesktopLanding && cabinOpen}"), form.indexOf("<DealsFlightDatesPopover"));
  assert.match(cabinPopover, /role="listbox"/);
  assert.match(cabinPopover, /\["economy", "business", "first"\]/);
  assert.match(cabinPopover, /update\("flightCabinClass", cabin\)/);
  assert.match(cabinPopover, /setCabinOpen\(false\)/);
  assert.match(cabinPopover, /cabinLauncherRef\.current\?\.focus/);
});

test("desktop Packages fields expose their complete visual surfaces on first click", () => {
  assert.match(form, /onPointerDown=\{\(event\) => \{[\s\S]*?inputRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(form, /target\.closest\("input, button, a, select, textarea"\)/);
  assert.match(form, /flightDatesLauncherRef[\s\S]*?lg:h-full lg:w-full/);
  assert.match(form, /data-deals-package-travellers[\s\S]*?h-full w-full cursor-pointer/);
  assert.match(form, /data-deals-package-cabin[\s\S]*?lg:absolute lg:inset-0 lg:h-full lg:w-full lg:cursor-pointer/);
});

test("desktop Packages launchers keep one-click switching and outside-click containment", () => {
  assert.match(form, /const openFlightDates = \(\) => \{\s*closeDesktopLandingPanels\(\)/);
  assert.match(form, /const openTravelers = \(\) => \{\s*closeDesktopLandingPanels\(\)/);
  assert.match(form, /closeDesktopLandingPanels\(\);\s*setCabinOpen\(true\)/);
  assert.match(form, /flightDatesLauncherRef\.current\?\.contains\(target\)/);
  assert.match(form, /travelersLauncherRef\.current\?\.contains\(target\)/);
  assert.match(form, /cabinLauncherRef\.current\?\.contains\(target\)/);
});

test("desktop Packages results show city, airport name, and one compact IATA code", () => {
  const results = form.slice(form.indexOf("const flightSuggestionContent"), form.indexOf("const handleFlightKey"));
  assert.match(results, /const ResultIcon = isAirportResult \? Plane : MapPin/);
  assert.match(results, /const secondaryText = isAirportResult \? airportName : getLocalizedAirportCountryName/);
  assert.match(results, /\{city\}[\s\S]*?\{secondaryText\}[\s\S]*?option\.code\.toUpperCase\(\)/);
  assert.match(results, /line-clamp-2/);
  assert.doesNotMatch(results, /` · \$\{getLocalizedAirportCountryName/);
});
