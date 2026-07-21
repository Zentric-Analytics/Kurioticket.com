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
function explicitObjectKeys(object, prefix = "", output = new Set(), duplicates = [], details = new Map()) {
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
    if (ts.isPropertyAssignment(prop)) details.set(full, {
      line: object.getSourceFile().getLineAndCharacterOfPosition(prop.getStart()).line + 1,
      source: prop.initializer.getText(object.getSourceFile()).slice(0, 300),
    });
    if (ts.isPropertyAssignment(prop) && ts.isObjectLiteralExpression(prop.initializer)) explicitObjectKeys(prop.initializer, full, output, duplicates, details);
  }
  return { keys: output, duplicates, details };
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

const allCandidateSourceFiles = sourceRoots.flatMap((dir) => filesUnder(path.join(root, dir)))
  .filter((file) => /\.(?:ts|tsx)$/.test(file)).sort();
const excludedPattern = /(?:^|\/)(?:__tests__|__mocks__|fixtures?|mocks?|stories?|generated)(?:\/|$)|\.(?:test|spec|stories?)\.tsx?$/i;
const excludedSourceFiles = allCandidateSourceFiles.filter((file) => excludedPattern.test(path.relative(root, file)));
const sourceFiles = allCandidateSourceFiles.filter((file) => !excludedPattern.test(path.relative(root, file)));
const sourceFileSet = new Set(sourceFiles);
const analyses = new Map();
const allUsedKeys = new Set();
const finiteDynamicKeys = new Set();
const unresolvedDynamic = [];
const genericIdentifierCandidates = [];
const hardcoded = [];
const fallbackFindings = [];
const rtlCandidates = [];
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
  const used = new Set(); const finite = new Set(); const dynamic = []; const generic = []; const literals = []; const deps = []; const rtl = [];
  const dictionaryBindings = new Set(["translations", "enTranslations"]);
  const functionBindings = new Set();
  const constants = new Map();
  const lineOf = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  function collect(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const resolved = resolveLocal(file, node.moduleSpecifier.text); if (resolved) deps.push(resolved);
      if (/\/i18n\/(?:en|index)$/.test(node.moduleSpecifier.text) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        for (const element of node.importClause.namedBindings.elements) {
          if (element.propertyName?.text === "translations" || element.name.text === "translations") dictionaryBindings.add(element.name.text);
          if (element.propertyName?.text === "getTranslations" || element.name.text === "getTranslations") functionBindings.add(element.name.text);
        }
      }
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      constants.set(node.name.text, node.initializer);
      if (ts.isCallExpression(node.initializer) && ts.isIdentifier(node.initializer.expression) && node.initializer.expression.text === "getTranslations") dictionaryBindings.add(node.name.text);
      if ((ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) && /(?:dictionary|translations|enTranslations)\s*\[/.test(node.initializer.body.getText(sf))) functionBindings.add(node.name.text);
    }
    if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer && ts.isCallExpression(node.initializer) && ts.isIdentifier(node.initializer.expression) && node.initializer.expression.text === "useLocale") {
      for (const element of node.name.elements) {
        const imported = element.propertyName && ts.isIdentifier(element.propertyName) ? element.propertyName.text : ts.isIdentifier(element.name) ? element.name.text : "";
        const local = ts.isIdentifier(element.name) ? element.name.text : "";
        if (imported === "t") dictionaryBindings.add(local);
      }
    }
    if (ts.isFunctionDeclaration(node) && node.name && /(?:dictionary|translations|enTranslations)\s*\[/.test(node.body?.getText(sf) ?? "")) functionBindings.add(node.name.text);
    ts.forEachChild(node, collect);
  }
  collect(sf);
  function valuesOf(node, seen = new Set()) {
    if (!node) return [];
    if (ts.isStringLiteralLike(node)) return [node.text];
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) return valuesOf(node.expression, seen);
    if (ts.isConditionalExpression(node)) return [...new Set([...valuesOf(node.whenTrue, seen), ...valuesOf(node.whenFalse, seen)])];
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind)) return [...new Set([...valuesOf(node.left, seen), ...valuesOf(node.right, seen)])];
    if (ts.isArrayLiteralExpression(node)) return [...new Set(node.elements.flatMap((item) => valuesOf(item, seen)))];
    if (ts.isIdentifier(node) && constants.has(node.text) && !seen.has(node.text)) { const next = new Set(seen).add(node.text); return valuesOf(constants.get(node.text), next); }
    if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && constants.has(node.expression.text)) {
      const target = constants.get(node.expression.text); const indexes = valuesOf(node.argumentExpression, seen);
      if (ts.isObjectLiteralExpression(target)) return target.properties.flatMap((prop) => {
        const name = propertyName(prop.name); return indexes.includes(name) && ts.isPropertyAssignment(prop) ? valuesOf(prop.initializer, seen) : [];
      });
      if (ts.isArrayLiteralExpression(target) && indexes.every((value) => /^\d+$/.test(value))) return indexes.flatMap((value) => valuesOf(target.elements[Number(value)], seen));
    }
    return [];
  }
  function addKey(node, line, kind, binding) {
    const values = valuesOf(node).filter((value) => englishKeys.has(value));
    if (values.length) {
      for (const key of values) { used.add(key); allUsedKeys.add(key); if (!ts.isStringLiteralLike(node)) { finite.add(key); finiteDynamicKeys.add(key); } }
    } else if (node && !ts.isStringLiteralLike(node)) dynamic.push({ file, line, kind, binding, expression: node.getText(sf).slice(0, 160) });
    else if (node && ts.isStringLiteralLike(node)) { used.add(node.text); allUsedKeys.add(node.text); }
  }
  function isEnglish(value) { return /[A-Za-z]{2}/.test(value) && !operational.test(value.trim()); }
  function addVisibleExpression(node, line, kind) {
    if (!node) return;
    if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) { if (isEnglish(node.text)) literals.push({ file, line, value: node.text.trim(), kind, confidence: "confirmed" }); return; }
    if (ts.isTemplateExpression(node)) { const value = node.getText(sf).slice(0, 240); if (isEnglish(value)) literals.push({ file, line, value, kind, confidence: "candidate" }); return; }
    if (ts.isConditionalExpression(node)) { addVisibleExpression(node.whenTrue, line, kind); addVisibleExpression(node.whenFalse, line, kind); }
  }
  function visibleAncestor(node) {
    for (let current = node.parent; current; current = current.parent) {
      if (ts.isJsxExpression(current) || ts.isJsxAttribute(current) || ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) return "jsx";
      if (ts.isCallExpression(current)) {
        const name = current.expression.getText(sf);
        if (/^(?:toast(?:\.(?:success|error|info|warning))?|alert|confirm|setError|setStatus|setMessage|setSuccess)$/.test(name)) return name;
      }
      if (ts.isFunctionLike(current) || ts.isSourceFile(current)) break;
    }
    return null;
  }
  function visit(node) {
    const line = lineOf(node);
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && dictionaryBindings.has(node.expression.text)) addKey(ts.factory.createStringLiteral(node.name.text), line, "property", node.expression.text);
    if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && dictionaryBindings.has(node.expression.text)) addKey(node.argumentExpression, line, "element", node.expression.text);
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (functionBindings.has(node.expression.text)) addKey(node.arguments[0], line, "call", node.expression.text);
      else if (node.expression.text === "t") generic.push({ file, line, expression: node.getText(sf).slice(0, 160) });
      if (/^(?:toast|alert|confirm|setError|setStatus|setMessage|setSuccess)$/.test(node.expression.text)) addVisibleExpression(node.arguments[0], line, `message:${node.expression.text}`);
    }
    if (ts.isJsxAttribute(node) && /^(?:translationKey|translation-key|i18nKey)$/.test(node.name.text)) { const init = node.initializer; addKey(init && ts.isStringLiteral(init) ? init : null, line, "prop", "translation-prop"); }
    if (ts.isJsxText(node)) { const value = node.text.replace(/\s+/g, " ").trim(); if (/[A-Za-z]{2}/.test(value) && !operational.test(value)) literals.push({ file, line, value, kind: "jsx" }); }
    if (ts.isJsxExpression(node)) addVisibleExpression(node.expression, line, "jsx-expression");
    if (ts.isJsxAttribute(node) && /^(?:placeholder|title|aria-label|aria-description|alt)$/.test(node.name.text)) {
      if (node.initializer && ts.isStringLiteral(node.initializer)) addVisibleExpression(node.initializer, line, node.name.text);
      if (node.initializer && ts.isJsxExpression(node.initializer)) addVisibleExpression(node.initializer.expression, line, node.name.text);
    }
    if (ts.isPropertyAssignment(node) && /^(?:label|heading|title|description|text|message|placeholder|emptyText|errorMessage|successMessage|loadingText|ariaLabel|alt)$/.test(propertyName(node.name) ?? "")) addVisibleExpression(node.initializer, line, `ui-config:${propertyName(node.name)}`);
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind) && ts.isStringLiteralLike(node.right) && isEnglish(node.right.text)) {
      const sink = visibleAncestor(node); const context = node.parent?.getText(sf).slice(0, 240) ?? "";
      const operationalContext = /(?:id|code|slug|url|path|provider|currency|airport|log|debug|name)\b/i.test(context);
      const classification = sink ? "confirmed_visible_fallback" : operationalContext ? "operational_fallback" : "manual_review";
      fallbackFindings.push({ file, line, value: node.right.text, classification, sink: sink ?? "none", context });
    }
    if (ts.isStringLiteralLike(node) && /(?:\b(?:ml|mr|pl|pr)-(?:\d+|px|auto)\b|\b(?:left|right)-(?:\d+|px|auto|full)\b|\bborder-[lr]\b|\b(?:translate-x|rotate)-(?:\d+|\[)|\b(?:ArrowLeft|ArrowRight|ChevronLeft|ChevronRight)\b)/.test(node.text)) {
      const context = node.parent?.parent?.getText(sf).slice(0, 260) ?? node.text;
      if (!/(?:airport|flightNumber|formatTime|price|currency|map|coordinate)/i.test(context)) rtl.push({ file, line, context, reason: "physical direction or directional transform/icon may assume LTR" });
    }
    if (ts.isJsxAttribute(node) && node.name.text === "dir" && node.initializer && ts.isStringLiteral(node.initializer) && node.initializer.text === "ltr") {
      const context = node.parent.getText(sf).slice(0, 260); if (!/(?:airport|flightNumber|formatTime|price|currency|time)/i.test(context)) rtl.push({ file, line, context, reason: "full-text dir=ltr requires Arabic review" });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  const stateCandidates = [...new Set([...text.matchAll(/\b(?:isLoading|loading|error|empty|unavailable|success|isAuthenticated|unauthenticated|dialogOpen|isOpen|mobileMenuOpen)\b/g)].map((m) => m[0]))].sort();
  analyses.set(file, { used, finite, dynamic, generic, literals, rtl, stateCandidates, text }); imports.set(file, deps);
  unresolvedDynamic.push(...dynamic); genericIdentifierCandidates.push(...generic); hardcoded.push(...literals); rtlCandidates.push(...rtl);
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
function audienceFor(route, graph) {
  const graphText = [...graph].map((file) => analyses.get(file)?.text ?? "").join("\n");
  const guarded = /(?:requireAdmin|AdminGuard|requireAuth|getServerSession|auth\(\)|redirect\(["'`]\/auth\/signin)/.test(graphText);
  if (route.startsWith("/admin")) return ["admin", guarded ? "admin_authenticated" : "auth_state_requires_runtime_review"];
  if (/^\/(?:dashboard|account|saved|recent-searches|email\/preferences|onboarding)/.test(route)) return ["customer", guarded ? "logged_in" : "auth_state_requires_runtime_review"];
  if (route.startsWith("/auth")) return ["customer", "logged_out"];
  return ["public", /(?:useSession|getServerSession|auth\(\))/.test(graphText) ? "optional_session" : "logged_out"];
}
function specialFilesFor(files) { return files.map((file) => path.basename(file)).filter((name) => name !== "page.tsx" && name !== "layout.tsx").sort().join(";"); }

const issues = [];
function issue(row) { issues.push({ ...row, issue_id: `GLV3-${String(issues.length + 1).padStart(3, "0")}` }); }
for (const [code, data] of localeData) {
  if (code === "en-us") continue;
  const defects = [];
  for (const key of allUsedKeys) if (key in enEffective && key in data.effective && tokenSignature(enEffective[key]) !== tokenSignature(data.effective[key])) defects.push(key);
  for (const key of defects) {
    const detail = data.explicit.details.get(key) ?? { line: 1, source: JSON.stringify(data.effective[key]) };
    const expected = tokenSignature(enEffective[key]); const actual = tokenSignature(data.effective[key]);
    issue({ severity: "high", status: "confirmed", route_groups: "shared/multiple", audience: "all", auth_state: "all", render_state: "static_used_key", component: "locale dictionary", source_file: path.relative(root, data.dictionaryFile), source_line: detail.line, translation_key: key, english_value: String(enEffective[key]).slice(0, 300), affected_locales: code, failure_type: "placeholder_defect", fallback_type: "none", visible_or_hidden: "both", metadata_only: false, accessibility_only: false, rtl_related: false, placeholder_expected: expected || "none", placeholder_actual: actual || "none", evidence: `English=${JSON.stringify(String(enEffective[key]).slice(0, 300))}; locale=${JSON.stringify(String(data.effective[key]).slice(0, 300))}; localeSource=${detail.source}; braceStyle=${expected} -> ${actual}`, recommended_fix_group: "placeholder parity", notes: "Exact compact evidence is committed; full evidence also exists temporarily." });
  }
  if (data.explicit.duplicates.length) issue({ severity: "high", status: "confirmed", route_groups: "shared/multiple", audience: "all", auth_state: "all", render_state: "all", component: "locale dictionary", source_file: path.relative(root, data.dictionaryFile), source_line: data.explicit.duplicates[0].line, translation_key: data.explicit.duplicates.map((d) => d.key).join(";"), english_value: "", affected_locales: code, failure_type: "duplicate_shadowed_key", fallback_type: "none", visible_or_hidden: "both", metadata_only: false, accessibility_only: false, rtl_related: false, placeholder_expected: "", placeholder_actual: "", evidence: JSON.stringify(data.explicit.duplicates), recommended_fix_group: "dictionary correctness", notes: "AST-detected duplicate property in the same object literal." });
}
const missingEnglish = [...allUsedKeys].filter((key) => !englishKeys.has(key)).sort();
if (missingEnglish.length) issue({ severity: "high", status: "confirmed", route_groups: "shared/multiple", audience: "all", auth_state: "all", render_state: "static_usage", component: "translation usage", source_file: "multiple", source_line: 0, translation_key: missingEnglish.slice(0, 100).join(";"), english_value: "", affected_locales: locales.map((l) => l.code).join(";"), failure_type: "used_key_absent_from_english", fallback_type: "raw_key_or_undefined", visible_or_hidden: "both", metadata_only: false, accessibility_only: false, rtl_related: false, placeholder_expected: "", placeholder_actual: "", evidence: `${missingEnglish.length} binding-resolved translation keys are absent from English.`, recommended_fix_group: "key resolution review", notes: "Generic identifiers are excluded from this confirmed count." });
// Aggregate literal findings by source file to keep the committed issue matrix compact.
for (const [file, hits] of Map.groupBy(hardcoded, (hit) => hit.file)) issue({ severity: "medium", status: hits.every((hit) => hit.confidence === "confirmed") ? "confirmed" : "manual_review", route_groups: "import graph routes", audience: file.includes("/admin/") ? "admin" : "all", auth_state: "various", render_state: "static_ui_sink", component: path.basename(file), source_file: path.relative(root, file), source_line: hits[0].line, translation_key: "", english_value: hits.slice(0, 8).map((h) => h.value).join(" | "), affected_locales: locales.filter((l) => l.code !== "en-us").map((l) => l.code).join(";"), failure_type: hits.every((hit) => hit.confidence === "confirmed") ? "hardcoded_visible_text" : "hardcoded_visible_text_candidate", fallback_type: "hardcoded_english", visible_or_hidden: hits.some((h) => ["alt", "aria-label", "aria-description", "title"].includes(h.kind)) ? "both" : "visible", metadata_only: hits.every((h) => /metadata/.test(h.kind)), accessibility_only: hits.every((h) => ["alt", "aria-label", "aria-description", "title"].includes(h.kind)), rtl_related: false, placeholder_expected: "", placeholder_actual: "", evidence: `${hits.length} UI-sink/context AST hit(s); examples and confidence retained.`, recommended_fix_group: "visible literals", notes: "Not all source strings are considered visible; only classified UI sinks/configuration are included." });
for (const finding of fallbackFindings.filter((item) => item.classification !== "operational_fallback")) issue({ severity: "medium", status: finding.classification === "confirmed_visible_fallback" ? "confirmed" : "manual_review", route_groups: "import graph routes", audience: finding.file.includes("/admin/") ? "admin" : "all", auth_state: "various", render_state: "static_fallback", component: path.basename(finding.file), source_file: path.relative(root, finding.file), source_line: finding.line, translation_key: "", english_value: finding.value, affected_locales: locales.filter((l) => l.code !== "en-us").map((l) => l.code).join(";"), failure_type: finding.classification, fallback_type: "nullish_or_boolean_fallback", visible_or_hidden: finding.sink === "none" ? "unknown" : "visible", metadata_only: finding.sink === "metadata", accessibility_only: false, rtl_related: false, placeholder_expected: "", placeholder_actual: "", evidence: `classification=${finding.classification}; sink=${finding.sink}; context=${finding.context}`, recommended_fix_group: "fallback policy", notes: "Operational fallbacks are counted in the summary but excluded from UI issue totals." });
for (const [file, hits] of Map.groupBy(rtlCandidates, (hit) => hit.file)) issue({ severity: "low", status: "manual_review", route_groups: "import graph routes", audience: file.includes("/admin/") ? "admin" : "all", auth_state: "various", render_state: "static_rtl_candidate", component: path.basename(file), source_file: path.relative(root, file), source_line: hits[0].line, translation_key: "", english_value: "", affected_locales: "ar", failure_type: "rtl_manual_review", fallback_type: "none", visible_or_hidden: "both", metadata_only: false, accessibility_only: false, rtl_related: true, placeholder_expected: "", placeholder_actual: "", evidence: hits.slice(0, 8).map((hit) => `L${hit.line}: ${hit.reason}; ${hit.context}`).join(" | "), recommended_fix_group: "rtl logical layout", notes: `${hits.length} candidate(s) in this production source; safe numeric/time/airport/price contexts filtered.` });

// Required validation reconciliation. These source-shape assertions are excluded from
// production coverage and recorded separately so every current failure remains reviewable.
const languageTestGroups = [
  ["saved/search-history source-shape assertions", 5, "vi;pl;id;sv", "saved/recent-searches", "Expected exact t(…) and aria-label source snippets that were refactored."],
  ["account preference composition/layout assertions", 5, "th;pl;id;vi;sv", "dashboard/preferences", "Expected exact component names or Tailwind class strings rather than runtime output."],
  ["dashboard, alerts, and trips fixture assertions", 9, "th;vi;tr;pl;id;sv", "dashboard/alerts/trips", "Expected exact href/config/count/template source shapes that changed."],
  ["cars landing/results/date formatting assertions", 8, "sv;pl;id;tr;th", "cars", "Expected removed key reads or exact operational/layout/time-format source snippets."],
  ["hotel results key-read assertion", 1, "sv", "hotels/results", "Expected an exact lowestTotalPrice key read no longer present in that source shape."],
  ["homepage newsletter/FAQ/layout assertions", 3, "sv;pl", "home", "Expected exact class or FAQ-key source snippets; not a rendered-output assertion."],
  ["flight results/details source-shape assertions", 5, "pl;sv;th;id", "flights", "Expected exact price helper or details-link template source snippets that changed."],
];
for (const [name, count, affected, routes, evidence] of languageTestGroups) issue({ severity: "low", status: "manual_review", route_groups: routes, audience: "validation_only", auth_state: "not_applicable", render_state: "test_only", component: name, source_file: "src/lib/__tests__/language.test.ts", source_line: 1, translation_key: "", english_value: "", affected_locales: affected, failure_type: "stale_or_source_shape_language_test", fallback_type: "unreachable_or_test_only", visible_or_hidden: "test_only", metadata_only: false, accessibility_only: false, rtl_related: false, placeholder_expected: "", placeholder_actual: "", evidence: `${count} failing assertion(s): ${evidence}`, recommended_fix_group: "language test maintenance", notes: "Excluded from production localization counts; application/test files were not changed by this report-only audit." });

const placeholderEvidence = {};
for (const [code, data] of localeData) placeholderEvidence[code] = [...allUsedKeys].filter((key) => key in enEffective && key in data.effective && tokenSignature(enEffective[key]) !== tokenSignature(data.effective[key])).map((key) => ({ key, expected: tokenSignature(enEffective[key]), actual: tokenSignature(data.effective[key]) }));
fs.writeFileSync(path.join(tmp, "placeholder-defects.json"), JSON.stringify(placeholderEvidence, null, 2));

const routeRows = [];
const routeEvidence = [];
for (const record of [...routes.values()].sort((a, b) => a.route.localeCompare(b.route))) {
  const graph = graphFor(record); const [audience, auth] = audienceFor(record.route, graph);
  const used = new Set(); const dynamics = []; const literals = []; const rtl = []; const stateCandidates = new Set();
  for (const file of graph) { const analysis = analyses.get(file); if (!analysis) continue; analysis.used.forEach((key) => used.add(key)); dynamics.push(...analysis.dynamic); literals.push(...analysis.literals); rtl.push(...analysis.rtl); analysis.stateCandidates.forEach((state) => stateCandidates.add(state)); }
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
    routeRows.push({ route: record.route, audience, auth_state: auth, special_route_files_discovered: specialFilesFor(record.files), conditional_state_candidates: [...stateCandidates], runtime_states_verified: "none", locale_code: locale.code, locale_tag: locale.locale, direction: locale.direction, page_files: record.pageFiles.map((f) => path.relative(root, f)), layout_files: [...graph].filter((f) => path.basename(f) === "layout.tsx").map((f) => path.relative(root, f)), shared_components: shared, used_key_count: used.size, explicit_translated_count: explicitCount, inherited_english_count: inherited, confirmed_hardcoded_visible_count: literals.filter((hit) => hit.confidence === "confirmed").length, candidate_hardcoded_visible_count: literals.filter((hit) => hit.confidence !== "confirmed").length, placeholder_defect_count: placeholderCount, blank_value_count: blank, dynamic_unresolved_count: dynamics.length, metadata_issue_count: literals.filter((h) => /metadata|generateMetadata/.test(analyses.get(h.file)?.text ?? "")).length, accessibility_issue_count: literals.filter((h) => ["alt", "aria-label", "aria-description", "title"].includes(h.kind)).length, rtl_manual_review_count: rtl.length, runtime_status: "RUNTIME_UNVERIFIED", overall_status: statuses.join(";"), confirmed_issue_ids: related, notes: "Static source/import-graph evidence only; conditional states are candidates, not rendered verification." });
  }
}
fs.writeFileSync(path.join(tmp, "route-evidence.json"), JSON.stringify(routeEvidence.map(({ route, graph, usedKeys, dynamic, literals }) => ({ route, graph, usedKeys, dynamicCount: dynamic.length, literals })), null, 2));
fs.writeFileSync(path.join(tmp, "key-analysis.json"), JSON.stringify({ confirmedUsedKeys: [...allUsedKeys].sort(), finiteDynamicKeys: [...finiteDynamicKeys].sort(), missingEnglish, unresolvedDynamic, genericIdentifierCandidates, excludedSourceFiles: excludedSourceFiles.map((file) => path.relative(root, file)), localeExplicit: Object.fromEntries([...localeData].map(([code, d]) => [code, { module: d.module, keys: [...d.explicit.keys].sort(), duplicates: d.explicit.duplicates }])) }, null, 2));

const routeColumns = ["route","audience","auth_state","special_route_files_discovered","conditional_state_candidates","runtime_states_verified","locale_code","locale_tag","direction","page_files","layout_files","shared_components","used_key_count","explicit_translated_count","inherited_english_count","confirmed_hardcoded_visible_count","candidate_hardcoded_visible_count","placeholder_defect_count","blank_value_count","dynamic_unresolved_count","metadata_issue_count","accessibility_issue_count","rtl_manual_review_count","runtime_status","overall_status","confirmed_issue_ids","notes"];
const issueColumns = ["issue_id","severity","status","route_groups","audience","auth_state","render_state","component","source_file","source_line","translation_key","english_value","affected_locales","failure_type","fallback_type","visible_or_hidden","metadata_only","accessibility_only","rtl_related","placeholder_expected","placeholder_actual","evidence","recommended_fix_group","notes"];
writeCsv(routeCsv, routeColumns, routeRows);
writeCsv(issueCsv, issueColumns, issues);

const discoveredRoutes = routes.size;
const matrixRoutes = new Set(routeRows.map((row) => row.route)).size;
const summary = {
  baseSha: require("node:child_process").execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  activeLocales: locales.length, discoveredRoutes, matrixRoutes, unmappedRoutes: discoveredRoutes - matrixRoutes,
  productionSourceFiles: sourceFiles.length, excludedTestSpecFixtureMockStoryGeneratedFiles: excludedSourceFiles.length,
  routeRows: routeRows.length, sharedComponents: new Set(routeRows.flatMap((r) => r.shared_components)).size,
  englishKeys: englishKeys.size, confirmedUsedTranslationKeys: allUsedKeys.size, finiteDynamicallyResolvedKeys: finiteDynamicKeys.size,
  unusedEnglishKeys: [...englishKeys].filter((k) => !allUsedKeys.has(k)).length,
  visibleLiteralHits: hardcoded.length, unresolvedDynamicCandidates: unresolvedDynamic.length, genericIdentifierFalsePositiveCandidates: genericIdentifierCandidates.length,
  confirmedVisibleFallbacks: fallbackFindings.filter((item) => item.classification === "confirmed_visible_fallback").length,
  likelyOrManualFallbacks: fallbackFindings.filter((item) => item.classification === "manual_review" || item.classification === "likely_visible_fallback").length,
  operationalFallbacksExcluded: fallbackFindings.filter((item) => item.classification === "operational_fallback").length,
  rtlManualReviewCandidates: rtlCandidates.length,
  placeholderEvidenceRows: issues.filter((item) => item.failure_type === "placeholder_defect").length,
  confirmedIssues: issues.filter((i) => i.status === "confirmed").length,
  manualReviewIssues: issues.filter((i) => i.status === "manual_review").length,
  temporaryEvidence: tmp,
};
if (summary.unmappedRoutes !== 0) fail(`${summary.unmappedRoutes} routes are unmapped`);
console.log(JSON.stringify(summary, null, 2));
