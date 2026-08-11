import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(root, "../..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("mobile package and Expo config advertise only Android and iOS", () => {
  const packageJson = JSON.parse(read("package.json"));
  const appConfig = read("app.config.ts");
  assert.equal(packageJson.scripts.web, undefined);
  assert.equal(packageJson.dependencies["react-dom"], undefined);
  assert.match(appConfig, /platforms: \["android", "ios"\]/);
});

test("release policy fails closed for iOS Production and preserves approved identities", () => {
  const policy = JSON.parse(read("release-policy.json"));
  const appConfig = read("app.config.ts");
  assert.deepEqual(policy.preview.supportedPlatforms, ["android", "ios"]);
  assert.deepEqual(policy.production.supportedPlatforms, ["android"]);
  assert.equal(policy.preview.bundleIdentifier, "com.kurioticket.app.preview");
  assert.equal(policy.production.androidPackage, "com.kurioticket.app");
  assert.match(appConfig, /iOS Production is deferred/);
});

test("Issue 6 preserves product architecture and Travel Inspiration", () => {
  const packageJson = JSON.parse(readFileSync(resolve(repositoryRoot, "package.json"), "utf8"));
  assert.equal(packageJson.dependencies.valibot, undefined);
  for (const route of ["payment-methods.tsx", "saved-travelers.tsx", "explore-trip.tsx"]) assert.equal(existsSync(resolve(root, "app", route)), false);
  for (const route of ["welcome.tsx", "home.tsx", "connection-status.tsx"]) assert.equal(existsSync(resolve(root, "app", route)), true);
  assert.equal(existsSync(resolve(repositoryRoot, "src/app/api/cron/travel-inspiration/route.ts")), true);
  assert.match(readFileSync(resolve(repositoryRoot, "render.yaml"), "utf8"), /kurioticket-travel-inspiration/);
});
