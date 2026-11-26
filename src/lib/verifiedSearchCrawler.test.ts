import assert from "node:assert/strict";
import test from "node:test";
import { verifySearchCrawler } from "./verifiedSearchCrawler";

const flight = (userAgent: string) => new Request("https://staging.kurioticket.com/api/flights/search", {
  method: "POST", headers: { "user-agent": userAgent },
});
const googleAgent = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const bingAgent = "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)";
const reverseForward = (ip: string, host: string, forwardIp = ip) => ({
  clientIp: () => ip,
  reverseIp: async () => [host],
  forwardHost: async () => [{ address: forwardIp }],
});

test("verified Googlebot requires matching forward-confirmed reverse DNS, not User-Agent alone", async () => {
  assert.equal(await verifySearchCrawler(flight(googleAgent),
    reverseForward("66.249.66.1", "crawl-66-249-66-1.googlebot.com")), "GOOGLEBOT");
  assert.equal(await verifySearchCrawler(flight(googleAgent),
    reverseForward("35.247.243.240", "geo-crawl-35-247-243-240.geo.googlebot.com")), "GOOGLEBOT");
  assert.equal(await verifySearchCrawler(flight(googleAgent),
    reverseForward("203.0.113.11", "crawl-66-249-66-1.googlebot.com", "66.249.66.1")), null);
  assert.equal(await verifySearchCrawler(flight(googleAgent),
    reverseForward("203.0.113.11", "googlebot.com.attacker.example")), null);
  assert.equal(await verifySearchCrawler(flight(googleAgent),
    reverseForward("203.0.113.11", "my.googleusercontent.com")), null);
  assert.equal(await verifySearchCrawler(flight(googleAgent),
    reverseForward("203.0.113.11", "crawl-66-249-66-1.googlebot.com.evil.com")), null);
});

test("Bingbot requires forward-confirmed reverse DNS in search.msn.com", async () => {
  assert.equal(await verifySearchCrawler(flight(bingAgent),
    reverseForward("157.55.39.1", "msnbot-157-55-39-1.search.msn.com")), "BINGBOT");
  assert.equal(await verifySearchCrawler(flight(bingAgent),
    reverseForward("157.55.39.1", "msnbot-157-55-39-1.search.msn.com", "203.0.113.11")), null);
  assert.equal(await verifySearchCrawler(flight(bingAgent),
    reverseForward("157.55.39.1", "search.msn.com.fake.org")), null);
});

test("ordinary browser and native requests incur no DNS lookups and retain customer behavior", async () => {
  let touched = false;
  const spy = {
    clientIp: () => { touched = true; return "66.249.66.1"; },
    reverseIp: async () => { touched = true; return []; },
    forwardHost: async () => { touched = true; return []; },
  };
  for (const userAgent of [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/157.0",
    "KurioticketPreview/62 CFNetwork",
    "okhttp/4.12.0",
    "BotReporter/1.0",
    "notgooglebot/1.0",
  ]) {
    assert.equal(await verifySearchCrawler(flight(userAgent), spy), null);
  }
  assert.equal(touched, false, "No DNS, no network cost for ordinary customers");
});

test("equivalent compressed expanded and IPv4-mapped IPv6 representations verify the same crawler", async () => {
  assert.equal(await verifySearchCrawler(flight(googleAgent),
    reverseForward("2001:4860:4801:0012:0000:0000:0000:000a",
      "crawl-2001-4860-4801-12--a.googlebot.com", "2001:4860:4801:12::a")), "GOOGLEBOT");
  assert.equal(await verifySearchCrawler(flight(bingAgent),
    reverseForward("::ffff:192.0.2.1",
      "msnbot-192-0-2-1.search.msn.com", "::ffff:c000:201")), "BINGBOT");
  assert.equal(await verifySearchCrawler(flight(googleAgent),
    reverseForward("2001:4860:4801:12::a",
      "crawl-2001-4860-4801-12--a.googlebot.com", "2001:4860:4801:12::b")), null);
});

test("invalid origin IP, DNS outage and unverified hostname cannot block people", async () => {
  for (const ip of ["", "not-an-ip", "private", "127.0.0.1.bad"]) {
    assert.equal(await verifySearchCrawler(flight(googleAgent), reverseForward(ip, "crawl-66-249-66-1.googlebot.com")), null);
  }
  const outage = reverseForward("66.249.66.1", "crawl-66-249-66-1.googlebot.com");
  assert.equal(await verifySearchCrawler(flight(googleAgent), {
    ...outage, reverseIp: async () => { throw new Error("DNS unavailable"); },
  }), null);
});

test("Applebot, YandexBot, Baiduspider and Slurp require forward-confirmed official hostnames", async () => {
  const fixtures = [
    ["Applebot", "APPLEBOT", "17-58-96-1.applebot.apple.com"],
    ["YandexBot", "YANDEXBOT", "spider-5-255-253-1.yandex.com"],
    ["Baiduspider", "BAIDUSPIDER", "baiduspider-123-125-71-1.crawl.baidu.com"],
    ["Slurp", "SLURP", "b100.crawl.yahoo.net"],
  ];
  for (const [agent, identity, host] of fixtures) {
    assert.equal(await verifySearchCrawler(flight(agent), reverseForward("192.0.2.1", host)), identity);
    assert.equal(await verifySearchCrawler(flight(agent), reverseForward("192.0.2.1", host + ".example.net")), null);
    assert.equal(await verifySearchCrawler(flight(agent), reverseForward("192.0.2.1", host, "192.0.2.2")), null);
  }
});

test("DuckDuckBot uses the official published addresses", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) => {
    assert.equal(url, "https://duckduckgo.com/duckduckbot.json");
    return Response.json({ prefixes: [{ ipv4Prefix: "192.0.2.1/32" }, { ipv6Prefix: "2001:db8::1/128" }] });
  });
  assert.equal(await verifySearchCrawler(flight("DuckDuckBot"), reverseForward("192.0.2.1", "")), "DUCKDUCKBOT");
  assert.equal(await verifySearchCrawler(flight("DuckDuckBot"), reverseForward("2001:db8::1", "")), "DUCKDUCKBOT");
  assert.equal(await verifySearchCrawler(flight("DuckDuckBot"), reverseForward("192.0.2.2", "")), null);
});
