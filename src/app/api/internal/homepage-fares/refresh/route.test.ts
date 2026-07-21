import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "./route";

test("internal homepage fare refresh returns 503 when cron secret is missing", async () => {
  const previous = process.env.HOMEPAGE_FARES_CRON_SECRET;
  delete process.env.HOMEPAGE_FARES_CRON_SECRET;

  try {
    const response = await POST(new Request("http://localhost/api/internal/homepage-fares/refresh", { method: "POST" }));
    const payload = await response.json() as { error?: string };

    assert.equal(response.status, 503);
    assert.equal(payload.error, "Homepage fare refresh is not configured.");
  } finally {
    if (previous === undefined) delete process.env.HOMEPAGE_FARES_CRON_SECRET;
    else process.env.HOMEPAGE_FARES_CRON_SECRET = previous;
  }
});

test("internal homepage fare refresh returns 401 for an invalid bearer token", async () => {
  const previous = process.env.HOMEPAGE_FARES_CRON_SECRET;
  process.env.HOMEPAGE_FARES_CRON_SECRET = "expected-secret";

  try {
    const response = await POST(new Request("http://localhost/api/internal/homepage-fares/refresh", {
      method: "POST",
      headers: { authorization: "Bearer wrong-secret" },
    }));
    const payload = await response.json() as { error?: string };

    assert.equal(response.status, 401);
    assert.equal(payload.error, "Unauthorized homepage fare refresh request.");
  } finally {
    if (previous === undefined) delete process.env.HOMEPAGE_FARES_CRON_SECRET;
    else process.env.HOMEPAGE_FARES_CRON_SECRET = previous;
  }
});
