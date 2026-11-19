import assert from "node:assert/strict";
import test from "node:test";
import { variableInitializer } from "./sourceContract";

test("initializer extraction tolerates JSX fragments and nested braces", () => {
  const initializer = '() => { const nested = { value: "}" }; return <><main>{nested.value}</main></>; }';
  for (const eol of ["\n", "\r\n"]) {
    assert.equal(variableInitializer(`function Page() {${eol} const form = ${initializer};${eol} return <aside />; }`, "form"), initializer);
  }
});

test("missing or ambiguous declarations fail closed", () => {
  assert.throws(() => variableInitializer('const other = 1;', "form"), /found 0/);
  assert.throws(() => variableInitializer('function a(){ const form = 1; } function b(){ const form = 2; }', "form"), /found 2/);
});
