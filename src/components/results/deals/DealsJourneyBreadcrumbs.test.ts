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
  assert.match(
    source,
    /<li[\s\S]*aria-current=\{item\.status === "current" \? "page"/,
  );
  assert.match(source, /ChevronRight/);
  assert.match(source, /rtl:rotate-180/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /whitespace-nowrap/);
  assert.doesNotMatch(source, /className="[^"]*(?:sm:)?hidden/);
  assert.doesNotMatch(source, /rounded-2xl|shadow|bg-white|border-slate/);
});

test("only model-approved completed and current Details items render as links", async () => {
  const source = await readFile(
    new URL("./DealsJourneyBreadcrumbs.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /item\.href \? \(/);
  assert.match(source, /<Link[\s\S]*href=\{item\.href\}/);
  assert.match(source, /item\.accessibleLabelKey/);
  assert.match(source, /item\.href \? "focus-ring cursor-pointer hover:text/);
  assert.match(source, /hover:underline/);
  assert.match(
    source,
    /status === "completed"[\s\S]*focus-ring cursor-pointer/,
  );
  assert.match(source, /cursor-default/);
});

test("current Details links preserve current semantics and accessible back actions", async () => {
  const [component, model, translations] = await Promise.all([
    readFile(new URL("./DealsJourneyBreadcrumbs.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../../../lib/deals/dealsJourneyBreadcrumbs.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../../lib/i18n/en.ts", import.meta.url), "utf8"),
  ]);
  assert.match(model, /status === "completed" \|\| details/);
  assert.match(
    model,
    /buildDealsJourneyUrl\(resultsStage\[step\.id\], search\)/,
  );
  assert.match(component, /aria-current=.*item\.status === "current"/s);
  assert.match(translations, /Hotel details — back to hotel results/);
  assert.match(translations, /Flight details — back to flight results/);
  assert.match(translations, /Car details — back to car results/);
});
