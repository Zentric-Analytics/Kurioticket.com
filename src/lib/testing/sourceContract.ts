import ts from "typescript";

/** Extract a declaration without depending on unrelated JSX or indentation. */
export function variableInitializer(source: string, name: string): string {
  const file = ts.createSourceFile("contract.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const matches: ts.Expression[] = [];
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer) {
      matches.push(node.initializer);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  if (matches.length !== 1) throw new Error(`Expected one initializer for ${name}; found ${matches.length}`);
  return matches[0].getText(file);
}
