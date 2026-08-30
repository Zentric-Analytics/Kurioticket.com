import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source = fs.readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");

test("Cars mobile edit search is one grouped surface with an external CTA", () => {
  assert.match(source, /rounded-\[14px\][^\n]*border border-\[#D8E1EC\][^\n]*divide-y/);
  assert.match(source, /data-cars-mobile-grouped-row/);
  assert.match(source, /data-cars-mobile-search-submit/);
  assert.match(source, /placement === "mobile"[\s\S]*border-0 bg-transparent p-0 shadow-none ring-0/);
});

test("mobile pickup uses a leading MapPin without a disclosure arrow", () => {
  const launcher = source.slice(source.indexOf("function MobileLocationLauncher"), source.indexOf("function SearchInputCell"));
  assert.match(launcher, /<Icon className="h-4 w-4 shrink-0 text-slate-700"/);
  assert.doesNotMatch(launcher, /Chevron(?:Down|Right)/);
  assert.match(launcher, /onClick=\{onClick\}/);
});

test("grouped mobile leading field icons use one neutral color", () => {
  const groupedLeadingIcons = [
    /groupedMobile \? <Icon className="h-4 w-4 shrink-0 ([^"]+)"/,
    /groupedMobile \? <CalendarDays className="h-4 w-4 shrink-0 ([^"]+)"/,
    /groupedMobile \? <Clock3 className="h-4 w-4 shrink-0 ([^"]+)"/,
    /groupedMobile \? <UserRound className="h-4 w-4 shrink-0 ([^"]+)"/,
  ];

  for (const iconPattern of groupedLeadingIcons) {
    const classes = source.match(iconPattern)?.[1];
    assert.equal(classes, "text-slate-700");
    assert.doesNotMatch(classes, /#004BB8/);
  }
});

test("grouped mobile rows stay compact without sacrificing their touch target", () => {
  assert.equal(source.match(/min-h-16 flex-col justify-center px-4 py-2/g)?.length, 4);
  assert.doesNotMatch(source, /data-cars-mobile-grouped-row[^\n]*min-h-\[70px\]/);
});

test("dates, time, and driver age retain disclosure chevrons", () => {
  for (const name of ["SearchDateCell", "SearchTimeCell", "DriverAgeCell"]) {
    const start = source.indexOf(`function ${name}`);
    const next = source.indexOf("\nfunction ", start + 10);
    const cell = source.slice(start, next < 0 ? undefined : next);
    assert.match(
      cell,
      /<ChevronDown[\s\S]*?text-slate-500[\s\S]*?aria-hidden="true"/,
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
