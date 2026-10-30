import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, fsCache: false });
const { ConfirmedTripsBreakdowns } = jiti("./ConfirmedTripsBreakdowns") as typeof import("./ConfirmedTripsBreakdowns");

type Snapshot = NonNullable<Parameters<typeof ConfirmedTripsBreakdowns>[0]["operations"]>;
const snapshot: Snapshot = {
  environment: "staging",
  metrics: { total: 0, confirmedLast24h: 0, upcoming: 0, past: 0, cancelled: 0 },
  byProduct: [],
  byProvider: [],
  recentTrips: [],
};
const render = (operations: Snapshot | null) => renderToStaticMarkup(createElement(ConfirmedTripsBreakdowns, { operations }));

test("product and provider sections remain visible and compact when no trips exist", () => {
  const html = render(snapshot);
  assert.match(html, /Confirmed trips by product/);
  assert.match(html, /Confirmed trips by provider/);
  assert.match(html, /No confirmed trips yet/);
  assert.match(html, /No confirmed trips from providers yet/);
  assert.match(html, /Product totals will appear after verified confirmations arrive/);
  assert.match(html, /Provider totals will appear after verified confirmations arrive/);
  assert.equal((html.match(/role="status"/g) || []).length, 2);
  assert.doesNotMatch(html, /Product breakdown unavailable|Provider breakdown unavailable|min-h-36|View details/);
  assert.doesNotMatch(html, /<table|>0<\/span>/);
});

test("database unavailable never appears as zero records or fictitious providers", () => {
  const html = render(null);
  assert.match(html, /Product breakdown unavailable/);
  assert.match(html, /Provider breakdown unavailable/);
  assert.match(html, /No counts are assumed/);
  assert.match(html, /No providers or counts are assumed/);
  assert.equal((html.match(/role="status"/g) || []).length, 2);
  assert.doesNotMatch(html, /No confirmed trips yet|No confirmed trips from providers yet/);
  assert.doesNotMatch(html, /<table|>0<\/span>/);
});

test("populated breakdowns display every product and provider without fabricated counts", () => {
  const html = render({
    ...snapshot,
    byProduct: [
      { tripType: "FLIGHT", count: 1234 },
      { tripType: "HOTEL", count: 3 },
      { tripType: "CAR", count: 1 },
      { tripType: "PACKAGE", count: 2 },
      { tripType: "FUTURE_TYPE", count: 4 },
    ],
    byProvider: [
      { provider: "Long Partner Name With Multiple Terms For Wrap Testing", count: 22, lastConfirmationAt: "2026-10-27T10:00:00.000Z" },
      { provider: "No-timestamp partner", count: 1, lastConfirmationAt: null },
    ],
  });
  for (const label of ["Flight", "Hotel", "Car", "Package", "FUTURE_TYPE", "Long Partner Name With Multiple Terms For Wrap Testing", "No-timestamp partner", "Last confirmation", "No timestamp"]) {
    assert.ok(html.includes(label), "Missing authentic product/provider field: " + label);
  }
  for (const count of ["1,234", "22", "3", "4"]) {
    assert.ok(html.includes(count), "Count must be rendered: " + count);
  }
  assert.equal((html.match(/aria-label="\d[\d,]* provider-confirmed trips"/g) || []).length, 7);
  assert.doesNotMatch(html, /No confirmed trips yet|breakdown unavailable|<table|<form/);
  assert.match(html, /break-words/);
  assert.match(html, /tabular-nums/);
});

test("uneven datasets do not force placeholders or equal-height empty cards", () => {
  const html = render({
    ...snapshot,
    byProduct: [{ tripType: "CAR", count: 1 }],
    byProvider: [],
  });
  assert.match(html, /Car/);
  assert.match(html, /No confirmed trips from providers yet/);
  assert.doesNotMatch(html, /min-h-36|items-stretch|opacity-0/);
});
