import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/search/MobileDateRangePicker.tsx", "utf8");

test("shared mobile calendar renders one card with localized stacked months and blank adjacent cells", () => {
  assert.match(source, /data-mobile-date-calendar-card/);
  assert.match(source, /monthCount = 12/);
  assert.match(source, /Intl\.DateTimeFormat\(locale, \{ month: "long", year: "numeric" \}\)/);
  assert.match(source, /grid grid-cols-7/);
  assert.match(source, /data-adjacent-month-placeholder/);
  assert.match(source, /border-t border-slate-200\/70/);
  assert.doesNotMatch(source, /ChevronLeft|ChevronRight|previousMonth|nextMonth/);
});

test("range endpoints and continuous band use the approved distinct treatments", () => {
  assert.match(source, /data-continuous-range-band/);
  assert.match(source, /inRange && "inset-x-0"/);
  assert.match(source, /isStart && "start-1\/2 end-0"/);
  assert.match(source, /isEnd && "start-0 end-1\/2"/);
  assert.match(source, /isStart && "bg-\[#075ee8\][^"]*text-white/);
  assert.match(source, /isEnd && "border-\[1\.5px\] border-\[#075ee8\] bg-white/);
  assert.doesNotMatch(source, /isEnd && "bg-\[#075ee8\]/);
});

test("dialog owns draft selection and only Done commits a valid product range", () => {
  assert.match(source, /const \[draftStart, setDraftStart\]/);
  assert.match(source, /const \[draftEnd, setDraftEnd\]/);
  assert.match(source, /if \(!rangeRequired\)/);
  assert.match(source, /if \(iso <= draftStart\)/);
  assert.match(source, /const validDraft = Boolean\(draftStart && \(!rangeRequired \|\| draftEnd\)\)/);
  assert.match(source, /onCommit\(draftStart, rangeRequired \? draftEnd : ""\)/);
  assert.match(source, /onClose=\{onClose\}/);
  assert.doesNotMatch(source, />\s*Clear\s*</);
});

test("dialog hides the Cancel action at the shared shell boundary", () => {
  assert.match(source, /showCancelAction=\{false\}/);
});

test("Done preserves native validation while always retaining its strong-blue treatment", () => {
  assert.match(source, /disabled=\{!validDraft\}/);
  assert.match(source, /bg-\[#075ee8\]/);
  assert.match(source, /text-white/);
  assert.match(source, /disabled:bg-\[#075ee8\]/);
  assert.match(source, /disabled:text-white/);
  assert.match(source, /disabled:opacity-100/);
  assert.doesNotMatch(source, /disabled:opacity-50/);
});

test("calendar preserves mobile scrolling, safe fixed footer, accessibility, and selected-month reveal", () => {
  assert.match(source, /<FlightMobilePickerShell/);
  assert.match(source, /h-\[52px\] w-full rounded-\[9px\]/);
  assert.match(source, /scrollIntoView\(\{ block: "start" \}\)/);
  assert.match(source, /aria-pressed=\{isStart \|\| isEnd\}/);
  assert.match(source, /aria-disabled=\{disabled\}/);
  assert.match(source, /selectDatePrefix/);
  assert.match(source, /`\$\{fullDate\}, \$\{endpoint\}`/);
});
