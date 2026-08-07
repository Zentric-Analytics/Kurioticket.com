import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("breadcrumb markup is semantic, accessible, compact, and mobile complete", async () => {
  const source = await readFile(
    new URL("./DealsJourneyBreadcrumbs.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /<nav/);
  assert.match(
    source,
    /aria-label=\{t\("deals\.breadcrumb\.navigationLabel"\)\}/,
  );
  assert.match(source, /<ol/);
  assert.match(source, /aria-current=\{item\.status === "current" \? "page"/);
  assert.match(source, /ChevronRight/);
  assert.match(source, /rtl:rotate-180/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /whitespace-nowrap/);
  assert.doesNotMatch(source, /className="[^"]*(?:sm:)?hidden/);
  assert.doesNotMatch(source, /rounded-2xl|shadow|bg-white|border-slate/);
});

test("only model-approved completed items render as links", async () => {
  const source = await readFile(
    new URL("./DealsJourneyBreadcrumbs.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /item\.href \? \(/);
  assert.match(source, /<Link[\s\S]*href=\{item\.href\}/);
  assert.match(source, /item\.accessibleLabelKey/);
});
