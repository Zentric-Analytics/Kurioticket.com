import assert from "node:assert/strict";
import test from "node:test";
import robots from "./robots";
import { crawlerCatalog, recognizedCrawlerAgents } from "@/lib/botRegistry";
import { botTarget } from "@/lib/botPolicy";

test("robots preserves production guidance and permits recognized staging crawlers on public pages only", (t) => {
  const previous = { mode: process.env.TRAVEL_PROVIDER_MODE, app: process.env.NEXT_PUBLIC_APP_URL, auth: process.env.NEXTAUTH_URL };
  t.after(() => {
    for (const [key, value] of [
      ["TRAVEL_PROVIDER_MODE", previous.mode], ["NEXT_PUBLIC_APP_URL", previous.app], ["NEXTAUTH_URL", previous.auth],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  process.env.TRAVEL_PROVIDER_MODE = "production";
  process.env.NEXT_PUBLIC_APP_URL = "https://kurioticket.com";
  process.env.NEXTAUTH_URL = "https://kurioticket.com";

  const rules = robots().rules;
  assert.ok(Array.isArray(rules));
  assert.deepEqual(rules.at(-1), { userAgent: "*", disallow: "/" });
  const catalog = rules[0];
  assert.deepEqual(catalog.userAgent, Object.values(crawlerCatalog).map(entry => entry.agent));
  assert.ok(Array.isArray(catalog.allow) && catalog.allow.includes("/destinations$"));
  assert.ok(!catalog.allow.some(path => path.includes("/accounts") || path.includes("/admin") || path.includes("/search")));

  process.env.TRAVEL_PROVIDER_MODE = "staging";
  const staging = robots().rules;
  assert.ok(Array.isArray(staging));
  assert.deepEqual(staging.at(-1), { userAgent: "*", disallow: "/" });
  const approved = staging[0];
  assert.deepEqual(approved.userAgent, recognizedCrawlerAgents);
  assert.equal(new Set(recognizedCrawlerAgents).size, 29);
  for (const agent of ["Googlebot", "Bingbot", "GPTBot", "MJ12BOT", "OAI-SEARCHBOT", "AASA-BOT"]) {
    assert.ok(recognizedCrawlerAgents.includes(agent));
  }
  assert.deepEqual(approved.disallow, catalog.disallow);
  assert.ok(Array.isArray(approved.allow));
  const allow = approved.allow;
  for (const page of ["/", "/flights/results", "/hotels/results", "/cars/results", "/packages/results"]) {
    assert.ok(allow.includes(page + "$"));
    assert.ok(allow.includes(page + "?*"));
    assert.equal(botTarget(new Request("https://staging.kurioticket.com" + page + "?fixture=1")).crawl, true);
  }
  // Robots guidance is advisory; actual protected routes and search methods
  // remain governed by the unchanged backend policy.
  for (const page of ["/admin", "/account", "/dashboard", "/api/account/profile", "/api/flights/search", "/api/hotels/search", "/api/cars/search", "/api/packages/search", "/flights/details", "/hotels/handoff"]) {
    assert.equal(botTarget(new Request("https://staging.kurioticket.com" + page)).crawl, false);
    assert.ok(!allow.includes(page + "$") && !allow.includes(page + "?*"));
  }
});
