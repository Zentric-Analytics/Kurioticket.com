#!/usr/bin/env node
/** Compact, deterministic localization coverage audit. Full evidence is kept in /tmp. */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createJiti } from "jiti";

const root = process.cwd();
const tmp = "/tmp/kurioticket-i18n-audit-v3";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const jiti = createJiti(import.meta.url);
const routeCsv = path.join(root, "language-audit-route-matrix-v3.csv");
const issueCsv = path.join(root, "language-audit-issues-v3.csv");
const sourceRoots = ["src/app", "src/components", "src/content", "src/data", "src/lib", "src/services"];
const routeKinds = new Set(["page.tsx", "layout.tsx", "loading.tsx", "error.tsx", "not-found.tsx", "default.tsx"]);

function fail(message) { console.error(`audit-i18n-v3: ${message}`); process.exitCode = 1; throw new Error(message); }
function filesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const value = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(value) : [value];
  });
}
function parse(file) {
  const text = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true,
    file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const diagnostics = sf.parseDiagnostics ?? [];
  if (diagnostics.length) fail(`${path.relative(root, file)} parse error: ${diagnostics.map((d) => d.messageText).join("; ")}`);
  return { sf, text };
}
function flatten(value, prefix = "", out = {}) {
  for (const [key, child] of Object.entries(value ?? {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) flatten(child, full, out);
    else out[full] = child;
  }
  return out;
}
function propertyName(node) {
  if (!node) return null;
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return node.text;
  return null;
}
function explicitObjectKeys(object, prefix = "", output = new Set(), duplicates = []) {
  const seen = new Map();
  for (const prop of object.properties) {
    if (ts.isSpreadAssignment(prop)) continue;
    if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop) && !ts.isMethodDeclaration(prop)) continue;
    const name = propertyName(prop.name);
    if (name == null) continue;
    const full = prefix ? `${prefix}.${name}` : name;
    if (seen.has(name)) duplicates.push({ key: full, firstLine: seen.get(name), line: object.getSourceFile().getLineAndCharacterOfPosition(prop.getStart()).line + 1 });
    else seen.set(name, object.getSourceFile().getLineAndCharacterOfPosition(prop.getStart()).line + 1);
    output.add(full);
    if (ts.isPropertyAssignment(prop) && ts.isObjectLiteralExpression(prop.initializer)) explicitObjectKeys(prop.initializer, full, output, duplicates);
  }
  return { keys: output, duplicates };
}
function dictionaryExplicit(file) {
  const { sf } = parse(file);
  let result;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "translations" && node.initializer && ts.isObjectLiteralExpression(node.initializer)) result = explicitObjectKeys(node.initializer);
    ts.forEachChild(node, visit);
  }
  visit(sf);
  if (!result) fail(`translations object not found in ${path.relative(root, file)}`);
  return result;
}
function placeholders(value) {
  const text = String(value ?? "");
  const tokens = [...text.matchAll(/\{\{([A-Za-z_$][\w$]*)\}\}|(?<!\{)\{([A-Za-z_$][\w$]*)\}(?!\})/g)]
    .map((m) => ({ name: m[1] ?? m[2], style: m[1] ? "double" : "single" }));
  return { tokens, malformed: /\{\{?[^{}]*$|^[^{}]*\}\}?|\{\{[^{}]+\}(?!\})|(?<!\{)\{[^{}]+\}\}/.test(text) };
}
function tokenSignature(value) { return placeholders(value).tokens.map((p) => `${p.style}:${p.name}`).sort().join("|"); }
function csv(value) { const text = Array.isArray(value) ? value.join(";") : String(value ?? ""); return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function writeCsv(file, columns, rows) { fs.writeFileSync(file, `${columns.join(",")}\n${rows.map((row) => columns.map((c) => csv(row[c])).join(",")).join("\n")}\n`); }

fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

const { supportedLocales } = jiti(path.join(root, "src/lib/supportedLocales.ts"));
const language = jiti(path.join(root, "src/lib/language.ts"));
const i18n = jiti(path.join(root, "src/lib/i18n/index.ts"));
const locales = supportedLocales.filter((locale) => locale.status === "available");
if (!locales.length) fail("no available locales discovered");

// Derive dictionary module aliases and locale resolution from the live index rather than a locale list.
const indexText = fs.readFileSync(path.join(root, "src/lib/i18n/index.ts"), "utf8");
const aliasToModule = new Map([...indexText.matchAll(/import \{ translations as (\w+) \} from "\.\/(.+?)";/g)].map((m) => [m[1], m[2]]));
const dictionaryBody = indexText.match(/export const dictionaries[^=]*=\s*\{([\s\S]*?)\n\};/)?.[1];
if (!dictionaryBody) fail("could not parse dictionaries registry");
const codeToModule = new Map();
for (const item of dictionaryBody.split(",")) {
  const match = item.trim().match(/^(?:"([^"]+)"|([\w-]+))\s*:\s*(\w+)$|^(\w+)$/);
  if (!match) continue;
  const code = match[1] ?? match[2] ?? match[4];
  const variable = match[3] ?? match[4];
  codeToModule.set(code, aliasToModule.get(variable));
}
const enEffective = flatten(i18n.getTranslations("en-us"));
const englishKeys = new Set(Object.keys(enEffective));
const localeData = new Map();
for (const locale of locales) {
  const normalized = language.normalizeLanguage(locale.code);
  let dictionaryModule = codeToModule.get(normalized) ?? codeToModule.get(locale.code);
  // language codes such as de-de normalize differently from the dictionary's alias resolution.
  if (!dictionaryModule) dictionaryModule = [...aliasToModule.values()].find((name) => name === locale.code || name === locale.code.split("-")[0]);
  if (!dictionaryModule) fail(`dictionary module not resolved for ${locale.code}`);
  const dictionaryFile = path.join(root, "src/lib/i18n", `${dictionaryModule}.ts`);
  const explicit = dictionaryExplicit(dictionaryFile);
  const effective = flatten(i18n.getTranslations(locale.code));
  localeData.set(locale.code, { locale, normalized, module: dictionaryModule, dictionaryFile, explicit, effective });
}

const sourceFiles = sourceRoots.flatMap((dir) => filesUnder(path.join(root, dir)))
  .filter((file) => /\.(?:ts|tsx)$/.test(file)).sort();
const sourceFileSet = new Set(sourceFiles);
const analyses = new Map();
const allUsedKeys = new Set();
const unresolvedDynamic = [];
const hardcoded = [];
const fallbackFindings = [];
const imports = new Map();
const operational = /^(?:Kurioticket|[A-Z]{2,4}|[A-Z]{3}\s*[-–]\s*[A-Z]{3}|https?:|\/|[\w.+-]+@[\w.-]+|\d[\d\s.,:/-]*|USD|EUR|GBP|AED)$/;

function resolveLocal(from, specifier) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return null;
  const base = specifier.startsWith("@/") ? path.join(root, "src", specifier.slice(2)) : path.resolve(path.dirname(from), specifier);
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, path.join(base, "index.tsx"), path.join(base, "index.ts")]) if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  return null;
}
for (const file of sourceFiles) {
  const { sf, text } = parse(file);
  const used = new Set(); const dynamic = []; const literals = []; const deps = [];
  function addKey(key, line, kind) { if (key) { used.add(key); allUsedKeys.add(key); } else dynamic.push({ file, line, kind }); }
  function visit(node) {
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) { const resolved = resolveLocal(file, node.moduleSpecifier.text); if (resolved) deps.push(resolved); }
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && ["t", "dictionary", "translations", "enTranslations"].includes(node.expression.text)) addKey(node.name.text, line, "property");
    if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && ["t", "dictionary", "translations", "enTranslations"].includes(node.expression.text)) addKey(ts.isStringLiteralLike(node.argumentExpression) ? node.argumentExpression.text : null, line, "element");
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "t") addKey(node.arguments[0] && ts.isStringLiteralLike(node.arguments[0]) ? node.arguments[0].text : null, line, "call");
    if (ts.isJsxAttribute(node) && /^(?:translationKey|translation-key|i18nKey)$/.test(node.name.text)) { const init = node.initializer; addKey(init && ts.isStringLiteral(init) ? init.text : null, line, "prop"); }
    if (ts.isJsxText(node)) { const value = node.text.replace(/\s+/g, " ").trim(); if (/[A-Za-z]{2}/.test(value) && !operational.test(value)) literals.push({ file, line, value, kind: "jsx" }); }
    if (ts.isJsxAttribute(node) && /^(?:placeholder|title|aria-label|aria-description|alt)$/.test(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer)) { const value = node.initializer.text.trim(); if (/[A-Za-z]{2}/.test(value) && !operational.test(value)) literals.push({ file, line, value, kind: node.name.text }); }
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind) && ts.isStringLiteralLike(node.right) && /[A-Za-z]{2}/.test(node.right.text)) fallbackFindings.push({ file, line, value: node.right.text });
    ts.forEachChild(node, visit);
  }
  visit(sf);
  analyses.set(file, { used, dynamic, literals, text }); imports.set(file, deps);
  unresolvedDynamic.push(...dynamic); hardcoded.push(...literals);
}

