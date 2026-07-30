import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync("src/components/admin/AdminPageShell.tsx", "utf8");

test("admin shell uses a responsive inline navigation instead of a drawer", () => {
  assert.match(shell, /<aside className="sticky top-0/);
  assert.match(shell, /lg:h-screen lg:w-\[280px\]/);
  assert.match(shell, /<nav className="flex gap-2 overflow-x-auto/);
  assert.match(shell, /lg:block/);
  assert.match(shell, /lg:overflow-y-auto/);
  assert.doesNotMatch(shell, /mobileOpen|Menu size|fixed inset-0|drawer|slide-over|aria-expanded/);
});

test("admin shell restores original branding and grouped navigation labels", () => {
  assert.match(shell, />Internal operations</);
  assert.match(shell, /adminNavigationGroups/);
  assert.doesNotMatch(shell, /Workspace|Travel inventory|Administration/);
});

test("admin topbar restores internal workspace controls", () => {
  assert.match(shell, />Kurioticket Admin</);
  assert.match(shell, />Secure internal workspace</);
  assert.match(shell, /placeholder="Search users, searches, providers\.\.\."/);
  assert.match(shell, /disabled aria-label="Notifications unavailable"/);
  assert.match(shell, /\{adminRole\}/);
  assert.match(shell, /aria-label="Open administrator profile menu"/);
});

test("administrator profile keeps all original destinations", () => {
  assert.match(shell, /href="\/admin\/settings" label="Admin settings"/);
  assert.match(shell, /href="\/admin\/logs" label="Audit logs"/);
  assert.match(shell, /href="\/" label="Switch to public site"/);
  assert.match(shell, /href="\/api\/auth\/signout" label="Logout"/);
});
