import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { getTranslations } from "../../lib/i18n";

const source = readFileSync(new URL("./HotelResultsClient.tsx", import.meta.url), "utf8");
const parsed = ts.createSourceFile("HotelResultsClient.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const control = parsed.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "PriceFilterControl");
assert.ok(control, "test the actual price control, not a copied implementation");
const compiled = ts.transpileModule(control.getText(parsed), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText;

test("hotel price inputs and sliders render localized labels and preserve numeric updates", () => {
  for (const locale of ["th", "vi", "pl", "sv", "id"]) {
    const dictionary = getTranslations(locale);
    for (const stayNights of [1, 5]) {
      const text: string[] = [];
      const inputs: Record<string, unknown>[] = [];
      const updates: number[] = [];
      runInNewContext(`${compiled}\nPriceFilterControl(props)`, {
        useLocale: () => ({ t: dictionary, locale }),
        enTranslations: getTranslations("en"),
        cn: (...values: string[]) => values.join(" "),
        props: { stayNights, minPrice: 50, maxPrice: 500, resultMaxPrice: 1000,
          setMinPrice: (value: number) => updates.push(value), setMaxPrice: (value: number) => updates.push(value),
          formatPrice: (value: number) => `$${value}`, filterRangeClass: "range" },
        React: { createElement: (tag: string, props: Record<string, unknown> | null, ...children: unknown[]) => {
          if (tag === "input") inputs.push(props!);
          text.push(...children.filter((child): child is string => typeof child === "string"));
          return null;
        } },
      });
      assert.equal(inputs.length, 4);
      assert.ok(text.includes(dictionary["hotelResults.estimatedStayTotal"]));
      assert.ok(text.includes(dictionary[stayNights === 1 ? "deals.results.night" : "deals.results.nights"]));
      assert.ok(text.includes(dictionary.from));
      assert.ok(text.includes(dictionary["hotelResults.totalUpTo"]));
      for (const [index, input] of inputs.entries()) {
        const label = `${dictionary["hotelResults.estimatedStayTotal"]}: ${index % 2 === 0 ? dictionary.from : dictionary["hotelResults.totalUpTo"]}`;
        assert.equal(input["aria-label"], label);
        assert.equal(input.step, 25);
        (input.onChange as (event: { target: { value: string } }) => void)({ target: { value: "125" } });
      }
      assert.deepEqual(updates, [125, 125, 125, 125]);
      assert.equal(inputs[2]["aria-valuetext"], "$50");
      assert.equal(inputs[3]["aria-valuetext"], "$500");
      assert.ok(!text.includes("Minimum") && !text.includes("Maximum"));
    }
  }
});

test("hotel star filters use the active locale in compact, full, and accessible headings", () => {
  assert.equal((source.match(/t\("hotelResults.starRating"\)/g) ?? []).length, 3);
  assert.doesNotMatch(source, /title(?:=|:)\s*"Hotel class"|>Hotel class</);
});

test("mobile filter completion localizes every state and formats its result count", () => {
  assert.match(source, /filterApplying \? t\("updatingResults"\) : sortedVisibleHotels.length === 0 \? t\("hotelResults.noStaysMatchFiltersTitle"\)/);
  assert.match(source, /t\("deals.results.package.view.hotel"\)[\s\S]*new Intl.NumberFormat\(locale\).format\(sortedVisibleHotels.length\)/);
  assert.doesNotMatch(source, /"Updating results…"|"No matching stays"|`View all \$\{/);
  for (const locale of ["th", "vi", "pl", "sv", "id"]) {
    const dictionary = getTranslations(locale);
    for (const key of ["updatingResults", "hotelResults.noStaysMatchFiltersTitle", "deals.results.package.view.hotel"]) {
      assert.ok(dictionary[key]);
      assert.notEqual(dictionary[key], getTranslations("en")[key]);
    }
  }
});