function routePattern(file) {
  const relative = path.relative(path.join(root, "src/app"), path.dirname(file));
  const parts = relative === "" ? [] : relative.split(path.sep).filter((part) => !/^\(.+\)$/.test(part) && !part.startsWith("@"));
  return `/${parts.join("/")}`.replace(/\/$|^$/g, "") || "/";
}
const routeEntries = sourceFiles.filter((file) => file.startsWith(path.join(root, "src/app") + path.sep) && routeKinds.has(path.basename(file)));
const routes = new Map();
for (const file of routeEntries) {
  const route = routePattern(file);
  if (!routes.has(route)) routes.set(route, { route, files: [], pageFiles: [], layoutFiles: [] });
  const record = routes.get(route); record.files.push(file);
  if (path.basename(file) === "page.tsx") record.pageFiles.push(file);
  if (path.basename(file) === "layout.tsx") record.layoutFiles.push(file);
}
// Layouts apply to descendants; include their imports in every applicable route.
const layouts = routeEntries.filter((file) => path.basename(file) === "layout.tsx");
function graphFor(record) {
  const seeds = [...record.files, ...layouts.filter((layout) => record.files.some((file) => file.startsWith(path.dirname(layout) + path.sep)))];
  const seen = new Set(); const stack = [...seeds];
  while (stack.length) { const file = stack.pop(); if (!file || seen.has(file)) continue; seen.add(file); for (const dep of imports.get(file) ?? []) if (sourceFileSet.has(dep)) stack.push(dep); }
  return seen;
}
function audienceFor(route) { if (route.startsWith("/admin")) return ["admin", "admin"]; if (/^\/(?:dashboard|account|saved|trips|alerts|onboarding|pending-account-deletion|email-preferences)/.test(route)) return ["customer", "logged_in"]; if (route.startsWith("/auth")) return ["customer", "logged_out"]; return ["public", "logged_out"]; }
function statesFor(files) { const names = new Set(files.map((f) => path.basename(f).replace(".tsx", ""))); return ["loaded", ...["loading", "error", "not-found", "default"].filter((s) => names.has(s))].join(";"); }

