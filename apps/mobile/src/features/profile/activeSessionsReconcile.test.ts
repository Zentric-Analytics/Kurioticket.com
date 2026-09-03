import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/profile/SecurityScreen.tsx", "utf8");
const action = source.slice(source.indexOf("const signOutOthers"), source.indexOf("const all"));

test("successful sign-out-others immediately removes non-current session cards before refresh", () => {
  assert.match(action, /setSessions\(current=>current\.filter\(item=>item\.isCurrent\)\)/);
  assert.match(action, /setManagedSession\(null\)/);
  assert.match(action, /void load\(\{showLandingFeedback:false,showLoading:false\}\)/);
});

test("failed sign-out-others does not clear the existing session list", () => {
  const catchBranch = action.slice(action.indexOf(".catch"));
  assert.doesNotMatch(catchBranch, /setSessions/);
  assert.match(catchBranch, /setDevicesError\(c\.signOutOthersFailed\)/);
});
