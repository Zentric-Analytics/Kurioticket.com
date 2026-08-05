import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const badge = readFileSync("src/components/layout/StagingDeploymentBadge.tsx", "utf8");
const layout = readFileSync("src/app/layout.tsx", "utf8");

test("staging pages expose immutable build identity in the rendered UI", () => {
  assert.match(badge, /data-staging-commit=\{release\.commitSha\}/);
  assert.match(badge, /Staging build/);
  assert.match(badge, /if \(!release\?\.commitSha\) return null/);
  assert.match(layout, /<StagingDeploymentBadge \/>/);
});
