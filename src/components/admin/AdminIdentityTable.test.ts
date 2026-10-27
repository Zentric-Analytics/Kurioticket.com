import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, fsCache: false });
const { AdminIdentityTable } = jiti("./AdminIdentityTable") as typeof import("./AdminIdentityTable");

type Props = Parameters<typeof AdminIdentityTable>[0];
const props: Props = {
  rows: [],
  sort: "name_asc",
  pageHref: "/admin/users?q=qa&role=ALL&status=ALL&tab=ALL&sort=name_asc&page=2",
};
const at = new Date("2026-10-20T12:34:00Z");
const render = (changes: Partial<Props> = {}) =>
  renderToStaticMarkup(createElement(AdminIdentityTable, { ...props, ...changes }));

test("five existing data columns and user/guest activity links retain all recorded identity details", () => {
  const html = render({ rows: [
    { kind: "user", record: { id: "qa-user-internal-id", name: "QA fixture", email: "qa@example.invalid",
      role: "SUPPORT", status: "ACTIVE", createdAt: at } },
    { kind: "guest", record: { id: "qa-guest-long-id", firstSeenAt: at, lastSeenAt: at } },
  ]});
  assert.equal((html.match(/<th /g) || []).length, 5);
  for (const column of ["IDENTITY", "TYPE", "STATUS", "JOINED / FIRST SEEN", "ACTIVITY"]) {
    assert.match(html, new RegExp(column.replace("/", "\\/")));
  }
  assert.match(html, /QA fixture/);
  assert.match(html, /qa@example.invalid/);
  assert.match(html, /Copy user ID: qa-user-internal-id/);
  assert.match(html, /Copy guest ID: qa-guest-long-id/);
  assert.match(html, /aria-label="Guest ID: qa-guest-long-id"/);
  assert.match(html, /Registered · Support/);
  assert.match(html, /aria-label="No account status for guest visitor"/);
  assert.match(html, /<time dateTime=/);
  for (const kind of ["user", "guest"]) {
    const id = kind === "user" ? "qa-user-internal-id" : "qa-guest-long-id";
    assert.match(html, new RegExp(`/admin/users/${kind}/${id}/activity\\?directory=q%3Dqa%26role%3DALL%26status%3DALL%26tab%3DALL%26sort%3Dname_asc%26page%3D2`));
  }
  assert.doesNotMatch(html, /Not an account|Manage account|Protected admin|Current admin/);
  assert.doesNotMatch(html, /aria-label="User types"|aria-label="Sort by"|Apply Filter/);
});

test("table remains a scrollable, accessible region with five columns and no pagination", () => {
  const html = render();
  assert.match(html, /<h2 id="identity-directory-title" class="sr-only">Users directory<\/h2>/);
  assert.equal((html.match(/aria-labelledby="identity-directory-title"/g) || []).length, 1);
  assert.match(html, /min-w-\[960px\]/);
  assert.doesNotMatch(html, /Pg\\d|Identity pagination|Previous page|Next page/);
  assert.match(html, /colSpan="5"/i);
  assert.doesNotMatch(html, /Rows per page|15 rows|matching identities/);
});

test("empty results omit Clear filters but retain search actions", () => {
  const html = render({
    pageHref: "/admin/users?q=qa&role=SUPPORT&status=ACTIVE&tab=GUEST&sort=oldest&page=1",
  });
  assert.match(html, /No users match your filters/);
  assert.doesNotMatch(html, />Clear filters<\/a>/);
  assert.match(html, />Clear search<\/a>/);
  assert.match(html, /q=&amp;role=SUPPORT&amp;status=ACTIVE&amp;tab=GUEST&amp;sort=oldest&amp;page=1/);
});

test("Clear filters is not shown for query-only empty results", () => {
  const html = render({ pageHref: "/admin/users?q=missing&role=ALL&status=ALL&tab=ALL&sort=newest&page=1" });
  assert.match(html, /Clear search/);
  assert.doesNotMatch(html, />Clear filters<\/a>/);
});

test("empty Guest tab with no search or account filters offers to return to all users", () => {
  const html = render({ pageHref: "/admin/users?role=ALL&status=ALL&tab=GUEST&sort=newest&page=1" });
  assert.match(html, /View all users/);
  assert.match(html, /tab=ALL&amp;sort=newest&amp;page=1/);
});
