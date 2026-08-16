import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const rootLayoutSource = readSource("../../app/layout.tsx");
const globalStylesSource = readSource("../../app/globals.css");
const headerSource = readSource("./AppHeader.tsx");
const footerSource = readSource("./Footer.tsx");

test("root viewport enables edge-to-edge rendering with light browser chrome", () => {
  assert.match(rootLayoutSource, /width: "device-width"/);
  assert.match(rootLayoutSource, /initialScale: 1/);
  assert.match(rootLayoutSource, /viewportFit: "cover"/);
  assert.match(rootLayoutSource, /themeColor: "#ffffff"/);
});

test("document canvas covers the dynamic viewport with the root background", () => {
  const htmlAndBodyRules = globalStylesSource.slice(
    globalStylesSource.indexOf("html {"),
    globalStylesSource.indexOf("a {"),
  );

  assert.equal((htmlAndBodyRules.match(/min-height: 100dvh/g) ?? []).length, 2);
  assert.equal(
    (htmlAndBodyRules.match(/background: var\(--background\)/g) ?? []).length,
    2,
  );
  assert.match(htmlAndBodyRules, /body \{[\s\S]*?width: 100%/);
});

test("shared public chrome owns the mobile safe-area surfaces", () => {
  assert.match(
    headerSource,
    /bg-white pt-\[env\(safe-area-inset-top\)\]/,
  );
  assert.match(
    footerSource,
    /bg-white pb-\[env\(safe-area-inset-bottom\)\]/,
  );
});
