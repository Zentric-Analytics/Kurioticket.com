import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync("src/components/admin/AdminPageShell.tsx", "utf8");
const adminLayout = readFileSync("src/app/admin/layout.tsx", "utf8");

test("admin desktop navbar uses a true three-column centered grid", () => {
  assert.match(shell, /md:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/);
  assert.match(shell, /<div className="min-w-0 justify-self-start">/);
  assert.match(shell, /aria-label="Admin navigation"/);
  assert.match(shell, /justify-self-center gap-3 md:flex lg:gap-4/);
  assert.match(shell, /justify-self-end md:flex/);
  assert.doesNotMatch(shell, /justify-between gap-7/);
  assert.doesNotMatch(shell, /fixed inset-y|sidebar|Sidebar/);
});

test("admin navbar keeps only Operations, Monitoring, and Platform hubs visible", () => {
  assert.match(shell, /hubs\.map\(\(hub\) => <AdminHubNavLink key=\{hub\.key\} hub=\{hub\} \/>\)/);
  assert.match(shell, /getAdminNavbarHubsForRole\(safeRole\)/);
  assert.doesNotMatch(shell, />Overview<|label="Overview"/);
});

test("admin desktop navigation copies public header typography and rounded pill styling", () => {
  assert.match(shell, /min-h-\[38px\] rounded-full px-3\.5 py-2 text-\[15px\] font-semibold leading-none tracking-\[-0\.005em\] lg:px-4/);
  assert.match(shell, /border-\[#DDE7F0\] bg-\[#F3F7FA\]\/70 text-\[#021C2B\]\/85 hover:border-\[#004BB8\]\/20 hover:bg-\[#004BB8\]\/5 hover:text-\[#021C2B\]/);
  assert.match(shell, /border-\[#004BB8\]\/18 bg-\[#004BB8\]\/6 text-\[#021C2B\]/);
  assert.doesNotMatch(shell, /rounded-xl text-sm font-bold transition",\n\s*mobile \? "min-h-11 px-3 py-2" : "px-3 py-2"/);
});

test("admin active-route and aria-current behavior remains unchanged", () => {
  assert.match(shell, /const active = getActiveAdminHub\(pathname\) === hub\.key;/);
  assert.match(shell, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(shell, /const active = pathname === "\/admin";/);
});

test("admin layout passes the authenticated profile image to the shell", () => {
  assert.match(adminLayout, /adminImage=\{session\.user\.image\}/);
  assert.match(shell, /adminImage\?: string \| null;/);
});

test("admin profile trigger matches public account control constraints", () => {
  assert.match(shell, /aria-label=\{profileLabel\}/);
  assert.match(shell, /aria-haspopup="menu"/);
  assert.match(shell, /aria-expanded=\{open\}/);
  assert.match(shell, /title=\{profileLabel\}/);
  assert.match(shell, /h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border border-transparent bg-transparent/);
  assert.match(shell, /h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-\[#F2F7FA\] text-\[11px\] font-black text-\[#004BB8\]/);
  assert.match(shell, /adminImage \? <AdminLogoImage src=\{adminImage\} alt="" className="h-full w-full object-cover" \/> : adminInitials/);
  assert.doesNotMatch(shell, /ChevronDown|role badge|Admin role|formatAdminBadgeLabel\(adminRole\)|\{displayName\}<\/summary>/);
});

test("admin profile initials use name or email split into up to two parts", () => {
  assert.match(shell, /function getAccountInitials\(name\?: string \| null, email\?: string \| null\)/);
  assert.match(shell, /const source = name\?\.trim\(\) \|\| email\?\.trim\(\) \|\| "Admin";/);
  assert.match(shell, /\.split\(\/\[\\s@\._-\]\+\/\)/);
  assert.match(shell, /\.slice\(0, 2\)/);
  assert.match(shell, /\.map\(\(part\) => part\.charAt\(0\)\.toUpperCase\(\)\)/);
});

test("admin profile menu destinations and dropdown presentation are preserved", () => {
  assert.match(shell, /role="menu"/);
  assert.match(shell, /w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white/);
  assert.match(shell, /<ProfileLink href="\/admin\/system" label="System" icon=\{Settings\} \/>/);
  assert.match(shell, /<ProfileLink href="\/admin\/logs" label="Audit logs" icon=\{ShieldCheck\} \/>/);
  assert.match(shell, /<ProfileLink href="\/" label="Switch to public site" icon=\{Building2\} \/>/);
  assert.match(shell, /<ProfileLink href="\/api\/auth\/signout" label="Logout" icon=\{LogOut\} \/>/);
  assert.match(shell, /role="menuitem"/);
  assert.match(shell, /hover:bg-\[#F2F7FA\]/);
});

test("admin mobile menu remains a temporary menu with nav and profile inside", () => {
  assert.match(shell, /aria-controls="admin-mobile-menu"/);
  assert.match(shell, /id="admin-mobile-menu"/);
  assert.match(shell, /aria-label="Admin mobile navigation"/);
  assert.match(shell, /<AdminHubNavLink key=\{hub\.key\} hub=\{hub\} onNavigate=\{\(\) => setMobileOpen\(false\)\} mobile \/>/);
  assert.match(shell, /<AdminProfileMenu adminEmail=\{adminEmail\} adminImage=\{adminImage\} displayName=\{displayName\} \/>/);
});
