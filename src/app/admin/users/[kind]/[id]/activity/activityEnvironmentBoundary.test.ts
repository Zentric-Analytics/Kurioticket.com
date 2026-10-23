import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const timeline = readFileSync(new URL("../../../../../../components/admin/ActivityTimeline.tsx", import.meta.url), "utf8");
const reader = readFileSync(new URL("../../../../../../services/adminIdentityActivityService.ts", import.meta.url), "utf8");
const filters = readFileSync(new URL("../../../../../../lib/adminIdentityActivity.ts", import.meta.url), "utf8");

test("the customer timeline identifies its data environment near the account heading", () => {
  assert.match(page, /\{environment\} records<\/span>/);
  assert.match(timeline, /No recorded activity is linked to this identity here/);
  assert.match(timeline, /Searches without an eligible identity link, or those made on a different environment, will not appear here/);
  assert.match(page, /Only recorded \{environment\} events are displayed/);
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
