import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actions = readFileSync("src/components/admin/UserStatusActions.tsx", "utf8");
const usersPage = readFileSync("src/app/admin/users/page.tsx", "utf8");

test("editable users render a labelled Manage button", () => {
  assert.match(actions, /if \(isSelf\) return/);
  assert.match(actions, /if \(isProtectedAdmin\) return/);
  assert.match(actions, /<AdminButton[^>]+aria-haspopup="menu"[^>]+aria-expanded=\{open\}/);
  assert.match(actions, />\s*Manage\s*<ChevronDown/);
});

test("the users table coordinates a single active row menu", () => {
  assert.match(usersPage, /<UsersActionsMenuProvider>/);
  assert.match(actions, /const \[activeUserId, setActiveUserId\] = useState<string \| null>\(null\)/);
  assert.match(actions, /const open = menuController\?\.activeUserId === userId/);
  assert.match(actions, /setActiveUserId\(open \? null : userId\)/);
  assert.match(actions, /setActiveUserId\(null\)/);
});

test("Escape closes the active menu and restores focus to Manage", () => {
  assert.match(actions, /event\.key !== "Escape"/);
  assert.match(actions, /document\.addEventListener\("keydown", closeOnEscape\)/);
  assert.match(actions, /document\.removeEventListener\("keydown", closeOnEscape\)/);
  assert.match(actions, /buttonRef\.current\?\.querySelector\("button"\)\?\.focus\(\)/);
});

test("soft delete uses the rose destructive treatment", () => {
  const softDelete = actions.match(/<button[^>]+onClick=\{\(\) => updateStatus\("DELETED"\)\}[^>]+>[\s\S]*?Soft delete[\s\S]*?<\/button>/)?.[0] ?? "";
  assert.match(softDelete, /text-rose-700/);
  assert.match(softDelete, /hover:bg-rose-50/);
});

test("the current admin has no Manage control", () => {
  assert.match(actions, /if \(isSelf\) return <span[^>]*>Current admin<\/span>/);
  assert.ok(actions.indexOf("if (isSelf) return") < actions.indexOf("Manage\n"));
});

test("a protected admin has no Manage control", () => {
  assert.match(actions, /if \(isProtectedAdmin\) return <span[^>]*>Protected admin<\/span>/);
  assert.ok(actions.indexOf("if (isProtectedAdmin) return") < actions.indexOf("Manage\n"));
});

test("ADMIN users expose role changes but not status or delete actions", () => {
  assert.match(actions, /const canChangeRole = !isSelf && !isProtectedAdmin && role === "ADMIN"/);
  assert.match(actions, /const canChangeStatus = !isSelf && !isProtectedAdmin && role !== "ADMIN"/);
  assert.match(actions, /const editableRoles = \["USER", "SUPPORT"\] as const/);
  assert.match(actions, /role === "ADMIN" \? <p[^>]*>Demote before status changes or permanent deletion\.<\/p>/);
});

test("deleted non-admin users can expose permanent delete", () => {
  assert.match(actions, /const canHardDelete = status === "DELETED" && !isSelf && !isProtectedAdmin && role !== "ADMIN"/);
  const permanentDeleteAction = actions.slice(actions.indexOf("{canHardDelete ?"), actions.indexOf("{showPermanentDelete"));
  assert.match(permanentDeleteAction, /role="menuitem"/);
  assert.match(permanentDeleteAction, />Permanent delete<\/button> : null\}/);
});

test("user action API endpoint strings are unchanged", () => {
  assert.match(actions, /`\/api\/admin\/users\/\$\{userId\}\/status`/);
  assert.match(actions, /`\/api\/admin\/users\/\$\{userId\}\/role`/);
  assert.match(actions, /`\/api\/admin\/users\/\$\{userId\}\/permanent`/);
});

test("confirmation requirements remain unchanged", () => {
  assert.match(actions, /nextStatus !== "ACTIVE" && !window\.confirm/);
  assert.match(actions, /window\.confirm\(`Confirm role change to \$\{nextRole\} for this user\?`\)/);
  assert.match(actions, /confirmation\.trim\(\)\.toLowerCase\(\) === email\.trim\(\)\.toLowerCase\(\)/);
  assert.match(actions, /confirmation === userId/);
  assert.match(actions, /email\?\.trim\(\) \? \{ confirmEmail: confirmation \} : \{ confirmUserId: confirmation \}/);
  assert.match(actions, /disabled=\{loading === "PERMANENT_DELETE" \|\| !confirmationMatches\}/);
});
