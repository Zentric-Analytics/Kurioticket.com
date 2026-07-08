#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildMarketImageRolloutPlan } = jiti("../src/data/images/marketImageRolloutPlanner.ts");

const result = buildMarketImageRolloutPlan();

console.log("Market image rollout plan");
console.log(`Ready markets: ${result.readyMarkets.length}`);
console.log(`Blocked markets: ${result.blockedMarkets.length}`);
console.log("");

for (const market of result.markets) {
  const status = market.readyForPromotion ? "ready" : "blocked";
  console.log(`${market.market}: ${status}`);
  console.log(`  approved images: ${market.approvedImages}/${market.totalRequiredImages}`);
  console.log(`  missing images: ${market.missingImages}`);
  console.log(`  staged batches: ${market.stagedBatches}`);
  console.log(`  staged entries: ${market.stagedEntries}`);

  if (market.blockers.length > 0) {
    console.log("  blockers:");
    for (const blocker of market.blockers) console.log(`  - ${blocker}`);
  }

  console.log("");
}
