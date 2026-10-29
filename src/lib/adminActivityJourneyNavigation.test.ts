import assert from "node:assert/strict";
import test from "node:test";
import { activityJourneyReturnHref, encodeActivityJourneyReturn, decodeActivityJourneyReturn } from "./adminActivityJourneyNavigation";

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


test("journey return preserves valid international search and directory context", () => {
  const params = new URLSearchParams({q:"旅".repeat(120),directory:"客".repeat(1000)});
  const href = "/admin/users/guest/qa-visitor-0001/activity?" + params;
  assert.ok(href.length > 2400);
  const returned = activityJourneyReturnHref(href);
  assert.ok(returned);
  assert.equal(new URL(returned, "https://kurioticket.test").searchParams.get("q"), "旅".repeat(120));
  assert.equal(new URL(returned, "https://kurioticket.test").searchParams.get("directory"), "客".repeat(1000));
});


test("compact context round-trips international filters and rejects invalid destinations", () => {
  const href = "/admin/users/guest/qa-visitor-0001/activity?" + new URLSearchParams({q:"旅".repeat(120),directory:"客".repeat(1000)});
  const token = encodeActivityJourneyReturn(href);
  assert.ok(token && token.length < 7000);
  assert.equal(decodeActivityJourneyReturn(token), href);
  assert.equal(decodeActivityJourneyReturn("/admin/users/user/qa-account/activity?q=LOS"), "/admin/users/user/qa-account/activity?q=LOS");
  for (const value of [null, "v1.invalid!", "v1."+"a".repeat(7000), "v1."+btoa(JSON.stringify({path:"https://evil.test",filters:{q:"LOS"}})), "v1."+btoa(JSON.stringify({path:"/admin/users/user/qa-account/activity",filters:{q:{nested:true}}}))]) {
    assert.equal(decodeActivityJourneyReturn(value),null);
  }
});
