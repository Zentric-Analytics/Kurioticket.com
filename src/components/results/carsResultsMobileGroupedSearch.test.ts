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
  assert.match(launcher, /<Icon className="h-4 w-4 shrink-0 text-\[#004BB8\]"/);
  assert.doesNotMatch(launcher, /Chevron(?:Down|Right)/);
  assert.match(launcher, /onClick=\{onClick\}/);
});

test("dates, time, and driver age retain disclosure chevrons", () => {
  for (const name of ["SearchDateCell", "SearchTimeCell", "DriverAgeCell"]) {
    const start = source.indexOf(`function ${name}`);
    const next = source.indexOf("\nfunction ", start + 10);
    assert.match(source.slice(start, next < 0 ? undefined : next), /<ChevronDown/);
  }
});
