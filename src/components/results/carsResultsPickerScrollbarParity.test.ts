import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync("src/app/globals.css", "utf8");
const results = readFileSync(
  "src/components/results/CarsResultsClient.tsx",
  "utf8",
);
const shared = readFileSync(
  "src/components/search/CarsPickerContent.tsx",
  "utf8",
);

const resultsScrollbarScope = String.raw`\[data-cars-results-picker-popover="true"\]`;

test("Cars Results desktop picker scrollbars stay narrowly scoped", () => {
  assert.match(
    results,
    /data-cars-results-picker-popover="true"/,
    "the desktop results portal must retain its styling scope",
  );
  assert.match(
    globals,
    new RegExp(`${resultsScrollbarScope} \\[data-cars-time-list\\]`),
  );
  assert.match(
    globals,
    new RegExp(`${resultsScrollbarScope} \\[data-cars-age-list\\]`),
  );
  assert.doesNotMatch(
    globals,
    /^\[data-cars-(?:time|age)-(?:list)[^\n]*\]\s*\{/m,
  );
});

test("Cars Results scrollbar contract is thin, transparent, and arrowless", () => {
  assert.match(globals, /scrollbar-width:\s*thin/);
  assert.match(globals, /scrollbar-color:\s*#64748b transparent/);
  assert.match(
    globals,
    /::-webkit-scrollbar\s*\{[\s\S]*?width:\s*4px;[\s\S]*?height:\s*4px;/,
  );
  assert.match(
    globals,
    /::-webkit-scrollbar-track,[\s\S]*?::-webkit-scrollbar-corner\s*\{[\s\S]*?background:\s*transparent;/,
  );
  assert.match(
    globals,
    /::-webkit-scrollbar-thumb\s*\{[\s\S]*?background-color:\s*#64748b;/,
  );
  assert.match(
    globals,
    /::-webkit-scrollbar-button\s*\{[\s\S]*?display:\s*none;[\s\S]*?width:\s*0;[\s\S]*?height:\s*0;/,
  );
});

test("shared inner lists retain independent native scroll ownership", () => {
  assert.match(shared, /data-cars-time-list=\{kind\}/);
  assert.match(shared, /h-\[260px\] overflow-y-auto overscroll-contain/);
  assert.match(shared, /data-cars-age-list/);
  assert.match(shared, /max-h-\[320px\] overflow-y-auto overscroll-contain/);
});

test("desktop picker shells retain their dimensions and hidden overflow", () => {
  assert.match(
    results,
    /preferredWidth=\{448\}[\s\S]*?desiredHeight=\{320\}[\s\S]*?align="center"[\s\S]*?shellClassName="overflow-hidden p-3"/,
  );
  assert.match(
    results,
    /preferredWidth=\{288\}[\s\S]*?desiredHeight=\{320\}[\s\S]*?align="end"[\s\S]*?shellClassName="overflow-hidden"/,
  );
});