const issues = [];
function issue(row) { issues.push({ ...row, issue_id: `GLV3-${String(issues.length + 1).padStart(3, "0")}` }); }
for (const [code, data] of localeData) {
  if (code === "en-us") continue;
  const defects = [];
  for (const key of allUsedKeys) if (key in enEffective && key in data.effective && tokenSignature(enEffective[key]) !== tokenSignature(data.effective[key])) defects.push(key);
  if (defects.length) issue({ severity: "high", status: "confirmed", route_groups: "shared/multiple", audience: "all", auth_state: "all", render_state: "all", component: "locale dictionary", source_file: path.relative(root, data.dictionaryFile), source_line: 1, translation_key: defects.slice(0, 30).join(";"), english_value: `${defects.length} used keys have placeholder mismatches`, affected_locales: code, failure_type: "placeholder_defect", fallback_type: "none", visible_or_hidden: "both", metadata_only: false, accessibility_only: false, rtl_related: false, placeholder_expected: "English token signatures", placeholder_actual: "different locale token signatures", evidence: `Temporary evidence: ${tmp}/placeholder-defects.json`, recommended_fix_group: "placeholder parity", notes: defects.length > 30 ? "Key list truncated; temporary evidence is complete." : "" });
  if (data.explicit.duplicates.length) issue({ severity: "high", status: "confirmed", route_groups: "shared/multiple", audience: "all", auth_state: "all", render_state: "all", component: "locale dictionary", source_file: path.relative(root, data.dictionaryFile), source_line: data.explicit.duplicates[0].line, translation_key: data.explicit.duplicates.map((d) => d.key).join(";"), english_value: "", affected_locales: code, failure_type: "duplicate_shadowed_key", fallback_type: "none", visible_or_hidden: "both", metadata_only: false, accessibility_only: false, rtl_related: false, placeholder_expected: "", placeholder_actual: "", evidence: JSON.stringify(data.explicit.duplicates), recommended_fix_group: "dictionary correctness", notes: "AST-detected duplicate property in the same object literal." });
}
const missingEnglish = [...allUsedKeys].filter((key) => !englishKeys.has(key)).sort();
if (missingEnglish.length) issue({ severity: "high", status: "confirmed", route_groups: "shared/multiple", audience: "all", auth_state: "all", render_state: "all", component: "translation usage", source_file: "multiple", source_line: 0, translation_key: missingEnglish.slice(0, 100).join(";"), english_value: "", affected_locales: locales.map((l) => l.code).join(";"), failure_type: "used_key_absent_from_english", fallback_type: "raw_key_or_undefined", visible_or_hidden: "both", metadata_only: false, accessibility_only: false, rtl_related: false, placeholder_expected: "", placeholder_actual: "", evidence: `${missingEnglish.length} statically referenced identifiers are absent from the flattened English dictionary; member-name analysis includes manual-review candidates.`, recommended_fix_group: "key resolution review", notes: "Manual review required for generic t member names and dynamic families." });
// Aggregate literal findings by source file to keep the committed issue matrix compact.
for (const [file, hits] of Map.groupBy(hardcoded, (hit) => hit.file)) issue({ severity: "medium", status: "manual_review", route_groups: "import graph routes", audience: file.includes("/admin/") ? "admin" : "all", auth_state: "various", render_state: "various", component: path.basename(file), source_file: path.relative(root, file), source_line: hits[0].line, translation_key: "", english_value: hits.slice(0, 8).map((h) => h.value).join(" | "), affected_locales: locales.filter((l) => l.code !== "en-us").map((l) => l.code).join(";"), failure_type: "hardcoded_visible_text_review", fallback_type: "hardcoded_english", visible_or_hidden: hits.some((h) => ["alt", "aria-label", "aria-description", "title"].includes(h.kind)) ? "both" : "visible", metadata_only: false, accessibility_only: hits.every((h) => ["alt", "aria-label", "aria-description", "title"].includes(h.kind)), rtl_related: false, placeholder_expected: "", placeholder_actual: "", evidence: `${hits.length} AST literal hit(s); examples truncated in this row.`, recommended_fix_group: "visible literals", notes: "Operational values were filtered; contextual confirmation remains required." });
for (const finding of fallbackFindings) issue({ severity: "medium", status: "confirmed", route_groups: "import graph routes", audience: finding.file.includes("/admin/") ? "admin" : "all", auth_state: "various", render_state: "fallback", component: path.basename(finding.file), source_file: path.relative(root, finding.file), source_line: finding.line, translation_key: "", english_value: finding.value, affected_locales: locales.filter((l) => l.code !== "en-us").map((l) => l.code).join(";"), failure_type: "hardcoded_english_fallback", fallback_type: "nullish_or_boolean_fallback", visible_or_hidden: "visible", metadata_only: false, accessibility_only: false, rtl_related: false, placeholder_expected: "", placeholder_actual: "", evidence: "String literal is the right operand of ?? or ||.", recommended_fix_group: "fallback policy", notes: "Confirm reachability at runtime." });

