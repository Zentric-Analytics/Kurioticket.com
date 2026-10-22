import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("shared profile metadata imports renderer-independent icon types", () => {
  const profile = readFileSync("apps/mobile/src/features/profile/profileModel.ts", "utf8");
  const types = readFileSync("apps/mobile/src/features/flow/flowIconTypes.ts", "utf8");
  const renderer = readFileSync("apps/mobile/src/features/flow/FlowIcon.tsx", "utf8");
  assert.match(profile, /import type \{ FlowIconName \} from "\.\.\/flow\/flowIconTypes"/);
  assert.doesNotMatch(types, /\bimport\b|react-native|<\w/);
  assert.match(renderer, /export type \{ FlowIconName \} from "\.\/flowIconTypes"/);
  assert.match(types, /export type FlowIconName/);
});
