import assert from "node:assert/strict";
import test from "node:test";
import robots from "./robots";

test("robots publishes production guidance for the catalog and blocks all staging indexing", (t) => {
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
  assert.ok(Array.isArray(catalog.userAgent) && catalog.userAgent.includes("Googlebot") && catalog.userAgent.includes("GPTBot"));
  assert.ok(Array.isArray(catalog.allow) && catalog.allow.includes("/destinations$"));
  assert.ok(!catalog.allow.some(path => path.includes("/accounts") || path.includes("/admin") || path.includes("/search")));

  process.env.TRAVEL_PROVIDER_MODE = "staging";
  assert.deepEqual(robots().rules, [{ userAgent: "*", disallow: "/" }]);
});
