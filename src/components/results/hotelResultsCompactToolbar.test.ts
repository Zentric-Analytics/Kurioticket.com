import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);

function desktopMinimizedHotelSearchBarSource() {
  const start = source.indexOf(
    "function renderDesktopMinimizedHotelSearchBar()",
  );
  const end = source.indexOf(
    "function renderDesktopStickyHotelSearchDialog()",
    start,
  );

  assert.notEqual(start, -1, "Hotel minimized toolbar renderer exists");
  assert.notEqual(
    end,
    -1,
    "sticky dialog renderer follows the toolbar renderer",
  );

  return source.slice(start, end);
}

function desktopCompactStickyWrapperSource() {
  const start = source.indexOf(
    '"pointer-events-none fixed inset-x-0 top-0 z-[1000]',
  );
  const end = source.indexOf("{renderDesktopStickyHotelSearchDialog()}", start);

  assert.notEqual(start, -1, "desktop compact sticky wrapper exists");
  assert.notEqual(end, -1, "sticky dialog follows the compact wrapper");

  return source.slice(start, end);
}

function mobileCompactHotelSearchSource() {
  const start = source.indexOf('"fixed inset-x-0 top-0 z-[900]');
  const end = source.indexOf("<MobileResultsEditSheet", start);

  assert.notEqual(start, -1, "mobile compact Hotel search exists");
  assert.notEqual(
    end,
    -1,
    "mobile Edit Search sheet follows the compact search",
  );
  return source.slice(start, end);
}

test("Hotel desktop compact sticky wrapper is a transparent positioning layer", () => {
  const wrapper = desktopCompactStickyWrapperSource();

  for (const className of [
    "pointer-events-none",
    "fixed",
    "inset-x-0",
    "top-0",
    "z-[1000]",
    "hidden",
    "px-4",
    "transition-all",
    "duration-200",
    "lg:block",
    "translate-y-0",
    "opacity-100",
    "-translate-y-3",
    "opacity-0",
  ]) {
    assert.match(
      wrapper,
      new RegExp(className.replaceAll("[", "\\[").replaceAll("]", "\\]")),
    );
  }

  assert.match(wrapper, /showDesktopMinimizedSearch/);
  assert.match(wrapper, /desktopStickyHotelSearchOpen/);
  assert.match(wrapper, /aria-hidden/);
  assert.match(wrapper, /inert/);
  assert.match(wrapper, /renderDesktopMinimizedHotelSearchBar\(\)/);

  for (const forbiddenChrome of [
    "border-b",
    "bg-gradient-to-b",
    "from-[#fbfdff]",
    "via-[#f8fbff]",
    "to-[#f5f9ff]",
    "py-3",
    "backdrop-blur-xl",
    "shadow-[0_10px_30px",
  ]) {
    assert.doesNotMatch(
      wrapper,
      new RegExp(forbiddenChrome.replaceAll("[", "\\[").replaceAll("]", "\\]")),
    );
  }
});

