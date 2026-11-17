import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  groupOperationsProviderIssues,
  OperationsDataTable,
  OperationsMetric,
  OperationsProviderIssues,
  OperationsStatus,
} from "./TravelOperationsOverviewUI";

const issues = [
  { id: "first", provider: "KAYAK sandbox", status: "FAILED", category: "Authentication / configuration", createdAt: "2026-11-17T03:00:00.000Z", latencyMs: 390 },
  { id: "second", provider: "KAYAK sandbox", status: "FAILED", category: "Authentication / configuration", createdAt: "2026-11-17T02:00:00.000Z", latencyMs: 401 },
  { id: "third", provider: "KAYAK sandbox", status: "DISABLED", category: "Provider disabled / skipped", createdAt: "2026-11-16T23:00:00.000Z", latencyMs: null },
  { id: "fourth", provider: "Duffel", status: "FAILED", category: "Authentication / configuration", createdAt: "2026-11-16T22:00:00.000Z", latencyMs: 250 },
];

test("provider grouping hides repetitive headings but retains each distinct provider event", () => {
  const groups = groupOperationsProviderIssues(issues);
  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map(group => group.length), [2, 1, 1]);
  assert.deepEqual(groups.flatMap(group => group.map(issue => issue.id)).sort(), issues.map(issue => issue.id).sort());
  assert.notEqual(groups[0][0].status, groups[1][0].status);
});

test("provider issue summaries keep individual times and latencies in accessible disclosure", () => {
  const html = renderToStaticMarkup(createElement(OperationsProviderIssues, {
    items: issues,
    formatDate: (date: Date) => date.toISOString(),
  }));
  assert.match(html, /2 observations/);
  assert.match(html, /1 observation/);
  assert.match(html, /Authentication \/ configuration/);
  assert.match(html, /Provider disabled \/ skipped/);
  assert.match(html, /<details/);
  assert.match(html, /<summary/);
  for (const issue of issues) {
    assert.ok(html.includes(issue.createdAt), issue.id + " timestamp missing");
    assert.ok(html.includes(issue.latencyMs === null ? "Latency unavailable" : issue.latencyMs + " ms"), issue.id + " latency missing");
  }
});

test("overview metric, status and table use neutral layout without altering values", () => {
  const metric = renderToStaticMarkup(createElement("dl", null,
    createElement(OperationsMetric, { label: "Searches", value: 16, hint: "24-hour window", tone: "info" }),
  ));
  assert.match(metric, /16/);
  assert.match(metric, /24-hour window/);
  assert.match(metric, /<dt/);
  assert.match(metric, /<dd/);
  const status = renderToStaticMarkup(createElement(OperationsStatus, { tone: "bad", children: "Failed" }));
  assert.match(status, /Failed/);
  assert.match(status, /bg-rose-500/);
  const table = renderToStaticMarkup(createElement(OperationsDataTable, {
    columns: ["Destination", "Status"],
    rows: [{ id: "search_1", cells: ["London", "FAILED"] }],
  }));
  assert.match(table, /London/);
  assert.match(table, /FAILED/);
  assert.match(table, /overflow-x-auto/);
});
