import assert from "node:assert/strict";
import test from "node:test";
import { edgeRequest } from "./bot-edge.mjs";

const env = { BOT_EDGE_HOST: "staging.kurioticket.com", BOT_EDGE_SECRET: "fixture".repeat(5) };
test("Worker overwrites spoofed observations with Cloudflare metadata and preserves the request", async () => {
  const request = new Request("https://staging.kurioticket.com/api/flights/search", {
    method: "POST", body: "example", headers: {
      "CF-Connecting-IP": "192.0.2.42", "CF-Ray": "1234567890abcdef-LHR",
      "X-Kurioticket-Edge-Auth": "forged", "X-Kurioticket-Edge-IP": "1.1.1.1",
      "X-Kurioticket-Edge-ASN": "1", "X-Kurioticket-Edge-Bot": "automated",
      "X-Kurioticket-Edge-Arbitrary": "forged", "CF-IPCountry": "US",
      "Authorization": "Bearer fixture", "User-Agent": "MJ12bot",
    },
  });
  Object.defineProperty(request, "cf", { value: { country: "GB", asn: 64512, asOrganization: "Example Network" } });
  const forwarded = edgeRequest(request, env);
  assert.equal(forwarded.url, request.url);
  assert.equal(forwarded.method, "POST");
  assert.equal(forwarded.redirect, "manual");
  assert.equal(forwarded.headers.get("x-kurioticket-edge-auth"), env.BOT_EDGE_SECRET);
  assert.equal(forwarded.headers.get("x-kurioticket-edge-ip"), "192.0.2.42");
  assert.equal(forwarded.headers.get("x-kurioticket-edge-country"), "GB");
  assert.equal(forwarded.headers.get("x-kurioticket-edge-asn"), "64512");
  assert.equal(forwarded.headers.get("x-kurioticket-edge-organization"), "Example%20Network");
  assert.equal(forwarded.headers.get("x-kurioticket-edge-bot"), null);
  assert.equal(forwarded.headers.get("x-kurioticket-edge-arbitrary"), null);
  assert.equal(forwarded.headers.get("Authorization"), "Bearer fixture");
  assert.equal(await forwarded.text(), "example");
});
test("Missing observations do not use inbound internal headers; only configured HTTPS host is forwarded", () => {
  const request = new Request("https://staging.kurioticket.com/", { headers: {
    "x-kurioticket-edge-country": "US", "x-kurioticket-edge-organization": "forged",
  } });
  const forwarded = edgeRequest(request, env);
  assert.equal(forwarded.headers.get("x-kurioticket-edge-country"), null);
  assert.equal(forwarded.headers.get("x-kurioticket-edge-organization"), null);
  assert.equal(edgeRequest(new Request("https://other.example/"), env), null);
  assert.equal(edgeRequest(new Request("http://staging.kurioticket.com/"), env), null);
  assert.equal(edgeRequest(request, { ...env, BOT_EDGE_SECRET: "" }), null);
});
