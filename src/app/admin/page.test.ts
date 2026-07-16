import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const overviewSource = readFileSync("src/app/admin/page.tsx", "utf8");

test("admin overview is a compact operations dashboard instead of detailed admin pages", () => {
  assert.ok(!overviewSource.includes("AdminProviderStatusCard"));
  assert.ok(!overviewSource.includes('label="Recent searches"'));
  assert.ok(!overviewSource.includes('label="Admin users"'));
  assert.ok(overviewSource.includes('label="Providers needing attention"'));
  assert.ok(overviewSource.includes('href="/admin/providers"'));
  assert.ok(overviewSource.includes('href="/admin/logs"'));
  assert.ok(overviewSource.includes("activity.slice(0, 5)"));
});

test("admin overview keeps the intended information architecture order", () => {
  const platformIndex = overviewSource.indexOf("Platform Health");
  const operationsIndex = overviewSource.indexOf("Operations Snapshot");
  const searchIndex = overviewSource.indexOf("Search Health");
  const providerIndex = overviewSource.indexOf("Provider Readiness");
  const activityIndex = overviewSource.indexOf("Admin Activity");

  assert.ok(platformIndex > -1);
  assert.ok(operationsIndex > platformIndex);
  assert.ok(searchIndex > operationsIndex);
  assert.ok(providerIndex > searchIndex);
  assert.ok(activityIndex > providerIndex);
});
