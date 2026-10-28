import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const list = readFileSync("src/app/admin/journeys/page.tsx", "utf8");
const detail = readFileSync("src/app/admin/journeys/[id]/page.tsx", "utf8");

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
  assert.match(detail, /range: _range, \.\.\.backendRaw/);
});
test("journey date presets are passed to detail and single-ended historical bounds survive", () => {
  assert.match(list, /p\.set\("range", range\)/);
  assert.match(list, /if \(one\(raw\.cursor\) \|\| one\(raw\.from\) \|\| one\(raw\.to\)\) return \{\}/);
  assert.match(list, /"custom",label:"Custom dates"/);
});
