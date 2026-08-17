import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shared = readFileSync("src/components/search/CarsPickerContent.tsx", "utf8");
const homepage = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const carsPage = readFileSync("src/app/cars/page.tsx", "utf8");

test("shared Cars picker content is consumed by both search surfaces", () => {
  assert.ok(homepage.includes("<CarsRentalDatePickerContent"));
  assert.ok(carsPage.includes("<CarsRentalDatePickerContent"));
  assert.ok(homepage.includes("<MobileCarTimePickerDialog"));
  assert.ok(carsPage.includes("<MobileCarTimePickerDialog"));
  assert.ok(homepage.includes("<MobileCarDriverAgePickerDialog"));
  assert.ok(carsPage.includes("<MobileCarDriverAgePickerDialog"));
});

test("shared calendar exposes range state and disables past dates", () => {
  assert.match(shared, /disabled=\{past\}/);
  assert.match(shared, /data-in-range=\{inRange \|\| undefined\}/);
  assert.match(shared, /aria-pressed=\{selected\}/);
  assert.match(shared, /length: mobileShell \? 12 : 2/);
  assert.match(shared, /!mobileShell \? <div className="mb-3 flex items-center justify-between"/);
});

test("shared time content renders two independently scrollable button lists", () => {
  assert.match(shared, /data-cars-time-columns/);
  assert.match(shared, /data-cars-time-list=\{kind\}/);
  assert.match(shared, /timeOptions\.map/);
  assert.match(shared, /aria-selected=\{selectedTime === time\}/);
  assert.match(shared, /grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-hidden/);
  assert.match(shared, /min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain/);
  assert.match(shared, /list\.scrollTop = Math\.max/);
  assert.equal(shared.includes("scrollIntoView"), false);
});

test("shared age content provides compact selection and keyboard semantics", () => {
  for (const key of ["ArrowDown", "ArrowUp", "Home", "End", "Enter"]) assert.ok(shared.includes(key));
  assert.match(shared, /role="option" aria-selected=\{selected\}/);
  assert.match(shared, /data-selected-age-indicator/);
  assert.match(shared, /border border-slate-400/);
  assert.match(shared, /rounded-full bg-\[#075EE8\]/);
});

test("dedicated Cars desktop time popup has no native selects and stable relationships", () => {
  const timeField = carsPage.slice(carsPage.indexOf("function TimeRangeField("), carsPage.indexOf("function SearchCell("));
  assert.equal(timeField.includes("<select"), false);
  assert.match(timeField, /id="cars-desktop-time-range-dialog"/);
  assert.match(timeField, /aria-controls="cars-desktop-time-range-dialog"/);
  assert.match(timeField, /role="dialog"/);
});


test("mobile age owns one flex-constrained momentum scroll region", () => {
  assert.match(shared, /min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain/);
  assert.match(shared, /mobileShell \? "min-h-0 flex-1[^"]+" : "max-h-\[320px\]/);
  assert.match(shared, /driverAgeOptions\.map/);
});

test("mobile calendar mirrors the twelve-month touch presentation", () => {
  assert.match(shared, /data-month-count=\{months\.length\}/);
  assert.match(shared, /h-11 w-full max-w-11 text-\[15px\]/);
  assert.match(shared, /text-\[17px\] font-bold/);
});

test("homepage mobile time picker drafts both values and commits only from Done", () => {
  assert.match(shared, /const \[draftPickup, setDraftPickup\]/);
  assert.match(shared, /const \[draftAge, setDraftAge\]/);
  assert.match(homepage, /pickupTime=\{carsValues\.pickupTime\}/);
  assert.match(homepage, /returnTime=\{carsValues\.dropoffTime\}/);
  assert.match(homepage, /onCommit=\{\(pickupTime, dropoffTime\)/);
  assert.match(homepage, /onCommit=\{\(age\) => updateCarsValue\("driverAge", age\)\}/);
  assert.match(shared, /onCommit\(draftPickup, draftReturn\); requestClose\(\)/);
  assert.match(shared, /onCommit\(draftAge\); requestClose\(\)/);
  assert.doesNotMatch(shared, /onCommit\(draft(?:Pickup|Age)[^;]*; onClose\(\)/);
});

test("shared shell locks the document while allowing picker touch panning", () => {
  const shell = readFileSync("src/components/search/FlightMobilePickerShell.tsx", "utf8");
  assert.match(shell, /bodyElement\.style\.position = "fixed"/);
  assert.match(shell, /bodyElement\.style\.overflow = "hidden"/);
  assert.match(shell, /bodyElement\.style\.touchAction = "auto"/);
  assert.match(shell, /touch-pan-y overflow-y-auto/);
  assert.match(shell, /-webkit-overflow-scrolling:touch/);
  assert.match(shell, /contentLayout\?: "scroll" \| "contained"/);
  assert.match(shell, /contentLayout === "scroll"/);
  assert.match(shell, /"flex touch-auto flex-col overflow-y-hidden"/);
  assert.match(shared, /contentLayout="contained"/);
  assert.match(shared, /flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-hidden/);
});

test("mobile shell interactions are not closed by the desktop outside-pointer listener", () => {
  assert.match(homepage, /mobilePresentation !== "shell" \|\| isSmViewport/);
  assert.match(homepage, /would unmount it on pointerdown before option clicks run/);
  assert.match(homepage, /if \(listenForOutsidePointer\) \{\s*document\.addEventListener\("pointerdown"/);
  assert.match(homepage, /document\.addEventListener\("keydown", closeOnEscape\)/);
  assert.match(homepage, /\[isSmViewport, mobilePresentation, onOpenChange, open\]/);
});
