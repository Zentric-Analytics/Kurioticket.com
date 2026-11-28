import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { activitySignals, coverageProblems, verifyAuditedBaseline } from "./check-activity-coverage.mjs";

const baseline = () => ({
  routes: { admin: { deferred: ["src/app/admin/page.tsx"] }, web: {}, native: {} },
  routeExclusions: {},
  activityDefinitions: { "customer.section-visit": "Meaningful customer subsection" },
  reviews: {},
});

test("new admin, customer and native routes require an explicit definition", () => {
  const paths = { "src/app/admin/page.tsx": "admin", "src/app/admin/users/page.tsx": "admin",
    "src/app/guide/page.tsx": "web", "apps/mobile/app/guide.tsx": "native" };
  const policy = baseline();
  assert.equal(coverageProblems({ routes: paths, signals: {} }, policy, {}).length, 3);
  policy.routes.admin.observed = ["src/app/admin/users/page.tsx"];
  policy.routes.web.deferred = ["src/app/guide/page.tsx"];
  policy.routes.native.excluded = ["apps/mobile/app/guide.tsx"];
  assert.deepEqual(coverageProblems({ routes: paths, signals: {} }, policy, {}), [
    "Invalid Phase 1 route disposition admin/observed",
    "Document why the route is excluded apps/mobile/app/guide.tsx",
  ]);
  delete policy.routes.admin.observed;
  policy.routes.admin.deferred.push("src/app/admin/users/page.tsx");
  policy.routeExclusions["apps/mobile/app/guide.tsx"] = "Alias that redirects to the canonical guide";
  assert.deepEqual(coverageProblems({ routes: paths, signals: {} }, policy, {}), []);
});

test("same-route controls, destination links and audit writers require distinct reviews", () => {
  const path = "src/components/Example.tsx";
  const signals = activitySignals(path, `
    const view = <Link href="/guide" onClick={() => setActiveTab("reviews")} />;
    router.push("/guide");
    writeAdminAuditLog({ action: "CMS_PUBLISH" });
  `);
  assert.equal(signals.length, 5);
  const policy = baseline();
  const discovered = { routes: { "src/app/admin/page.tsx": "admin" }, signals: { [path]: signals } };
  const auditedCounts = { [path]: { [signals[0].id]: 1 } };
  assert.equal(coverageProblems(discovered, policy, auditedCounts).length, 4);
  for (const signal of signals.slice(1)) {
    policy.reviews[path + "#" + signal.id] = signal.kind.includes("audit") && signal.expression.includes("AuditLog")
      ? { exclusion: "Existing admin audit outside behavioral monitoring" }
      : { definition: "customer.section-visit" };
  }
  assert.deepEqual(coverageProblems(discovered, policy, auditedCounts), []);
});

test("the audited baseline verifies against Git and rejects unverified evidence", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const read = path => JSON.parse(readFileSync(join(root, "config/activity-tracking", path), "utf8"));
  const baselinePolicy = read("definitions.json");
  const manifest = read("audited-signals.json");
  const counts = verifyAuditedBaseline(root, baselinePolicy, manifest);
  assert.equal(Object.keys(counts).length, Object.keys(manifest).length);

  const newSource = "src/components/ActivityCoverageTestFixture.tsx";
  const [newSignal] = activitySignals(newSource, 'router.push("/new-destination");');
  const discovered = { routes: {}, signals: { [newSource]: [newSignal] } };
  assert.equal(coverageProblems(discovered, { ...baselinePolicy, routes: {} }, counts).length, 1);
  assert.throws(() => verifyAuditedBaseline(root, baselinePolicy, { ...manifest, [newSource]: newSignal.id }),
    /baseline differs/);
  assert.throws(() => verifyAuditedBaseline(root, baselinePolicy, null), /baseline differs/);
  const changedPolicy = structuredClone(baselinePolicy);
  changedPolicy.auditMatrix.admin.sha256 = "0".repeat(64);
  assert.throws(() => verifyAuditedBaseline(root, changedPolicy, manifest), /revision or matrix differs/);
  assert.throws(() => verifyAuditedBaseline(root, { ...baselinePolicy, auditedRevision: "HEAD" }, manifest),
    /revision or matrix differs/);

  const withoutGit = mkdtempSync(join(tmpdir(), "activity-coverage-"));
  try {
    assert.throws(() => verifyAuditedBaseline(withoutGit, baselinePolicy, manifest), /Cannot read the audited Git revision/);
  } finally {
    rmSync(withoutGit, { recursive: true, force: true });
  }
});

test("an additional occurrence of an audited expression needs a review", () => {
  const path = "src/components/Example.tsx";
  const [signal] = activitySignals(path, 'router.push("/guide"); router.push("/guide");');
  const discovered = { routes: { "src/app/admin/page.tsx": "admin" }, signals: { [path]: [signal] } };
  const policy = baseline();
  const counts = { [path]: { [signal.id]: 1 } };
  const key = path + "#" + signal.id;
  assert.equal(coverageProblems(discovered, policy, counts).length, 1);
  policy.activityDefinitions.invalid = "";
  policy.reviews[key] = { definition: "invalid" };
  assert.equal(coverageProblems(discovered, policy, counts).length, 1);
  policy.reviews[key] = { definition: "customer.section-visit", exclusion: "" };
  assert.equal(coverageProblems(discovered, policy, counts).length, 1);
  policy.reviews[key] = { definition: "customer.section-visit" };
  assert.deepEqual(coverageProblems(discovered, policy, counts), []);
});
