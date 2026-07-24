import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync("src/components/admin/AdminPageShell.tsx", "utf8");
const adminLayout = readFileSync("src/app/admin/layout.tsx", "utf8");

test("admin desktop navbar uses a true three-column centered grid", () => {
  assert.match(shell, /md:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/);
  assert.match(shell, /<div className="min-w-0 justify-self-start">/);
  assert.match(shell, /aria-label="Admin navigation"/);
  assert.match(shell, /justify-self-center gap-3 md:flex md:translate-y-1.5 lg:gap-4/);
  assert.match(shell, /justify-self-end md:flex/);
  assert.doesNotMatch(shell, /justify-between gap-7/);
});


test("admin desktop center navigation applies only the shared vertical offset", () => {
  const desktopNav = shell.match(/<nav className="([^"]*)" aria-label="Admin navigation">/)?.[1] ?? "";
  const mobileDrawer = shell.match(/id="admin-mobile-menu-drawer"[\s\S]*?aria-label="Admin mobile navigation"/)?.[0] ?? "";

  assert.match(desktopNav, /justify-self-center/);
  assert.match(desktopNav, /md:translate-y-1\.5/);
  assert.match(desktopNav, /md:flex/);
  assert.doesNotMatch(desktopNav, /grid-rows|flex-col|absolute|ml-|pl-/);
  assert.doesNotMatch(mobileDrawer, /translate-y-1\.5/);
  assert.doesNotMatch(shell, /<div className="min-w-0 justify-self-start[^"]*translate-y/);
  assert.doesNotMatch(shell, /<div className="hidden shrink-0 items-center justify-self-end[^"]*translate-y/);
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

test("admin mobile removes rectangular Menu button and separates circular profile and hamburger controls", () => {
  assert.doesNotMatch(shell, /gap-2 rounded-xl border[\s\S]*>\s*\{mobileOpen \?[^]*Menu\s*<\/button>/);
  assert.doesNotMatch(shell, /<div id="admin-mobile-menu"/);
  assert.match(shell, /const \[mobileMenuOpen, setMobileMenuOpen\] = useState\(false\);/);
  assert.match(shell, /const \[mobileAccountOpen, setMobileAccountOpen\] = useState\(false\);/);
  assert.match(shell, /aria-controls="admin-mobile-account-drawer"/);
  assert.match(shell, /aria-controls="admin-mobile-menu-drawer"/);
  assert.match(shell, /h-10 w-10 cursor-pointer items-center justify-center rounded-full[^"]*md:hidden|<div className="flex items-center gap-3 md:hidden">/);
});

test("admin hamburger exposes dialog controls and portal drawer structure", () => {
  assert.match(shell, /aria-label=\{mobileMenuOpen \? "Close Admin mobile menu" : "Open Admin mobile menu"\}/);
  assert.match(shell, /aria-expanded=\{mobileMenuOpen\}/);
  assert.match(shell, /aria-controls="admin-mobile-menu-drawer"/);
  assert.match(shell, /aria-haspopup="dialog"/);
  assert.match(shell, /createPortal\(/);
  assert.match(shell, /className="fixed inset-0 z-\[70\] md:hidden" role="presentation"/);
  assert.match(shell, /className="absolute inset-0 h-full w-full cursor-default bg-slate-950\/45"/);
  assert.match(shell, /id="admin-mobile-menu-drawer"/);
  assert.match(shell, /role="dialog"/);
  assert.match(shell, /aria-modal="true"/);
  assert.match(shell, /fixed inset-y-0 end-0 z-\[80\] flex h-\[100dvh\] max-h-\[100dvh\] w-full max-w-md[^"]*md:hidden/);
  assert.match(shell, />Menu<\/h2>/);
});

test("admin mobile drawer renders only role-filtered admin hubs and closes after navigation", () => {
  assert.match(shell, /<AdminHubNavLink key=\{hub\.key\} hub=\{hub\} onNavigate=\{\(\) => setMobileMenuOpen\(false\)\} mobile \/>/);
  assert.match(shell, /aria-label="Admin mobile navigation"/);
  assert.match(shell, /min-h-12 px-2 py-2\.5 text-\[15px\] font-semibold leading-5/);
  assert.doesNotMatch(shell, /Flights|Hotels|Cars|Deals|Explore|Info & legal|CountryCurrencySelector|languageOpen/);
  assert.doesNotMatch(shell, /AdminProfileMenu adminEmail=\{adminEmail\} adminImage=\{adminImage\} displayName=\{displayName\} \/>\s*<\/div>\s*<\/div>\s*\) : null\}/);
});

test("admin mobile account drawer is separate and contains only admin profile actions", () => {
  assert.match(shell, /aria-expanded=\{mobileAccountOpen\}/);
  assert.match(shell, /aria-controls="admin-mobile-account-drawer"/);
  assert.match(shell, /aria-haspopup="dialog"/);
  assert.match(shell, /id="admin-mobile-account-drawer"/);
  assert.match(shell, /aria-label="Admin account menu"/);
  assert.match(shell, /\{displayName\}/);
  assert.match(shell, /\{adminEmail \|\| "No email available"\}/);
  assert.match(shell, /<AdminAccountDrawerLink href="\/admin\/system" label="System" icon=\{Settings\} onNavigate=\{\(\) => setMobileAccountOpen\(false\)\} \/>/);
  assert.match(shell, /<AdminAccountDrawerLink href="\/admin\/logs" label="Audit logs" icon=\{ShieldCheck\} onNavigate=\{\(\) => setMobileAccountOpen\(false\)\} \/>/);
  assert.match(shell, /<AdminAccountDrawerLink href="\/" label="Switch to public site" icon=\{Building2\} onNavigate=\{\(\) => setMobileAccountOpen\(false\)\} \/>/);
  assert.match(shell, /<AdminAccountDrawerLink href="\/api\/auth\/signout" label="Logout" icon=\{LogOut\} onNavigate=\{\(\) => setMobileAccountOpen\(false\)\} \/>/);
  assert.doesNotMatch(shell, /dashboard\/account|saved\?from=account|priceAlerts|recentSearches/);
});

test("admin mobile panels close on route changes, Escape, backdrop, and lock body scroll", () => {
  assert.match(shell, /useEffect\(\(\) => \{\n\s*const closePanelsOnRouteChange = window\.setTimeout/);
  assert.match(shell, /\}, \[pathname\]\);/);
  assert.match(shell, /const previousOverflow = document\.body\.style\.overflow;/);
  assert.match(shell, /document\.body\.style\.overflow = "hidden";/);
  assert.match(shell, /event\.key === "Escape"/);
  assert.match(shell, /setMobileMenuOpen\(false\);\n\s*setMobileAccountOpen\(false\);/);
  assert.match(shell, /document\.body\.style\.overflow = previousOverflow;/);
  assert.match(shell, /aria-label="Close Admin mobile menu backdrop"[\s\S]*onClick=\{\(\) => setMobileMenuOpen\(false\)\}/);
  assert.match(shell, /aria-label="Close Admin account backdrop"[\s\S]*onClick=\{\(\) => setMobileAccountOpen\(false\)\}/);
});
