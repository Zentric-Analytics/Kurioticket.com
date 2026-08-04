import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

function renderedMobileSources(directory: string): string[] {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) return renderedMobileSources(path);
    if (extname(entry.name) !== ".tsx" || entry.name.endsWith(".test.tsx")) return [];
    return [path];
  });
}

test("Preview and Production share the same in-app interface without environment markers", () => {
  const files = [...renderedMobileSources("app"), ...renderedMobileSources("src")];
  const renderedSource = files.map(source).join("\n");

  assert.doesNotMatch(renderedSource, /KURIOTICKET PREVIEW/i);
  assert.doesNotMatch(renderedSource, /OTA TEST/i);
  assert.doesNotMatch(renderedSource, /PreviewBanner|preview badge|environment marker/i);
});

test("root layout adds no environment-specific safe-area banner or spacer", () => {
  const layout = source("app/_layout.tsx");

  assert.doesNotMatch(layout, /PreviewBanner|SafeAreaView|isPreview/);
  assert.match(layout, /<View style=\{\{ flex: 1 \}\}>\s*<StatusBar[\s\S]*?<Stack/);
});
