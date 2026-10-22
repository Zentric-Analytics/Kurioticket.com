import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync("src/components/results/KayakSandboxEntry.tsx", "utf8");
const compiled = ts.transpileModule(source.replace(/^import .*;\r?$/gm, "").replace("export function", "function"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText;

test("sandbox entry disappears when the server environment gate is closed", () => {
  const rendered = runInNewContext(`${compiled}\nKayakSandboxEntry({ vertical: "hotels" })`, {
    isKayakSandboxEnabled: () => false,
  });
  assert.equal(rendered, null);
});

test("normal search layouts do not inject a page-level KAYAK sandbox banner", () => {
  for (const vertical of ["flights", "hotels", "cars"]) {
    const layout = readFileSync(`src/app/${vertical}/layout.tsx`, "utf8");
    assert.doesNotMatch(layout, /KayakSandboxEntry/);
  }
});
