import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("Render staging uses deterministic build, pre-deploy migration, dev, and health contracts", () => {
  const render = readFileSync("render.yaml", "utf8");
  const staging = render.slice(render.indexOf("name: kurioticket-web-staging"));
  assert.match(staging, /branch: dev/);
  assert.match(staging, /autoDeploy: true/);
  assert.match(staging, /buildCommand: npm ci && npm run build/);
  assert.match(staging, /preDeployCommand: npm run db:deploy:render/);
  assert.match(staging, /startCommand: npm run start/);
  assert.match(staging, /healthCheckPath: \/api\/health/);
});

test("the web delivery runbook keeps web, mobile Preview, and Production status separate", () => {
  const runbook = readFileSync("apps/mobile/docs/team-web-staging-development-workflow.md", "utf8");
  assert.match(runbook, /Web staging: LIVE/);
  assert.match(runbook, /mobile Preview lanes are independent/);
  assert.match(runbook, /Production and `main` are unrelated/);
});
