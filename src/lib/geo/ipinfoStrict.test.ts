import assert from "node:assert/strict";
import test from "node:test";

import { extractVisitorIp, publicVisitorIp, resolveIpinfoLiteCountryContext } from "./ipinfo";
import { createGuestCountryResolver } from "../guestLiveCountry";

test("search country lookup never falls back to the origin server's /me location", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.IPINFO_TOKEN;
  const calls: string[] = [];
  process.env.IPINFO_TOKEN = "integration-test-only";
  globalThis.fetch = async (input) => {
    const uri = String(input);
    calls.push(uri);
    if (uri.includes("/me?")) return Response.json({ country_code: "US", country: "United States" });
    return new Response(null, { status: 403 });
  };
  try {
    const strict = await resolveIpinfoLiteCountryContext("8.8.8.8", { allowMeFallback: false });
    assert.equal(strict, null, "403 cannot become the server's country");
    assert.equal(calls.length, 1);
    assert.match(calls[0], /\/8\.8\.8\.8\?/);
    assert.ok(!calls[0].includes("/me?"));

    calls.length = 0;
    const ordinary = await resolveIpinfoLiteCountryContext("8.8.8.8");
    assert.equal(ordinary?.countryCode, "US", "preserve existing /api/location fallback behavior");
    assert.equal(calls.length, 2, "existing /me fallback is unchanged for non-search callers");
    assert.match(calls[1], /\/me\?/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.IPINFO_TOKEN;
    else process.env.IPINFO_TOKEN = originalToken;
  }
});

const nonPublicAddresses = [
  "0.0.0.0", "0.255.255.255", "10.0.0.1", "100.64.0.0", "100.127.255.255", "127.0.0.1",
  "169.254.1.2", "172.16.0.0", "172.31.255.255", "192.0.0.8", "192.0.0.170", "192.0.2.1",
  "192.88.99.2", "192.168.1.1", "198.18.0.0", "198.19.255.255", "198.51.100.1", "203.0.113.5",
  "224.0.0.1", "239.255.255.255", "240.0.0.1", "255.255.255.255",
  "::", "0:0:0:0:0:0:0:0", "::1", "0:0:0:0:0:0:0:1", "0000:0000:0000:0000:0000:0000:0000:0001",
  "::127.0.0.1", "0:0:0:0:0:0:7f00:1", "::8.8.8.8",
  "::ffff:127.0.0.1", "::FFFF:7F00:1", "0000:0000:0000:0000:0000:FFFF:7F00:0001",
  "::ffff:10.0.0.1", "0:0:0:0:0:ffff:a00:1", "::ffff:c000:201", "::ffff:224.0.0.1",
  "64:ff9b::10.0.0.1", "0064:FF9B:0000:0000:0000:0000:7F00:0001", "64:ff9b:1::808:808",
  "100::1", "0100:0000:0000:0000:0000:0000:0000:0001", "100:0:0:1::1",
  "2001::1", "2001:2::1", "2001:10::1", "2001:db8::1", "2001:0DB8:0:0:0:0:0:1",
  "2002:7f00:1::1", "3fff::1", "3FFF:0FFF:FFFF:FFFF:FFFF:FFFF:FFFF:FFFF", "5f00::1",
  "fc00::1", "FDFF:FFFF:FFFF:FFFF:FFFF:FFFF:FFFF:FFFF", "fe80::1", "fe90::1", "febf:ffff::1",
  "fec0::1", "feff:ffff::1", "ff02::1", "FF0E:0000:0000:0000:0000:0000:0000:0001",
];

test("public-IP classification rejects equivalent nonpublic IPv4 and IPv6 forms", () => {
  for (const address of nonPublicAddresses) {
    assert.equal(publicVisitorIp(address), null, address);
    assert.equal(publicVisitorIp(address.includes(":") ? "[" + address + "]:443" : address + ":443"), null, "with port: " + address);
  }
  for (const address of [null, "", "unknown", "not-an-ip", "127.000.000.001", "8.8.8.8/32",
    "2001:4860::8888/64", "2001:4860::8888%eth0", "[2001:4860::8888%eth0]:443", "8.8.8.8, 1.1.1.1"]) {
    assert.equal(publicVisitorIp(address), null, String(address));
  }
});