const placeholderEvidence = {};
for (const [code, data] of localeData) placeholderEvidence[code] = [...allUsedKeys].filter((key) => key in enEffective && key in data.effective && tokenSignature(enEffective[key]) !== tokenSignature(data.effective[key])).map((key) => ({ key, expected: tokenSignature(enEffective[key]), actual: tokenSignature(data.effective[key]) }));
fs.writeFileSync(path.join(tmp, "placeholder-defects.json"), JSON.stringify(placeholderEvidence, null, 2));

const routeRows = [];
const routeEvidence = [];
for (const record of [...routes.values()].sort((a, b) => a.route.localeCompare(b.route))) {
  const graph = graphFor(record); const [audience, auth] = audienceFor(record.route);
  const used = new Set(); const dynamics = []; const literals = [];
  for (const file of graph) { const analysis = analyses.get(file); if (!analysis) continue; analysis.used.forEach((key) => used.add(key)); dynamics.push(...analysis.dynamic); literals.push(...analysis.literals); }
  const graphRelative = new Set([...graph].map((file) => path.relative(root, file)));
  const shared = [...graph].filter((file) => file.includes("/src/components/")).map((file) => path.relative(path.join(root, "src/components"), file)).sort();
  routeEvidence.push({ route: record.route, graph: [...graph].map((f) => path.relative(root, f)), usedKeys: [...used].sort(), dynamic: dynamics, literals });
  for (const { locale, explicit, effective } of [...localeData.values()].sort((a, b) => a.locale.code.localeCompare(b.locale.code))) {
    let explicitCount = 0, inherited = 0, blank = 0, placeholderCount = 0;
    for (const key of used) {
      if (explicit.keys.has(key)) explicitCount++; else if (key in enEffective && key in effective) inherited++;
      if (!(key in effective) || effective[key] == null || String(effective[key]).trim() === "") blank++;
      if (key in enEffective && key in effective && tokenSignature(enEffective[key]) !== tokenSignature(effective[key])) placeholderCount++;
    }
    const statuses = ["RUNTIME_UNVERIFIED"];
    if (inherited) statuses.push("ENGLISH_FALLBACK_PRESENT");
    if (literals.length) statuses.push("HARDCODED_ENGLISH_PRESENT");
    if (placeholderCount) statuses.push("PLACEHOLDER_DEFECT_PRESENT");
    if (dynamics.length) statuses.push("DYNAMIC_USAGE_REQUIRES_REVIEW");
    if (!inherited && !literals.length && !placeholderCount && !dynamics.length && !blank) statuses.push("FULLY_EXPLICITLY_TRANSLATED"); else statuses.push("PARTIALLY_TRANSLATED");
    const related = issues.filter((item) => item.affected_locales?.split(";").includes(locale.code) && (item.route_groups === "shared/multiple" || item.source_file === "multiple" || graphRelative.has(item.source_file))).map((item) => item.issue_id);
    routeRows.push({ route: record.route, audience, auth_state: auth, render_states_checked: statesFor(record.files), locale_code: locale.code, locale_tag: locale.locale, direction: locale.direction, page_files: record.pageFiles.map((f) => path.relative(root, f)), layout_files: [...graph].filter((f) => path.basename(f) === "layout.tsx").map((f) => path.relative(root, f)), shared_components: shared, used_key_count: used.size, explicit_translated_count: explicitCount, inherited_english_count: inherited, hardcoded_visible_count: literals.length, placeholder_defect_count: placeholderCount, blank_value_count: blank, dynamic_unresolved_count: dynamics.length, metadata_issue_count: literals.filter((h) => /metadata|generateMetadata/.test(analyses.get(h.file)?.text ?? "")).length, accessibility_issue_count: literals.filter((h) => ["alt", "aria-label", "aria-description", "title"].includes(h.kind)).length, rtl_issue_count: 0, runtime_status: "RUNTIME_UNVERIFIED", overall_status: statuses.join(";"), confirmed_issue_ids: related, notes: "Static AST/import-graph audit; browser and authenticated runtime unavailable." });
  }
}
fs.writeFileSync(path.join(tmp, "route-evidence.json"), JSON.stringify(routeEvidence.map(({ route, graph, usedKeys, dynamic, literals }) => ({ route, graph, usedKeys, dynamicCount: dynamic.length, literals })), null, 2));
fs.writeFileSync(path.join(tmp, "key-analysis.json"), JSON.stringify({ usedKeys: [...allUsedKeys].sort(), missingEnglish, unresolvedDynamic, localeExplicit: Object.fromEntries([...localeData].map(([code, d]) => [code, { module: d.module, keys: [...d.explicit.keys].sort(), duplicates: d.explicit.duplicates }])) }, null, 2));

