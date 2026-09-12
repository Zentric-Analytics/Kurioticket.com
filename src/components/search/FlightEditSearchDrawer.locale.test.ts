import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { getTranslations } from "../../lib/i18n";

const source = readFileSync(new URL("./FlightEditSearchDrawer.tsx", import.meta.url), "utf8");
const parsed = ts.createSourceFile("drawer.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

test("actual traveler picker strings use the active locale and localized count controls", () => {
  let strings: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(parsed) === "MobileTravelerCabinPicker") {
      const prop = node.attributes.properties.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(parsed) === "strings");
      if (prop && ts.isJsxAttribute(prop) && prop.initializer && ts.isJsxExpression(prop.initializer)) strings = prop.initializer.expression;
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert.ok(strings);
  const compiled = ts.transpileModule(`globalThis.labels = (${strings.getText(parsed)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const locale of ["ko", "th", "vi", "pl", "sv", "id", "fr"]) {
    const dictionary = getTranslations(locale);
    const context = { t: (key: string) => dictionary[key], labels: {} as Record<string, string | ((label: string) => string)> };
    runInNewContext(compiled, context);
    assert.equal(context.labels.infants, dictionary.infantsOnLap);
    assert.notEqual(context.labels.infants, "Infants");
    assert.equal(context.labels.adults, dictionary.adults);
    assert.equal(context.labels.cabinClass, dictionary.cabinClass);
    assert.equal((context.labels.increase as (label: string) => string)(dictionary.adults), dictionary["deals.increaseCountAria"].replace("{{label}}", dictionary.adults));
    assert.equal((context.labels.decrease as (label: string) => string)(dictionary.children), dictionary["deals.decreaseCountAria"].replace("{{label}}", dictionary.children));
    for (const [key, value] of Object.entries(context.labels)) if (typeof value === "string") assert.ok(value.trim(), `${locale}: ${key}`);
  }
});

test("editor fields localize labels without translating request values", () => {
  for (const [value, key] of [["round-trip", "roundTrip"], ["one-way", "oneWay"], ["multi-city", "multiCity"]]) {
    assert.ok(source.includes(`["${value}", t("${key}")]`));
  }
  assert.match(source, /onSearch\(draft\)/);
  assert.match(source, /infants=\{draft.infants\}/);
  assert.match(source, /aria-label=\{t\("swapOriginDestination"\)\}/);
  assert.doesNotMatch(source, /title="(?:Travel dates|Choose origin|Choose destination|Travelers and cabin)"/);
});
