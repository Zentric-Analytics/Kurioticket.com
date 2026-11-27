import assert from "node:assert/strict";
import test from "node:test";
import { confirmedOperatorNetwork } from "./operatorCrawlerNetwork";

test("operator networks require a supported declaration and a matching source address", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ prefixes: [
    { ipv4Prefix: "192.0.2.16/28" }, { ipv6Prefix: "2001:db8:1234::/48" },
  ] }));
  assert.equal(await confirmedOperatorNetwork("GPTBOT", null), false);
  assert.equal(await confirmedOperatorNetwork("NEWBOT", "192.0.2.20"), false);
  assert.equal(fetch.mock.callCount(), 0);
  assert.deepEqual(await Promise.all(["192.0.2.15", "192.0.2.16", "192.0.2.31", "192.0.2.32",
    "2001:db8:1234::2"].map(ip => confirmedOperatorNetwork("GPTBOT", ip))), [false, true, true, false, true]);
  assert.equal(fetch.mock.callCount(), 1);
});

test("invalid feed or unavailable provider cannot confirm a declaration", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ prefixes: [{ ipv4Prefix: "0.0.0.0/0" }] }));
  assert.equal(await confirmedOperatorNetwork("PERPLEXITYBOT", "192.0.2.20"), false);
  fetch.mock.mockImplementation(async () => { throw new Error("offline"); });
  assert.equal(await confirmedOperatorNetwork("PERPLEXITY_USER", "192.0.2.20"), false);
});

test("shared Google crawler ranges cannot authenticate a specific non-search product", async t => {
  const fetch = t.mock.method(globalThis, "fetch");
  for (const token of ["GOOGLEOTHER", "GOOGLE_INSPECTION_TOOL", "MEDIAPARTNERS_GOOGLE"]) {
    assert.equal(await confirmedOperatorNetwork(token, "192.0.2.20"), false);
  }
  assert.equal(fetch.mock.callCount(), 0);
});
