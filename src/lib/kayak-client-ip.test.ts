import assert from "node:assert/strict";
import test from "node:test";
import { getKayakClientIp } from "./kayak-client-ip";

test("Render sandbox ignores caller forwarding addresses in favor of its trusted edge", () => {
  const request = new Request("https://staging.kurioticket.com", { headers: {
    "x-forwarded-for": "192.0.2.99", "x-real-ip": "192.0.2.98", "cf-connecting-ip": "198.51.100.10",
  } });
  assert.equal(getKayakClientIp(request, true), "198.51.100.10");
});

test("Render sandbox fails closed without a single valid edge address", () => {
  for (const value of ["", "invalid", "198.51.100.10, 192.0.2.99"]) {
    const request = new Request("https://staging.kurioticket.com", { headers: {
      "x-forwarded-for": "192.0.2.99", "cf-connecting-ip": value,
    } });
    assert.equal(getKayakClientIp(request, true), "");
  }
});

test("local sandbox retains the existing development proxy behavior", () => {
  assert.equal(getKayakClientIp(new Request("http://localhost", { headers: { "x-forwarded-for": "127.0.0.1" } }), false), "127.0.0.1");
});
