import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source = fs.readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
const editSheet = fs.readFileSync(
  new URL("../search/MobileResultsEditSheet.tsx", import.meta.url),
  "utf8",
);

function classConstant(name: string) {
  const value = source.match(new RegExp(`const ${name} =\\s*\\n?\\s*"([^"]+)";`))?.[1];
  assert.ok(value, `${name} should remain defined`);
  return value;
}

test("Cars mobile edit search uses independent cards with an external CTA", () => {
  assert.match(source, /placement === "mobile" && "grid grid-cols-1 gap-2.5"/);
  assert.doesNotMatch(source, /placement === "mobile"[^\n]*divide-y/);
  assert.match(source, /rounded-\[13px\] border border-\[#D8E1EC\] bg-white/);
  assert.match(source, /data-cars-mobile-grouped-row/);
  assert.match(source, /data-cars-mobile-search-submit/);
  assert.match(source, /placement === "mobile"[\s\S]*border-0 bg-transparent p-0 shadow-none ring-0/);
});

test("Cars mobile Edit Search title keeps a restrained native-like hierarchy", () => {
  assert.match(
    editSheet,
    /carsResultsEdit && "text-\[19px\] font-semibold leading-\[24px\] tracking-normal"/,
  );
});

test("mobile pickup uses a leading MapPin without a disclosure arrow", () => {
  const launcher = source.slice(source.indexOf("function MobileLocationLauncher"), source.indexOf("function SearchInputCell"));
  assert.match(launcher, /<Icon className="h-4 w-4 shrink-0 text-slate-700"/);
  assert.doesNotMatch(launcher, /Chevron(?:Down|Right)/);
  assert.match(launcher, /onClick=\{onClick\}/);
});

test("grouped mobile leading field icons match the Cars Main neutral tone", () => {
  const groupedLeadingIcons = [
    /groupedMobile \? <Icon className="h-4 w-4 shrink-0 ([^"]+)"/,
    /groupedMobile \? <CalendarDays className="h-4 w-4 shrink-0 ([^"]+)"/,
    /groupedMobile \? <Clock3 className="h-4 w-4 shrink-0 ([^"]+)"/,
    /groupedMobile \? <UserRound className="h-4 w-4 shrink-0 ([^"]+)"/,
  ];

  for (const iconPattern of groupedLeadingIcons) {
    const classes = source.match(iconPattern)?.[1];
    assert.equal(classes, "text-[#334155]");
    assert.doesNotMatch(classes, /#004BB8/);
  }
});

test("grouped mobile rows stay compact without sacrificing their touch target", () => {
  const shell = classConstant("carsMobileEditFieldShellClass");

  assert.match(shell, /min-h-\[70px\]/);
  assert.match(shell, /justify-center/);
  assert.match(shell, /rounded-\[13px\]/);
  assert.match(shell, /px-4/);
  assert.match(shell, /py-2\.5/);
  assert.match(shell, /gap-\[1px\]/);
  assert.equal(source.match(/groupedMobile \? carsMobileEditFieldShellClass/g)?.length, 4);
});

test("grouped mobile copy matches the polished Cars Main hierarchy", () => {
  const label = classConstant("carsMobileEditFieldLabelClass");
  const value = classConstant("carsMobileEditValueClass");

  assert.match(label, /mb-0/);
  assert.match(label, /text-\[10px\]/);
  assert.match(label, /leading-\[13px\]/);
  assert.match(label, /tracking-\[0\.5px\]/);
  assert.match(label, /font-extrabold/);
  assert.match(label, /uppercase/);
  assert.match(label, /text-\[#64748B\]/);

  assert.match(value, /h-auto/);
  assert.match(value, /text-\[15px\]/);
  assert.match(value, /leading-5/);
  assert.match(value, /font-semibold/);
  assert.match(value, /text-\[#0F172A\]/);
  assert.doesNotMatch(value, /font-medium|tracking-\[-0\.01em\]/);

  assert.equal(classConstant("carsMobileEditValueRowClass"), "gap-2.5");
});

test("grouped location values match the Cars Main supporting-text hierarchy", () => {
  const launcher = source.slice(source.indexOf("function MobileLocationLauncher"), source.indexOf("function SearchInputCell"));
  const secondary = classConstant("carsMobileEditSecondaryValueClass");

  assert.match(launcher, /groupedMobile && carsMobileEditValueClass/);
  assert.match(launcher, /groupedMobile && carsMobileEditSecondaryValueClass/);
  assert.match(secondary, /text-\[12px\]/);
  assert.match(secondary, /font-normal/);
  assert.match(secondary, /leading-4/);
  assert.match(secondary, /tracking-normal/);
  assert.match(secondary, /text-\[#56658E\]/);
  assert.match(launcher, /block truncate/);
  assert.doesNotMatch(classConstant("carsMobileEditValueClass"), /text-\[16px\]/);
});

test("grouped date summary uses the shared mobile value line height", () => {
  const start = source.indexOf("function SearchDateCell");
  const end = source.indexOf("function SearchTimeCell", start);
  const cell = source.slice(start, end);

  assert.match(cell, /groupedMobile && "leading-5"/);
  assert.match(cell, /groupedMobile \? \[carsMobileEditValueClass, carsMobileEditValueRowClass\] : "h-8 gap-2"/);
});

test("mobile Search keeps its full touch target with restrained copy", () => {
  assert.match(
    source,
    /data-cars-mobile-search-submit[\s\S]*?h-12 w-full rounded-\[10px\][^\"]*text-\[14px\][^\"]*font-semibold[^\"]*leading-\[18px\]/,
  );
});

test("dates, time, and driver age retain disclosure behavior with Cars Main mobile tone", () => {
  for (const name of ["SearchDateCell", "SearchTimeCell", "DriverAgeCell"]) {
    const start = source.indexOf(`function ${name}`);
    const next = source.indexOf("\nfunction ", start + 10);
    const cell = source.slice(start, next < 0 ? undefined : next);
    assert.match(
      cell,
      /<ChevronDown[\s\S]*?text-slate-500[\s\S]*?groupedMobile && "text-\[#334155\]"[\s\S]*?aria-hidden="true"/,
    );
  }
});

test("grouped time and driver age values own the left-aligned flexible column", () => {
  for (const name of ["SearchTimeCell", "DriverAgeCell"]) {
    const start = source.indexOf(`function ${name}`);
    const next = source.indexOf("\nfunction ", start + 10);
    const cell = source.slice(start, next < 0 ? undefined : next);

    assert.match(cell, /groupedMobile && "min-w-0 flex-1 text-start"/);
    assert.doesNotMatch(cell, /groupedMobile && "[^"]*(?:text-center|justify-center|mx-auto)/);
  }
});
