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
  assert.notEqual(end, -1, "sticky dialog renderer follows the toolbar renderer");

  return source.slice(start, end);
}

function desktopMinimizedHotelSearchWrapperSource() {
  const toolbarCall = "{renderDesktopMinimizedHotelSearchBar()}";
  const toolbarCallIndex = source.indexOf(toolbarCall);
  const start = source.lastIndexOf("<div", toolbarCallIndex);
  const end = source.indexOf("</div>", toolbarCallIndex) + "</div>".length;

  assert.notEqual(toolbarCallIndex, -1, "Hotel minimized toolbar is rendered");
  assert.notEqual(start, -1, "Hotel minimized toolbar wrapper exists");

  return source.slice(start, end);
}

test("Hotel desktop minimized search matches the Flights compact geometry", () => {
  const toolbar = desktopMinimizedHotelSearchBarSource();

  assert.match(toolbar, /pointer-events-auto/);
  assert.match(toolbar, /max-w-\[820px\]/);
  assert.match(toolbar, /h-\[58px\]/);
  assert.match(toolbar, /rounded-lg/);
  assert.match(
    toolbar,
    /grid-cols-\[minmax\(220px,1\.5fr\)_minmax\(150px,0\.9fr\)_minmax\(160px,1fr\)_92px\]/,
  );
  assert.match(toolbar, /h-10 w-\[92px\] whitespace-nowrap/);
  assert.doesNotMatch(toolbar, /max-w-5xl/);
});

test("Hotel desktop minimized search uses a transparent positioning wrapper", () => {
  const wrapper = desktopMinimizedHotelSearchWrapperSource();

  assert.match(
    wrapper,
    /pointer-events-none fixed inset-x-0 top-3 z-\[1000\] hidden px-4 transition-all duration-200 lg:block/,
  );
  assert.match(wrapper, /\? "translate-y-0 opacity-100"/);
  assert.match(wrapper, /: "-translate-y-3 opacity-0"/);
  assert.doesNotMatch(wrapper, /border-b/);
  assert.doesNotMatch(wrapper, /bg-gradient-to-b/);
  assert.doesNotMatch(wrapper, /from-\[#fbfdff\]/);
  assert.doesNotMatch(wrapper, /via-\[#f8fbff\]/);
  assert.doesNotMatch(wrapper, /to-\[#f5f9ff\]/);
  assert.doesNotMatch(wrapper, /py-3/);
  assert.doesNotMatch(wrapper, /shadow-\[0_10px_30px/);
  assert.doesNotMatch(wrapper, /backdrop-blur-xl/);
  assert.doesNotMatch(
    wrapper,
    /\? "pointer-events-auto translate-y-0 opacity-100"/,
  );
  assert.match(
    wrapper,
    /showDesktopMinimizedSearch && !desktopStickyHotelSearchOpen/,
  );
  assert.match(wrapper, /aria-hidden=/);
  assert.match(wrapper, /inert=/);
});

test("Hotel compact toolbar retains its local surface styling", () => {
  const toolbar = desktopMinimizedHotelSearchBarSource();

  assert.match(
    toolbar,
    /pointer-events-auto mx-auto grid h-\[58px\][\s\S]*?max-w-\[820px\]/,
  );
  assert.match(toolbar, /border border-slate-200\/95/);
  assert.match(toolbar, /bg-white/);
  assert.match(toolbar, /shadow-\[0_12px_28px_-22px_rgba\(15,23,42,0\.55\)\]/);
  assert.match(toolbar, /ring-1 ring-slate-950\/\[0\.025\]/);
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
