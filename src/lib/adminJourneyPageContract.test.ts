import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const list = readFileSync("src/app/admin/journeys/page.tsx", "utf8");
const detail = readFileSync("src/app/admin/journeys/[id]/page.tsx", "utf8");
const dates = readFileSync("src/lib/adminJourneyDateRange.ts", "utf8");
const controls = readFileSync("src/components/admin/JourneyDateRangeFields.tsx", "utf8");

test("journey metrics are scoped to one returned list reporting window", () => {
  assert.match(list, /adminJourneys\.summary\(\{ \.\.\.withoutPagination\(raw\), \.\.\.list\.data\.scope \}\)/);
  assert.match(list, /adminJourneys\.list\(input\)/);
  assert.doesNotMatch(list, /Promise\.all\(\[\s*adminJourneys\.list/);
});
test("headline metrics report recorded funnel stages, not correlation as a journey stage", () => {
  for (const key of ["RESULTS_VIEWED", "OFFER_SELECTED", "PROVIDER_HANDOFF_STARTED"]) {
    assert.ok(list.includes("summary.data.stages." + key + ".events"));
  }
  assert.match(list, /Only eligible consented journeys are included/);
  assert.doesNotMatch(list, /<AdminMetricCard/);
});
test("detail back link preserves scoped filters, not an untrusted destination", () => {
  assert.match(detail, /<SearchWorkspaceBackLink href=\{returnHref\(raw\)\}/);
  assert.match(detail, /for \(const key of \["range", "from", "to", "environment"/);
  assert.match(detail, /return "\/admin\/journeys"/);
});

test("journey detail is valid JSX and strips view-only range from backend input", () => {
  assert.match(detail, /return \(\s*<>\s*<SearchWorkspaceBackLink/);
  assert.match(detail, /<\/AdminPageShell>\s*<\/>/);
  assert.match(detail, /range: _range, activityReturn: _activityReturn, \.\.\.backendRaw/);
});
test("journey date presets are passed to detail and single-ended historical bounds survive", () => {
  assert.match(list, /p\.set\("range", range\)/);
  assert.match(dates, /if \(one\(raw\.cursor\) \|\| one\(raw\.from\) \|\| one\(raw\.to\)\) return \{\}/);
  assert.match(controls, /value: "custom", label: "Custom dates"/);
});

test("custom dates are editable and preset selection does not submit stale bounds", () => {
  assert.match(controls, /type="datetime-local"/);
  assert.match(controls, /name="from"/);
  assert.match(controls, /name="to"/);
  assert.match(controls, /\{custom \? \(/);
  assert.match(controls, /onValueChange=/);
  assert.match(list, /<JourneyDateRangeFields/);
});

test("equal custom UTC endpoints block native form submission", () => {
  assert.match(controls, /setCustomValidity\(valid \? "" :/);
  assert.match(controls, /offsetUtcDateTime\(from, 1\)/);
  assert.match(controls, /offsetUtcDateTime\(to, -1\)/);
  assert.match(controls, /Date\.parse\(startIso\) < Date\.parse\(endIso\)/);
});
test("detail event pagination retains the display preset without forwarding it to backend", () => {
  assert.match(detail, /key !== "cursor"\) p\.set\(key, value\)/);
  assert.match(detail, /range: _range, activityReturn: _activityReturn, \.\.\.backendRaw/);
});
