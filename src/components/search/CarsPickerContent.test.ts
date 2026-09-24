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
  assert.match(
    shared,
    /!mobileShell \? \([\s\S]*?mb-2 flex items-center justify-between[\s\S]*?mb-3 flex items-center justify-between/,
  );
  assert.match(shared, /desktopCompact \? "h-7 w-7 text-\[13px\]"/);
  assert.match(shared, /desktopCompact\?: boolean/);
});

test("shared calendar shows today with only the restrained ring", () => {
  assert.match(shared, /today && !past \? "ring-1 ring-inset ring-\[#004BB8\]\/25"/);
  assert.doesNotMatch(shared, /today && !selected \? <span/);
  assert.doesNotMatch(shared, /bottom-1\.5 h-1 w-1 rounded-full bg-\[#004BB8\]/);
});

test("shared time content renders two independently scrollable button lists", () => {
  assert.match(shared, /data-cars-time-columns/);
  assert.match(shared, /data-cars-time-list=\{kind\}/);
  assert.match(shared, /timeOptions\.map/);
  assert.match(shared, /aria-selected=\{selectedTime === time\}/);
  assert.match(shared, /grid min-h-0 flex-1 grid-cols-2 overflow-hidden/);
  assert.match(shared, /min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain/);
  assert.match(shared, /list\.scrollTop = Math\.max/);
  assert.match(shared, /if \(!mobileShell \|\| autoRevealSelected \|\| !open\) return/);
  assert.match(shared, /pickupListRef\.current\.scrollTop = 0/);
  assert.match(shared, /returnListRef\.current\.scrollTop = 0/);
  assert.match(shared, /open=\{open\}/);
  assert.match(shared, /autoRevealSelected=\{!nativeCarsAppearance\}/);
  assert.equal(shared.includes("scrollIntoView"), false);
});

test("native Cars time dialogs reset both lists only when the picker opens", () => {
  assert.match(shared, /autoRevealSelected=\{!nativeCarsAppearance\}/);
  assert.match(shared, /open=\{open\}/);
  assert.match(shared, /if \(!mobileShell \|\| autoRevealSelected \|\| !open\) return/);
  assert.match(shared, /pickupListRef\.current\.scrollTop = 0/);
  assert.match(shared, /returnListRef\.current\.scrollTop = 0/);
  assert.match(
    shared,
    /\}, \[autoRevealSelected, mobileShell, open\]\);/,
  );
  assert.doesNotMatch(
    shared,
    /\}, \[autoRevealSelected, mobileShell, open, (?:pickupTime|returnTime)/,
  );
});

test("shared age content provides compact selection and keyboard semantics", () => {
  for (const key of ["ArrowDown", "ArrowUp", "Home", "End", "Enter"]) assert.ok(shared.includes(key));
  assert.match(shared, /role="option"[\s\S]*?aria-selected=\{selected\}/);
  assert.match(shared, /data-selected-age-indicator/);
  assert.match(shared, /border border-slate-400/);
  assert.match(shared, /rounded-full[\s\S]*?bg-\[#075EE8\]/);
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
  assert.match(shared, /mobileShell[\s\S]*?min-h-0 flex-1[\s\S]*?max-h-\[320px\]/);
  assert.match(shared, /ageOptions\.map/);
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
  assert.match(shared, /onCommit\(draftPickup, draftReturn\);[\s\S]*?requestClose\(\)/);
  assert.match(shared, /onCommit\(draftAge\);[\s\S]*?requestClose\(\)/);
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

test("Cars Main shares native time and concrete-age internals without changing defaults", () => {
  assert.match(shared, /presentation\?: "default" \| "carsResultsEdit" \| "carsMain"/);
  assert.match(shared, /presentation === "carsResultsEdit" \|\| presentation === "carsMain"/);
  assert.match(shared, /presentation === "carsMain"[\s\S]*?"bg-white px-4 py-3"/);
  assert.match(shared, /nativeCarsAppearance \? driverAgeOptions\.slice\(1\) : driverAgeOptions/);
  assert.match(shared, /presentation === "carsMain" && driverAge === defaultDriverAge[\s\S]*?\? undefined/);
  assert.doesNotMatch(shared, /driverAge === defaultDriverAge[\s\S]*?\? "30"/);
  assert.match(shared, /disabled=\{presentation === "carsMain" && draftAge === undefined\}/);
  assert.match(shared, /if \(draftAge === undefined\) return;[\s\S]*?onCommit\(draftAge\)/);
  assert.doesNotMatch(shared, /presentation === "carsResultsEdit" && driverAge === defaultDriverAge[\s\S]*?\? "30"/);
  assert.match(shared, /nativeCarsAppearance \?[\s\S]*?`\$\{age\} years old`/);
});


test("mobile Cars time rows distinguish touch scrolling from intentional taps", () => {
  assert.match(shared, /function CarsTimeOptionButton/);
  assert.match(shared, /beginCarLocationPointerIntent/);
  assert.match(shared, /updateCarLocationPointerIntent/);
  assert.match(shared, /isIntentionalCarLocationTap/);
  assert.match(shared, /suppressClickRef\.current = true/);
});

test("mobile Cars time Done stays disabled until both times are chosen", () => {
  assert.match(shared, /disabled=\{!draftPickup \|\| !draftReturn\}/);
  assert.match(shared, /aria-disabled=\{!draftPickup \|\| !draftReturn\}/);
  assert.match(shared, /if \(!draftPickup \|\| !draftReturn\) return/);
});
