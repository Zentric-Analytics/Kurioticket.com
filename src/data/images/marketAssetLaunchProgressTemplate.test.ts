import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMarketAssetPriorityLaunchQueue } from "./marketAssetPriorityLaunchQueue";
import { buildMarketAssetLaunchProgressTemplate } from "./marketAssetLaunchProgressTemplate";

describe("buildMarketAssetLaunchProgressTemplate", () => {
  it("creates planned progress rows for every priority launch batch", () => {
    const queue = buildMarketAssetPriorityLaunchQueue({ createdAt: "2026-07" });
    const template = buildMarketAssetLaunchProgressTemplate(queue);

    assert.equal(template.length, 100);
    assert.equal(template[0].batchId, "market-assets-2026-07-us-001");
    assert.equal(template[0].status, "planned");
    assert.ok(template.every((item) => item.status === "planned"));
  });

  it("supports a custom initial status", () => {
    const queue = buildMarketAssetPriorityLaunchQueue({
      createdAt: "2026-07",
      markets: ["US"],
    });
    const template = buildMarketAssetLaunchProgressTemplate(queue, {
      initialStatus: "template-generated",
    });

    assert.equal(template.length, 10);
    assert.ok(template.every((item) => item.status === "template-generated"));
  });
});
