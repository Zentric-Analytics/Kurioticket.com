import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";

// Used by validation, not the live worker. Inspect real static runtime imports,
// including re-exports and relative imports crossing the mobile project root.
export function mobileSharedRuntimeFiles(root) {
  const seen = new Set();
  function visit(file) {
    file = resolve(file);
    if (seen.has(file)) return;
    seen.add(file);
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
      if (statement.importClause?.isTypeOnly || statement.isTypeOnly) continue;
      const specifier = statement.moduleSpecifier?.text;
      if (!specifier || (!specifier.startsWith(".") && !specifier.startsWith("@/"))) continue;
      const base = specifier.startsWith("@/") ? join(root, "src", specifier.slice(2)) : resolve(dirname(file), specifier);
      const target = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]
        .find((candidate) => existsSync(candidate) && statSync(candidate).isFile() && /\.[jt]sx?$/.test(candidate));
      if (target) visit(target);
    }
  }
  function scan(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory() && !["__tests__", "node_modules"].includes(entry.name)) scan(file);
      else if (entry.isFile() && /\.[jt]sx?$/.test(file) && !/\.(?:test|spec)\./.test(file)) visit(file);
    }
  }
  scan(join(root, "apps/mobile/src"));
  scan(join(root, "apps/mobile/app"));
  return [...seen].map((file) => relative(root, file).replaceAll("\\", "/")).filter((file) => file.startsWith("src/")).sort();
}
