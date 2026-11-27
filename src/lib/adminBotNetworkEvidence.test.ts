import assert from "node:assert/strict";
import test from "node:test";
import { activityNetworkEvidence, botReportVerification } from "./adminBotNetworkEvidence";
import { confirmedOperatorNetwork } from "./operatorCrawlerNetwork";
import { automationSignal, observeBot, botAccess, botTarget } from "./botPolicy";

const timestamp = new Date("2026-11-27T13:18:06Z");
const identity = {
  name: "BINGBOT", group: "SEARCH_ENGINE", verification: "DECLARED", requests: BigInt(1), lastSeen: timestamp,
};
const request = {
  timestamp, declaredName: "BINGBOT", verification: "DECLARED", ip: null,
  reportedIp: "52.167.144.161", reportedNetworkMatch: null, renderLogIp: null, renderLogCorroboration: null,
};

test("existing reported addresses are checked on report reads; only the exact latest request determines directory status", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async (url: string) => {
    assert.equal(url, "https://www.bing.com/toolbox/bingbot.json");
    return Response.json({ prefixes: [{ ipv4Prefix: "52.167.144.0/24" }] });
  });
  const status = await botReportVerification(identity, request);
  assert.equal(status.label, "Crawler network matched");
  assert.match(status.detail ?? "", /Reported IP/);
  assert.equal((await botReportVerification(identity, { ...request, timestamp: new Date(0) })).label, "Unverified (self-declared)");
  assert.equal((await botReportVerification({ ...identity, name: "GOOGLEBOT" }, request)).label, "Unverified (self-declared)");
  assert.equal((await botReportVerification({ ...identity, group: "UNKNOWN" }, request)).label, "Unverified (self-declared)");
  assert.equal((await botReportVerification({ ...identity, verification: "SUSPICIOUS" }, request)).label, "Suspicious");
  assert.equal(await activityNetworkEvidence({ ...request, reportedIp: "127.0.0.1" }), null);
  assert.equal(fetch.mock.callCount(), 1);
});

test("stored evidence is not carried across conflicting IPs or historical and live requests", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ prefixes: [{ ipv4Prefix: "52.167.144.0/24" }] }));
  const matched = { ...request, reportedNetworkMatch: "OFFICIAL_CRAWLER_RANGE_MATCH" };
  assert.equal((await activityNetworkEvidence(matched))?.label, "Crawler network matched");
  assert.equal(await activityNetworkEvidence({ ...matched, renderLogIp: "8.8.8.8" }), null);
  assert.match((await activityNetworkEvidence({ ...matched, renderLogIp: "52.167.144.161", renderLogCorroboration: "FORWARD_CONFIRMED_DNS" }))?.detail ?? "", /Render log IP/);
  assert.equal(await activityNetworkEvidence({ ...matched, verification: "SUSPICIOUS" }), null);
  assert.equal((await botReportVerification({ ...identity, verification: "VERIFIED", requests: BigInt(0) })).label, "Verified (historical searches)");
});

test("Meta network match is report-only, not crawler authentication, and does not disclose caller IP to the feed", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async (url: string) => {
    assert.equal(url, "https://stat.ripe.net/data/announced-prefixes/data.json?resource=AS32934");
    return Response.json({ status: "ok", data: { resource: "AS32934", prefixes: [{ prefix: "57.141.24.0/24" }] } });
  });
  const meta = { ...request, declaredName: "FACEBOOKEXTERNALHIT", reportedIp: "57.141.24.114" };
  assert.equal((await activityNetworkEvidence(meta))?.label, "Meta network matched");
  assert.equal(await activityNetworkEvidence({ ...meta, reportedIp: "8.8.8.8" }), null);
  assert.equal(await confirmedOperatorNetwork("FACEBOOKEXTERNALHIT", "57.141.24.114"), false);
  assert.equal(fetch.mock.callCount(), 1);
  const req = new Request("https://staging.kurioticket.com/api/flights/search", {
    method: "POST", headers: { "User-Agent": "facebookexternalhit/1.1", "CF-Connecting-IP": "57.141.24.114", "X-Kurioticket-Edge-Auth": "forged" },
  });
  const bot = await observeBot(req, automationSignal(req)!);
  assert.equal(bot.verification, "DECLARED");
  assert.equal(bot.ip, null);
  assert.equal(botAccess(bot, botTarget(req)), "SEARCH_NOT_ALLOWED");
});

test("an unsupported identity and a failed official feed stay unverified", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  assert.equal(await activityNetworkEvidence({ ...request, declaredName: "NEWBOT" }), null);
  assert.equal((await botReportVerification({ ...identity, name: "GPTBOT" }, { ...request, declaredName: "GPTBOT" })).label, "Unverified (self-declared)");
  assert.equal(fetch.mock.callCount(), 1);
});