test("public addresses and port normalization retain legitimate country lookup inputs", () => {
  for (const address of ["8.8.8.8", "1.1.1.1", "100.63.255.255", "100.128.0.0", "172.15.255.255", "172.32.0.0",
    "192.0.0.9", "192.0.0.10", "192.0.1.1", "198.17.255.255", "198.20.0.0",
    "2001:4860:4860::8888", "2001:0486:0000:0000:0000:0000:0000:0001", "2606:4700:4700::1111",
    "2A02:6B8::1", "2404:6800:4003:c00::8b", "2001:1::1", "2001:3::1", "2001:4:112::1",
    "2001:20::1", "2001:30::1", "64:ff9b::8.8.8.8", "64:ff9b::808:808",
    "::ffff:8.8.8.8", "::FFFF:0808:0808", "0000:0000:0000:0000:0000:FFFF:0808:0808"]) {
    assert.equal(publicVisitorIp(address), address, address);
    const withPort = address.includes(":") ? "[" + address + "]:443" : address + ":443";
    assert.equal(publicVisitorIp(withPort), address, withPort);
    assert.equal(publicVisitorIp(' "' + withPort + '" '), address, "quoted header value");
  }
});

test("forwarded address selection skips nonpublic IPv6 variants instead of trusting their text form", () => {
  const headers = new Headers({
    "cf-connecting-ip": "0:0:0:0:0:0:0:1",
    "x-real-ip": "2001:0db8::1",
    "x-forwarded-for": "::ffff:7f00:1, fe90::1, 2001:4860:4860::8888",
  });
  assert.equal(extractVisitorIp(headers), "2001:4860:4860::8888");
  headers.delete("x-forwarded-for");
  assert.equal(extractVisitorIp(headers), null);
});

test("verified guest-country lookup rejects nonpublic addresses before invoking IPinfo", async () => {
  const keys = ["GUEST_LIVE_COUNTRY_ENABLED", "GUEST_LIVE_RENDER_INGRESS_VERIFIED", "RENDER", "NEXT_PUBLIC_APP_URL", "BOT_EDGE_SECRET"] as const;
  const previous = keys.map(key => process.env[key]);
  try {
    process.env.GUEST_LIVE_COUNTRY_ENABLED = "true";
    process.env.GUEST_LIVE_RENDER_INGRESS_VERIFIED = "true";
    process.env.RENDER = "true";
    process.env.NEXT_PUBLIC_APP_URL = "https://staging.example.invalid";
    delete process.env.BOT_EDGE_SECRET;
    const lookedUp: string[] = [];
    const resolve = createGuestCountryResolver(async ip => { lookedUp.push(ip); return "NG"; });
    const request = (ip: string) => new Request("http://localhost:10000/api/identity/online-presence", {
      headers: { "cf-connecting-ip": ip, "cf-ipcountry": "US", "x-forwarded-for": "8.8.8.8" },
    });
    for (const address of nonPublicAddresses) {
      assert.equal(await resolve(request(address), "staging"), null, address);
    }
    assert.deepEqual(lookedUp, [], "rejected addresses never reach the external lookup");
    for (const address of ["8.8.8.8", "2001:4860:4860::8888", "::ffff:8.8.8.8"]) {
      assert.equal(await resolve(request(address), "staging"), "NG");
    }
    assert.deepEqual(lookedUp, ["8.8.8.8", "2001:4860:4860::8888", "::ffff:8.8.8.8"]);
    assert.equal(await resolve(request("fe90::1"), "staging"), null, "cached valid countries cannot fill invalid observations");
    assert.equal(lookedUp.length, 3);
  } finally {
    keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
  }
});
