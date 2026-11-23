import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SearchDetailActivityPanel } from "./SearchDetailActivityPanel";

const detailPage = readFileSync("src/app/admin/searches/[id]/page.tsx", "utf8");
const reader = readFileSync("src/services/adminSearchScopedActivityCore.ts", "utf8");
const protectedService = readFileSync("src/services/adminSearchScopedActivityService.ts", "utf8");
const endpoint = readFileSync("src/app/api/admin/searches/[id]/activity/route.ts", "utf8");

test("Search Detail renders an inline interaction section without a View activity disclosure", () => {
  const html = renderToStaticMarkup(createElement(SearchDetailActivityPanel, {
    searchId: "search_123456",
    environment: "staging",
    searchedAt: "2026-11-16T12:34:00.000Z",
    status: "SUCCESS",
  }));
  assert.match(html, /User interactions/);
  assert.match(html, /Search recorded/);
  assert.match(html, /Loading verified user interactions/);
  assert.doesNotMatch(html, /View activity|aria-expanded|href="\/admin\/users\//);
});

test("Search Detail shows scoped activity separately from verified account navigation", () => {
  assert.match(detailPage, /<SearchDetailActivityPanel/);
  assert.match(detailPage, /searchId=\{search\.id\}/);
  assert.match(detailPage, /View user details/);
  assert.match(detailPage, /search\.searcher\.activity/);
  assert.match(detailPage, /Country/);
  assert.match(detailPage, /IP address/);
  assert.doesNotMatch(detailPage, /search\.searcher\.activity\.id\)\}\s*<SearchDetailActivityPanel/);
});

test("Search Activity endpoint independently requires admin authorization and never reads Users activity", () => {
  assert.match(protectedService, /requireAdminApiSession\(\)/);
  assert.match(protectedService, /getOptionalPrisma/);
  assert.match(protectedService, /environment: getPublicEnvironment/);
  assert.match(endpoint, /readAdminSearchScopedActivity\(id, new URL\(request\.url\)\.searchParams\)/);
  assert.match(endpoint, /adminOperationalReadResponse/);
  assert.match(reader, /if \(!\(await deps\.authorize\(\)\)\)/);
  assert.match(reader, /searchHistoryId: search\.id/);
  assert.match(reader, /eligibleGuestVisitorWhere/);
  assert.match(reader, /eligibleJourneyLinkedVisitorWhere/);
  assert.match(reader, /environment !== deps\.environment\(\)/);
  assert.doesNotMatch(reader, /loadAdminIdentityActivity|\/admin\/users|db\.user\.findMany/);
});
