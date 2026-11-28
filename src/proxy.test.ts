import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { proxy } from "@/proxy";
import { shouldDisableStagingDocumentCache } from "@/lib/requestIngress";

test("staging document responses cannot retain HTML across deployments", async () => {
  const request = new NextRequest("https://staging.kurioticket.com/deals", {
    headers: { "sec-fetch-dest": "document" },
  });
  assert.equal(shouldDisableStagingDocumentCache(request), true);
  assert.equal((await proxy(request)).headers.get("Cache-Control"), "no-store, max-age=0");
});

test("Production and non-document requests keep their existing cache policy", async () => {
  const production = new NextRequest("https://kurioticket.com/deals", {
    headers: { "sec-fetch-dest": "document" },
  });
  const stagingAsset = new NextRequest("https://staging.kurioticket.com/_next/static/app.js", {
    headers: { "sec-fetch-dest": "script" },
  });
  assert.equal(shouldDisableStagingDocumentCache(production), false);
  assert.equal(shouldDisableStagingDocumentCache(stagingAsset), false);
  assert.equal((await proxy(production)).headers.get("Cache-Control"), null);
  assert.equal((await proxy(stagingAsset)).headers.get("Cache-Control"), null);
});


test("staging public documents and aliases carry noindex even without browser fetch headers", async t => {
  const keys = ["TRAVEL_PROVIDER_MODE", "NEXT_PUBLIC_APP_URL", "NEXTAUTH_URL", "BOT_REQUIRE_EDGE"] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  t.after(() => {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  process.env.TRAVEL_PROVIDER_MODE = "production";
  process.env.NEXT_PUBLIC_APP_URL = "https://kurioticket.com";
  process.env.NEXTAUTH_URL = "https://kurioticket.com";
  process.env.BOT_REQUIRE_EDGE = "false";
  for (const host of ["staging.kurioticket.com", "kurioticket-web-staging.onrender.com"]) {
    for (const path of ["/", "/flights/results?fixture=1", "/hotels/results", "/cars/results", "/packages/results", "/robots.txt", "/_next/static/app.js", "/deals"]) {
      const response = await proxy(new NextRequest("https://" + host + path));
      assert.equal(response.headers.get("X-Robots-Tag"), "noindex", host + path);
    }
  }
  assert.equal((await proxy(new NextRequest("https://kurioticket.com/flights/results"))).headers.get("X-Robots-Tag"), null);
  process.env.TRAVEL_PROVIDER_MODE = "staging";
  assert.equal((await proxy(new NextRequest("https://fixture.invalid/flights/results"))).headers.get("X-Robots-Tag"), "noindex");
});
