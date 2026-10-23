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
  count: 31,
  pageSize: 15,
  currentUserId: "qa-self",
  protectedEmails: [],
  pageHref: "/admin/users?q=qa&role=ALL&status=ALL&identity=ALL&page=2",
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
  assert.match(html, /\/admin\/users\/user\/qa-user-internal-id\/activity\?directory=q%3Dqa%26role%3DALL%26status%3DALL%26identity%3DALL%26page%3D2/);
  assert.match(html, /\/admin\/users\/guest\/qa-guest-long-id\/activity\?directory=q%3Dqa%26role%3DALL%26status%3DALL%26identity%3DALL%26page%3D2/);
  assert.doesNotMatch(html, /activity=(?:user|guest)%3A/);
});

test("footer preserves filters and gives matching identity counts on both page links", () => {
  const html = renderToStaticMarkup(createElement(AdminIdentityTable, props));
  assert.match(html, /Page 2 of 3/);
  assert.match(html, /31 matching identities/);
  for (const page of [1, 3]) {
    assert.ok(
      html.includes(
        `q=qa&amp;role=ALL&amp;status=ALL&amp;identity=ALL&amp;page=${page}`,
      ),
    );
  }
  assert.match(html, /colSpan="6"/i);
});

test("empty directory has an accessible empty state and no enabled pagination", () => {
  const html = renderToStaticMarkup(
    createElement(AdminIdentityTable, { ...props, page: 1, count: 0 }),
  );
  assert.match(html, /No identities match these filters/);
  assert.match(html, /Page 1 of 1/);
  assert.match(html, /0 matching identities/);
  assert.doesNotMatch(html, /<a[^>]*>Previous|<a[^>]*>Next/);
});
