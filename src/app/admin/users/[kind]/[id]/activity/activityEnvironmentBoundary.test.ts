import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const timeline = readFileSync(new URL("../../../../../../components/admin/ActivityTimeline.tsx", import.meta.url), "utf8");
const reader = readFileSync(new URL("../../../../../../services/adminIdentityActivityService.ts", import.meta.url), "utf8");
const filters = readFileSync(new URL("../../../../../../lib/adminIdentityActivity.ts", import.meta.url), "utf8");

test("Activity Explorer identifies its environment without repeating the visitor type or inventing history", () => {
  assert.match(page, /kind === "guest" \? "Visitor" : data.title/);
  assert.match(page, /Analytics consent/);
  assert.doesNotMatch(page, /Guest · Not an account|Unregistered visitor with active analytics consent/);
  assert.match(timeline, /No activity recorded in this view/);
  assert.match(timeline, /No matching recorded activity is currently linked to this identity in \{environment\}/);
  assert.match(page, /Only recorded, consented \{environment\} activity is displayed/);
  assert.match(page, /Missing records do not establish that no visit occurred/);
});

test("the activity reader never includes cross-environment or unowned history in an identity timeline", () => {
  assert.match(reader, /const environment = getPublicEnvironment\(\)/);
  assert.match(reader, /const environmentScope = activityEnvironmentScope\(environment\)/);
  assert.match(reader, /searchOwner, environmentScope\.search/);
  assert.match(reader, /redirectOwner, environmentScope\.handoff/);
  assert.match(reader, /analyticsOwner, environmentScope\.analytics/);
  assert.match(reader, /scopedJourneyOwner/);
  assert.match(filters, /metadata: \{ path: \["environment"\], equals: environment \}/);
  assert.match(filters, /query: \{ path: \["environment"\], equals: environment \}/);
});
