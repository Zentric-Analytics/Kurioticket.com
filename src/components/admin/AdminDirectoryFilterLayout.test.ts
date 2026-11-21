import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const users = readFileSync("src/components/admin/AdminUsersToolbar.tsx", "utf8");
const cms = readFileSync("src/components/admin/ContentDirectoryToolbar.tsx", "utf8");
const homepage = readFileSync("src/app/admin/content/homepage/[section]/page.tsx", "utf8");
const faq = readFileSync("src/app/admin/content/faqs/page.tsx", "utf8");

test("Users Directory places search, date, role, status, and Apply on one desktop row", () => {
  assert.match(users, /data-testid="users-directory-filter-row"/);
  assert.match(users, /lg:grid-cols-\[minmax\(0,2fr\)_repeat\(3,minmax\(0,1fr\)\)_128px\]/);
  assert.match(users, /onClick=\{applyFilters\}/);
  assert.match(users, /initialServerSync\.current = false;/);
  assert.match(users, /if \(initialServerSync\.current\) \{/);
  assert.match(users, /const appliedStateKey = JSON\.stringify\(/);
  assert.match(users, /if \(appliedStateKey === lastAppliedStateKey\.current\) return;/);
  assert.match(users, /lastAppliedStateKey\.current = appliedStateKey;/);
  assert.match(users, /q: searchText\.trim\(\)\.slice\(0, 120\)/);
  assert.match(users, /type="button" onClick=\{applyFilters\}/);
  assert.match(users, /function onSearchSubmit\(event: FormEvent<HTMLFormElement>\) \{\s*\/\/ Enter must not submit a draft\.[\s\S]*?event\.preventDefault\(\)/);
  assert.doesNotMatch(users, /setTimeout|setInterval|router\.replace/);
  assert.match(users, /onValueChange=\{setDraftRole\}/);
  assert.match(users, /onValueChange=\{setDraftStatus\}/);
  assert.match(users, /setDraftDate\(next as AdminIdentityDate\)/);
  assert.match(users, /if \(draftDate === "custom" && !validCustom\)/);
  assert.match(users, /<nav aria-label="User types"/);
  assert.ok(users.indexOf('data-testid="users-directory-filter-row"') < users.indexOf('<nav aria-label="User types"'));
  assert.match(users, /tab === "GUEST"/);
  assert.match(users, /Status not applicable/);
  assert.match(users, /name="sort" value=\{sort\}/);
  assert.match(users, /href=\{href\(\{ tab: item.value \}\)\}/);
});

test("All four Content directories show search, relevant dropdown, and real Apply above status tabs", () => {
  assert.match(homepage, /<ContentDirectoryToolbar/);
  assert.match(faq, /<ContentDirectoryToolbar/);
  assert.match(cms, /data-testid="cms-content-filter-row"/);
  assert.match(cms, /lg:grid-cols-\[minmax\(0,2fr\)_minmax\(0,1fr\)_120px\]/);
  assert.match(cms, /lg:grid-cols-\[minmax\(0,1fr\)_120px\]/);
  assert.match(cms, /data-testid="cms-content-status-row"/);
  assert.ok(cms.indexOf('data-testid="cms-content-filter-row"') < cms.indexOf('data-testid="cms-content-status-row"'));
  assert.match(cms, /onClick=\{applyFilters\}/);
  assert.match(cms, /if \(isPending\) return/);
  assert.match(cms, /onValueChange=\{setDraftMarket\}/);
  assert.match(cms, /onValueChange=\{setDraftCountry\}/);
  assert.match(cms, /aria-label="Content publication status"/);
  assert.match(cms, /statuses\.map/);
  assert.match(cms, /params\.delete\("cursor"\)/);
});

test("FAQ editing search and Enter do not navigate before Apply", () => {
  assert.match(faq, /faqSearchOnly/);
  assert.match(cms, /function submitSearch\(event: FormEvent<HTMLFormElement>\) \{\s*event\.preventDefault\(\)/);
  assert.doesNotMatch(cms, /faqSearchOnly\) applyFilters\(\)/);
  assert.doesNotMatch(cms, /onValueChange=\{next => navigate/);
  assert.doesNotMatch(cms, /setTimeout|setInterval/);
  assert.match(cms, /navigate\(\{\s*q: searchTerm/);
  assert.match(cms, /onTabClick/);
  assert.match(cms, /q: appliedSearch, status: next/);
});
