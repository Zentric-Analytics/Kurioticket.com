import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

test("all ordinary root navigation is owned by the recovery boundary without changing safe-area presentation", () => {
  const source = readFileSync("app/_layout.tsx", "utf8");
  const ast = ts.createSourceFile("root.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found = 0;
  function visit(node: ts.Node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === "MobileRecoveryBoundary") {
      assert.ok(node.children.some(child => ts.isJsxElement(child) && child.openingElement.tagName.getText(ast) === "Stack")); found++;
    }
    node.forEachChild(visit);
  }
  visit(ast); assert.equal(found, 1);
  const boundary = readFileSync("src/features/auth/MobileRecoveryBoundary.tsx", "utf8");
  assert.match(boundary, /<SafeAreaView/); assert.match(boundary, /accessibilityRole="header"/); assert.match(boundary, /minHeight: 48/);
});

test("recovery restoration cannot report ordinary authenticated bootstrap success", () => {
  const api = readFileSync("src/features/auth/authApi.ts", "utf8");
  const restore = api.slice(api.indexOf("export async function restoreAuthenticatedSession"));
  assert.match(restore, /if \(result\.recovery\) \{ await writeSession\(\{ \.\.\.session, recovery: result\.recovery \}\); return false; \}/);
  const storage = readFileSync("src/storage/sessionStorage.ts", "utf8");
  assert.match(storage, /recovery\?: \{ deadline: string \}/);
});

test("ordinary deletion Keep action requires fresh authentication; only the recovery confirmation sends the mutation", () => {
  const security = readFileSync("src/features/profile/SecurityScreen.tsx", "utf8");
  const action = security.slice(security.indexOf("const reactivate = async"), security.indexOf("const date =", security.indexOf("const reactivate = async")));
  assert.match(action, /await clearSession\(\)/); assert.match(action, /router\.replace\(signInHref\("\/security"\)\)/);
  assert.doesNotMatch(action, /reactivateDeletion/);
  const api = readFileSync("src/api/travelApi.ts", "utf8");
  assert.match(api, /reactivateDeletion:[^\n]*JSON\.stringify\(\{confirmed:true\}\)/);
  const boundary = readFileSync("src/features/auth/MobileRecoveryBoundary.tsx", "utf8");
  assert.match(boundary, /if \(!verified \|\| busy \|\| complete\) return/);
  assert.equal((boundary.match(/await travelApi\.reactivateDeletion\(\)/g) || []).length, 1);
  assert.match(boundary, /"Keep account", \(\) => void recover\(\)/);
});
