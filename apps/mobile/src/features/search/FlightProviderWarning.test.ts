import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { URL as NodeURL } from "node:url";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

const rootRequire = createRequire(new NodeURL("../../../../../package.json", import.meta.url));
const React = rootRequire("react") as typeof import("react");
const { renderToString } = rootRequire("react-dom/server") as { renderToString: (element: unknown) => string };
const source = readFileSync(new NodeURL("./FlightProviderWarning.tsx", import.meta.url), "utf8");
const exported: Record<string, unknown> = {};
runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
  exports: exported,
  require: (name: string) => {
    if (name === "react/jsx-runtime") return rootRequire(name);
    assert.equal(name, "react-native");
    return { Text: ({ children, accessibilityRole }: { children: string; accessibilityRole: string }) => React.createElement("p", { role: accessibilityRole }, children) };
  },
});
const Warning = exported.FlightProviderWarning as (props: { message: string }) => ReturnType<typeof React.createElement>;

test("a provider warning is announced while successful offers remain visible", () => {
  const html = renderToString(React.createElement("section", null,
    React.createElement(Warning, { message: "Flight results are temporarily unavailable. Please try again." }),
    React.createElement("article", { "data-provider": "Duffel" }, "Available flight")));
  assert.match(html, /role="alert"/);
  assert.match(html, /Flight results are temporarily unavailable/);
  assert.match(html, /data-provider="Duffel">Available flight/);
});

test("successful searches do not fabricate a warning", () => {
  for (const message of ["", "   "]) assert.equal(renderToString(React.createElement(Warning, { message })), "");
});

test("the flight result intro renders its warning outside the hotel-only intro", () => {
  const screen = readFileSync(new NodeURL("./ApprovedResultsScreen.tsx", import.meta.url), "utf8");
  const flightIntro = screen.slice(screen.indexOf('style={[s0.flightResultsIntro'), screen.indexOf('<FlightResultsSummaryRow count={sorted.length}'));
  assert.match(flightIntro, /<FlightProviderWarning message=\{message\}/);
});
