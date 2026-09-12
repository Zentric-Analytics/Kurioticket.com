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

test("enabled travel entry links select their matching sandbox search type", () => {
  for (const vertical of ["flights", "hotels", "cars"]) {
    const links: string[] = [];
    runInNewContext(`${compiled}\nKayakSandboxEntry({ vertical })`, {
      vertical, Link: "link", isKayakSandboxEnabled: () => true,
      React: { createElement: (tag: string, props: { href?: string }) => {
        if (tag === "link" && props.href) links.push(props.href);
        return null;
      } },
    });
    assert.deepEqual(links, [`/sandbox/kayak?vertical=${vertical}`]);
    const layout = readFileSync(`src/app/${vertical}/layout.tsx`, "utf8");
    assert.ok(layout.includes(`<KayakSandboxEntry vertical="${vertical}" />`));
  }
});
