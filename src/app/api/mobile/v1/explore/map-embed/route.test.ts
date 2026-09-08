import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";
test("Explore map supports world view and encoded destination queries", async () => {
 const previous = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
 process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY = "test-only-key";
 try {
  const world = GET(new Request("https://example.test/api/mobile/v1/explore/map-embed"));
  assert.equal(world.status, 200);
  assert.match(await world.text(), /embed\/v1\/view/);
  const response = GET(new Request("https://example.test/api/mobile/v1/explore/map-embed?q=" + encodeURIComponent('Paris, France <script>')));
  const html = await response.text();
  assert.match(html, /embed\/v1\/place/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(response.headers.get("content-security-policy")!, /frame-src https:\/\/www.google.com/);
  assert.equal(GET(new Request("https://example.test/?q=" + "a".repeat(161))).status, 400);
 } finally { if (previous === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY; else process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY = previous; }
});
test("Explore map is unavailable without the existing embed configuration", () => {
 const previous = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
 delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
 try { assert.equal(GET(new Request("https://example.test/")).status, 503); }
 finally { if (previous !== undefined) process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY = previous; }
});
