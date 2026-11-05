import assert from "node:assert/strict";
import test from "node:test";
import { alertSourceHref } from "./adminAlertNavigation";

test("global alert self-links are not rendered as investigation actions", () => {
  for (const href of ["/admin/notifications", "/admin/notifications/", "/admin/notifications?view=all", "/admin/notifications#issue"]) assert.equal(alertSourceHref(href), null);
});
test("real diagnostics retain their query and section context", () => {
  for (const href of ["/admin/system#service-health-heading", "/admin/providers", "/admin/confirmed-trips/monitoring?panel=flight#flight-status-overview-title", "/admin/support?priority=URGENT&status=OPEN"]) assert.equal(alertSourceHref(href), href);
});
test("untrusted or non-admin destinations do not become alert links", () => {
  for (const href of ["", "javascript:alert(1)", "https://example.com", "//example.com", "/admin/../auth", "/admin\\notifications", "/admin/notifications/../notifications"]) assert.equal(alertSourceHref(href), null);
});
