import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMarketAssetHandoffTransferChecklist } from "./marketAssetHandoffTransferChecklist";
import { buildMarketAssetHandoffTransferCompletionTemplate } from "./marketAssetHandoffTransferCompletionTemplate";
import { buildMarketAssetIntakeHandoffTemplate } from "./marketAssetIntakeHandoffTemplate";

describe("buildMarketAssetHandoffTransferCompletionTemplate", () => {
  it("creates incomplete completion rows for every transfer checklist item", () => {
    const checklist = buildMarketAssetHandoffTransferChecklist(
      buildMarketAssetIntakeHandoffTemplate("US"),
    );

    const template = buildMarketAssetHandoffTransferCompletionTemplate(checklist);

    assert.equal(template.length, 104);
    assert.equal(template[0].completed, false);
    assert.ok(template.every((item) => item.completed === false));
    assert.ok(template[0].id.includes("source-path"));
  });

  it("supports precompleted completion templates", () => {
    const checklist = buildMarketAssetHandoffTransferChecklist(
      buildMarketAssetIntakeHandoffTemplate("US"),
    );

    const template = buildMarketAssetHandoffTransferCompletionTemplate(checklist, {
      completed: true,
    });

    assert.equal(template.length, 104);
    assert.ok(template.every((item) => item.completed === true));
  });
});
