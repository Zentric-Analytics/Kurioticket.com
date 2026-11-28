import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const productionSources = ["src/app", "src/components", "src/lib", "src/services", "apps/mobile/app", "apps/mobile/src"];
const sourceFile = /\.[cm]?[jt]sx?$/;
const ignoredFile = /(?:\.(?:test|spec|d)|\.stories)\.[cm]?[jt]sx?$/;
const navigationMethods = new Set(["push", "replace", "navigate", "back", "dismissTo", "reset"]);
const exactCalls = new Set([
  "redirect", "permanentRedirect", "notFound", "routerNavigate",
  "writeAdminAuditLog", "writeOperationalAccountAudit", "recordOperationalAccountAudit",
  "recordNativeHomeSection", "recordNativeResultsPage", "recordNativeShare", "recordNativeSavedJourney",
  "workflowDecision", "resultsViewed", "resultDetailsOpened", "recordSave", "recordShare",
]);
const subsectionCall = /^(?:set|select|change|switch|open|show|activate)(?:Active|Selected|Current|Visible)?[A-Z]\w*(?:Tab|Section|Panel|Modal|Step|View)(?:Id|Key|Open)?$/;
const interactionHandler = /(?:save|unsave|share|filter|sort|alert|handoff|delete|revoke|remove|reset|settings|detail|panel|modal|expand|tab|section|permission|dismiss|acknowledge|consent|approve|suspend|publish|archive|restore|logout|signout)/i;

function listFiles(root, directory) {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const path = directory + "/" + entry.name;
    if (entry.isDirectory()) return entry.name.startsWith(".") || entry.name === "__tests__" ? [] : listFiles(root, path);
    return entry.isFile() && sourceFile.test(path) && !ignoredFile.test(path) ? [path] : [];
  });
}

function signalId(kind, expression) {
  return createHash("sha256").update(kind + "\n" + expression.replace(/\s+/g, " ").trim()).digest("hex").slice(0, 16);
}

export function activitySignals(filename, source) {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const found = new Map();
  const add = (kind, node) => {
    const expression = node.getText(file);
    const id = signalId(kind, expression);
    if (!found.has(id)) found.set(id, { id, kind, line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
      expression: expression.replace(/\s+/g, " ").slice(0, 150) });
  };
  const visit = node => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const method = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isIdentifier(callee) ? callee.text : "";
      const receiver = ts.isPropertyAccessExpression(callee) ? callee.expression.getText(file) : "";
      if (exactCalls.has(method) || subsectionCall.test(method) ||
          (navigationMethods.has(method) && /(?:router|navigation)$/i.test(receiver)) ||
          (method === "create" && /(?:^|\.)adminAuditLog$/.test(receiver))) {
        add("navigation, activity or audit call", node);
      }
    }
    if (ts.isJsxAttribute(node)) {
      const attribute = node.name.getText(file);
      const tag = node.parent.parent.tagName.getText(file);
      const initializer = node.initializer?.getText(file) ?? "";
      if (["href", "to"].includes(attribute) && /(^|\.)(?:\w*Link|a)$/.test(tag)) add("destination link", node);
      const deliberateAction = ["onClick", "onPress", "onSelect", "onSubmit"].includes(attribute);
      const meaningfulChange = ["onChange", "onValueChange"].includes(attribute) && interactionHandler.test(initializer);
      if (deliberateAction || meaningfulChange) add("interaction or subsection candidate", node);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return [...found.values()];
}

export function discoverCoverage(root) {
  const routes = {};
  const signals = {};
  for (const folder of productionSources) {
    for (const file of listFiles(root, folder)) {
      if (file.startsWith("src/app/") && /\/page\.[jt]sx?$/.test(file)) {
        routes[file] = file.startsWith("src/app/admin/") ? "admin" : "web";
      }
      if (file.startsWith("apps/mobile/app/")) routes[file] = "native";
      const observations = activitySignals(file, readFileSync(join(root, file), "utf8"));
      if (observations.length) signals[file] = observations;
    }
  }
  return { routes, signals };
}

export function coverageProblems(discovered, policy, baselineSignals) {
  const problems = [];
  const declared = new Map();
  for (const [family, definitions] of Object.entries(policy.routes)) {
    for (const [disposition, files] of Object.entries(definitions)) {
      if (!["observed", "deferred", "excluded"].includes(disposition) || (family === "admin" && disposition === "observed" && files.length > 0)) {
        problems.push("Invalid Phase 1 route disposition " + family + "/" + disposition);
      }
      for (const file of files) {
        if (declared.has(file)) problems.push("Duplicate route definition " + file);
        if (disposition === "excluded" && !(typeof policy.routeExclusions[file] === "string" && policy.routeExclusions[file].trim().length >= 12)) {
          problems.push("Document why the route is excluded " + file);
        }
        declared.set(file, family);
      }
    }
  }
  for (const [file, family] of Object.entries(discovered.routes)) {
    if (declared.get(file) !== family) problems.push("Declare route or document its exclusion " + file);
  }
  for (const [file, family] of declared) {
    if (discovered.routes[file] !== family) problems.push("Stale or mismatched route definition " + file);
  }
  const validActivities = new Set(Object.keys(policy.activityDefinitions));
  for (const [file, observations] of Object.entries(discovered.signals)) {
    const reviewedBaseline = new Set((baselineSignals[file] ?? "").split(" "));
    for (const signal of observations) {
      if (reviewedBaseline.has(signal.id)) continue;
      const id = file + "#" + signal.id;
      const review = policy.reviews[id];
      const defined = validActivities.has(review?.definition);
      const excluded = typeof review?.exclusion === "string" && review.exclusion.trim().length >= 12;
      if (defined === excluded) {
        problems.push(`${file}:${signal.line} Declare ${id} as an approved activity definition or document why it is excluded (${signal.kind}, ${signal.expression})`);
      }
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const read = path => JSON.parse(readFileSync(join(root, "config/activity-tracking", path), "utf8"));
  const discovered = discoverCoverage(root);
  const problems = coverageProblems(discovered, read("definitions.json"), read("audited-signals.json"));
  if (problems.length) {
    for (const problem of problems) console.error(problem);
    process.exitCode = 1;
  } else {
    const count = Object.values(discovered.signals).reduce((total, entries) => total + entries.length, 0);
    console.log(`Activity coverage reviewed for ${Object.keys(discovered.routes).length} route files and ${count} source signals.`);
  }
}
