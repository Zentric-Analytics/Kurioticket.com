import assert from "node:assert/strict";
import test from "node:test";
import { buildAdminSearchProviderOptions } from "./adminSearchProviderOptions";

test("provider filter includes configured integrations, owned catalogue, and All providers", () => {
  const options = buildAdminSearchProviderOptions([
    { provider: "Duffel" },
    { provider: "KAYAK sandbox" },
    { provider: "duffel" },
  ]);
  assert.deepEqual(options, [
    { value: "", label: "All providers" },
    { value: "Duffel", label: "Duffel" },
    { value: "KAYAK sandbox", label: "KAYAK sandbox" },
    { value: "Kurioticket static catalogue", label: "Kurioticket static catalogue" },
  ]);
});

test("historical deep-linked provider remains selectable without injecting unsafe names", () => {
  const options = buildAdminSearchProviderOptions([{ provider: "Duffel" }], "Legacy supplier");
  assert.ok(options.some(option => option.value === "Legacy supplier"));
  assert.ok(!buildAdminSearchProviderOptions([], "unsafe\nprovider").some(option => option.value === "unsafe\nprovider"));
});

test("case-insensitive historical provider links preserve exact value with canonical display", () => {
  const options = buildAdminSearchProviderOptions([{ provider: "Duffel" }], "duffel");
  assert.deepEqual(options.find(option => option.label === "Duffel"), { value: "duffel", label: "Duffel" });
  assert.equal(options.filter(option => option.label.toLowerCase() === "duffel").length, 1);
});

test("whitespace in historical provider link preserves exact selection", () => {
  const options = buildAdminSearchProviderOptions([{ provider: "Duffel" }], "  duffel  ");
  assert.deepEqual(options.find(option => option.label === "Duffel"), { value: "  duffel  ", label: "Duffel" });
});

test("unknown historical provider keeps exact query value with trimmed label", () => {
  const options = buildAdminSearchProviderOptions([{ provider: "Duffel" }], "  Old supplier  ");
  assert.deepEqual(options.find(option => option.label === "Old supplier"), { value: "  Old supplier  ", label: "Old supplier" });
});
