import assert from "node:assert/strict";
import test from "node:test";
import { requireProviderUrl, validateProviderUrl } from "./provider-url";

test("provider URL policy accepts legitimate external HTTPS destinations", () => {
  assert.equal(validateProviderUrl("https://www.delta.com/my-trips", { production: true }), "https://www.delta.com/my-trips");
});

test("provider URL policy rejects unsafe or Kurioticket-owned destinations", () => {
  for (const value of ["/dashboard/trips", "javascript:alert(1)", "data:text/html,no", "http://provider.test/manage", "https://kurioticket.com/manage", "https://accounts.kurioticket.com/manage", "not a url", "https://user:pass@provider.test/manage"]) {
    assert.equal(validateProviderUrl(value, { production: true }), null, value);
  }
  assert.throws(() => requireProviderUrl("/dashboard/trips", { production: true }));
});
