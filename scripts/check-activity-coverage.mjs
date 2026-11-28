import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const productionSources = ["src/app", "src/components", "src/lib", "src/services", "apps/mobile/app", "apps/mobile/src"];
const sourceFile = /\.[cm]?[jt]sx?$/;
const ignoredFile = /(?:\.(?:test|spec|d)|\.stories)\.[cm]?[jt]sx?$/;
// Frozen audit metadata from the original Phase 1 evidence.
const auditedRevision = "598bef7cbe9dc51aade5923023f7483c479c9a91";
const auditMatrix = {
  admin: { rows: 598, sha256: "20a813df6e7f9e25a1fe8dd4ee76101368f1bafb0b950aa8c7c70ac41508f937" },
  web: { rows: 325, sha256: "e333f05c026c0d0c5f409c42b40f3be576d4f910bf86a2397fd71a5e45325c1a" },
  native: { rows: 162, sha256: "a7c99952a6e9f1dcac42b094990d2e5988043c9a3b93d76902902b25f86ae6ea" },
};
const navigationMethods = new Set(["push", "replace", "navigate", "back", "dismissTo", "reset"]);
const exactCalls = new Set([
  "redirect", "permanentRedirect", "notFound", "routerNavigate",
  "writeAdminAuditLog", "writeOperationalAccountAudit", "recordOperationalAccountAudit",
  "recordNativeHomeSection", "recordNativeResultsPage", "recordNativeShare", "recordNativeSavedJourney",
  "workflowDecision", "resultsViewed", "resultDetailsOpened", "recordSave", "recordShare",
]);
const subsectionCall = /^(?:set|select|change|switch|open|show|activate)(?:Active|Selected|Current|Visible)?[A-Z]\w*(?:Tab|Section|Panel|Modal|Step|View)(?:Id|Key|Open)?$/;
const interactionHandler = /(?:save|unsave|share|filter|sort|alert|handoff|delete|revoke|remove|reset|settings|detail|panel|modal|expand|tab|section|permission|dismiss|acknowledge|consent|approve|suspend|publish|archive|restore|logout|signout)/i;

function isProductionSource(path) {
  return sourceFile.test(path) && !ignoredFile.test(path) &&
    path.split("/").slice(0, -1).every(segment => !segment.startsWith(".") && segment !== "__tests__");
}

function listFiles(root, directory) {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const path = directory + "/" + entry.name;
    if (entry.isDirectory()) return entry.name.startsWith(".") || entry.name === "__tests__" ? [] : listFiles(root, path);
    return entry.isFile() && isProductionSource(path) ? [path] : [];
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
    const existing = found.get(id);
    if (existing) {
      existing.occurrences++;
    } else {
      found.set(id, { id, kind, line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
        expression: expression.replace(/\s+/g, " ").slice(0, 150), occurrences: 1 });
    }
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

export function verifyAuditedBaseline(root, policy, manifest) {
  if (policy.auditedRevision !== auditedRevision || !isDeepStrictEqual(policy.auditMatrix, auditMatrix)) {
    throw new Error("Activity coverage audit revision or matrix differs from the original Phase 1 evidence.");
  }

  const git = (args, input) => execFileSync("git", ["--no-replace-objects", ...args], {
    cwd: root, input, stdio: ["pipe", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024,
  });
  let tree;
  try {
    tree = git(["ls-tree", "-r", "-z", "--full-tree", auditedRevision, "--", ...productionSources]);
  } catch (cause) {
    throw new Error("Cannot read the audited Git revision " + auditedRevision + ". Fetch it before running the guard.", { cause });
  }
  const files = tree
    .toString("utf8").split("\0").flatMap(entry => {
      const match = /^(100(?:644|755)) blob ([0-9a-f]{40})\t([\s\S]+)$/.exec(entry);
      return match && isProductionSource(match[3]) ? [{ oid: match[2], path: match[3] }] : [];
    });
  if (!files.length) throw new Error("No production sources found in the audited revision.");

  const blobs = git(["cat-file", "--batch"], files.map(({ oid }) => oid).join("\n") + "\n");
  const reconstructed = {};
  const counts = {};
  let offset = 0;
  for (const { oid, path } of files) {
    const headerEnd = blobs.indexOf(10, offset);
    const [object, type, size] = blobs.toString("utf8", offset, headerEnd).split(" ");
    const end = headerEnd + 1 + Number(size);
    if (headerEnd < offset || object !== oid || type !== "blob" || !/^\d+$/.test(size) || blobs[end] !== 10) {
      throw new Error("Cannot read audited activity source " + path);
    }
    const signals = activitySignals(path, blobs.toString("utf8", headerEnd + 1, end));
    offset = end + 1;
    if (signals.length) {
      reconstructed[path] = signals.map(({ id }) => id).sort().join(" ");
      counts[path] = Object.fromEntries(signals.map(({ id, occurrences }) => [id, occurrences]));
    }
  }
  if (!isDeepStrictEqual(manifest, reconstructed)) {
    throw new Error("Activity coverage baseline differs from the source signals in the audited revision.");
  }
  return counts;
}

export function coverageProblems(discovered, policy, auditedCounts) {
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
  for (const [file, observations] of Object.entries(discovered.signals)) {
    for (const signal of observations) {
      if (signal.occurrences <= (auditedCounts[file]?.[signal.id] ?? 0)) continue;
      const id = file + "#" + signal.id;
      const review = policy.reviews[id];
      const definition = typeof review?.definition === "string" && Object.hasOwn(policy.activityDefinitions, review.definition)
        ? policy.activityDefinitions[review.definition] : undefined;
      const defined = typeof definition === "string" && definition.trim().length > 0;
      const excluded = typeof review?.exclusion === "string" && review.exclusion.trim().length >= 12;
      const validReview = (defined && !Object.hasOwn(review, "exclusion")) ||
        (excluded && !Object.hasOwn(review, "definition"));
      if (!validReview) {
        problems.push(`${file}:${signal.line} Declare ${id} as an approved activity definition or document why it is excluded (${signal.kind}, ${signal.expression})`);
      }
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const read = path => JSON.parse(readFileSync(join(root, "config/activity-tracking", path), "utf8"));
  try {
    const policy = read("definitions.json");
    const auditedCounts = verifyAuditedBaseline(root, policy, read("audited-signals.json"));
    const discovered = discoverCoverage(root);
    const problems = coverageProblems(discovered, policy, auditedCounts);
    if (problems.length) {
      for (const problem of problems) console.error(problem);
      process.exitCode = 1;
    } else {
      const count = Object.values(discovered.signals).reduce((total, entries) => total + entries.length, 0);
      console.log(`Activity coverage reviewed for ${Object.keys(discovered.routes).length} route files and ${count} source signals.`);
    }
  } catch (error) {
    console.error("Activity coverage verification failed: " + error.message);
    process.exitCode = 1;
  }
}
