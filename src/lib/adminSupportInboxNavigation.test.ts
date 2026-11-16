import assert from "node:assert/strict";
import test from "node:test";
import {
  supportCategoryChoices,
  supportCategoryLabel,
  supportInboxHref,
  supportStatusTabs,
  supportPriorityOptions,
  supportTicketDetailHref,
  supportInboxReturnHref,
  supportDeletionRequestHref,
  supportTicketFromDeletionHref,
  supportTicketBackHref,
  deletionRequestBackHref,
} from "./adminSupportInboxNavigation";

test("Support categories use actual form and system-generated storage values", () => {
  const values = supportCategoryChoices("").map(option => option.value);
  assert.deepEqual(values, ["", "search-help", "price-alerts", "redirect", "account", "account_deletion"]);
  assert.equal(supportCategoryLabel("search-help"), "Search help");
  assert.equal(supportCategoryLabel("account_deletion"), "Account deletion");
  assert.equal(supportCategoryLabel("legacy_custom"), "Legacy custom");
  assert.equal(supportCategoryChoices("legacy_custom").at(-1)?.value, "legacy_custom");
});

test("Support tabs and priorities retain the backend's accepted values", () => {
  assert.deepEqual(supportStatusTabs.map(tab => tab.value), ["", "OPEN", "WAITING_ON_TEAM", "WAITING_ON_USER", "RESOLVED", "CLOSED"]);
  assert.deepEqual(supportPriorityOptions.map(option => option.value), ["", "LOW", "NORMAL", "HIGH", "URGENT"]);
});

test("Changing Support filters preserves other filters and clears the stale page cursor", () => {
  const base = new URLSearchParams("q=flight&status=OPEN&priority=HIGH&category=search-help&cursor=old-token&from=2026-10-01T00%3A00%3A00.000Z");
  const next = new URL(supportInboxHref(base, { category: "redirect" }), "https://example.test");
  assert.equal(next.pathname, "/admin/support");
  assert.equal(next.searchParams.get("q"), "flight");
  assert.equal(next.searchParams.get("status"), "OPEN");
  assert.equal(next.searchParams.get("priority"), "HIGH");
  assert.equal(next.searchParams.get("category"), "redirect");
  assert.equal(next.searchParams.get("cursor"), null);
  assert.ok(next.searchParams.get("from"));
  const all = new URL(supportInboxHref(base, { status: "", category: "", priority: "" }), "https://example.test");
  assert.equal(all.searchParams.get("status"), null);
  assert.equal(all.searchParams.get("category"), null);
  assert.equal(all.searchParams.get("priority"), null);
});


test("Support ticket detail returns to the exact filtered inbox, including pagination", () => {
  const params = new URLSearchParams("q=refund&status=OPEN&priority=HIGH&category=redirect&cursor=next-page&limit=25");
  const detail = new URL(supportTicketDetailHref("ticket-123", params), "https://kurioticket.test");
  assert.equal(detail.pathname, "/admin/support/ticket-123");
  const returned = new URL(supportInboxReturnHref(detail.searchParams.get("inbox") || undefined), "https://kurioticket.test");
  assert.equal(returned.pathname, "/admin/support");
  // Query order is canonicalized by the allowlist; every filter and cursor survives.
  assert.deepEqual([...returned.searchParams.entries()].sort(), [...params.entries()].sort());
});

test("Support detail return navigation cannot lead outside the Support inbox", () => {
  assert.equal(supportInboxReturnHref("https://evil.example/admin?next=1"), "/admin/support");
  assert.equal(supportInboxReturnHref("q=flight&redirect=https%3A%2F%2Fevil.example"), "/admin/support?q=flight");
  assert.equal(supportInboxReturnHref(undefined), "/admin/support");
});

test("Support deletion deep link returns to the verified originating ticket with its inbox filters", () => {
  const inbox = "q=help&status=OPEN&priority=HIGH&cursor=page-2&redirect=https%3A%2F%2Fevil.example";
  const link = new URL(supportDeletionRequestHref("deletion-1", inbox), "https://kurioticket.test");
  assert.equal(link.pathname, "/admin/account-deletions/deletion-1");
  assert.equal(link.searchParams.get("fromSupport"), "1");
  assert.equal(link.searchParams.get("inbox"), "status=OPEN&priority=HIGH&q=help&cursor=page-2");
  assert.equal(
    deletionRequestBackHref("ticket-1", link.searchParams.get("fromSupport") || undefined, link.searchParams.get("inbox") || undefined),
    supportTicketDetailHref("ticket-1", new URLSearchParams("status=OPEN&priority=HIGH&q=help&cursor=page-2")),
  );
});

test("Direct deletion visits return to requests; unrelated query parameters cannot redirect", () => {
  assert.equal(deletionRequestBackHref("ticket-1", undefined, undefined), "/admin/account-deletions");
  assert.equal(deletionRequestBackHref(null, "1", "q=hello"), "/admin/account-deletions");
  assert.equal(supportTicketBackHref("deletion-1", "deletion-2", "q=help"), "/admin/support?q=help");
  assert.equal(supportTicketBackHref("deletion-1", "deletion-1", "q=help"), "/admin/account-deletions/deletion-1");
  assert.equal(
    supportTicketFromDeletionHref("ticket-1", "deletion-1"),
    "/admin/support/ticket-1?fromDeletion=deletion-1",
  );
});

test("linked deletion round trip retains the original Support inbox and accurate navigation", () => {
  const originalInbox = "q=help&status=OPEN&priority=HIGH&cursor=page-2";
  const deletion = new URL(supportDeletionRequestHref("deletion-1", originalInbox), "https://kurioticket.test");
  const support = new URL(
    supportTicketFromDeletionHref("ticket-1", "deletion-1", deletion.searchParams.get("fromSupport") || undefined, deletion.searchParams.get("inbox") || undefined),
    "https://kurioticket.test",
  );
  assert.equal(support.pathname, "/admin/support/ticket-1");
  assert.equal(support.searchParams.get("fromDeletion"), "deletion-1");
  assert.equal(support.searchParams.get("fromSupport"), "1");
  assert.equal(support.searchParams.get("inbox"), "status=OPEN&priority=HIGH&q=help&cursor=page-2");

  const back = supportTicketBackHref(
    "deletion-1",
    support.searchParams.get("fromDeletion") || undefined,
    support.searchParams.get("inbox") || undefined,
    support.searchParams.get("fromSupport") || undefined,
  );
  assert.equal(back, deletion.pathname + deletion.search);
  const backToTicket = deletionRequestBackHref("ticket-1", "1", new URL(back, "https://kurioticket.test").searchParams.get("inbox") || undefined);
  assert.equal(backToTicket, supportTicketDetailHref("ticket-1", new URLSearchParams(originalInbox)));
  assert.equal(supportInboxReturnHref(new URL(backToTicket, "https://kurioticket.test").searchParams.get("inbox") || undefined),
    "/admin/support?status=OPEN&priority=HIGH&q=help&cursor=page-2");
});

test("direct deletion navigation does not invent an originating Support inbox", () => {
  assert.equal(supportTicketFromDeletionHref("ticket-1", "deletion-1", undefined, "q=private"),
    "/admin/support/ticket-1?fromDeletion=deletion-1");
  assert.equal(supportTicketBackHref("deletion-1", "deletion-1", "q=private"),
    "/admin/account-deletions/deletion-1");
  assert.equal(supportTicketBackHref("deletion-1", "other", "q=private", "1"), "/admin/support?q=private");
});
