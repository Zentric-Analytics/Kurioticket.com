import assert from "node:assert/strict";
import ts from "typescript";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";

export function parseSource(source: string) {
  return ts.createSourceFile("fixture.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

export function nodesWhere(root: ts.Node, predicate: (node: ts.Node) => boolean): ts.Node[] {
  const found: ts.Node[] = [];
  function visit(node: ts.Node) { if (predicate(node)) found.push(node); node.forEachChild(visit); }
  visit(root);
  return found;
}

export function namedFunction(source: string, name: string) {
  const root = parseSource(source);
  const matches = nodesWhere(root, (node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.equal(matches.length, 1, `expected one actual ${name} declaration`);
  return matches[0].getText(root);
}

export function bindingExpression(source: string, name: string) {
  const root = parseSource(source);
  const matches = nodesWhere(root, (node) => ts.isVariableDeclaration(node) && node.name.getText(root) === name) as ts.VariableDeclaration[];
  assert.equal(matches.length, 1, `expected one actual ${name} binding`);
  assert.ok(matches[0].initializer);
  return matches[0].initializer.getText(root);
}

export function evaluateExpression<T>(expression: string, scope: Record<string, unknown>): T {
  const require = createRequire(import.meta.url);
  const code = ts.transpileModule(`export const value = (${expression});`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: { value?: T } = {};
  runInNewContext(code, { ...scope, exports, require: (name: string) => { assert.equal(name, "react/jsx-runtime", "extracted expression must not introduce unrelated imports"); return require(name); } });
  return exports.value as T;
}

export function jsxOpening(source: string, tag: string) {
  const root = parseSource(source);
  return nodesWhere(root, (node) => (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(root) === tag).map((node) => node as ts.JsxOpeningElement | ts.JsxSelfClosingElement);
}

export function assertFaqBootstrap(source: string) {
  const elements = jsxOpening(source, "FaqContent");
  assert.equal(elements.length, 1);
  const props = new Map(elements[0].attributes.properties.filter(ts.isJsxAttribute).map((attribute) => [attribute.name.getText(), attribute.initializer?.getText()]));
  assert.equal(props.get("showAccountLink"), "{showAccountLink}");
  assert.equal(props.get("initialFaqItems"), "{initialFaqs.items}");
  assert.equal(props.get("initialFaqLocale"), "{initialLocale}");
}

export function assertFullWidthRateAlert(source: string) {
  const buttons = jsxOpening(source, "button");
  const control = buttons.filter((node) => node.attributes.properties.some((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText() === "role" && attribute.initializer?.getText() === '"switch"'));
  assert.equal(control.length, 1, "one rate-level accessible switch");
  const text = control[0].getText();
  for (const property of ["aria-label", "aria-checked", "aria-busy", "disabled", "onClick"]) assert.match(text, new RegExp(property));
  assert.match(text, /h-11 w-11/);
  assert.match(source, /flex min-h-11 w-full min-w-0 items-center gap-2/);
  assert.match(source, /data-cars-price-alert/);
  assert.match(source, /text-\[13px\] font-semibold leading-\[18px\]/);
  assert.doesNotMatch(source, /max-\[359px\]:text-\[10\.5px\]/, "retired compact pill must not return");
}
