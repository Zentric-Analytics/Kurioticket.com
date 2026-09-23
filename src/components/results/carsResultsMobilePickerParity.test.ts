import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { variableInitializer } from "@/lib/testing/sourceContract";

const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const pickerShell = readFileSync(
  new URL("../search/FlightMobilePickerShell.tsx", import.meta.url),
  "utf8",
);
const datePicker = readFileSync(
  new URL("../search/MobileDateRangePicker.tsx", import.meta.url),
  "utf8",
);
const locationPicker = readFileSync(
  new URL("../search/MobileCarLocationPicker.tsx", import.meta.url),
  "utf8",
);
const carsPickerContent = readFileSync(
  new URL("../search/CarsPickerContent.tsx", import.meta.url),
  "utf8",
);

const mobileForm = variableInitializer(source, "renderCarsSearchForm");

assert.ok(mobileForm, "the Cars Results search form should remain defined");

test("mobile Results uses the main Cars dedicated picker dialogs", () => {
  assert.match(source, /<MobileDatePickerDialog/);
  assert.match(source, /<MobileCarTimePickerDialog/);
  assert.match(source, /<MobileCarDriverAgePickerDialog/);
  assert.match(source, /<MobileCarLocationPicker/);
  assert.match(
    source,
    /type CarsResultsMobilePicker =\s*\| "pickupLocation"\s*\| "returnLocation"\s*\| "dates"\s*\| "times"\s*\| "driverAge"\s*\| null/,
  );
});

