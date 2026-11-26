import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { proxy } from "../proxy";
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
