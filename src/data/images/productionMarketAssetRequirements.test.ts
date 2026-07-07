import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getProductionAssetRequirementsForMarket,
  productionAssetIntakeMarkets,
  productionMarketAssetRequirements,
} from "./productionMarketAssetRequirements";

describe("productionMarketAssetRequirements", () => {
  it("defines three production asset requirement groups for each intake market", () => {
    assert.equal(productionMarketAssetRequirements.length, productionAssetIntakeMarkets.length * 3);

    for (const market of productionAssetIntakeMarkets) {
      assert.equal(getProductionAssetRequirementsForMarket(market).length, 3);
    }
  });

  it("requires homepage hero, destination card, and flight inspiration assets for each market", () => {
    for (const market of productionAssetIntakeMarkets) {
      const usages = getProductionAssetRequirementsForMarket(market).map((requirement) => requirement.usage);

      assert.deepEqual(usages, [
        "homepage-hero",
        "homepage-destination-card",
        "flight-inspiration-card",
      ]);
    }
  });

  it("keeps every production asset requirement in needed status until real assets are approved", () => {
    assert.ok(
      productionMarketAssetRequirements.every((requirement) => requirement.status === "needed"),
    );
  });
});
