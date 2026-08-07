import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const readComponent = () =>
  readFile(new URL("./DealsJourneyBreadcrumbs.tsx", import.meta.url), "utf8");

test("breadcrumb markup is semantic, accessible, compact, RTL-aware, and scrollable", async () => {
  const source = await readComponent();
  assert.match(source, /<nav/);
  assert.match(
    source,
    /aria-label=\{t\("deals\.breadcrumb\.navigationLabel"\)\}/,
  );
  assert.match(source, /<ol/);
  assert.match(source, /<li[\s\S]*aria-current=\{item\.current \? "page"/);
  assert.match(source, /ChevronRight/);
  assert.match(source, /rtl:rotate-180/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /whitespace-nowrap/);
  assert.doesNotMatch(source, /rounded-2xl|shadow|bg-white|border-slate/);
});

test("only ancestor crumbs link and the current crumb uses non-link styling", async () => {
  const source = await readComponent();
  assert.match(source, /item\.href \? \(/);
  assert.match(source, /<Link[\s\S]*href=\{item\.href\}/);
  assert.match(
    source,
    /item\.current[\s\S]*cursor-default font-semibold text-slate-950/,
  );
  assert.match(source, /focus-ring cursor-pointer font-medium text-slate-700/);
  assert.match(source, /hover:text-\[#004BB8\]/);
  assert.match(source, /hover:underline/);
});

test("product icons represent products and CheckCircle2 is reserved for Complete", async () => {
  const source = await readComponent();
  assert.match(source, /hotel: BedDouble, flight: Plane, car: Car/);
  assert.match(source, /item\.id === "complete"[\s\S]*\? CheckCircle2/);
  assert.doesNotMatch(source, /\bCheck\b/);
  assert.doesNotMatch(source, /status === "completed"/);
});

test("Details has product context without becoming a back action", async () => {
  const [component, model, translations] = await Promise.all([
    readComponent(),
    readFile(
      new URL("../../../lib/deals/dealsJourneyBreadcrumbs.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../../lib/i18n/en.ts", import.meta.url), "utf8"),
  ]);
  assert.match(model, /id: `\$\{currentProduct\}-details`/);
  assert.match(
    model,
    /accessibleLabelKey: detailsAccessibleLabel\[currentProduct\]/,
  );
  assert.match(component, /aria-current=\{item\.current \? "page"/);
  assert.match(translations, /"Hotel details"/);
  assert.doesNotMatch(translations, /details — back to/);
});
