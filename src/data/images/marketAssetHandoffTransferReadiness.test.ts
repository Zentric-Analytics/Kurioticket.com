import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMarketAssetHandoffTransferChecklist } from "./marketAssetHandoffTransferChecklist";
import { checkMarketAssetHandoffTransferReadiness } from "./marketAssetHandoffTransferReadiness";
import { buildMarketAssetIntakeHandoffTemplate } from "./marketAssetIntakeHandoffTemplate";

describe("checkMarketAssetHandoffTransferReadiness", () => {
  it("fails when transfer checklist completions are missing", () => {
    const checklist = buildMarketAssetHandoffTransferChecklist(
      buildMarketAssetIntakeHandoffTemplate("US"),
    );

    const result = checkMarketAssetHandoffTransferReadiness(checklist);

    assert.equal(result.ready, false);
    assert.equal(result.totalChecks, 104);
    assert.equal(result.completedChecks, 0);
    assert.equal(result.remainingChecks, 104);
    assert.ok(result.missingCheckIds[0].includes("source-path"));
  });

  it("passes when every transfer checklist item is completed", () => {
    const checklist = buildMarketAssetHandoffTransferChecklist(
      buildMarketAssetIntakeHandoffTemplate("US"),
    );
    const completions = checklist.entries.flatMap((entry) =>
      entry.checklist.map((item) => ({ id: item.id, completed: true })),
    );

    const result = checkMarketAssetHandoffTransferReadiness(checklist, completions);

    assert.equal(result.ready, true);
    assert.equal(result.totalChecks, 104);
    assert.equal(result.completedChecks, 104);
    assert.equal(result.remainingChecks, 0);
    assert.deepEqual(result.missingCheckIds, []);
  });
});
