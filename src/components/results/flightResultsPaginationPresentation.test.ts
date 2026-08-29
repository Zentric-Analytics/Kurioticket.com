import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";

const componentSource = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
  "utf8",
);
const globalsCss = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);

function ruleBody(selector: string) {
  const selectorStart = globalsCss.indexOf(selector);
  assert.notEqual(selectorStart, -1, `${selector} rule exists`);
  const bodyStart = globalsCss.indexOf("{", selectorStart);
  const bodyEnd = globalsCss.indexOf("}", bodyStart);
  assert.notEqual(bodyStart, -1, `${selector} rule opens`);
  assert.notEqual(bodyEnd, -1, `${selector} rule closes`);
  return globalsCss.slice(bodyStart + 1, bodyEnd);
}

function paginationSource() {
  const start = componentSource.indexOf("function FlightResultsPagination(");
  const end = componentSource.indexOf("export type FlightResultsSearchInput", start);
  assert.notEqual(start, -1, "Flight Results pagination exists");
  assert.notEqual(end, -1, "pagination remains locally scoped");
  return componentSource.slice(start, end);
}

test("Flight Results pagination keeps its semantic controls and compact mobile items", () => {
  const pagination = paginationSource();

  assert.match(pagination, /<nav\s+aria-label="Flight results pages"/);
  assert.match(pagination, /aria-label="Previous flight results page"/);
  assert.match(pagination, /aria-label="Next flight results page"/);
  assert.match(pagination, /aria-current=\{item === currentPage \? "page" : undefined\}/);
  assert.match(pagination, /buildFlightPaginationItems\(currentPage, totalPages, true\)/);
  assert.match(pagination, /aria-hidden="true">…<\/span>/, "desktop ellipses remain renderable");
  assert.doesNotMatch(
    pagination,
    /buildFlightPaginationItems\(currentPage, totalPages, true\)[\s\S]*?filter\([^)]*ellipsis/,
  );
});

test("pagination nav sits directly on the Results background", () => {
  const pagination = paginationSource();
  const navClass = pagination.match(/<nav[\s\S]*?className="([^"]+)"/)?.[1];

  assert.equal(
    navClass,
    "flight-results-pagination mb-6 mt-6 flex min-w-0 items-center justify-center",
  );
  assert.doesNotMatch(navClass ?? "", /bg-white|border-slate|rounded-xl|shadow-sm|\bp-\d/);
});

test("page controls are borderless, accessible touch targets with current-only blue", () => {
  const control = ruleBody(".flight-pagination-control {");
  const current = ruleBody('.flight-pagination-control[aria-current="page"]');
  const disabled = ruleBody(".flight-pagination-control:disabled");

  assert.match(control, /min-height:\s*44px/);
  assert.match(control, /min-width:\s*44px/);
  assert.match(control, /background:\s*transparent/);
  assert.match(control, /border:\s*1px solid transparent/);
  assert.match(control, /color:\s*#07133b/);
  assert.match(control, /font-weight:\s*600/);
  assert.doesNotMatch(control, /color:\s*#004bb8/);

  assert.match(current, /background:\s*transparent/);
  assert.match(current, /border-color:\s*transparent/);
  assert.match(current, /color:\s*#004bb8/);
  assert.match(current, /font-weight:\s*700/);
  assert.doesNotMatch(current, /#f8fafc|#334155/);

  assert.match(disabled, /color:\s*#94a3b8/);
  assert.match(ruleBody(".flight-pagination-ellipsis"), /color:\s*#64748b/);
  assert.match(
    ruleBody(".flight-pagination-control:focus-visible"),
    /outline:\s*2px solid rgb\(0 75 184 \/ 35%\)/,
  );
});
