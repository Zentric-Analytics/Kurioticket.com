import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ReferralUnlinkedHandoffs } from "./ReferralUnlinkedHandoffs";

test("Referral Attribution renders unlinked handoff records immediately without a reveal control", () => {
  const html = renderToStaticMarkup(createElement(ReferralUnlinkedHandoffs, {
    window: { start: "2026-11-01T00:00:00.000Z", end: "2026-11-17T00:00:00.000Z" },
    environment: "staging",
    unlinkedCount: 12,
    providers: ["Duffel", "KAYAK sandbox"],
  }));
  assert.match(html, /12 recorded in this reporting window/);
  assert.match(html, /aria-label="Unlinked provider handoff records"/);
  assert.match(html, /aria-label="Filter unlinked handoff records"/);
  assert.match(html, /Loading provider handoffs/);
  assert.match(html, /Refresh records/);
  assert.doesNotMatch(html, /View 12 handoffs without a linked search|Hide unlinked handoff records/);
  assert.doesNotMatch(html, /hidden=""|aria-expanded="false"/);
  assert.doesNotMatch(html, /href="\/admin\/(?:redirects|searches)/);
});

const source = readFileSync("src/components/admin/ReferralUnlinkedHandoffs.tsx", "utf8");

test("Provider and Product filters reuse the polished accessible monitor select without new navigation", () => {
  assert.match(source, /<SearchMonitorSelect label="Provider" name="provider" appearance="fare"/);
  assert.match(source, /<SearchMonitorSelect label="Product" name="product" appearance="fare"/);
  assert.match(source, /onValueChange=\{value => \{ setProvider\(value\); resetPage\(\); \}\}/);
  assert.match(source, /onValueChange=\{value => \{ setProduct\(value as ProductFilter\); resetPage\(\); \}\}/);
  assert.match(source, /referralUnlinkedRecordsParams/);
  assert.doesNotMatch(source, /router\.push|router\.replace|\/admin\/redirects|\/admin\/searches/);
});

test("unlinked handoff product select includes Cars", () => {
  assert.match(source, /type ProductFilter = "" \| "FLIGHT" \| "HOTEL" \| "CAR"/);
  assert.match(source, /\{ value: "CAR", label: "Cars" \}/);
});

test("Refresh control preserves selected filters, existing rows, and current cursor while loading", () => {
  assert.match(source, /<RefreshCw size=\{15\}/);
  assert.match(source, /loadState === "loading" \? "Refreshing…" : "Refresh records"/);
  assert.match(source, /disabled=\{loadState === "loading"\}/);
  assert.match(source, /setReload\(value => value \+ 1\)/);
  assert.match(source, /cache: "no-store"/);
  assert.match(source, /credentials: "include"/);
  assert.match(source, /loadState === "loading" && list/);
  assert.doesNotMatch(source, /onClick=\{\(\) => \{\s*setPageIndex\(0\);\s*setReload/);
});

test("Expanded details remain a read-only, grouped card displaying all existing record fields", () => {
  assert.match(source, /aria-label="Provider handoff record details"/);
  assert.match(source, /Handoff information/);
  assert.match(source, /Source &amp; destination/);
  assert.match(source, /Identity &amp; correlation/);
  assert.match(source, /max-w-\[960px\]/);
  assert.match(source, /Search link: \{handoff\.searchCorrelation\.kind === "exact" \? "Verified" : "Unavailable"\}/);
  for (const field of [
    "Handoff ID", "Provider", "Product", "Route or property", "Price", "Created",
    "Source page", "Destination domain", "Environment", "Identity", "User ID", "Visitor ID",
  ]) {
    assert.ok(source.includes('label="' + field + '"'), field);
  }
  assert.match(source, /setSelectedId\(current => current === handoff\.id \? null : handoff\.id\)/);
  assert.match(source, /<td colSpan=\{9\}/);
});

test("Unlinked handoffs begin an automatic protected read and retain scope, errors and pagination", () => {
  assert.doesNotMatch(source, /if \(!expanded\) return|\[expanded, window\.start/);
  assert.match(source, /useEffect\(\(\) => \{/);
  assert.match(source, /\[window\.start, window\.end, environment, provider, product, cursor, reload\]/);
  assert.match(source, /setLoadState\("loading"\)/);
  assert.match(source, /referralUnlinkedRecordsParams/);
  assert.match(source, /limit: PAGE_SIZE/);
  assert.match(source, /aria-label="Unlinked handoff pagination"/);
  assert.match(source, /role="alert"/);
});
