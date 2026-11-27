import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";
import { adminUsersActivityReturn } from "../../lib/adminUsersNavigation";

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

test("six data columns and user/guest activity links retain all recorded identity details", () => {
  const html = render({ rows: [
    { kind: "user", record: { id: "qa-user-internal-id", name: "QA fixture", email: "qa@example.invalid",
      role: "SUPPORT", status: "ACTIVE", createdAt: at }, lastSeenAt: new Date("2026-10-21T08:05:00Z") },
    { kind: "guest", record: { id: "qa-guest-long-id", firstSeenAt: at, lastSeenAt: at } },
  ]});
  assert.equal((html.match(/<th /g) || []).length, 6);
  for (const column of ["IDENTITY", "TYPE", "STATUS", "JOINED / FIRST SEEN", "LAST SEEN", "ACTIVITY"]) {
    assert.match(html, new RegExp(column.replace("/", "\\/")));
  }
  assert.match(html, /QA fixture/);
  assert.match(html, /qa@example.invalid/);
  assert.match(html, /Copy user ID: qa-user-internal-id/);
  assert.match(html, /Copy guest ID: qa-guest-long-id/);
  assert.match(html, /aria-label="Guest ID: qa-guest-long-id"/);
  assert.match(html, /Registered · Support/);
  assert.match(html, /data-testid="guest-directory-status"[^>]*>Unavailable<\/span>/);
  assert.match(html, /<time dateTime=/);
  for (const kind of ["user", "guest"]) {
    const id = kind === "user" ? "qa-user-internal-id" : "qa-guest-long-id";
    const links = [...html.matchAll(/href="([^"]*\/activity[^\"]*)"/g)]
      .map(match => new URL(match[1].replaceAll("&amp;", "&"), "https://admin.example.invalid"));
    const activity = links.find(url => url.pathname === `/admin/users/${kind}/${id}/activity`);
    assert.ok(activity);
    assert.equal(activity.searchParams.get("range"), "all", "an identity opens complete history independently of the directory range");
    assert.equal(activity.searchParams.get("usersReturn"), props.pageHref);
  }
  assert.doesNotMatch(html, /Not an account|Manage account|Protected admin|Current admin/);
  assert.doesNotMatch(html, /aria-label="User types"|aria-label="Sort by"|Apply Filter/);
});

test("the full permitted Unicode directory search survives identity navigation and Back", () => {
  const pageHref = "/admin/users?" + new URLSearchParams({
    q: "旅".repeat(120), role: "ALL", status: "ALL", tab: "GUEST", sort: "newest", date: "today", page: "1234567",
  });
  assert.ok(pageHref.length > 1000 && pageHref.length < 2048);
  const html = render({ pageHref, rows: [
    { kind: "guest", guestStatus: "ACTIVE", guestSource: "visitor", record: { id: "qa-guest-long-id", firstSeenAt: at, lastSeenAt: at } },
  ] });
  const match = [...html.matchAll(/href="([^"]*\/activity[^\"]*)"/g)][0];
  assert.ok(match);
  const url = new URL(match[1].replaceAll("&amp;", "&"), "https://admin.example.invalid");
  assert.equal(url.searchParams.get("range"), "all");
  assert.equal(url.searchParams.get("usersReturn"), pageHref);
  assert.equal(adminUsersActivityReturn(Object.fromEntries(url.searchParams)).href, pageHref);
});

test("table remains a scrollable, accessible region with six columns and no pagination", () => {
  const html = render();
  assert.match(html, /<h2 id="identity-directory-title" class="sr-only">Users directory<\/h2>/);
  assert.equal((html.match(/aria-labelledby="identity-directory-title"/g) || []).length, 1);
  assert.match(html, /min-w-\[1080px\]/);
  assert.doesNotMatch(html, /Pg\\d|Identity pagination|Previous page|Next page/);
  assert.match(html, /colSpan="6"/i);
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

test("Last Seen distinguishes actual observations from registration and absent data", () => {
  const html = render({ rows: [
    { kind: "user", record: { id: "qa-user-111111", name: "Observed", email: null,
      role: "USER", status: "ACTIVE", createdAt: new Date("2026-08-08T12:00:00Z") },
      lastSeenAt: new Date("2026-11-20T09:20:00Z") },
    { kind: "user", record: { id: "qa-user-222222", name: "Unobserved", email: null,
      role: "USER", status: "ACTIVE", createdAt: new Date("2026-08-08T12:00:00Z") },
      lastSeenAt: null },
    { kind: "guest", record: { id: "qa-guest-333333", firstSeenAt: new Date("2026-11-19T12:00:00Z"),
      lastSeenAt: new Date("2026-11-20T10:00:00Z") } },
  ] });
  assert.equal((html.match(/data-label="Last Seen"/g) || []).length, 3);
  assert.match(html, /dateTime="2026-11-20T09:20:00\.000Z"/);
  assert.match(html, /dateTime="2026-11-20T10:00:00\.000Z"/);
  assert.match(html, /aria-label="No recorded last seen"/);
  assert.doesNotMatch(html, /Online now|Currently online/);
});

test("guest status labels distinguish identity eligibility, expiry and unavailable evidence", () => {
  const html = render({ rows: [
    { kind: "guest", guestSource: "visitor", guestStatus: "ACTIVE", record: { id: "qa-guest-active", firstSeenAt: at, lastSeenAt: at } },
    { kind: "guest", guestSource: "operational", guestStatus: "INACTIVE", record: { id: "qa-guest-expired", firstSeenAt: at, lastSeenAt: at } },
    { kind: "guest", guestSource: "operational", record: { id: "qa-guest-unknown", firstSeenAt: at, lastSeenAt: at } },
  ] });
  for (const status of ["Active", "Inactive", "Unavailable"]) assert.match(html, new RegExp('data-testid="guest-directory-status"[^>]*>' + status + '</span>'));
  assert.match(html, /not live presence/);
});