test("Hotel desktop minimized search matches the Flights compact geometry", () => {
  const toolbar = desktopMinimizedHotelSearchBarSource();

  assert.match(toolbar, /pointer-events-auto/);
  assert.match(toolbar, /max-w-\[820px\]/);
  assert.match(toolbar, /h-\[58px\]/);
  assert.match(toolbar, /rounded-lg/);
  assert.match(toolbar, /border border-slate-200\/95/);
  assert.match(toolbar, /bg-white/);
  assert.match(toolbar, /shadow-\[0_12px_28px/);
  assert.match(toolbar, /ring-1/);
  assert.match(
    toolbar,
    /grid-cols-\[minmax\(220px,1\.5fr\)_minmax\(150px,0\.9fr\)_minmax\(160px,1fr\)_92px\]/,
  );
  assert.match(toolbar, /h-10 w-\[92px\] whitespace-nowrap/);
  assert.doesNotMatch(toolbar, /max-w-5xl/);
});

test("Hotel compact sections retain Hotel summaries and open the editor in place", () => {
  const toolbar = desktopMinimizedHotelSearchBarSource();

  assert.match(
    toolbar,
    /activeDesktopHotelSearchDraft\.destination \|\| body\.destination/,
  );
  assert.match(toolbar, /desktopMinimizedDateSummary/);
  assert.match(toolbar, /desktopMinimizedGuestsSummary/);
  assert.doesNotMatch(toolbar, /scrollToFullHotelSearch|scrollIntoView/);
  assert.match(
    toolbar,
    /openDesktopStickyHotelSearch\(event,\s*"destination"\)/,
  );
  assert.match(toolbar, /openDesktopStickyHotelSearch\(event, "dates"\)/);
  assert.match(toolbar, /openDesktopStickyHotelSearch\(event, "guests"\)/);
  assert.match(toolbar, /openDesktopStickyHotelSearch\(event, null, true\)/);
  assert.equal(
    toolbar.match(/aria-expanded=\{desktopStickyHotelSearchOpen\}/g)?.length,
    3,
  );
  assert.equal(
    toolbar.match(/aria-controls="sticky-hotel-search-dialog"/g)?.length,
    3,
  );
  assert.equal(
    toolbar.match(/<button/g)?.length,
    4,
    "the toolbar exposes exactly four primary buttons",
  );
});

test("Hotel compact summaries use decorative icons and no two-line labels", () => {
  const toolbar = desktopMinimizedHotelSearchBarSource();

  for (const icon of ["MapPin", "Calendar", "Users"]) {
    assert.match(toolbar, new RegExp(`<${icon}[\\s\\S]*?aria-hidden="true"`));
  }
  assert.match(
    toolbar,
    /<Calendar[^>]*className="h-4 w-4 shrink-0 text-slate-500"/,
  );
  assert.doesNotMatch(toolbar, /<Calendar[^>]*text-\[#004BB8\]/);
  assert.equal(
    toolbar.match(/aria-hidden="true"/g)?.length,
    3,
    "all three summary icons are decorative",
  );
  assert.doesNotMatch(toolbar, />Destination</);
  assert.doesNotMatch(toolbar, />Travel dates</);
  assert.doesNotMatch(toolbar, />Guests \/ rooms</);
  assert.doesNotMatch(toolbar, /uppercase/);
  assert.doesNotMatch(toolbar, /flex-col/);
});

test("Hotel sticky lifecycle and neighboring search/filter contracts remain intact", () => {
  assert.match(source, /showDesktopMinimizedSearch/);
  assert.match(
    source,
    /aria-hidden=\{\s*!showDesktopMinimizedSearch \|\| desktopStickyHotelSearchOpen\s*\}/,
  );
  assert.match(
    source,
    /inert=\{\s*!showDesktopMinimizedSearch \|\| desktopStickyHotelSearchOpen\s*\? true\s*: undefined\s*\}/,
  );
  assert.match(source, /desktopSearchFormRef\.current/);
  assert.match(source, /desktopFormRef=\{setDesktopSearchFormRef\}/);
  assert.match(source, /desktopCompactFilterTopOffset = 116/);
});

test("mobile compact Hotel search has narrow gutters and distinct back, edit, and filter affordances", () => {
  const compactSearch = mobileCompactHotelSearchSource();

  assert.match(
    compactSearch,
    /z-\[900\] px-2 pt-\[env\(safe-area-inset-top\)\]/,
  );
  assert.doesNotMatch(compactSearch, /z-\[900\] px-3/);
  assert.match(
    compactSearch,
    /grid-cols-\[auto_minmax\(0,1fr\)_auto\]/,
  );
  assert.match(
    compactSearch,
    /aria-label="Back to hotels"[\s\S]*?router\.push\("\/hotels"\)[\s\S]*?<ArrowLeft[\s\S]*?aria-hidden="true"[\s\S]*?<\/button>/,
  );
  assert.match(
    compactSearch,
    /onClick=\{openMobileHotelSearch\}[\s\S]*?aria-label=\{t\("editHotelSearch"\) \|\| "Edit hotel search"\}/,
  );
  assert.doesNotMatch(compactSearch, /<ChevronRight/);
  assert.match(
    compactSearch,
    /onClick=\{\(\) => setFiltersOpen\(true\)\}[\s\S]*?<SlidersHorizontal[\s\S]*?aria-hidden="true"[\s\S]*?\{t\("filters"\)\}/,
  );
});
