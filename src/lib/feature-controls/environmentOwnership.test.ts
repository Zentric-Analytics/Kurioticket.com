import assert from "node:assert/strict";
import test from "node:test";
import { getRuntimeFeatureEnvironment } from "./service";
import { bootstrapFeatureControls } from "./bootstrap";
import { featureControlMutationSchema, validateFeatureControlMutationAuthorization } from "@/app/api/admin/feature-controls/route";

function withEnvironment(values: Record<string, string | undefined>, run: () => void) {
  const names = ["TRAVEL_PROVIDER_MODE", "NEXT_PUBLIC_APP_URL", "NEXTAUTH_URL"] as const;
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  Object.assign(process.env, values); try { run(); } finally { for (const name of names) { if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; } }
}

test("runtime ownership resolves staging only from trusted staging configuration", () => withEnvironment({ TRAVEL_PROVIDER_MODE: "staging", NEXT_PUBLIC_APP_URL: "https://staging.kurioticket.com" }, () => assert.equal(getRuntimeFeatureEnvironment(), "STAGING")));
test("production runtime owns only production controls", () => withEnvironment({ TRAVEL_PROVIDER_MODE: "production", NEXT_PUBLIC_APP_URL: "https://kurioticket.com", NEXTAUTH_URL: "https://kurioticket.com" }, () => assert.equal(getRuntimeFeatureEnvironment(), "PRODUCTION")));
test("admin payload cannot spoof either remote environment", () => {
  assert.equal(featureControlMutationSchema.safeParse({ key: "FLIGHT_SEARCH_ENABLED", enabled: false, environment: "PRODUCTION" }).success, false);
  assert.equal(featureControlMutationSchema.safeParse({ key: "FLIGHT_SEARCH_ENABLED", enabled: false, environment: "STAGING" }).success, false);
});
test("staging authorization cannot become a production mutation and production remains fail closed", () => {
  const previous = process.env.FEATURE_CONTROL_PRODUCTION_ADMINS;
  process.env.FEATURE_CONTROL_PRODUCTION_ADMINS = "controller@example.com";
  try {
    assert.equal(validateFeatureControlMutationAuthorization("STAGING", "admin@example.com"), null);
    assert.equal(validateFeatureControlMutationAuthorization("PRODUCTION", "admin@example.com", "reason")?.status, 403);
    assert.equal(validateFeatureControlMutationAuthorization("PRODUCTION", "controller@example.com", "  ")?.status, 400);
    assert.equal(validateFeatureControlMutationAuthorization("PRODUCTION", "CONTROLLER@example.com", "incident response"), null);
  } finally { if (previous === undefined) delete process.env.FEATURE_CONTROL_PRODUCTION_ADMINS; else process.env.FEATURE_CONTROL_PRODUCTION_ADMINS = previous; }
});
test("bootstrap claims legacy state and creates only the deployment-local rows", async () => {
  const operations: Array<Record<string, unknown>> = [];
  const tx = { $queryRaw: async () => undefined, featureFlag: { updateMany: async (args: Record<string, unknown>) => { operations.push({ updateMany: args }); return { count: 1 }; }, upsert: async (args: Record<string, unknown>) => { operations.push({ upsert: args }); return {}; } } };
  await bootstrapFeatureControls({ $transaction: async (run: (client: typeof tx) => Promise<unknown>) => run(tx) } as never, "STAGING");
  assert.deepEqual((operations[0].updateMany as { data: { environment: string } }).data, { environment: "STAGING" });
  assert.equal(operations.filter((operation) => operation.upsert).length, 9);
  assert.ok(operations.slice(1).every((operation) => JSON.stringify(operation).includes('"environment":"STAGING"') && !JSON.stringify(operation).includes('"environment":"PRODUCTION"')));
});
