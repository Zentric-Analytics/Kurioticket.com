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
  registeredCount: 17,
  guestCount: 214,
  identity: "ALL" as const,
  pageSize: 100,
  sort: "name_asc" as const,
  currentUserId: "qa-self",
  protectedEmails: [],
  pageHref: "/admin/users?q=qa&role=ALL&status=ALL&identity=ALL&sort=name_asc&page=2",
};
const at = new Date("2026-10-20T12:34:00Z");

const render = (overrides: Partial<typeof props> = {}) =>
  renderToStaticMarkup(createElement(AdminIdentityTable, { ...props, ...overrides }));

test("complete six-column table keeps identity, copy, role, status, dates, and activity links accessible", () => {
  const html = render({
    rows: [
      {
        kind: "user",
        record: { id: "qa-user-internal-id", name: "QA fixture", email: "qa@example.invalid",
          role: "SUPPORT", status: "ACTIVE", createdAt: at },
      },
      {
        kind: "guest",
        record: { id: "qa-guest-long-id", firstSeenAt: at, lastSeenAt: at },
      },
    ],
  } as Parameters<typeof render>[0]);
  assert.equal((html.match(/<th /g) || []).length, 6);
  for (const column of ["Identity", "Type", "Status", "Joined / First Seen", "Activity", "Actions"]) {
    assert.match(html, new RegExp(column.replace("/", "\\/")));
  }
  assert.match(html, /QA fixture/);
  assert.match(html, /qa@example.invalid/);
  assert.match(html, /Copy user ID: qa-user-internal-id/);
  assert.match(html, /Copy guest ID: qa-guest-long-id/);
  assert.match(html, /aria-label="Guest ID: qa-guest-long-id"/);
  assert.match(html, /Registered · Support/);
  assert.match(html, /Guest/);
  assert.match(html, /aria-label="No account status for guest visitor"/);
  assert.doesNotMatch(html, /Not an account/);
  assert.match(html, /text-\[#047857\]/);
  assert.match(html, /<time dateTime=/);
  assert.match(html, /\/admin\/users\/user\/qa-user-internal-id\/activity\?directory=q%3Dqa%26role%3DALL%26status%3DALL%26identity%3DALL%26sort%3Dname_asc%26page%3D2/);
  assert.match(html, /\/admin\/users\/guest\/qa-guest-long-id\/activity\?directory=q%3Dqa%26role%3DALL%26status%3DALL%26identity%3DALL%26sort%3Dname_asc%26page%3D2/);
  assert.match(html, /focus-ring inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-sm px-0.5 text-\[13px\] font-medium text-\[#004BB8\]/);
  assert.doesNotMatch(html, /activity=(?:user|guest)%3A/);
});

test("single toolbar gives three stable counts with underline-only active tab and one accessible table region", () => {
  const html = render();
  assert.match(html, /<h2 id="identity-directory-title" class="sr-only">Users directory<\/h2>/);
  assert.match(html, /aria-label="User types"/);
  assert.match(html, /All \(231\)/);
  assert.match(html, /Registered \(17\)/);
  assert.match(html, /Guests \(214\)/);
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  assert.equal((html.match(/aria-labelledby="identity-directory-title"/g) || []).length, 1);
  assert.match(html, /aria-current="page" class="[^"]*border-\[#004BB8\][^"]*">All \(231\)/);
  assert.match(html, /class="[^"]*border-transparent[^"]*">Registered \(17\)/);
  assert.match(html, /class="[^"]*border-transparent[^"]*">Guests \(214\)/);
  // Unselected and selected text must keep the SAME #020617 and normal weight.
  const links = [...html.matchAll(/<a[^>]*class="([^"]*)"[^>]*>(All|Registered|Guests) \([\d,]+\)<\/a>/g)];
  assert.equal(links.length, 3);
  for (const [, cls] of links) {
    assert.match(cls, /text-\[13px\] font-normal text-\[#020617\]/);
    assert.doesNotMatch(cls, /font-semibold|text-blue|text-indigo/);
  }
  assert.doesNotMatch(html, /Users: 231|17 registered · 214 guest|Identities \(231\)/);
  assert.doesNotMatch(html, /shadow-|rounded-2xl|font-mono|identity-type-select/);
});

test("tab navigation preserves applied search/role/status/sort, resets page 1, and does not filter within a row", () => {
  const html = render();
  for (const identity of ["ALL", "REGISTERED", "GUEST"]) {
    assert.match(html, new RegExp(`q=qa&amp;role=ALL&amp;status=ALL&amp;identity=${identity}&amp;sort=name_asc&amp;page=1`));
  }
  assert.equal((html.match(/aria-label="User types"/g) || []).length, 1);
  const onlyRegistered = render({ identity: "REGISTERED", count: 17, page: 1, pageHref: "/admin/users?q=qa&role=ALL&status=ALL&identity=REGISTERED&sort=name_asc&page=1" });
  assert.match(onlyRegistered, /Registered \(17\)/);
  assert.match(onlyRegistered, /Guests \(214\)/); // tab counts do not depend on selected identity
  assert.match(onlyRegistered, /aria-current="page" class="[^"]*border-\[#004BB8\][^"]*">Registered \(17\)/);
  const onlyGuests = render({ identity: "GUEST", count: 214, page: 1, pageHref: "/admin/users?q=qa&role=ALL&status=ALL&identity=GUEST&sort=name_asc&page=1" });
  assert.match(onlyGuests, /All \(231\)/);
  assert.match(onlyGuests, /Registered \(17\)/);
  assert.match(onlyGuests, /aria-current="page" class="[^"]*border-\[#004BB8\][^"]*">Guests \(214\)/);
});

test("pagination keeps 100 per page, filters and sorting, and compact arrow-only footer", () => {
  const html = render();
  assert.match(html, /Pg2 of 3/);
  assert.doesNotMatch(html, /matching identities|Rows per page|per page|15 rows/i);
  assert.doesNotMatch(html, />Previous<|>Next</);
  assert.match(html, /aria-label="Previous page"/);
  assert.match(html, /aria-label="Next page"/);
  for (const page of [1, 3]) {
    assert.ok(html.includes(`q=qa&amp;role=ALL&amp;status=ALL&amp;identity=ALL&amp;sort=name_asc&amp;page=${page}`));
  }
  assert.match(html, /colSpan="6"/i);
});

test("sort auto-submit form preserves query and selected cohort, resets the page", () => {
  const html = render();
  const form = html.match(/<form[^>]*action="\/admin\/users"[^>]*>[\s\S]*?<\/form>/)?.[0] || "";
  assert.match(form, /name="q" value="qa"/);
  assert.match(form, /name="role" value="ALL"/);
  assert.match(form, /name="status" value="ALL"/);
  assert.match(form, /name="identity" value="ALL"/);
  assert.match(form, /name="sort"/);
  assert.match(form, /<select/); // accessible native fallback before hydration
  assert.match(form, /<option value="name_asc" selected=""/);
  assert.match(form, /Apply sort/);
  assert.doesNotMatch(form, /name="page"/);
  for (const option of ["newest", "oldest", "name_asc", "name_desc"]) {
    assert.match(form, new RegExp(`value="${option}"`));
  }
});

test("small filtered directories show all rows on one page and reflect tab counts", () => {
  const html = render({
    page: 1, count: 12, identity: "REGISTERED", registeredCount: 12, guestCount: 18,
    pageHref: "/admin/users?identity=REGISTERED&sort=name_asc&page=1",
  });
  assert.match(html, /All \(30\)/);
  assert.match(html, /Registered \(12\)/);
  assert.match(html, /Guests \(18\)/);
  assert.match(html, /Pg1 of 1/);
  assert.match(html, /aria-label="Previous page unavailable"/);
  assert.match(html, /aria-label="Next page unavailable"/);
  assert.doesNotMatch(html, /<a[^>]*aria-label="(?:Previous|Next) page"/);
});

test("role/status cohort filters can hide guests without displaying a false guest count", () => {
  const html = render({
    count: 1, page: 1, identity: "ALL", registeredCount: 1, guestCount: 0,
    pageHref: "/admin/users?role=SUPPORT&status=ACTIVE&identity=ALL&sort=newest&page=1",
  });
  assert.match(html, /All \(1\)/);
  assert.match(html, /Registered \(1\)/);
  assert.match(html, /Guests \(0\)/);
  assert.match(html, /role=SUPPORT&amp;status=ACTIVE&amp;identity=GUEST&amp;sort=newest&amp;page=1/);
});

test("empty directory has a readable empty state and pagination stays disabled", () => {
  const html = render({ page: 1, count: 0, registeredCount: 0, guestCount: 0 });
  assert.match(html, /No users match these filters/);
  assert.match(html, /All \(0\)/);
  assert.match(html, /Pg1 of 1/);
  assert.match(html, /aria-label="Next page unavailable"/);
});
