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

test("Hotel desktop minimized search matches the Flights compact geometry", () => {
  const toolbar = desktopMinimizedHotelSearchBarSource();

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
