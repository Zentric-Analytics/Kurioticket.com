import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const results = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
  "utf8",
);
const drawer = readFileSync(
  new URL("../search/FlightEditSearchDrawer.tsx", import.meta.url),
  "utf8",
);
test("Results shared drawer uses production mobile picker components", () => {
  assert.match(results, /<FlightEditSearchDrawer[\s\S]*?resultsMode/);
  assert.match(drawer, /<MobileDatePickerDialog/);
  assert.match(drawer, /<MobileTravelerCabinPicker/);
  assert.match(drawer, /<MobileAirportPicker/);
});

test("compact Flight header matches the Cars inline Pencil contract", () => {
  const start = results.indexOf("function renderMobileCompactResultsHeader");
  const end = results.indexOf("function renderMobile", start + 20);
  const header = results.slice(start, end);
  assert.match(header, /<span>Modify search<\/span>[\s\S]*?<Pencil/);
  assert.match(header, /data-flight-compact-edit-icon/);
  assert.match(header, /className="h-3 w-3 shrink-0 text-\[#536B92\]"/);
  assert.equal(header.match(/aria-label=\{modifySearchLabel\}/g)?.length, 1);
  assert.doesNotMatch(
    header,
    /data-flight-compact-edit-icon[\s\S]{0,160}(?:SquarePen|PencilLine|bg-\[#004BB8\]\/8)/,
  );
});
