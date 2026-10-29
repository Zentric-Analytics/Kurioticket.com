import assert from "node:assert/strict";
import test from "node:test";
import { activityJourneyReturnHref } from "./adminActivityJourneyNavigation";

test("journey return keeps Activity identity and recognized filters", () => {
  const href = "/admin/users/guest/qa-visitor-0001/activity?tab=searches&q=LOS&product=FLIGHT&from=2026-10-01&to=2026-10-22&directory=tab%3Dguests";
  assert.deepEqual([...new URL(activityJourneyReturnHref(href)!, "https://kurioticket.test").searchParams].sort(), [...new URL(href, "https://kurioticket.test").searchParams].sort());
  assert.equal(activityJourneyReturnHref("/admin/users/user/qa-account-0001/activity"), "/admin/users/user/qa-account-0001/activity");
});
test("journey return rejects external, malformed and unrelated targets", () => {
  for (const input of [undefined, ["/admin/users/user/qa-account-0001/activity"], "https://evil.test", "//evil.test/admin/users/user/qa-account/activity", "/admin/users/invalid/qa-account/activity", "/admin/users/user/short/activity", "/admin/users/user/qa-account/activity/../delete", "/admin/users/user/qa-account/activity#fragment"]) {
    assert.equal(activityJourneyReturnHref(input), null);
  }
  assert.equal(activityJourneyReturnHref("/admin/users/user/qa-account/activity?redirect=https://evil.test&q=LOS"), "/admin/users/user/qa-account/activity?q=LOS");
});
