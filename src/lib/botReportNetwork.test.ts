import assert from "node:assert/strict";
import test from "node:test";
import { botReportNetwork } from "./botReportNetwork";
import { automationSignal, observeBot, botAccess, botTarget } from "./botPolicy";

test("staging Render observation is reporting-only, requires reviewed ingress and never approves a spoofed crawler", async t => {
  const keys = ["RENDER", "GUEST_LIVE_RENDER_INGRESS_VERIFIED", "NEXT_PUBLIC_APP_URL", "BOT_EDGE_SECRET"] as const;
  const prior = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  t.after(() => {
    for (const key of keys) {
      const value = prior[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  process.env.RENDER = "true";
  process.env.NEXT_PUBLIC_APP_URL = "https://staging.kurioticket.com";
  process.env.BOT_EDGE_SECRET = "fixture".repeat(5);
  const headers = { "user-agent": "Googlebot", "cf-connecting-ip": "8.8.8.8", "cf-ipcountry": "US" };
  const req = new Request("https://staging.kurioticket.com/api/flights/search", { method: "POST", headers });
  delete process.env.GUEST_LIVE_RENDER_INGRESS_VERIFIED;
  assert.deepEqual(botReportNetwork(req, "staging"), {});
  process.env.GUEST_LIVE_RENDER_INGRESS_VERIFIED = "true";
  assert.deepEqual(botReportNetwork(req, "staging"), { reportedIp: "8.8.8.8", reportedCountry: "US" });
  assert.deepEqual(botReportNetwork(req, "production"), {});
  const signal = automationSignal(req);
  assert.ok(signal);
  const bot = await observeBot(req, signal);
  assert.equal(bot.ip, null);
  assert.equal(bot.verification, "DECLARED");
  assert.equal(botAccess(bot, botTarget(req)), "SEARCH_NOT_ALLOWED");
  for (const bad of [
    { "cf-connecting-ip": "10.0.0.1" },
    { "cf-connecting-ip": "2a06:98c0:3600::103" },
    { "cf-connecting-ip": "1.1.1.1, 8.8.8.8" },
    { "cf-worker": "untrusted.example" },
    { "cf-connecting-ip": "", "x-forwarded-for": "8.8.8.8" },
  ]) {
    const otherHeaders = new Headers(headers);
    for (const [name, value] of Object.entries(bad)) {
      if (typeof value === "string") otherHeaders.set(name, value);
    }
    const other = new Request(req.url, { headers: otherHeaders });
    assert.deepEqual(botReportNetwork(other, "staging"), {});
  }
  assert.deepEqual(botReportNetwork(new Request("https://other.example/", { headers }), "staging"), {});
});
