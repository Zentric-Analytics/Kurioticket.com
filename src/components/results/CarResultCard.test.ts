import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  formatCarPickupType,
  getCarSpecificationIcon,
  getMobileCarPrimarySpecs,
  getMobileCarResultIdentity,
  getMobileCarSpecColumns,
  getMobileProviderCarSpecSlots,
} from "./carResultCardSpecs";
import {
  BriefcaseBusiness,
  CarFront,
  DoorOpen,
  Fuel,
  Gauge,
  MapPin,
  Snowflake,
  Users,
} from "lucide-react";
import {
  AutomaticTransmissionIcon,
  ManualTransmissionIcon,
} from "./CarTransmissionIcon";
import type { NormalizedCarResult } from "@/lib/cars/types";

const source = readFileSync("src/components/results/CarResultCard.tsx", "utf8");

const car = {
  passengers: 5,
  bags: 3,
  transmission: "automatic",
  mileagePolicy: "unlimited",
  doors: 5,
  fuelPolicy: "full-to-full",
} as NormalizedCarResult;

test("CarResultCard accepts string and null href actions without provider fallback", () => {
  assert.match(source, /detailsHref: string \| null/);
  assert.match(source, /detailsHref \? \(\s*<Link\s+href=\{detailsHref\}/);
  assert.match(source, /<button\s+type="button"\s+disabled/);
  assert.doesNotMatch(
    source,
    /href=\{detailsHref \?\?|href="#"|bookingUrl|api\/redirect/,
  );
});

test("KAYAK detail links cannot prefetch and duplicate provider recovery", () => {
  assert.equal((source.match(/prefetch=\{car\.inventorySource === "kayak-sandbox" \? false : undefined\}/g) ?? []).length, 2);
});

test("standalone mobile follows native daily-price and View deal commerce", () => {
  const mobile = source.slice(
    source.indexOf("data-car-card-mobile-lower-band"),
    source.indexOf("grid-cols-[minmax(0,1.1fr)"),
  );
  assert.doesNotMatch(mobile, /totalDisplayPrice\.formatted|>Total</);
  assert.match(
    mobile,
    /text-\[19px\][^\"]*font-semibold[^\"]*text-\[#07133B\][^\"]*tabular-nums/,
  );
  assert.match(mobile, /dailyDisplayPrice\.formatted/);
  assert.match(mobile, />per day</);
  assert.match(mobile, /View deal <ChevronRight/);
  assert.doesNotMatch(mobile, /bg-\[#004BB8\]/);
  assert.doesNotMatch(mobile, /Taxes and fees included/);
});

test("desktop media fills its column and unsupported tax copy stays hidden", () => {
  const desktop = source.slice(source.indexOf('data-region="image"'));
  assert.match(desktop, /md:aspect-auto md:h-full md:min-h-\[220px\]/);
  assert.doesNotMatch(desktop, /md:p-2\.5/);
  assert.doesNotMatch(source, /Taxes and fees included/);
});

test("standalone desktop uses a shared header row for identity and actions without changing mobile", () => {
  const desktop = source.slice(source.indexOf('data-region="heading"'));
  const heading = desktop.slice(0, desktop.indexOf('data-region="details"'));
  const details = desktop.slice(
    desktop.indexOf('data-region="details"'),
    desktop.indexOf('data-region="pricing"'),
  );

  assert.match(
    heading,
    /data-car-card-desktop-shared-header[\s\S]*?lg:grid-cols-\[minmax\(0,1fr\)_205px\]/,
  );
  assert.match(
    heading,
    /data-car-card-desktop-title-row[\s\S]*?h-11[\s\S]*?data-car-card-desktop-actions[\s\S]*?h-11/,
  );
  assert.match(
    heading,
    /data-car-card-desktop-badge[\s\S]*?\{badge\}/,
  );
  assert.match(details, /desktopStandaloneSpecifications/);
  assert.match(
    details,
    /guidedPlanning \? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2"/,
  );
  assert.match(source, /getCarSpecificationIcon\(title\(car\.transmission\)\)/);

  const mobile = source.slice(
    source.indexOf("data-car-card-mobile-main"),
    source.indexOf("grid-cols-[minmax(0,1.1fr)"),
  );
  assert.match(mobile, /data-car-card-mobile-specs/);
  assert.match(mobile, /mobileSpecColumns\.map/);
});

test("desktop standalone title and save/share occupy the exact same grid row below Best value", () => {
  const desktop = source.slice(source.indexOf('data-region="heading"'));
  const heading = desktop.slice(0, desktop.indexOf('data-region="details"'));

  assert.doesNotMatch(heading, /lg:pt-6/);
  assert.match(
    heading,
    /badge && BadgeIcon \? "lg:grid-rows-\[24px_44px_auto_auto_auto\]" : "lg:grid-rows-\[44px_auto_auto_auto\]"/,
  );
  assert.match(
    heading,
    /data-car-card-desktop-title-row[\s\S]*?\$\{badge && BadgeIcon \? "row-start-2" : "row-start-1"\}[\s\S]*?h-11/,
  );
  assert.match(
    heading,
    /data-car-card-desktop-actions[\s\S]*?\$\{badge && BadgeIcon \? "row-start-2" : "row-start-1"\}[\s\S]*?h-11/,
  );
  assert.match(
    heading,
    /\$\{badge && BadgeIcon \? "row-start-3" : "row-start-2"\}[\s\S]*?leading-none/,
  );
  assert.match(
    heading,
    /\$\{badge && BadgeIcon \? "row-start-4" : "row-start-3"\} mt-0\.5 flex/,
  );
});

test("desktop standalone keeps Best value above the shared action row and pricing below it", () => {
  const desktop = source.slice(source.indexOf('data-region="heading"'));
  const heading = desktop.slice(0, desktop.indexOf('data-region="details"'));
  const pricing = desktop.slice(desktop.indexOf('data-region="pricing"'));

  assert.match(
    heading,
    /data-car-card-desktop-badge[\s\S]*?row-start-1[\s\S]*?data-car-card-desktop-actions/,
  );
  assert.match(
    pricing,
    /!guidedPlanning \? "lg:row-start-2 lg:row-span-1 lg:items-stretch lg:border-s lg:border-t lg:border-\[#CBD5E1\] lg:pb-3 lg:text-right"/,
  );
  assert.match(
    pricing,
    /data-car-card-desktop-actions[\s\S]*?lg:hidden/,
  );
  assert.match(
    pricing,
    /<div className="mt-auto w-full">[\s\S]*?<CarPriceComparison/,
  );
});

test("standalone desktop uses only the approved subtle T divider", () => {
  const desktop = source.slice(source.indexOf('data-region="image"'));
  const heading = desktop.slice(
    desktop.indexOf('data-region="heading"'),
    desktop.indexOf('data-region="details"'),
  );
  const details = desktop.slice(
    desktop.indexOf('data-region="details"'),
    desktop.indexOf('data-region="pricing"'),
  );
  const pricing = desktop.slice(desktop.indexOf('data-region="pricing"'));

  assert.match(
    desktop,
    /data-region="image"[\s\S]*?\$\{!guidedPlanning \? "lg:border-e-0" : ""\}/,
  );
  assert.doesNotMatch(
    heading,
    /data-car-card-desktop-header-rail[\s\S]*?border-s/,
  );
  assert.match(
    details,
    /\$\{!guidedPlanning \? "lg:border-t lg:border-\[#CBD5E1\]" : ""\}/,
  );
  assert.match(
    pricing,
    /!guidedPlanning \? "lg:row-start-2 lg:row-span-1 lg:items-stretch lg:border-s lg:border-t lg:border-\[#CBD5E1\] lg:pb-3 lg:text-right"/,
  );
});

test("desktop save and share glyphs sit closer within independent targets", () => {
  const actions = source.slice(
    source.indexOf("const cardActions"),
    source.indexOf("const mobileCardActions"),
  );
  assert.match(actions, /h-11 w-11/);
  assert.match(actions, /translate-x-1\.5/);
  assert.match(actions, /-translate-x-1\.5/);
});

test("standalone mobile follows the native two-line car identity structure", () => {
  const mobile = source.slice(
    source.indexOf("data-car-card-mobile-information"),
    source.indexOf("data-car-card-mobile-specs"),
  );
  assert.match(source, /const mobileIdentity = getMobileCarResultIdentity\(car\.modelName\)/);
  assert.equal(
    (mobile.match(/\{mobileIdentity\.primaryName\}/g) ?? []).length,
    2,
    "both supported heading levels render the native-style primary name line",
  );
  assert.equal(
    (mobile.match(/mobileIdentity\.secondaryModel \|\| car\.orSimilar/g) ?? []).length,
    2,
    "both supported heading levels conditionally render the secondary identity line",
  );
  assert.match(mobile, /\{mobileIdentity\.secondaryModel\}/);
  assert.match(mobile, /\{orSimilarLabel\}/);
  assert.match(mobile, /block min-w-0 truncate text-\[15px\] font-bold leading-\[18px\]/);
  assert.doesNotMatch(
    mobile,
    /<h3[^>]*>\s*\{car\.modelName\}|<h2[^>]*>\s*\{car\.modelName\}/,
    "mobile headings must not hand the full provider model string directly to browser line wrapping",
  );
});

test("guided planning retains its localized combined vehicle-name contract", () => {
  assert.match(
    source,
    /`\$\{car\.modelName\} \$\{orSimilarLabel\}`/,
  );
  assert.match(source, /guidedPlanning \? \([\s\S]*?\{vehicleName\}/);
});

test("standalone desktop hides sandbox pickup-label chrome while preserving the actual location", () => {
  assert.equal(formatCarPickupType("meet-and-greet"), "Meet and greet");
  assert.equal(formatCarPickupType("airport-counter"), "Airport counter");
  assert.equal(formatCarPickupType("city-location"), "City location");
  assert.equal(formatCarPickupType("shuttle"), "Shuttle");
  assert.equal(car.transmission, "automatic");

  const headingStart = source.indexOf('data-region="heading"');
  const standaloneStart = source.indexOf('<div className="lg:hidden">', headingStart);
  const detailsStart = source.indexOf('data-region="details"', standaloneStart);
  const standaloneDesktop = source.slice(standaloneStart, detailsStart);

  assert.doesNotMatch(standaloneDesktop, /formatCarPickupType\(car\.pickupType\)/);
  assert.doesNotMatch(standaloneDesktop, /car\.sandboxPresentation\?\.pickupLabel/);
  assert.equal(
    (standaloneDesktop.match(/\{car\.pickupLocation\}/g) ?? []).length,
    2,
    "both supported desktop heading variants keep the actual pickup location",
  );
});

test("standalone desktop shows localized data-driven Free cancellation directly below the location at md and lg", () => {
  const desktop = source.slice(source.indexOf('data-region="heading"'));
  const heading = desktop.slice(0, desktop.indexOf('data-region="details"'));

  const locationIndex = heading.indexOf("{car.pickupLocation}");
  const cancellationIndex = heading.indexOf("data-car-card-desktop-free-cancellation");

  assert.ok(locationIndex >= 0, "desktop location must be present");
  assert.ok(
    cancellationIndex > locationIndex,
    "Free cancellation must render after the desktop location",
  );
  assert.equal(
    (heading.match(/data-car-card-desktop-free-cancellation/g) ?? []).length,
    2,
    "both the md desktop fallback and lg shared header render the benefit",
  );
  assert.equal(
    (heading.match(/t\("carsResults\.freeCancellation"\)/g) ?? []).length,
    2,
    "both desktop variants use the localized cancellation label",
  );
  assert.match(
    heading,
    /\{offer\.freeCancellation \? \([\s\S]*?data-car-card-desktop-free-cancellation[\s\S]*?<ShieldCheck/,
  );
  assert.match(
    heading,
    /\$\{badge && BadgeIcon \? "row-start-5" : "row-start-4"\} mt-1 flex/,
  );
});

test("mobile primary specs are deterministic and capped at four", () => {
  const first = getMobileCarPrimarySpecs(car).map(([, label]) => label);
  assert.deepEqual(
    first,
    getMobileCarPrimarySpecs(car).map(([, label]) => label),
  );
  assert.deepEqual(first, [
    "5 passengers",
    "Automatic",
    "5 doors",
    "3 bags",
  ]);
  const limited = {
    ...car,
    transmission: "manual" as const,
    mileagePolicy: "limited" as const,
    limitedMileageKm: 250,
  };
  assert.deepEqual(
    getMobileCarPrimarySpecs(limited).map(([, label]) => label),
    ["5 passengers", "Manual", "5 doors", "3 bags"],
  );
  assert.equal(getMobileCarPrimarySpecs(limited).length, 4);
});
test("mobile card matches native compact height, semantic spec columns, and top-aligned actions", () => {
  assert.match(source, /data-car-card-mobile-main[\s\S]*?min-h-\[156px\]/);
  assert.doesNotMatch(source, /data-car-card-mobile-main[\s\S]*?min-h-\[168px\]/);
  assert.match(source, /getMobileProviderCarSpecSlots\(car\.sandboxPresentation\.specs\)/);
  assert.match(source, /getMobileCarSpecColumns\(mobilePrimarySpecs\)/);
  assert.doesNotMatch(source, /index % 2 === 0|index % 2 === 1/);
  const specs = source.slice(
    source.indexOf("data-car-card-mobile-specs"),
    source.indexOf('className="flex min-w-0 flex-[1.35]', source.indexOf("data-car-card-mobile-specs")),
  );
  assert.match(specs, /px-2 py-2\.5/);
  assert.match(specs, /space-y-2/);
  assert.doesNotMatch(specs, /<li[^>]*py-2\.5/);

  const actions = source.slice(
    source.indexOf("data-car-card-mobile-actions"),
    source.indexOf("return ("),
  );
  assert.match(actions, /items-start justify-end/);
  assert.match(actions, /items-start justify-start/);
  assert.equal((actions.match(/h-11 w-7/g) ?? []).length, 2);
});

test("Free cancellation is data-driven in mobile and secondary benefits stay desktop-only", () => {
  const mobileMain = source.slice(
    source.indexOf("data-car-card-mobile-main"),
    source.indexOf("data-car-card-mobile-lower-band"),
  );
  assert.match(mobileMain, /offer\.freeCancellation &&/);
  assert.match(mobileMain, /Free cancellation/);
  assert.doesNotMatch(
    mobileMain,
    /offer\.payAtPickup|car\.fuelPolicy|Taxes and fees included/,
  );
});

test("desktop static pricing removes provider, sandbox, total, and disclosure chrome while keeping daily price and View deal", () => {
  const desktop = source.slice(source.indexOf('data-region="pricing"'));

  assert.match(
    desktop,
    /<CarPriceComparison[\s\S]*?\n\s+cleanStaticSummary\n/,
  );
  assert.doesNotMatch(desktop, /cleanStaticSummary=\{!car\.sandboxPresentation\}/);
  assert.doesNotMatch(desktop, /"KAYAK"|"Sandbox"|Simulated inventory — no real booking/);
  assert.match(desktop, /comparePrices: "View deal"/);
  assert.doesNotMatch(desktop, /carsResults\.comparison\.comparePrices/);
  assert.match(desktop, /carsResults\.comparison\.perDay/);
});

test("standalone desktop pricing is anchored to the card bottom-right while guided pricing stays centered", () => {
  const desktop = source.slice(source.indexOf('data-region="pricing"'));

  assert.match(
    desktop,
    /!guidedPlanning \? "lg:items-stretch lg:pb-3 lg:text-right" : "lg:items-center lg:justify-center lg:text-center"/,
  );
});

test("desktop and guided contracts retain their responsive grid and owned disclosures", () => {
  assert.match(source, /guidedPlanning \? "grid" : "hidden md:grid"/);
  assert.match(source, /md:grid-cols-\[250px_minmax\(0,1fr\)\]/);
  assert.match(source, /lg:grid-cols-\[250px_minmax\(0,1fr\)_205px\]/);
  assert.match(source, /xl:grid-cols-\[270px_minmax\(0,1fr\)_205px\]/);
  const desktop = source.slice(source.indexOf('data-region="heading"'));
  assert.match(desktop, /offer\.freeCancellation/);
  assert.match(desktop, /carsResults\.freeCancellation/);
  assert.doesNotMatch(desktop, /offer\.payAtPickup|Pay at pickup/);
  assert.doesNotMatch(source, /Unlimited mileage|car\.limitedMileageKm/);
  assert.doesNotMatch(source, /<Fuel|title\(car\.fuelPolicy\)/);
  assert.doesNotMatch(source, /offer\.taxesAndFeesIncluded|Taxes and fees included/);
  assert.match(source, /planningLabels\?\.estimatedTotal/);
  assert.match(source, /planningLabels\?\.disclosure/);
});

test("prices preserve formatter output, LTR semantics, and accessible fallback metadata", () => {
  assert.match(source, /const offer = getPrimaryCarOffer\(car\)/);
  assert.doesNotMatch(source, /car\.offers\[0\]/);
  for (const price of ["totalDisplayPrice", "dailyDisplayPrice"]) {
    assert.match(
      source,
      new RegExp(
        `dir="ltr"[\\s\\S]*?title=\\{${price}\\.title\\}[\\s\\S]*?aria-label=\\{${price}\\.ariaLabel\\}`,
      ),
    );
  }
});

test("cards expose compact, functional save and share actions", () => {
  const mobileUtility = source.slice(
    source.indexOf("data-car-card-mobile-utility-row"),
    source.indexOf("data-car-card-mobile-specs"),
  );
  assert.match(mobileUtility, /\{mobileCardActions\}/);
  assert.ok(
    mobileUtility.indexOf("data-car-card-mobile-identity") <
      mobileUtility.indexOf("{mobileCardActions}"),
  );
  const actions = source.slice(
    source.indexOf("data-car-card-mobile-actions"),
    source.indexOf("return ("),
  );
  assert.doesNotMatch(actions, /car\.modelName\}\s*<\/h[23]>/);
  assert.match(
    mobileUtility,
    /data-car-card-mobile-identity[\s\S]*className="min-w-0"/,
  );
  assert.match(
    source,
    /aria-label=\{`\$\{isSaved \? "Unsave" : "Save"\} \$\{car\.modelName\}`\}/,
  );
  assert.match(source, /aria-pressed=\{isSaved\}/);
  assert.match(source, /fill=\{isSaved \? "currentColor" : "none"\}/);
  assert.match(source, /aria-label=\{`Share \$\{car\.modelName\}`\}/);
  assert.match(source, /navigator\.share/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(actions, /gap-0/);
  assert.equal(
    (actions.match(/h-11 w-7/g) ?? []).length,
    2,
    "save and share each use the native 44px by 28px layout box",
  );
  assert.match(
    actions,
    /h-11 w-7[^\n]*before:inset-y-0[^\n]*before:-start-2[^\n]*before:end-0/,
  );
  assert.match(
    actions,
    /h-11 w-7[^\n]*before:inset-y-0[^\n]*before:start-0[^\n]*before:-end-2/,
  );
  assert.match(actions, /<Heart\s+size=\{18\}/);
  assert.match(actions, /<Share2 size=\{18\}/);
  assert.doesNotMatch(actions, /translate-x/);
  assert.doesNotMatch(actions, /before:-inset-/);
  assert.match(mobileUtility, /flex min-w-0 items-start gap-1\.5/);
  assert.match(
    mobileUtility,
    /data-car-card-mobile-utility-copy[\s\S]*?min-w-0 flex-1 overflow-hidden/,
  );
  assert.match(
    mobileUtility,
    /truncate text-\[10px\][^>]*>\{car\.categoryLabel\}/,
  );
  assert.match(source, /inline-flex min-h-5 shrink-0 items-center gap-1 whitespace-nowrap/);
  assert.match(
    source,
    /data-car-card-mobile-information[\s\S]*?bg-\[#E7EBF1\]/,
  );
});

test("every supported mobile badge keeps its full single-line label", () => {
  const badgeMap = source.slice(
    source.indexOf("const carResultBadgeIcons"),
    source.indexOf("export function CarResultCard"),
  );
  assert.match(badgeMap, /"Best value": Award/);
  assert.match(badgeMap, /Cheapest: Tag/);
  assert.match(badgeMap, /"Top rated": Star/);
  assert.match(source, /shrink-0[^\"]*whitespace-nowrap/);
});

test("mobile car names use the same deliberate Mercedes-Benz identity split as native", () => {
  for (const model of ["E-Class", "V-Class", "C-Class"]) {
    assert.deepEqual(getMobileCarResultIdentity(`Mercedes-Benz ${model}`), {
      primaryName: "Mercedes-Benz",
      secondaryModel: model,
    });
  }
  assert.deepEqual(getMobileCarResultIdentity("Toyota Corolla"), {
    primaryName: "Toyota Corolla",
    secondaryModel: null,
  });
  assert.deepEqual(getMobileCarResultIdentity("  Mercedes-Benz   E-Class  "), {
    primaryName: "Mercedes-Benz",
    secondaryModel: "E-Class",
  });

  const identity = source.slice(
    source.indexOf("data-car-card-mobile-identity"),
    source.indexOf("data-car-card-mobile-specs"),
  );
  assert.match(identity, /\{mobileIdentity\.primaryName\}/);
  assert.match(identity, /\{mobileIdentity\.secondaryModel\}/);
  assert.doesNotMatch(
    identity,
    /data-car-card-mobile-actions|p[er]-\d+|w-\[(?:80|88)px\]/,
  );
});


test("KAYAK provider specs occupy the same semantic slots and columns as Kurioticket cars", () => {
  const slots = getMobileProviderCarSpecSlots([
    "4 passengers",
    "1 bags",
    "5 doors",
    "Automatic",
  ]);
  assert.deepEqual(
    slots.map((entry) => entry?.[1] ?? null),
    ["4 passengers", "Automatic", "5 doors", "1 bags"],
  );
  assert.deepEqual(
    getMobileCarSpecColumns(slots).map((column) =>
      column.map(([, label]) => label),
    ),
    [
      ["4 passengers", "Automatic"],
      ["5 doors", "1 bags"],
    ],
  );
});

test("KAYAK fixed provider slots preserve an unusual transmission label", () => {
  const slots = getMobileProviderCarSpecSlots([
    "4 passengers",
    "1 bags",
    "5 doors",
    "CVT",
  ]);
  assert.deepEqual(
    slots.map((entry) => entry?.[1] ?? null),
    ["4 passengers", "CVT", "5 doors", "1 bags"],
  );
  assert.equal(slots[1]?.[0], CarFront);
});

test("missing KAYAK specs stay absent without shifting another fact into the wrong column", () => {
  const slots = getMobileProviderCarSpecSlots([
    "4 passengers",
    "Baggage capacity not supplied",
    "5 doors",
    "Transmission not supplied",
  ]);
  assert.deepEqual(
    slots.map((entry) => entry?.[1] ?? null),
    ["4 passengers", null, "5 doors", null],
  );
  assert.deepEqual(
    getMobileCarSpecColumns(slots).map((column) =>
      column.map(([, label]) => label),
    ),
    [["4 passengers"], ["5 doors"]],
  );
});

test("provider car specs use the same semantic icons as normalized car cards", () => {
  assert.equal(getCarSpecificationIcon("4 passengers"), Users);
  assert.equal(getCarSpecificationIcon("5 seats"), Users);
  assert.equal(getCarSpecificationIcon("2 bags"), BriefcaseBusiness);
  assert.equal(getCarSpecificationIcon("Baggage capacity not supplied"), BriefcaseBusiness);
  assert.equal(getCarSpecificationIcon("5 doors"), DoorOpen);
  assert.equal(getCarSpecificationIcon("Doors not supplied"), DoorOpen);
  assert.equal(getCarSpecificationIcon("Automatic"), AutomaticTransmissionIcon);
  assert.equal(getCarSpecificationIcon("Manual"), ManualTransmissionIcon);
  assert.equal(getCarSpecificationIcon("Air conditioning"), Snowflake);
  assert.equal(getCarSpecificationIcon("Unlimited mileage"), Gauge);
  assert.equal(getCarSpecificationIcon("Fuel policy"), Fuel);
  assert.equal(getCarSpecificationIcon("Pickup location"), MapPin);
  assert.equal(getCarSpecificationIcon("Specifications not supplied"), CarFront);
});

test("KAYAK result cards resolve each provider spec icon instead of forcing CarFront", () => {
  assert.match(
    source,
    /car\.sandboxPresentation\.specs\.map\(\(label\) => \[[\s\S]*?getCarSpecificationIcon\(label\)[\s\S]*?label,[\s\S]*?\]\)/,
  );
  assert.doesNotMatch(
    source,
    /sandboxPresentation\.specs\.map\([^\n]*\[CarFront,\s*label\]/,
  );
});

test("mobile transmission specs use dedicated automatic and manual icons", () => {
  const specsSource = readFileSync(
    "src/components/results/carResultCardSpecs.ts",
    "utf8",
  );
  const iconSource = readFileSync(
    "src/components/results/CarTransmissionIcon.tsx",
    "utf8",
  );

  assert.match(
    specsSource,
    /\/manual\/i\.test\(car\.transmission\)[\s\S]*?ManualTransmissionIcon/,
  );
  assert.match(
    specsSource,
    /\/automatic\/i\.test\(car\.transmission\)[\s\S]*?AutomaticTransmissionIcon/,
  );
  assert.match(specsSource, /: CarFront;/);

  assert.match(iconSource, /M7 4\.5h5\.5v15H7zM9\.75 6\.5v10/);
  assert.match(iconSource, />P<\/text>/);
  assert.match(iconSource, />R<\/text>/);
  assert.match(iconSource, />N<\/text>/);
  assert.match(iconSource, />D<\/text>/);
  assert.match(iconSource, /M6 8v8M12 8v8M18 8v8M6 12h12/);
});
