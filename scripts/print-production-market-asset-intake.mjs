#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);

const {
  productionAssetIntakeMarkets,
  productionMarketAssetRequirements,
} = jiti("../src/data/images/productionMarketAssetRequirements.ts");

const requirementsByMarket = new Map();

for (const requirement of productionMarketAssetRequirements) {
  const current = requirementsByMarket.get(requirement.market) ?? [];
  current.push(requirement);
  requirementsByMarket.set(requirement.market, current);
}

console.log("Kurioticket production market asset intake");
console.log("=========================================");
console.log(`Markets: ${productionAssetIntakeMarkets.length}`);
console.log(`Requirement groups: ${productionMarketAssetRequirements.length}`);
console.log(
  `Total minimum images requested: ${productionMarketAssetRequirements.reduce(
    (total, requirement) => total + requirement.requiredCount,
    0,
  )}`,
);

for (const market of productionAssetIntakeMarkets) {
  const requirements = requirementsByMarket.get(market) ?? [];
  console.log(`\n${market}`);
  console.log("-".repeat(market.length));

  for (const requirement of requirements) {
    console.log(
      `- ${requirement.usage}: ${requirement.requiredCount} image(s), ${requirement.priority}, status=${requirement.status}`,
    );
    console.log(`  Brief: ${requirement.brief}`);
    console.log(`  Must have: ${requirement.mustHave.join("; ")}`);
    console.log(`  Must avoid: ${requirement.mustAvoid.join("; ")}`);
    console.log(`  Aspect ratios: ${requirement.recommendedAspectRatios.join(", ")}`);
  }
}

console.log("\nProduction approval rule");
console.log("- Do not mark any requirement production-approved until the image file is uploaded, registered, licensed, and desktop/mobile crop-approved.");
