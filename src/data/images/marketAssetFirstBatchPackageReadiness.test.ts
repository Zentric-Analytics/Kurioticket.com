import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkMarketAssetFirstBatchPackageReadiness } from "./marketAssetFirstBatchPackageReadiness";

describe("checkMarketAssetFirstBatchPackageReadiness", () => {
  it("fails when required first batch files are missing", () => {
    const result = checkMarketAssetFirstBatchPackageReadiness({
      handoff: true,
      transferChecklist: true,
      transferCompletions: false,
      manifest: false,
      status: true,
    });

    assert.equal(result.ready, false);
    assert.equal(result.requiredFileCount, 5);
    assert.equal(result.presentFileCount, 3);
    assert.deepEqual(result.missingFileIds, ["transferCompletions", "manifest"]);
  });

  it("passes when every required first batch file is present", () => {
    const result = checkMarketAssetFirstBatchPackageReadiness({
      handoff: true,
      transferChecklist: true,
      transferCompletions: true,
      manifest: true,
      status: true,
    });

    assert.equal(result.ready, true);
    assert.equal(result.requiredFileCount, 5);
    assert.equal(result.presentFileCount, 5);
    assert.deepEqual(result.missingFileIds, []);
    assert.equal(result.files[0].path, "intake-handoff-us-001.json");
  });

  it("supports custom file suffixes", () => {
    const result = checkMarketAssetFirstBatchPackageReadiness(
      {
        handoff: true,
        transferChecklist: true,
        transferCompletions: true,
        manifest: true,
        status: true,
      },
      { fileSuffix: "gb-001" },
    );

    assert.equal(result.files[0].path, "intake-handoff-gb-001.json");
    assert.equal(result.files[4].path, "first-batch-status-gb-001.json");
  });
});
