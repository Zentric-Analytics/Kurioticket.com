import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("desktop Flight filters keep long range values visibly separated", async () => {
  const source = await readFile(
    new URL("./DesktopFlightFilters.tsx", import.meta.url),
    "utf8",
  );

  const priceSection = source.slice(
    source.indexOf('<SectionTitle>{t("price")}</SectionTitle>'),
    source.indexOf(
      '<OptionSection title={t("stops")}',
      source.indexOf('<SectionTitle>{t("price")}</SectionTitle>'),
    ),
  );
  assert.match(priceSection, /grid grid-cols-2 gap-4/);
  assert.match(priceSection, /tabular-nums/);
  assert.match(priceSection, /className="min-w-0 text-right"/);
  assert.doesNotMatch(priceSection, /flex justify-between/);

  assert.match(source, /presentationMode\?: "default" \| "deals-guided"/);
  assert.match(source, /presentationMode = "default"/);
  assert.match(source, /isGuidedComfortable && "text-\[13px\]"/);
});

test("facet rows reserve flexible copy space and a fixed count column", async () => {
  const source = await readFile(
    new URL("./DesktopFlightFilters.tsx", import.meta.url),
    "utf8",
  );
  const facetRow = source.slice(source.indexOf("function FacetRow"));

  assert.match(facetRow, /flex min-w-0 flex-1 items-start/);
  assert.match(facetRow, /className="min-w-0 flex-1"/);
  assert.match(facetRow, /block break-words text-\[12px\]/);
  assert.match(facetRow, /className="shrink-0 text-\[12px\]/);
  assert.doesNotMatch(facetRow, /block truncate/);
});

test("alternate time mode control remains full width with comfortable guided sizing", async () => {
  const source = await readFile(
    new URL("./DesktopFlightFilters.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /min-h-7 w-full/);
  assert.match(source, /isGuidedComfortable && "min-h-9 text-\[13px\]"/);
  assert.match(
    source,
    /setTimeFilterMode\([\s\S]*?timeFilterMode === "takeoff"[\s\S]*?\? "landing"[\s\S]*?: "takeoff"[\s\S]*?\)/,
  );
});
