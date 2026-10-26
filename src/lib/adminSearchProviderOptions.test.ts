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
