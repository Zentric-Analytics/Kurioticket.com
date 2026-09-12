import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { getTranslations } from "../../lib/i18n";

test("the active saved page localizes both tabs and empty states", () => {
  const page = readFileSync("src/app/saved/page.tsx", "utf8");
  const source = readFileSync("src/components/saved/SavedRecentContent.tsx", "utf8");
  assert.match(page, /<SavedRecentContent\s*\/>/);
  assert.match(source, /const \{ t \} = useLocale\(\)/);
  for (const key of ["savedTripsPageTitle", "savedTripsTabsLabel", "savedTripsTabSaved", "savedTripsTabHistory", "savedTripsClearAllRecent", "savedTripsEmptyTitle", "savedTripsEmptyDescription", "savedTripsNoRecentTitle", "savedTripsNoRecentDescription"]) {
    assert.ok(source.includes(`t.${key}`), `${key} must be rendered through the active locale`);
  }
  assert.doesNotMatch(source, /No \{tab\} travel yet|>Clear recent<|>\{value\}<|aria-label="Saved and recent travel"/);
});

test("saved and recent controls render selected-language labels for both lists and errors", () => {
  const source = readFileSync("src/components/saved/SavedRecentContent.tsx", "utf8");
  const compiled = ts.transpileModule(source.replace(/^import .*;\r?$/gm, "").replace("export function", "function"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  for (const locale of ["vi", "th", "pl", "sv", "id"]) {
  const dictionary = getTranslations(locale);
  for (const tab of ["saved", "recent"]) {
    for (const error of [false, true]) {
      const values = [tab, [{ id: "test", type: "search", label: "Test saved search", href: "/cars" }], [{ id: "search", label: "Test search", href: "/cars" }], error];
      let stateIndex = 0;
      const text: string[] = [];
      runInNewContext(`${compiled}\nSavedRecentContent()`, {
        useLocale: () => ({ t: dictionary }),
        useState: () => [values[stateIndex++], () => {}],
        useCallback: (callback: unknown) => callback,
        useEffect: () => {},
        Link: "a",
        React: { createElement: (_tag: unknown, _props: unknown, ...children: unknown[]) => {
          text.push(...children.filter((child): child is string => typeof child === "string"));
          return null;
        } },
      });
      assert.ok(text.includes(dictionary.savedTripsRepeatSearch));
      if (tab === "saved") assert.ok(!text.includes(dictionary.savedTripsRecentSearchesTitle), "saved records must not be labeled recent");
      else assert.ok(text.includes(dictionary.savedTripsRecentSearchesTitle));
      assert.ok(text.includes(tab === "saved" ? dictionary.savedTripsRemoveSavedTrip : dictionary.savedTripsRemoveRecentSearch));
      if (error) assert.ok(text.includes(dictionary["accountDashboard.trips.state.error.body"]));
      for (const english of ["Search again", "Remove", "Saved search", "Recent search", "Clear recent"]) assert.ok(!text.includes(english));
    }
  }
  }
});
