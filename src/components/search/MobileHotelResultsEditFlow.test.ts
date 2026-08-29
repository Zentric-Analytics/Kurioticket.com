import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const search = read("./HotelSearchBar.tsx");
const sheet = read("./MobileResultsEditSheet.tsx");
const styles = read("../../app/globals.css");

test("mobile hotel results fields are independent cards with only the required chevrons", () => {
  assert.match(
    search,
    /data-hotel-results-edit-fields=[\s\S]*?flex flex-col gap-2\.5/,
  );
  assert.doesNotMatch(search, /mobileResultsEditGroupClass/);
  assert.match(
    search,
    /dateSummary[\s\S]*?mobileResultsSheet \? <ChevronRight aria-hidden="true"/,
  );
  assert.equal(
    (search.match(/<ChevronRight aria-hidden="true" className=/g) ?? []).length,
    2,
  );

  const destinationRow = search.slice(
    search.indexOf("ref={destinationWrapperRef}"),
    search.indexOf("ref={datesWrapperRef}"),
  );
  assert.doesNotMatch(destinationRow, /ChevronRight/);
});

test("results edit sheet mounts as a complete white animated surface", () => {
  assert.match(
    sheet,
    /mobile-results-sheet-surface[\s\S]*?border border-b-0 border-slate-200\/80 bg-white/,
  );
  assert.doesNotMatch(sheet, /entered|translate-y-full/);
  assert.match(styles, /@keyframes mobile-results-sheet-surface-in/);
  assert.match(styles, /transform: translate3d\(0, 100%, 0\)/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});
