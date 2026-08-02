import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// AdminPageShell.tsx is a compatibility barrel after the approved pre-July-16 rollback.
const shell = readFileSync("src/components/admin/AdminPageShellHistorical.tsx", "utf8");

test("admin shell uses a responsive inline navigation instead of a drawer", () => {
  assert.match(shell, /<aside className="sticky top-0/);
  assert.match(shell, /lg:grid-cols-\[280px_1fr\]/);
  assert.match(shell, /lg:h-screen/);
  assert.match(shell, /<nav className="flex gap-2 overflow-x-auto/);
  assert.match(shell, /lg:block/);
  assert.match(shell, /lg:overflow-y-auto/);
  assert.doesNotMatch(shell, /mobileOpen|Menu size|fixed inset-0|drawer|slide-over|aria-expanded/);
});

test("admin shell restores original branding and grouped navigation labels", () => {
  assert.match(shell, />Internal operations</);
  assert.match(shell, /const grouped = items\.reduce/);
  assert.match(shell, /sectionLabels\[section\]/);
  assert.doesNotMatch(shell, /Workspace|Travel inventory|Administration/);
});

test("admin topbar restores internal workspace controls", () => {
  assert.match(shell, />Kurioticket Admin</);
  assert.match(shell, />Secure internal workspace</);
  assert.match(shell, /placeholder="Search users, searches, providers\.\.\."/);
  assert.match(shell, /disabled[\s\S]*?aria-label="Notifications unavailable"/);
  assert.match(shell, /\{adminRole\}/);
  assert.match(shell, /<details className=\{`relative \$\{className\}`\}>/);
  assert.match(shell, /<summary className="flex h-10 cursor-pointer/);
});

test("administrator profile keeps all original destinations", () => {
  assert.match(shell, /href="\/admin\/settings" label="Admin settings"/);
  assert.match(shell, /href="\/admin\/logs" label="Audit logs"/);
  assert.match(shell, /href="\/" label="Switch to public site"/);
  assert.match(shell, /href="\/api\/auth\/signout" label="Logout"/);
});
