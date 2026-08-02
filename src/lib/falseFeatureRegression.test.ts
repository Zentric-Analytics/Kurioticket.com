import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("removed false-feature contracts do not return", () => {
  const packageJson = JSON.parse(read("package.json"));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const schema = read("prisma/schema.prisma");
  const mobileConfig = read("src/app/api/mobile/v1/config/route.ts");
  const flightNormalizer = read("src/services/travel/normalizeFlightResult.ts");
  const redirectRoute = read("src/app/api/redirect/route.ts");
  const hotelInventory = read("src/data/images/imageInventory.ts");

  assert.equal(dependencies.openai, undefined);
  assert.equal(dependencies.stripe, undefined);
  assert.doesNotMatch(schema, /\bisAiDraft\b/);
  assert.doesNotMatch(mobileConfig, /premiumSubscriptions/);
  assert.doesNotMatch(flightNormalizer, /images\.kiwi\.com/);
  assert.doesNotMatch(redirectRoute, /servedFromFallback/);
  assert.doesNotMatch(hotelInventory, /illustrative demo hotel/i);

  assert.match(schema, /model NewsletterSubscriber\s*{/);
  assert.match(read("src/app/api/newsletter/subscribe/route.ts"), /NewsletterSubscriber|newsletterSubscriber/);
  assert.match(read("src/lib/types.ts"), /premium-economy/);
  assert.match(
    read("prisma/migrations/20260802170000_remove_support_message_ai_draft/migration.sql"),
    /DROP COLUMN "isAiDraft"/,
  );
});
