import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

// Exercise the real Admin header in isolation. Unlike the directory's legacy
// before/after fixture, this test does not import historic Users implementations.
const qa = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(qa, "../..");
const source = path.join(repo, "src");
const scratch = path.resolve(process.env.ADMIN_NAV_QA_WORK || os.tmpdir());
await mkdir(scratch, { recursive: true });
const app = await mkdtemp(path.join(scratch, "admin-nav-"));
const output = path.resolve(process.env.ADMIN_NAV_QA_OUTPUT || path.join(app, "screenshots"));
const port = process.env.ADMIN_NAV_QA_PORT || "3119";
const origin = "http://127.0.0.1:" + port;

async function put(name, contents) {
  const file = path.join(app, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, contents);
}

await symlink(path.join(repo, "node_modules"), path.join(app, "node_modules"));
await symlink(path.join(repo, "public"), path.join(app, "public"));
await put("package.json", JSON.stringify({ private: true }));
await put("tsconfig.json", JSON.stringify({
  compilerOptions: {
    jsx: "react-jsx",
    paths: { "@/*": [path.join(source, "*")] },
  },
}));
await put("next.config.mjs", [
  'export default {devIndicators:false,agentRules:false,experimental:{externalDir:true},webpack(config){',
  'config.resolve.alias["@"]=' + JSON.stringify(source) + ';',
  'return config;}};',
].join("\n"));
await put("postcss.config.mjs", 'export default {plugins:{"@tailwindcss/postcss":{}}};');
await put("app/globals.css", (await readFile(path.join(source, "app/globals.css"), "utf8"))
  + "\n@source " + JSON.stringify(source) + ';\n@source "./";');
await put("app/layout.jsx", [
  'import "./globals.css";',
  'import { AdminHorizontalShell } from "@/components/admin/AdminHorizontalShell";',
  'export default function Layout({children}) {',
  '  return <html lang="en"><body>',
  '    <AdminHorizontalShell adminRole="ADMIN" adminEmail="qa@example.invalid" adminName="QA admin" showPreviewTesters={true}>',
  '      {children}',
  '    </AdminHorizontalShell>',
  '  </body></html>;',
  '}',
].join("\n"));
const fixturePage = [
  'export default function Page() {',
  '  return <section aria-label="Navigation QA content" className="rounded-xl bg-white p-6">',
  '    <h1 className="text-xl font-semibold">Admin navigation QA</h1>',
  '    <p>No customer records or production data are used by this fixture.</p>',
  '  </section>;',
  '}',
].join("\n");
await put("app/page.jsx", fixturePage);
await put("app/[...route]/page.jsx", fixturePage);

const expectedHrefs = [
  "/admin", "/admin/users", "/admin/searches", "/admin/journeys",
  "/admin/redirects", "/admin/referral-attribution", "/admin/confirmed-trips",
  "/admin/flight-status", "/admin/support", "/admin/account-deletions",
  "/admin/providers", "/admin/flights", "/admin/hotels", "/admin/cars",
  "/admin/content", "/admin/logs", "/admin/system", "/admin/settings",
  "/admin/homepage-fares", "/admin/preview-testers",
];

const server = spawn(process.execPath, [
  path.join(repo, "node_modules/next/dist/bin/next"), "dev", "--webpack", "-p", port,
], { cwd: app, stdio: "inherit" });
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      if ((await fetch(origin, { signal: AbortSignal.timeout(2000) })).ok) {
        ready = true;
        break;
      }
    } catch {
      // The disposable Next development server is still starting.
    }
    if (server.exitCode !== null) throw new Error("Fixture server exited: " + server.exitCode);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(ready, "Admin navigation fixture must start");

  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const passed = [];
  const nav = page.locator('nav[aria-label="Admin navigation"]:visible');

  for (const width of [320, 390, 768, 1099, 1100, 1280, 1366, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin, { waitUntil: "networkidle" });
    const brand = page.getByRole("link", { name: "Kurioticket Admin overview" });
    await expect(brand).toHaveCount(1);
    await expect(brand).toBeVisible();
    const mark = brand.locator("img");
    await expect(mark).toBeVisible();
    assert.equal(await mark.evaluate((img) => img.complete && img.naturalWidth > 0), true,
      "Official Kurioticket logo loads");
    const imageBox = await mark.boundingBox();
    const titleBox = await page.getByText("Kurioticket Admin", { exact: true }).boundingBox();
    assert.ok(imageBox && titleBox && imageBox.x < titleBox.x);
    assert.ok(titleBox.x - (imageBox.x + imageBox.width) <= 20, "Brand mark stays beside title");

    if (width < 1100) {
      await expect(nav).toHaveCount(0);
      await page.getByRole("button", { name: "Open admin navigation" }).click();
    } else {
      await expect(page.getByRole("button", { name: "Open admin navigation" })).not.toBeVisible();
    }
    await expect(nav).toHaveCount(1);
    for (const href of expectedHrefs) {
      const link = nav.locator('a[href="' + href + '"]');
      await expect(link, "Direct visible tab for " + href + " at " + width + "px").toHaveCount(1);
      await expect(link).toBeVisible();
    }
    await expect(nav.locator('button[aria-label^="Show "]')).toHaveCount(0);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(scrollWidth <= width + 1, "Unexpected page overflow at " + width + "px: " + scrollWidth);
    await page.screenshot({
      path: path.join(output, (width < 1100 ? "compact-" : "desktop-") + width + ".png"),
      fullPage: true,
    });
    passed.push("all accessible Admin tabs and no page overflow at " + width + "px");
    console.log("PASS", passed[passed.length - 1]);
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(origin + "/admin/redirects", { waitUntil: "networkidle" });
  await expect(nav).toHaveCount(1);
  const selected = nav.locator('a[href="/admin/redirects"]');
  const unselected = nav.locator('a[href="/admin/searches"]');
  await expect(selected).toHaveAttribute("aria-current", "page");
  await expect(unselected).not.toHaveAttribute("aria-current", "page");
  const baseClasses = (value) => value.split(/\s+/).filter((token) => !token.startsWith("after:")).join(" ");
  assert.equal(baseClasses(await selected.getAttribute("class")),
    baseClasses(await unselected.getAttribute("class")),
    "Active tabs may differ only by their underline, not typography or surface");
  assert.ok((await selected.getAttribute("class")).includes("after:bg-indigo-600"),
    "Active tab underline is present");
  await page.screenshot({ path: path.join(output, "selected-provider-handoffs-1280.png"), fullPage: true });
  passed.push("Selected tab uses underline only");
  assert.deepEqual(pageErrors, [], "No browser JavaScript errors");
  await writeFile(path.join(output, "browser-results.json"),
    JSON.stringify({ passed, pageErrors, fixture: "real AdminHorizontalShell, synthetic content only" }, null, 2));
  console.log("PASS Admin navigation visual QA: " + passed.length + " checks");
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
