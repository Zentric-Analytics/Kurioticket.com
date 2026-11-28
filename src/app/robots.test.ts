import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { automationSignal, botAccess, botTarget, observeBot, publicCrawlerPaths, publicCrawlerPrefixes } from "@/lib/botPolicy";
import { crawlerCatalog } from "@/lib/botRegistry";
import robots from "./robots";

test("robots retains production rules and publishes the approved staging crawl rules", async (t) => {
  const keys = ["TRAVEL_PROVIDER_MODE", "NEXT_PUBLIC_APP_URL", "NEXTAUTH_URL", "BOT_TRUST_RENDER_WORKSPACE_INGRESS"] as const;
  const previous = keys.map(key => process.env[key]);
  t.after(() => {
    keys.forEach((key, index) => {
      const value = previous[index];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  });
  process.env.TRAVEL_PROVIDER_MODE = "production";
  process.env.NEXT_PUBLIC_APP_URL = "https://kurioticket.com";
  process.env.NEXTAUTH_URL = "https://kurioticket.com";
  process.env.BOT_TRUST_RENDER_WORKSPACE_INGRESS = "false";

  const wildcard = { userAgent: "*", disallow: "/" };
  const production = {
    userAgent: Object.values(crawlerCatalog).map(entry => entry.agent),
    disallow: ["/", "/flights/details", "/hotels/details", "/flights/handoff", "/hotels/handoff"],
    allow: [
      ...publicCrawlerPaths.map(path => path + "$"),
      ...publicCrawlerPrefixes, "/_next/image", "/api/content/faqs", "/api/content/homepage",
      "/flights/*$", "/hotels/*$", "/guides/*$", "/legal/*$",
    ],
  };
  assert.deepEqual(robots(), { rules: [production, wildcard] });

  process.env.TRAVEL_PROVIDER_MODE = "staging";
  const origin = "https://staging.kurioticket.com";
  process.env.NEXT_PUBLIC_APP_URL = origin;
  process.env.NEXTAUTH_URL = origin;

  const agents = [...production.userAgent, "MJ12BOT", "OAI-SEARCHBOT", "AASA-BOT"];
  assert.equal(new Set(agents.map(agent => agent.toLowerCase())).size, 29);
  const queryRules = publicCrawlerPaths.map(path => path + "?");
  const staging = robots().rules;
  assert.ok(Array.isArray(staging));
  const [approved] = staging;
  assert.deepEqual(staging, [
    { ...production, userAgent: agents, allow: [
      ...publicCrawlerPaths.map(path => path + "$"),
      ...queryRules,
      ...production.allow.slice(publicCrawlerPaths.length),
    ] },
    wildcard,
  ]);
  assert.ok(Array.isArray(approved.allow));

  for (const agent of agents) {
    for (const path of ["/", "/flights/results", "/hotels/results", "/cars/results", "/packages/results"]) {
      assert.ok(approved.allow.includes(path + "$"));
      assert.ok(approved.allow.includes(path + "?"));
      const request = new Request(origin + path + "?fixture=1", { headers: { "User-Agent": agent } });
      const signal = automationSignal(request);
      assert.ok(signal, agent);
      const bot = await observeBot(request, signal);
      assert.equal(botAccess(bot, botTarget(request)), null, agent + " " + path);
    }
  }

  for (const [agent, path, denial] of [
    ["NovelSpider", "/", "UNAPPROVED_BOT"],
    ["Googlebot", "/admin", "PATH_NOT_ALLOWED"],
    ["GPTBot", "/api/sandbox/kayak", "PATH_NOT_ALLOWED"],
    ["GPTBot", "/hotels/details/private", "PATH_NOT_ALLOWED"],
  ]) {
    const request = new Request(origin + path, { headers: { "User-Agent": agent } });
    const signal = automationSignal(request);
    assert.ok(signal, agent);
    assert.equal(botAccess(await observeBot(request, signal), botTarget(request)), denial);
  }
});

test("sandbox results and intentionally restricted pages retain noindex and nofollow", () => {
  for (const page of [
    "flights/results",
    "hotels/results",
    "cars/results",
    "sandbox/kayak",
    "deals/journey/[stage]",
    "mobile/legal/[slug]",
  ]) {
    const source = readFileSync("src/app/" + page + "/page.tsx", "utf8");
    assert.match(source, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/, page);
  }
});
