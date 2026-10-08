import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const presentation = readFileSync(new URL("../../lib/cars/carFilterPresentation.ts", import.meta.url), "utf8");

test("source-contract: Cars compact shell keeps the normal desktop visual scale", () => {
  assert.match(
    source,
    /desktop-filter-sidebar flex max-h-full w-full flex-col overflow-hidden rounded-2xl border border-\[#D8E1EC\] p-0 shadow-\[0_14px_30px_-26px_rgba\(15,23,42,0\.42\)\]/,
  );
  assert.match(
    source,
    /desktopSurfaceParity \? "bg-white" : "bg-\[#EEF3F8\]"/,
  );
  assert.match(
    source,
    /desktop-filter-sidebar__header shrink-0 border-b border-\[#D8E1EC\]\/80 px-3 py-3/,
  );
  assert.match(
    source,
    /desktop-filter-sidebar__title flex min-w-0 items-center gap-2 truncate text-\[16px\] font-bold leading-6/,
  );
  assert.match(
    source,
    /<SlidersHorizontal\s+className="desktop-filter-sidebar__icon cars-desktop-filter-icon shrink-0 text-\[#07133B\]"\s+size=\{18\}\s+aria-hidden="true"\s*\/>\s*<span className="truncate">\{t\("filters"\)\}<\/span>/,
  );
  assert.match(
    source,
    /desktop-filter-sidebar__count rounded-full bg-\[#EAF2FB\].*ring-\[#004BB8\]\/8/,
  );
  assert.match(source, /rounded-full px-1\.5 py-0\.5 text-\[13px\] font-bold leading-5/);
  assert.match(source, /\{activeFilterLabel\}/);
  assert.match(source, /\{t\("clearAll"\)\}/);
});

test("source-contract: Cars compact sections keep normal desktop control sizing", () => {
  assert.match(
    source,
    /layout === "compact"\s*\? "border-t border-\[#D8E1EC\]\/75 first:border-t-0"/,
  );
  assert.match(
    source,
    /min-h-10 rounded-md px-3 py-2\.5 text-\[15px\] leading-5 tracking-\[-0\.003em\]/,
  );
  assert.match(
    source,
    /h-4 w-4 text-slate-500 transition duration-200[\s\S]*?compactOpen && "rotate-180 text-\[#004BB8\]"/,
  );
  assert.match(source, /strokeWidth=\{2\.3\}/);
  assert.match(
    source,
    /min-w-5 rounded-full bg-\[#E2EAF3\].*text-\[#235A9F\].*group-hover:bg-\[#DCE8F6\]/,
  );
  assert.match(
    source,
    /grid h-auto gap-0\.5 overflow-visible bg-transparent px-3 pb-3 pt-1\.5/,
  );
  assert.match(
    source,
    /flex min-h-8 cursor-pointer items-center justify-between gap-2\.5 rounded-lg px-1\.5 py-1\.5 text-\[14px\]/,
  );
  assert.match(source, /flex min-w-0 items-center gap-2\.5/);
  assert.match(
    source,
    /mt-0\.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-blue/,
  );
  assert.doesNotMatch(source, /layout === "compact"[\s\S]{0,220}h-3\.5 w-3\.5 shrink-0 rounded border-slate-300 accent-blue/);
});

test("source-contract: compact body is the only vertical scroll owner and header does not scroll", () => {
  assert.match(
    source,
    /min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-1/,
  );
  assert.match(
    source,
    /desktopSurfaceParity \? "bg-white" : "bg-\[#EEF3F8\]"/,
  );
  assert.match(
    source,
    /desktop-filter-sidebar flex max-h-full w-full flex-col overflow-hidden/,
  );
  assert.match(source, /desktop-filter-sidebar__header shrink-0/);
  assert.equal(
    (source.match(/overflow-y-auto/g) ?? []).filter(Boolean).length > 0,
    true,
  );
  assert.doesNotMatch(source, /grid h-auto gap-0\.5 overflow-y-auto/);
});

test("source-contract: full desktop and mobile filter styling remain separate", () => {
  assert.match(
    source,
    /layout === "desktop"[\s\S]*?desktop-filter-sidebar border border-slate-200\/80 p-0 shadow-none rounded-none[\s\S]*?desktopSurfaceParity \? "bg-white" : "bg-transparent"/,
  );
  assert.match(
    source,
    /desktopSurfaceParity &&\s*layout !== "mobile" &&\s*"cars-desktop-filter-surface cars-hotel-filter-surface"/,
  );
  assert.match(
    source,
    /<SlidersHorizontal\s+className="cars-desktop-filter-icon shrink-0 text-\[#07133B\]"\s+size=\{18\}/,
  );
  assert.match(source, /if \(layout === "mobile"\) \{[\s\S]*?grid gap-\[5px\][\s\S]*?min-h-\[46px\]/);
  assert.doesNotMatch(source, /layout === "mobile"\s*\? "mb-2 overflow-hidden rounded-xl/);
  assert.match(source, /layout === "compact" \? \([\s\S]*?aria-expanded=\{compactOpen\}/);
  assert.match(
    source,
    /layout === "compact"\s*\? "mt-0\.5 h-4 w-4[^"\n]*"\s*: "h-4 w-4 rounded border-slate-300 accent-blue"/,
  );
});

test("source-contract: Cars price filters use the short Price label on mobile and desktop", () => {
  assert.match(
    source,
    /if \(group\.id === "pricePerDay"\) \{\s*return group\.title \?\? "Price";\s*\}/,
  );
  assert.doesNotMatch(source, /t\("carsResults\.pricePerDay"\)/);
  assert.equal(
    (source.match(/carFilterGroupLabel\([^\n]+, t, true\)/g) ?? []).length,
    3,
  );
  assert.match(
    source,
    /carFilterGroupLabel\(group, t, true\)/,
  );
  assert.match(presentation, /id: "pricePerDay", titleKey: "", title: "Price"/);
  assert.doesNotMatch(
    presentation,
    /label: "[^"]*(?:\(|\[)per day(?:\)|\])/i,
  );
});

test("source-contract: Cars filters use the Flights desktop lifecycle", () => {
  assert.doesNotMatch(
    source,
    /useDesktopFilterShortcut|DesktopFilterShortcut|Edit filters/,
  );
  assert.match(source, /const desktopCompactFilterTopOffset = 116/);
  assert.match(
    source,
    /calculateCompactFilterPlacement\(\{[\s\S]*enabled: nextVisibility,[\s\S]*bodyBottomDocument:[\s\S]*resultsBody\.getBoundingClientRect\(\)\.bottom \+ scrollY,[\s\S]*currentState: desktopCompactFilterPlacementRef\.current/,
  );
  assert.match(
    source,
    /shouldShowDesktopCompactFilter\(\{[\s\S]*viewportWidth: window\.innerWidth,[\s\S]*sentinelTop:[\s\S]*topOffset: desktopCompactFilterTopOffset/,
  );
  assert.match(
    source,
    /const desktopFilterSidebarRef = useRef<HTMLElement \| null>\(null\)/,
  );
  assert.match(
    source,
    /const desktopFilterSentinelRef = useRef<HTMLDivElement \| null>\(null\)/,
  );
  assert.match(
    source,
    /const desktopCompactFilterRef = useRef<HTMLDivElement \| null>\(null\)/,
  );
  assert.match(
    source,
    /const carsResultsBodyRef = useRef<HTMLDivElement \| null>\(null\)/,
  );
  assert.match(
    source,
    /if \(presentation !== "standalone" \|\| typeof window === "undefined"\)/,
  );
  assert.match(
    source,
    /ref=\{carsResultsBodyRef\}[\s\S]*ref=\{desktopFilterSidebarRef\}[\s\S]*layout="desktop"[\s\S]*ref=\{desktopFilterSentinelRef\}[\s\S]*ref=\{desktopCompactFilterRef\}[\s\S]*layout="compact"/,
  );
  assert.match(
    source,
    /desktopCompactFilterPlacement === "fixed"[\s\S]*top: desktopCompactFilterTopOffset,[\s\S]*left: desktopCompactFilterFrame\.left,[\s\S]*width: desktopCompactFilterFrame\.width/,
  );
  assert.match(
    source,
    /layout === "compact"[\s\S]*desktop-filter-sidebar flex max-h-full w-full flex-col/,
  );
  assert.match(
    source,
    /desktopCompactFilterPlacement === "docked" &&[\s\S]*"absolute inset-x-0 bottom-0"/,
  );
  assert.match(
    source,
    /calculateCompactFilterMaxHeight\(\{[\s\S]*viewportHeight: window\.innerHeight/,
  );
  assert.match(
    source,
    /window\.addEventListener\("scroll", scheduleMeasurement, \{ passive: true \}\)/,
  );
  assert.match(
    source,
    /window\.addEventListener\("resize", scheduleMeasurement\)/,
  );
  assert.match(source, /new ResizeObserver\(scheduleMeasurement\)/);
  assert.match(source, /layout: "desktop" \| "compact" \| "mobile"/);
  assert.match(source, /hidden=\{layout === "compact" && !compactOpen\}/);
  assert.match(source, /aria-hidden=\{layout === "compact" && !compactOpen\}/);
  assert.equal(
    (
      presentation.match(
        /id: "(?:vehicleType|transmission|seats|bags|fuelPolicy|mileagePolicy|cancellation|pickupLocationType)"/g,
      ) ?? []
    ).length,
    8,
  );
});