const routeColumns = ["route","audience","auth_state","render_states_checked","locale_code","locale_tag","direction","page_files","layout_files","shared_components","used_key_count","explicit_translated_count","inherited_english_count","hardcoded_visible_count","placeholder_defect_count","blank_value_count","dynamic_unresolved_count","metadata_issue_count","accessibility_issue_count","rtl_issue_count","runtime_status","overall_status","confirmed_issue_ids","notes"];
const issueColumns = ["issue_id","severity","status","route_groups","audience","auth_state","render_state","component","source_file","source_line","translation_key","english_value","affected_locales","failure_type","fallback_type","visible_or_hidden","metadata_only","accessibility_only","rtl_related","placeholder_expected","placeholder_actual","evidence","recommended_fix_group","notes"];
writeCsv(routeCsv, routeColumns, routeRows);
writeCsv(issueCsv, issueColumns, issues);

const discoveredRoutes = routes.size;
const matrixRoutes = new Set(routeRows.map((row) => row.route)).size;
const summary = {
  baseSha: require("node:child_process").execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  activeLocales: locales.length, discoveredRoutes, matrixRoutes, unmappedRoutes: discoveredRoutes - matrixRoutes,
  routeRows: routeRows.length, sharedComponents: new Set(routeRows.flatMap((r) => r.shared_components)).size,
  englishKeys: englishKeys.size, usedTranslationKeys: allUsedKeys.size, unusedEnglishKeys: [...englishKeys].filter((k) => !allUsedKeys.has(k)).length,
  visibleLiteralHits: hardcoded.length, unresolvedDynamicUsages: unresolvedDynamic.length,
  confirmedIssues: issues.filter((i) => i.status === "confirmed").length,
  manualReviewIssues: issues.filter((i) => i.status === "manual_review").length,
  temporaryEvidence: tmp,
};
if (summary.unmappedRoutes !== 0) fail(`${summary.unmappedRoutes} routes are unmapped`);
console.log(JSON.stringify(summary, null, 2));
