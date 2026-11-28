import assert from "node:assert/strict";
import test from "node:test";
import { activitySignals, coverageProblems } from "./check-activity-coverage.mjs";

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
  assert.equal(coverageProblems(discovered, policy, { [path]: signals[0].id }).length, 4);
  for (const signal of signals.slice(1)) {
    policy.reviews[path + "#" + signal.id] = signal.kind.includes("audit") && signal.expression.includes("AuditLog")
      ? { exclusion: "Existing admin audit outside behavioral monitoring" }
      : { definition: "customer.section-visit" };
  }
  assert.deepEqual(coverageProblems(discovered, policy, { [path]: signals[0].id }), []);
});
