// Test-only browser loader. Compile unchanged client modules with real React;
// explicitly supplied boundary fixtures never replace the component under test.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, posix, relative, resolve } from "node:path";
import ts from "typescript";
import postcss from "postcss";
import type { Page } from "playwright";

export function componentBundle(entries: Record<string, string>, boundaries: Record<string, string> = {}) {
  const require = createRequire(import.meta.url);
  const modules: Record<string, string> = {};
  for (const [name, file] of Object.entries({ react: "react/cjs/react.production.js", "react-dom": "react-dom/cjs/react-dom.production.js", "react-dom/client": "react-dom/cjs/react-dom-client.production.js", "react/jsx-runtime": "react/cjs/react-jsx-runtime.production.js", scheduler: "scheduler/cjs/scheduler.production.js" })) {
    modules[name] = readFileSync(`node_modules/${file}`, "utf8");
  }
  Object.assign(modules, {
    "next/link": "module.exports={__esModule:true,default:({children,...props})=>require('react').createElement('a',props,children)};",
    "next/navigation": "exports.useRouter=()=>({push:url=>window.fixtureNavigation.push(url)});exports.usePathname=()=>window.fixturePath||'/admin/flights';",
    ...boundaries,
  });
  function add(name: string, file: string) {
    if (Object.hasOwn(modules, name)) return;
    modules[name] = "";
    const raw = readFileSync(file, "utf8");
    if (file.endsWith(".module.css")) {
      const classes: Record<string, string> = {};
      const prefix = "fixture_" + createHash("sha256").update(file).digest("hex").slice(0, 10) + "_";
      const css = postcss.parse(raw, { from: file });
      css.walkRules(rule => {
        rule.selector = rule.selector.replace(/\.([A-Za-z_][A-Za-z0-9_-]*)/g, (_match, value: string) => "." + (classes[value] ??= prefix + value));
      });
      // Load the actual module stylesheet with isolated fixture class names.
      // This fixture adapter does not claim Next.js CSS compiler equivalence.
      modules[name] = `const style=document.createElement("style");style.textContent=${JSON.stringify(css.toString())};document.head.appendChild(style);module.exports=${JSON.stringify(classes)};`;
      return;
    }
    let compiled = /\.tsx?$/.test(file) ? ts.transpileModule(raw, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText : raw;
    compiled = compiled.replace(/require\("([^"]+)"\)/g, (_call, dependency: string) => {
      if (Object.hasOwn(modules, dependency)) return `require(${JSON.stringify(dependency)})`;
      const location = dependency.startsWith("@/") ? `src/${dependency.slice(2)}` : dependency.startsWith(".") ? posix.normalize(posix.join(posix.dirname(file), dependency)) : relative(process.cwd(), require.resolve(dependency, { paths: [dirname(`${process.cwd()}/${file}`)] })).replaceAll("\\", "/");
      const resolved = [location, `${location}.ts`, `${location}.tsx`, `${location}/index.ts`, `${location}/index.js`].find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
      assert.ok(resolved, `Unconfigured component dependency: ${dependency} from ${file}`);
      const id = `file:${resolved}`;
      add(id, resolved);
      return `require(${JSON.stringify(id)})`;
    });
    modules[name] = compiled;
  }
  for (const [name, file] of Object.entries(entries)) add(name, file);
  return `const registry={${Object.entries(modules).map(([name, code]) => `${JSON.stringify(name)}:function(require,module,exports){${code}\n}`).join(",")}},cache={};function require(name){if(cache[name])return cache[name].exports;if(!registry[name])throw Error('Unconfigured module '+name);const module={exports:{}};cache[name]=module;registry[name](require,module,module.exports);return module.exports;}`;
}

export async function withComponentBrowser(bundle: string, setup: string, run: (page: Page) => Promise<void>, width = 1280) {
  const { chromium } = createRequire(import.meta.url)("playwright") as typeof import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width, height: 900 }, serviceWorkers: "block" });
    // A synthetic origin permits sessionStorage/focus behavior; no real server,
    // supplier, authentication or database endpoint can be reached.
    await page.route("**/*", (route) => route.request().url() === "http://fixture.local/" ? route.fulfill({ contentType: "text/html", body: '<div id="root"></div>' }) : route.abort());
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://fixture.local/");
    const cssDir = ".next/static/chunks";
    if (existsSync(cssDir)) await page.addStyleTag({ content: readdirSync(cssDir).filter((file) => file.endsWith(".css")).map((file) => readFileSync(`${cssDir}/${file}`, "utf8")).join("\n") });
    await page.addScriptTag({ content: bundle + `\nwindow.fixtureNavigation=[];\n` + setup });
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
    assert.deepEqual(errors, [], "component setup must execute without hidden errors");
    await run(page);
    assert.deepEqual(errors, [], "component browser must not conceal runtime errors");
    const evidenceDirectory = process.env.KURIOTICKET_COMPONENT_EVIDENCE;
    if (evidenceDirectory) {
      const directory = resolve(evidenceDirectory);
      assert.ok(relative(process.cwd(), directory).startsWith(".."), "screenshots belong outside the repository");
      mkdirSync(directory, { recursive: true });
      const name = `component-${width}-${randomUUID()}`;
      await page.screenshot({ path: `${directory}/${name}.png`, fullPage: true });
      writeFileSync(`${directory}/${name}.json`, JSON.stringify({ scope: "Mounted component with explicit boundary fixtures; not a complete Next.js route/hydration test", width, errors, text: await page.locator("body").innerText() }, null, 2));
    }
  } finally { await browser.close(); }
}
