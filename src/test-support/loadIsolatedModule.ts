import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

/** Execute unchanged source against explicit, narrowly typed fixture ports.
 * Never pretend a partial database fixture implements all Prisma delegates.
 */
export function loadIsolatedModule<T extends object>(file: string, dependencies: Record<string, unknown>): T {
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported: Record<string, unknown> = {};
  const execute = vm.runInThisContext(`(function(exports, require) {${code}\n})`, { filename: file });
  execute(exported, (name: string) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected fixture dependency: ${name}`);
    return dependencies[name];
  });
  return exported as T;
}
