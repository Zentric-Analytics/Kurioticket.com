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
