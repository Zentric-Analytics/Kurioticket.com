import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Activity retry preserves the selected user and current filters", () => {
  const retry = readFileSync("src/components/admin/ActivityRetryButton.tsx", "utf8");
  const page = readFileSync("src/app/admin/users/[kind]/[id]/activity/page.tsx", "utf8");

  assert.match(retry, /startTransition\(\(\) => router\.refresh\(\)\)/);
  assert.match(retry, /disabled=\{isRefreshing\}/);
  assert.match(retry, /aria-busy=\{isRefreshing\}/);
  assert.match(retry, /Refreshing activity/);
  assert.match(page, /const result = await loadAdminIdentityActivity\(kind, id, filters, undefined, "all"\)/);
  assert.match(page, /<ActivityRetryButton \/>/);
});

test("Activity outages do not trigger extra account management reads", () => {
  const page = readFileSync("src/app/admin/users/[kind]/[id]/activity/page.tsx", "utf8");
  assert.match(page, /const serviceUnavailable = result\.status === "unavailable"/);
  assert.match(page, /!serviceUnavailable && <div aria-label="Identity management">/);
  assert.match(page, /await requireAdminSession\(/);
  assert.match(page, /records have not been confirmed missing/);
  assert.doesNotMatch(page, /temporarily unavailable.*No activity recorded/);
});
