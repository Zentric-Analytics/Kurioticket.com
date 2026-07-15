import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  "src/app/dashboard/alerts/PriceAlertsContent.tsx",
  "utf8",
);

test("price alerts empty state keeps the bell illustration without the exclamation badge", () => {
  const illustrationStart = source.indexOf("function EmptyStateIllustration()");
  const contentStart = source.indexOf("type PriceAlertsContentProps");

  assert.notEqual(illustrationStart, -1);
  assert.notEqual(contentStart, -1);

  const illustrationSource = source.slice(illustrationStart, contentStart);

  assert.match(illustrationSource, /<svg[\s\S]*viewBox="0 0 120 120"/);
  assert.match(illustrationSource, /id="bellGradient"/);
  assert.match(illustrationSource, /d="M26 84h68/);
  assert.match(illustrationSource, /absolute start-7 top-7/);
  assert.match(illustrationSource, /absolute start-14 top-4/);
  assert.match(illustrationSource, /absolute bottom-9 h-3 w-28/);
  assert.doesNotMatch(illustrationSource, />\s*!\s*</);
  assert.doesNotMatch(illustrationSource, /bg-slate-900 text-lg font-black text-white/);
});

test("price alerts empty state title and search flights button remain", () => {
  assert.match(
    source,
    /aria-labelledby="empty-alerts-title"[\s\S]*id="empty-alerts-title"[\s\S]*accountDashboard\.priceAlerts\.empty\.title/,
  );
  assert.match(source, /href="\/flights"[\s\S]*accountDashboard\.priceAlerts\.cta\.flights/);
});

test("price alerts dashboard fetches real alerts from the existing account API", () => {
  assert.match(source, /fetch\("\/api\/price-alerts", \{ signal: controller\.signal, cache: "no-store" \}\)/);
  assert.match(source, /response\.status === 401/);
  assert.match(source, /setLoadState\("unauthorized"\)/);
  assert.match(source, /setLoadState\("error"\)/);
});

test("price alerts dashboard renders loaded alert cards instead of empty state", () => {
  assert.match(source, /alerts\.length === 0/);
  assert.match(source, /alerts\.length > 0/);
  assert.match(source, /visibleAlerts\.map\(\(alert\) => <AlertCard/);
  assert.match(source, /function AlertCard/);
});

test("price alerts tabs use active triggered and all counts from loaded alerts", () => {
  assert.match(source, /id: "active"/);
  assert.match(source, /id: "triggered"/);
  assert.match(source, /id: "all"/);
  assert.match(source, /status === "ACTIVE"/);
  assert.match(source, /status === "TRIGGERED"/);
  assert.match(source, /all: alerts\.length/);
  assert.match(source, /counts\[tab\.id\]/);
});

test("price alerts sorting supports newest oldest and route A-Z", () => {
  assert.match(source, /id: "newest"/);
  assert.match(source, /id: "oldest"/);
  assert.match(source, /id: "routeAz"/);
  assert.match(source, /selectedSort === "oldest"/);
  assert.match(source, /selectedSort === "routeAz"/);
  assert.match(source, /routeLabel\(a\)\.localeCompare\(routeLabel\(b\)\)/);
});

test("price alert cards render route pricing status and check metadata", () => {
  for (const field of ["Departure date", "Return date", "Current price", "Last checked", "alert.status", "alert.targetPrice", "alert.currency", "alert.createdAt"]) {
    assert.ok(source.includes(field), field);
  }
});

test("price alerts dashboard keeps mobile and accessibility affordances", () => {
  assert.match(source, /sm:grid-cols-2/);
  assert.match(source, /break-words/);
  assert.match(source, /min-h-10/);
  assert.match(source, /aria-pressed/);
  assert.match(source, /role="listbox"/);
  assert.match(source, /role="status"/);
  assert.match(source, /role="alert"/);
});
