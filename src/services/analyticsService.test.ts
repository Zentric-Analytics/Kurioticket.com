import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { withEnvironmentMetadata } from "@/lib/stagingSafety";

const originalUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = originalUrl;
});

test("analytics, provider, and search metadata receive the staging environment dimension", () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://staging.kurioticket.com";
  const metadata = withEnvironmentMetadata({ operation: "search" });
  assert.deepEqual(metadata, { operation: "search", environment: "staging" });
});

test("Production metadata retains its data and reports production", () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://kurioticket.com";
  assert.deepEqual(withEnvironmentMetadata({ operation: "search" }), {
    operation: "search",
    environment: "production",
  });
});
