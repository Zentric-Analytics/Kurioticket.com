import assert from "node:assert/strict";
import test from "node:test";
import { activityNetworkEvidence, botReportVerification } from "./adminBotNetworkEvidence";
import { confirmedOperatorNetwork } from "./operatorCrawlerNetwork";
import { matchReportedSearchCrawlerAddress } from "./verifiedSearchCrawler";
import { automationSignal, observeBot, botAccess, botTarget } from "./botPolicy";

const timestamp = new Date("2026-11-27T13:18:06Z");
const identity = {
  name: "BINGBOT", group: "SEARCH_ENGINE", verification: "DECLARED", requests: BigInt(1), lastSeen: timestamp,
};
const request = {
  timestamp, declaredName: "BINGBOT", verification: "DECLARED", ip: null,
  reportedIp: "52.167.144.161", reportedNetworkMatch: null, renderLogIp: null, renderLogCorroboration: null,
};

test("directory verification is binary, synchronous and based only on matching recorded identity", t => {
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("summary must not look up networks"); });
  for (const verification of ["DECLARED", "SUSPICIOUS", "UNVERIFIED", "UNKNOWN"]) {
    assert.equal(botReportVerification({ ...identity, verification }), "Unverified");
  }
  assert.equal(botReportVerification(identity, request), "Unverified");
  const verified = { ...request, verification: "VERIFIED" };
  assert.equal(botReportVerification(identity, verified), "Verified");
  assert.equal(botReportVerification(identity, { ...verified, timestamp: new Date(0) }), "Unverified");
  assert.equal(botReportVerification(identity, { ...verified, declaredName: "OTHER" }), "Unverified");
  assert.equal(botReportVerification({ ...identity, verification: "SUSPICIOUS" }, verified), "Unverified");
  assert.equal(botReportVerification({ ...identity, group: "UNKNOWN" }, verified), "Unverified");
  assert.equal(botReportVerification({ ...identity, name: null, verification: "VERIFIED" }), "Unverified");
  assert.equal(botReportVerification({ ...identity, verification: "VERIFIED" }, request), "Unverified");
  assert.equal(botReportVerification({ ...identity, verification: "VERIFIED" }), "Verified");
  assert.equal(fetch.mock.callCount(), 0);
});

test("the per-request network evidence retains the report-only check", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async (url: string) => {
    assert.equal(url, "https://www.bing.com/toolbox/bingbot.json");
    return Response.json({ prefixes: [{ ipv4Prefix: "52.167.144.0/24" }] });
  });
  const evidence = await activityNetworkEvidence(request);
  assert.equal(evidence?.label, "Crawler network matched");
  assert.match(evidence?.detail ?? "", /Reported IP/);
  assert.equal(botReportVerification(identity, request), "Unverified");
  assert.equal(await activityNetworkEvidence({ ...request, reportedIp: "127.0.0.1" }), null);
  assert.equal(fetch.mock.callCount(), 1);
});

test("stored evidence is not carried across conflicting IPs or historical and live requests", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ prefixes: [{ ipv4Prefix: "52.167.144.0/24" }] }));
  const matched = { ...request, reportedNetworkMatch: "OFFICIAL_CRAWLER_RANGE_MATCH" };
  assert.equal((await activityNetworkEvidence(matched))?.label, "Crawler network matched");
  assert.equal(await activityNetworkEvidence({ ...matched, renderLogIp: "8.8.8.8" }, async () => null), null);
  assert.match((await activityNetworkEvidence({ ...matched, renderLogIp: "52.167.144.161", renderLogCorroboration: "FORWARD_CONFIRMED_DNS" }))?.detail ?? "", /Render log IP/);
  assert.equal(await activityNetworkEvidence({ ...matched, verification: "SUSPICIOUS" }), null);
  assert.equal(botReportVerification({ ...identity, verification: "VERIFIED" }), "Verified");
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
  assert.equal(await activityNetworkEvidence({ ...request, declaredName: "GPTBOT" }), null);
  assert.equal(botReportVerification({ ...identity, name: "GPTBOT" }, { ...request, declaredName: "GPTBOT" }), "Unverified");
  assert.equal(fetch.mock.callCount(), 1);
});

test("report reuses existing DNS matcher for a saved Applebot address; mismatches remain unverified", async () => {
  const row = { ...request, declaredName: "APPLEBOT", reportedIp: "17.58.96.1" };
  const match = async (name: string | null, ip: string | null) => matchReportedSearchCrawlerAddress(name, ip, {
    reverseIp: async () => ["17-58-96-1.applebot.apple.com"],
    forwardHost: async () => [{ address: "17.58.96.1" }],
  });
  const evidence = await activityNetworkEvidence(row, match);
  assert.equal(evidence?.label, "Crawler network matched");
  assert.match(evidence?.detail ?? "", /Forward-confirmed reverse DNS/);
  assert.equal(await activityNetworkEvidence({ ...row, reportedIp: "17.58.96.2" }, match), null);
});
