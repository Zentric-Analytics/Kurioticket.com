import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  stagedProductionMarketImagePacks,
  stagedProductionMarketImages,
} from "./stagedProductionPacks";

describe("stagedProductionMarketImagePacks", () => {
  it("starts empty so no staged images become live by default", () => {
    assert.deepEqual(stagedProductionMarketImagePacks, []);
    assert.deepEqual(stagedProductionMarketImages, []);
  });
});
