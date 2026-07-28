import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildSearchesHref, latencyTone, parseSearchesSearchParams, searchesTableColumns } from "./page-data";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const toolbar = readFileSync(new URL("./SearchesFilterToolbar.tsx", import.meta.url), "utf8");

test("searches monitoring workspace keeps the focused header and toolbar", () => {
  assert.doesNotMatch(page, /Admin Operations/);
  assert.match(page, /title="Searches"/);
  assert.match(toolbar, /Search route/);
  assert.match(toolbar, /Clear filters/);
  assert.match(toolbar, /name="type"/);
  assert.match(toolbar, /name="status"/);
  assert.match(toolbar, /name="provider"/);
});

test("table retains operational columns and removes repeated raw-query copy", () => {
  assert.deepEqual(searchesTableColumns, ["Created", "Type", "Route / Stay", "Market", "Results", "Provider", "Status", "Latency"]);
  assert.match(page, /AdminStatusBadge/);
  assert.match(page, /Showing \{first\}–\{last\} of \{data\.total\} searches/);
  assert.doesNotMatch(page, /Raw query summarized for operations/);
});

test("latency thresholds affect presentation only", () => {
  assert.equal(latencyTone(null), "text-slate-400");
  assert.equal(latencyTone(999), "text-emerald-700");
  assert.equal(latencyTone(1000), "text-amber-700");
  assert.equal(latencyTone(3000), "text-amber-700");
  assert.equal(latencyTone(3001), "text-rose-700");
});

test("pagination links preserve every filter", () => {
  assert.equal(buildSearchesHref(3, { q: "JFK", type: "FLIGHT", status: "FAILED", provider: "FLIGHT" }), "/admin/searches?q=JFK&type=FLIGHT&status=FAILED&provider=FLIGHT&page=3");
  assert.equal(buildSearchesHref(1, { q: "", type: "ALL", status: "ALL", provider: "ALL" }), "/admin/searches");
  assert.deepEqual(parseSearchesSearchParams({ page: "nope" }), { q: "", type: "ALL", status: "ALL", provider: "ALL", page: 1 });
});

test("database, global-empty, and filtered-empty states remain distinct", () => {
  assert.match(page, /AdminDataErrorState title="Searches could not be loaded/);
  assert.match(page, /data\.all === 0/);
  assert.match(page, /Try another filter or clear the current filters/);
});
