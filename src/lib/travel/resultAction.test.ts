import assert from "node:assert/strict";
import test from "node:test";
import { isKayakSandboxResult, resultActionHref } from "./resultAction";

test("unified KAYAK cards use only approved sandbox provider actions", () => {
  const result = { searchPolicy: { source: "kayak-sandbox" as const, bookable: false,
    action: { kind: "provider" as const, href: "https://affiliates.kayak.com/sandbox-clickout", enabled: true as const } } };
  assert.equal(resultActionHref(result, "/flights/details/kayak"), "https://affiliates.kayak.com/sandbox-clickout");
  assert.equal(isKayakSandboxResult(result), true);
  assert.equal(resultActionHref({ searchPolicy: { ...result.searchPolicy, action: { ...result.searchPolicy.action, href: "https://evil.example/in" } } }, "/internal"), null);
});

test("first-party cards retain their internal detail action", () => {
  const result = { searchPolicy: { source: "duffel" as const, bookable: true,
    action: { kind: "internal-detail" as const, href: "/flights/details/one", enabled: true as const } } };
  assert.equal(resultActionHref(result, "/flights/details/one"), "/flights/details/one");
  assert.equal(isKayakSandboxResult(result), false);
});
