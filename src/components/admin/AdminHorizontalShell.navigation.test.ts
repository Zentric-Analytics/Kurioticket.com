import { jsxOpening } from "../../test-support/sourceStructure";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { getAdminHeaderGroups, isAdminNavItemActive } from "@/lib/adminNavigation";

const shell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");

test("official logo stays beside Admin title at every width, never in the navigation row", () => {
  assert.match(shell, /import \{ KurioticketLogo \} from/);
  assert.match(shell, /Official Kurioticket mark stays in the top-left header beside the title at every width/);
  assert.match(shell, /<Link href="\/admin" aria-label="Kurioticket Admin overview"/);
  assert.match(shell, /<KurioticketLogo variant="mark" className="h-11 w-11"/);
  assert.match(shell, /pl-2 pr-4 sm:pr-6 lg:pr-10/);
  const navigation = shell.slice(shell.indexOf("function Navigation("), shell.indexOf("export function AdminHorizontalShell("));
  assert.doesNotMatch(navigation, /KurioticketLogo/);
  assert.equal((shell.match(/<KurioticketLogo\b/g) || []).length, 1);
});

test("selected workspaces use the public Hotel navbar palette and underline", () => {
  assert.match(shell, /text-\[#021C2B\]\/85/);
  assert.match(shell, /hover:bg-\[#004BB8\]\/5/);
  assert.match(shell, /const underline = selected/);
  assert.match(shell, /after:h-0\.5 after:rounded-full after:bg-\[#004BB8\]/);
  assert.match(shell, /text-\[15px\] font-semibold/);
  const document = ts.createSourceFile("AdminHorizontalShell.tsx", shell, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const headers: ts.JsxOpeningElement[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(document) === "header") headers.push(node);
    ts.forEachChild(node, visit);
  }
  visit(document);
  assert.equal(headers.length, 1, "one admin header surface");
  const className = headers[0].attributes.properties.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(document) === "className");
  assert.ok(className && ts.isJsxAttribute(className) && className.initializer && ts.isStringLiteral(className.initializer));
  assert.ok(className.initializer.text.split(/\s+/).includes("bg-white/95"));
  const link = document.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "HeaderNavLink");
  assert.ok(link);
  type Entry = ReturnType<typeof getAdminHeaderGroups>[number]["links"][number];
  type LinkProps = { href: string; className: string; "aria-current"?: string; onClick: () => void };
  const exports: { render?: (props: { entry: Entry; pathname: string; close: () => void }) => ReactElement<LinkProps> } = {};
  runInNewContext(ts.transpileModule(`${link.getText(document)}; exports.render = HeaderNavLink;`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, Link: "a", isAdminNavItemActive,
    require: (name: string) => { assert.equal(name, "react/jsx-runtime"); return jsxRuntime; },
  });
  assert.ok(exports.render);
  const entries = getAdminHeaderGroups("ADMIN", true).flatMap((group) => group.links);
  for (const [href, pathname, active] of [
    ["/admin", "/admin", true], ["/admin", "/admin/users", false],
    ["/admin/users", "/admin/users/fixture", true], ["/admin/users", "/admin/settings", false],
    ["/admin/searches", "/admin/journeys", true], ["/admin/providers", "/admin/hotels", true],
  ] as const) {
    const entry = entries.find(({ item }) => item.href === href);
    assert.ok(entry);
    let clicks = 0;
    const element: ReactElement<LinkProps> = exports.render({ entry, pathname, close: () => { clicks += 1; } });
    const classes: Set<string> = new Set(element.props.className.split(/\s+/));
    assert.ok(classes.has("text-[#021C2B]/85"));
    assert.equal(classes.has("after:bg-[#004BB8]"), active);
    assert.equal(classes.has("after:h-0.5"), active);
    assert.equal(element.props["aria-current"], active ? "page" : undefined);
    assert.equal(element.props.href, href);
    element.props.onClick();
    assert.equal(clicks, 1);
    const html = renderToStaticMarkup(element);
    assert.ok(html.includes(entry.item.label));
    assert.equal(html.includes('aria-current="page"'), active);
  }
  assert.equal(isAdminNavItemActive("/admin", "/admin"), true);
  assert.equal(isAdminNavItemActive("/admin", "/admin/users"), false);
});

test("navigation keeps parent workspaces visible while child routes stay nested", () => {
  assert.match(shell, /min-\[1100px\]:block/);
  assert.match(shell, /min-\[1100px\]:hidden/);
  assert.doesNotMatch(shell, /overflow-x-auto overscroll-x-contain/);
  assert.match(shell, /flex w-full flex-wrap items-center/);
  assert.doesNotMatch(shell, /createPortal/);
  assert.match(shell, /Official Kurioticket mark stays in the top-left header beside the title at every width/);
  const groups = getAdminHeaderGroups("ADMIN", true);
  const entries = groups.flatMap(group => group.links);
  assert.deepEqual(entries.map(({ item }) => item.label), ["Overview", "Users", "Searches", "Trips", "Support", "Providers", "Content", "System", "Settings"]);
  const searches = entries.find(({ item }) => item.href === "/admin/searches");
  const providers = entries.find(({ item }) => item.href === "/admin/providers");
  assert.deepEqual(searches?.children.map((item) => item.label), ["Journeys", "Provider Handoffs", "Referral Attribution"]);
  assert.deepEqual(providers?.children.map((item) => item.label), ["Flights", "Hotels", "Cars"]);
  // Current dev intentionally hides Admin navigation from support roles.
  assert.deepEqual(getAdminHeaderGroups("SUPPORT"), []);
});


test("navbar search opens the dedicated global-search workspace", () => {
  assert.equal(jsxOpening(shell, 'AdminWorkspaceSearchProvider').length, 1);
  assert.equal(jsxOpening(shell, 'AdminSearchTrigger').length, 1);
  assert.equal(jsxOpening(shell, 'AdminSearchHeader').length, 1);
  assert.equal(jsxOpening(shell, 'AdminSearchContent').length, 1);
  assert.doesNotMatch(shell, /Search navigation only|aria-label="Search admin pages"/);
  assert.doesNotMatch(shell, /router\.push\("\/admin\/search"\)/);
});
