import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const searchBar = readFileSync(
  new URL("./HotelSearchBar.tsx", import.meta.url),
  "utf8",
);
const sheet = readFileSync(
  new URL("./MobileResultsEditSheet.tsx", import.meta.url),
  "utf8",
);

test("results Hotel editor uses compact grouped picker rows", () => {
  assert.match(
    searchBar,
    /mobileResultsSheet && "min-h-\[60px\][^"]*hover:bg-slate-50\/70/,
  );
  assert.match(
    searchBar,
    /mobileResultsSheet && "mb-0\.5 normal-case text-\[11px\] font-semibold/,
  );
  assert.match(
    searchBar,
    /mobileResultsSheet && mobileResultsEditGroupClass/,
  );
  assert.doesNotMatch(searchBar, /after:inset-x-4 after:bottom-0/);
  assert.match(searchBar, /mobileLandingPresentation \|\| mobileResultsSheet/);
  assert.match(
    searchBar,
    /!mobileLandingPresentation && !mobileResultsSheet && "max-sm:hidden"/,
  );
  assert.match(searchBar, /!mobileResultsSheet \? \([\s\S]*?<ChevronDown/);
  assert.match(
    searchBar,
    /mobileResultsSheet && "mt-3 h-\[52px\] shadow-none/,
  );
});

test("submitting a Hotel results edit closes the sheet before navigation", () => {
  const close = searchBar.indexOf("if (mobileLayout === \"drawer\")");
  const navigation = searchBar.indexOf("router.push(nextUrl)", close);

  assert.notEqual(close, -1);
  assert.notEqual(navigation, -1);
  assert.ok(close < navigation);
  assert.match(
    searchBar.slice(close, navigation),
    /closeMobileSearchPanel\(\)/,
  );
});

test("results edit sheet focuses its neutral dialog surface on open", () => {
  assert.match(sheet, /dialogRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(sheet, /role="dialog"[\s\S]*?tabIndex=\{-1\}/);
  assert.doesNotMatch(sheet, /closeRef\.current\?\.focus/);
  assert.match(
    sheet,
    /focus:outline-none focus-visible:ring-2 focus-visible:ring-\[#004BB8\]\/35/,
  );
});
