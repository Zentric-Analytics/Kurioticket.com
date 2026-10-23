import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  jsx: { runtime: "automatic" },
  fsCache: false,
});
const { AdminIdentityTable } = jiti(
  "./AdminIdentityTable",
) as typeof import("./AdminIdentityTable");

const props = {
  rows: [],
  page: 2,
  count: 231,
  pageSize: 100,
  sort: "name_asc" as const,
  currentUserId: "qa-self",
  protectedEmails: [],
  pageHref: "/admin/users?q=qa&role=ALL&status=ALL&identity=ALL&sort=name_asc&page=2",
};
const at = new Date("2026-10-20T12:34:00Z");

test("six-column directory groups real identity details and keeps full IDs accessible", () => {
  const html = renderToStaticMarkup(
    createElement(AdminIdentityTable, {
      ...props,
      rows: [
        {
          kind: "user",
          record: {
            id: "qa-user-internal-id",
            name: "QA fixture",
            email: "qa@example.invalid",
            role: "SUPPORT",
            status: "ACTIVE",
            createdAt: at,
          },
        },
        {
          kind: "guest",
          record: { id: "qa-guest-long-id", firstSeenAt: at, lastSeenAt: at },
        },
      ],
    }),
  );
  assert.equal((html.match(/<th /g) || []).length, 6);
  const identityCell =
    html.match(/<tbody[^>]*><tr[^>]*><td[^>]*>(.*?)<\/td>/)?.[1] || "";
  assert.match(identityCell, /QA fixture/);
  assert.match(identityCell, /qa@example.invalid/);
  assert.match(identityCell, /Copy user ID: qa-user-internal-id/);
  assert.match(html, /Copy guest ID: qa-guest-long-id/);
  assert.match(html, /Registered · Support/);
  assert.match(html, /Not an account/);
  assert.match(html, /\/admin\/users\/user\/qa-user-internal-id\/activity\?directory=q%3Dqa%26role%3DALL%26status%3DALL%26identity%3DALL%26sort%3Dname_asc%26page%3D2/);
  assert.match(html, /\/admin\/users\/guest\/qa-guest-long-id\/activity\?directory=q%3Dqa%26role%3DALL%26status%3DALL%26identity%3DALL%26sort%3Dname_asc%26page%3D2/);
  assert.doesNotMatch(html, /activity=(?:user|guest)%3A/);
});

test("arrow footer has no duplicate count and retains sorting and filters across page links", () => {
  const html = renderToStaticMarkup(createElement(AdminIdentityTable, props));
  assert.match(html, /Identities \(231\)/);
  assert.match(html, /Pg2 of 3/);
  assert.doesNotMatch(html, /matching identities/i);
  assert.doesNotMatch(html, />Previous<|>Next</);
  assert.match(html, /aria-label="Previous page"/);
  assert.match(html, /aria-label="Next page"/);
  for (const page of [1, 3]) {
    assert.ok(
      html.includes(
        `q=qa&amp;role=ALL&amp;status=ALL&amp;identity=ALL&amp;sort=name_asc&amp;page=${page}`,
      ),
    );
  }
  assert.match(html, /colSpan="6"/i);
});

test("Sort by auto-submit form preserves filters, selected option and resets to first page", () => {
  const html = renderToStaticMarkup(createElement(AdminIdentityTable, props));
  const sortForm = html.match(/<form[^>]*action="\/admin\/users"[^>]*>[\s\S]*?<\/form>/)?.[0] || "";
  assert.match(sortForm, /Sort by/);
  assert.match(sortForm, /name="q" value="qa"/);
  assert.match(sortForm, /name="role" value="ALL"/);
  assert.match(sortForm, /name="status" value="ALL"/);
  assert.match(sortForm, /name="identity" value="ALL"/);
  assert.match(sortForm, /name="sort"/);
  assert.match(sortForm, /<option value="name_asc" selected=""/);
  assert.doesNotMatch(sortForm, /name="page"/);
  for (const option of ["newest", "oldest", "name_asc", "name_desc"]) {
    assert.match(sortForm, new RegExp(`value="${option}"`));
  }
});

test("under 100 identities occupy one page with both arrows unavailable", () => {
  const html = renderToStaticMarkup(
    createElement(AdminIdentityTable, { ...props, page: 1, count: 30, pageHref: "/admin/users?sort=name_asc&page=1" }),
  );
  assert.match(html, /Pg1 of 1/);
  assert.match(html, /aria-label="Previous page unavailable"/);
  assert.match(html, /aria-label="Next page unavailable"/);
  assert.doesNotMatch(html, /<a[^>]*aria-label="(?:Previous|Next) page"/);
});

test("a 125-identity directory has a second page but no configurable rows menu", () => {
  const html = renderToStaticMarkup(
    createElement(AdminIdentityTable, { ...props, page: 1, count: 125, pageHref: "/admin/users?sort=newest&page=1" }),
  );
  assert.match(html, /Pg1 of 2/);
  assert.match(html, /aria-label="Next page"/);
  assert.match(html, /sort=newest&amp;page=2/);
  assert.doesNotMatch(html, /Rows per page|per page|15 rows|50 rows|100 rows/i);
});

test("empty directory has an accessible empty state and disabled pagination", () => {
  const html = renderToStaticMarkup(
    createElement(AdminIdentityTable, { ...props, page: 1, count: 0 }),
  );
  assert.match(html, /No identities match these filters/);
  assert.match(html, /Pg1 of 1/);
  assert.doesNotMatch(html, /matching identities/i);
  assert.match(html, /aria-label="Previous page unavailable"/);
  assert.match(html, /aria-label="Next page unavailable"/);
});
