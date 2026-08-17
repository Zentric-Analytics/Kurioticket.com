import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);

test("source-contract: Cars compact shell and header match Flights styling", () => {
  assert.match(
    source,
    /desktop-filter-sidebar flex max-h-full flex-col overflow-hidden rounded-2xl border border-\[#D8E1EC\] bg-\[#EEF3F8\] p-0 shadow-\[0_14px_30px_-26px_rgba\(15,23,42,0\.42\)\]/,
  );
  assert.match(
    source,
    /desktop-filter-sidebar__header shrink-0 border-b border-\[#D8E1EC\]\/80 bg-\[#EEF3F8\] px-3\.5 py-2\.5/,
  );
  assert.match(
    source,
    /desktop-filter-sidebar__title flex min-w-0 items-center gap-2 truncate text-\[15px\] font-semibold leading-5/,
  );
  assert.match(
    source,
    /<SlidersHorizontal className="desktop-filter-sidebar__icon shrink-0 text-\[#004BB8\]" size=\{15\} strokeWidth=\{2\.25\} aria-hidden="true" \/>\s*<span className="truncate">\{t\("carsResults\.filterBy"\)\}<\/span>/,
  );
  assert.match(
    source,
    /desktop-filter-sidebar__count rounded-full bg-\[#EAF2FB\].*ring-\[#004BB8\]\/8/,
  );
  assert.match(source, /\{activeFilterLabel\}/);
  assert.match(source, /\{t\("clearAll"\)\}/);
});

test("source-contract: Cars compact sections match Flights density", () => {
  assert.match(
    source,
    /layout === "compact" \? "border-t border-\[#D8E1EC\]\/75 first:border-t-0"/,
  );
  assert.doesNotMatch(source, /layout === "compact" \? "[^"]*py-3/);
  assert.match(
    source,
    /group flex min-h-9 w-full items-center justify-between gap-3 rounded-md px-2\.5 py-2 text-start text-\[13px\] font-semibold/,
  );
  assert.doesNotMatch(source, /layout === "compact"[^\n]*min-h-10/);
  assert.doesNotMatch(source, /layout === "compact"[^\n]*text-sm font-bold/);
  assert.match(
    source,
    /h-3\.5 w-3\.5 text-slate-500 transition duration-200.*compactOpen && "rotate-180 text-\[#004BB8\]"/,
  );
  assert.match(source, /strokeWidth=\{2\.3\}/);
  assert.match(
    source,
    /min-w-5 rounded-full bg-\[#E2EAF3\].*text-\[#235A9F\].*group-hover:bg-\[#DCE8F6\]/,
  );
  assert.doesNotMatch(
    source,
    /selectedOptions\.length \? <span className="rounded-full bg-\[#004BB8\]/,
  );
  assert.match(
    source,
    /grid h-auto gap-0\.5 overflow-visible bg-transparent px-2\.5 pb-3 pt-0\.5/,
  );
  assert.match(
    source,
    /flex min-h-8 cursor-pointer items-start justify-between gap-2 rounded-lg px-1\.5 py-1 text-\[13px\]/,
  );
  assert.match(source, /flex min-w-0 items-start gap-1\.5/);
  assert.match(
    source,
    /mt-0\.5 h-3\.5 w-3\.5 shrink-0 rounded border-slate-300 accent-blue/,
  );
});

test("source-contract: compact body is the only vertical scroll owner and header does not scroll", () => {
  assert.match(
    source,
    /min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-\[#EEF3F8\] px-2 py-1/,
  );
  assert.match(
    source,
    /desktop-filter-sidebar flex max-h-full flex-col overflow-hidden/,
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
    /layout === "desktop" \? "desktop-filter-sidebar border border-slate-200\/80 bg-transparent p-0 shadow-none rounded-none"/,
  );
  assert.match(
    source,
    /layout === "mobile" \? "border-t border-border py-4 first:border-t-0 first:pt-0"/,
  );
  assert.match(source, /layout === "mobile" \? "space-y-0 bg-white"/);
  assert.match(
    source,
    /layout === "compact" \? "mt-0\.5 h-3\.5 w-3\.5.*" : "h-4 w-4 rounded border-slate-300 accent-blue"/,
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
      source.match(
        /id: "(?:vehicleType|transmission|seats|bags|fuelPolicy|mileagePolicy|cancellation|pickupLocationType)"/g,
      ) ?? []
    ).length,
    8,
  );
});
