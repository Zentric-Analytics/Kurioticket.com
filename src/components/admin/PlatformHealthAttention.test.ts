import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";
import { platformFixture } from "../../../qa/stage06/fixtures";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, fsCache: false });
const { PlatformHealthAttention, summarizePlatformHealthAttention } =
  jiti("./PlatformHealthAttention") as typeof import("./PlatformHealthAttention");
const { AppRouterContext } = jiti("next/dist/shared/lib/app-router-context.shared-runtime") as typeof import("next/dist/shared/lib/app-router-context.shared-runtime");
const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} };

test("triage distinguishes degraded operations from missing evidence without inventing overall health", () => {
  const { issues, gaps } = summarizePlatformHealthAttention(platformFixture(), "ALL");
  assert.deepEqual(issues.map(issue => issue.key), ["scheduled-jobs"], "fixture contains one recorded failed job");
  assert.ok(gaps.some(gap => gap.key === "installed-apps" && gap.state === "UNKNOWN"));
  assert.ok(gaps.some(gap => gap.key === "unverified-search-source" && gap.href.includes("applicationSource=UNKNOWN")),
    "unverified human-looking traffic must be investigated, not called a verified crawler");
  assert.ok(gaps.some(gap => gap.key === "providers-unavailable"));
  assert.ok(!gaps.some(gap => gap.key === "activity-unavailable"));
});

test("failed activity reader cannot become zero healthy operations", () => {
  const { issues, gaps } = summarizePlatformHealthAttention(platformFixture(true), "IOS");
  assert.ok(issues.some(issue => issue.key === "database" && issue.state === "FAILING"));
  assert.ok(gaps.some(gap => gap.key === "activity-unavailable" && gap.scope === "Selected application"));
  assert.ok(gaps.some(gap => gap.key === "scheduled-jobs-unobserved"));
  assert.ok(!issues.some(issue => issue.key === "searches"));
});

test("triage reports only demonstrated failures and keeps application scope", () => {
  const data = platformFixture();
  const searches = data.activity.data!.searches;
  searches.applications.IOS = { ...searches.applications.IOS, total: 12, successful: 3, failed: 9, state: "FAILING" };
  searches.combined = { ...searches.combined, total: 48, successful: 39, failed: 9, state: "DEGRADED" };
  const ios = summarizePlatformHealthAttention(data, "IOS");
  assert.ok(ios.issues.some(issue => issue.key === "searches" && issue.state === "FAILING" && issue.scope === "Selected application"));
  const web = summarizePlatformHealthAttention(data, "WEB");
  assert.ok(!web.issues.some(issue => issue.key === "searches"));
  const all = summarizePlatformHealthAttention(data, "ALL");
  assert.ok(all.issues.some(issue => issue.key === "searches" && issue.state === "DEGRADED"));
});

test("background job failure is based on recorded outcomes, not inferred scheduler uptime", () => {
  const data = platformFixture();
  data.scheduledJobs.runs = [{ job: "fare-update", status: "FAILED", observedAt: data.window.from,
    environment: "staging", outcome: "FAILED", completedAt: data.window.to, durationMs: 1000 }];
  const { issues } = summarizePlatformHealthAttention(data, "ALL");
  assert.ok(issues.some(issue => issue.key === "scheduled-jobs" && issue.href === "#scheduled-job-observations"));
});

test("health summary is accessible, has investigation links, and preserves cautionary status copy", () => {
  const html = renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: router as never },
    createElement(PlatformHealthAttention, { data: platformFixture(), application: "ALL" })));
  assert.match(html, /Health at a glance/);
  assert.match(html, /Needs investigation/);
  assert.match(html, /Unknown or unavailable/);
  assert.match(html, /Not an overall platform health score/);
  assert.match(html, /\/admin\/providers/);
  // The compact summary shows the first three gaps; verify remaining evidence is retained.
  assert.ok(summarizePlatformHealthAttention(platformFixture(), "ALL").gaps.some(gap => gap.key === "installed-apps"));
  assert.match(html, /2 more signal/);
  assert.doesNotMatch(html, /Overall healthy|100% uptime|Crash-free/);
  assert.doesNotMatch(html, /href="#/, "Do not navigate to a duplicate panel on the same page");
});