test("Cars Edit children preserve polished Cars content in the full-height mobile-web picker shell", () => {
  assert.equal(
    (source.match(/presentation="carsResultsEdit"/g) ?? []).length,
    5,
  );
  assert.match(source, /nestedLayerOpen=\{mobilePicker !== null\}/);
  assert.match(pickerShell, /data-cars-results-edit-picker/);
  assert.match(
    pickerShell,
    /fixed inset-0 flex h-\[100dvh\] min-h-0 w-screen max-w-full flex-col overflow-hidden bg-white pt-\[env\(safe-area-inset-top\)\]/,
  );
  assert.match(
    pickerShell,
    /carsResultsEdit && !whiteSurface && "bg-\[#F5F7FB\]"/,
  );
  assert.match(pickerShell, /surfaceVariant = "default"/);
  assert.doesNotMatch(pickerShell, /bg-\[rgba\(8,18,35,0\.20\)\]/);
  assert.doesNotMatch(pickerShell, /max-h-\[82dvh\]/);
  assert.doesNotMatch(carsPickerContent, /max-h-\[72dvh\]/);
  assert.match(pickerShell, /presentation = "default"/);
  assert.match(datePicker, /carsResultsEdit &&[\s\S]*?"h-8 w-8 rounded-lg text-xs/);
  assert.match(datePicker, /text-\[16px\] font-semibold leading-5/);
  assert.match(datePicker, /data-scroll-direction=\{carsResultsEdit \? "vertical"/);
  assert.match(datePicker, /Array\.from\(\{ length: monthCount \}/);
  assert.doesNotMatch(datePicker, /\[resultsMonth\]/);
  assert.doesNotMatch(datePicker, /Previous month|Next month/);
  assert.doesNotMatch(datePicker, /data-cars-results-date-range-header/);
  assert.match(datePicker, /endpoint && !carsResultsEdit/);
  assert.match(datePicker, /`\$\{fullDate\}, \$\{endpoint\}`/);
  assert.match(locationPicker, /surfaceVariant=\{nativeCarsAppearance \? "white" : "default"\}/);
  assert.match(locationPicker, /contentLayout=\{nativeCarsAppearance \? "contained" : "scroll"\}/);
  assert.match(locationPicker, /nativeCarsAppearance && "bg-white px-5 py-3"/);
  assert.match(locationPicker, /h-\[50px\].*rounded-\[10px\]/);
  assert.match(carsPickerContent, /min-h-14/);
  assert.match(
    carsPickerContent,
    /nativeCarsAppearance \? driverAgeOptions\.slice\(1\)/,
  );
  const resultsAgeDialog = carsPickerContent.slice(
    carsPickerContent.indexOf("export function MobileCarDriverAgePickerDialog"),
  );
  assert.match(
    resultsAgeDialog,
    /presentation === "carsMain" && driverAge === defaultDriverAge/,
  );
  assert.doesNotMatch(
    resultsAgeDialog,
    /presentation === "carsResultsEdit" && driverAge === defaultDriverAge[\s\S]*?\? "30"/,
  );
  assert.match(resultsAgeDialog, /\? undefined\s*: driverAge;/);
  assert.match(carsPickerContent, /`\$\{age\} years old`/);
  assert.match(carsPickerContent, /!nativeCarsAppearance \? \(/);
  assert.doesNotMatch(
    carsPickerContent.slice(
      carsPickerContent.indexOf("export function MobileCarDriverAgePickerDialog"),
    ),
    />Driver must be between 18 and 70 years old\.</,
  );
  assert.match(carsPickerContent, /h-\[22px\] w-\[22px\]/);
  assert.match(carsPickerContent, /min-h-\[50px\] px-2/);
  assert.match(carsPickerContent, /h-\[17px\] w-\[17px\] text-\[#075EE8\]/);
  assert.match(
    carsPickerContent,
    /h-12 w-full rounded-\[10px\] bg-\[#004BB8\]/,
  );
});

test("mobile launchers enter one nested picker instead of inline panels", () => {
  for (const picker of ["dates", "times", "driverAge"]) {
    assert.match(
      mobileForm,
      new RegExp(
        `if \\(placement === "mobile"\\) \\{\\s*setMobilePicker\\("${picker}"\\);\\s*return;`,
      ),
    );
  }
  assert.match(
    mobileForm,
    /placement !== "mobile" && surfaceOwnsPopovers && timesOpen/,
  );
  assert.match(
    mobileForm,
    /placement !== "mobile" &&[\s\S]*?surfaceOwnsPopovers &&[\s\S]*?driverAgeOpen/,
  );
});

test("nested picker close returns to Edit Search without submitting", () => {
  const dialogs = source.match(
    /<MobileDatePickerDialog[\s\S]*?<div\n        className=\{cn\(/,
  )?.[0];
  assert.ok(dialogs, "the nested mobile dialogs should remain by the editor");
  assert.equal(
    (dialogs.match(/onClose=\{\(\) => setMobilePicker\(null\)\}/g) ?? [])
      .length,
    5,
  );
  assert.doesNotMatch(
    dialogs,
    /router\.(?:push|replace)|onSubmit|closeMobileSearchDrawer/,
  );
  assert.match(
    dialogs,
    /<MobileCarLocationPicker[\s\S]*?commitOnSelect[\s\S]*?onClose=\{\(\) => setMobilePicker\(null\)\}/,
  );
});

test("mobile Driver Age delegates numeric formatting to the shared picker", () => {
  assert.match(
    source,
    /<MobileCarDriverAgePickerDialog[\s\S]*?formatAge=\{\(age\) => age\}/,
  );
  assert.doesNotMatch(
    source.match(/<MobileCarDriverAgePickerDialog[\s\S]*?\/>/)?.[0] ?? "",
    /years old/,
  );
});

test("Results Edit preserves the Any Age sentinel without selecting a numeric row", () => {
  const agePicker = carsPickerContent.slice(
    carsPickerContent.indexOf("export function CarsDriverAgePickerContent"),
    carsPickerContent.indexOf("export function MobileCarTimePickerDialog"),
  );
  const ageDialog = carsPickerContent.slice(
    carsPickerContent.indexOf("export function MobileCarDriverAgePickerDialog"),
  );

  assert.match(
    agePicker,
    /nativeCarsAppearance \? driverAgeOptions\.slice\(1\) : driverAgeOptions/,
  );
  assert.match(agePicker, /const selectedIndex = ageOptions\.indexOf\(selectedAge\)/);
  assert.match(agePicker, /selectedIndex < 0 \? 0 : selectedIndex/);
  assert.match(agePicker, /const selected = selectedAge === age/);
  assert.match(agePicker, /aria-selected=\{selected\}/);

  assert.match(
    ageDialog,
    /presentation === "carsMain" && driverAge === defaultDriverAge[\s\S]*?\? undefined[\s\S]*?: driverAge/,
  );
  assert.match(ageDialog, /onCommit\(draftAge\)/);
  assert.match(ageDialog, /onClose=\{onClose\}/);
});
