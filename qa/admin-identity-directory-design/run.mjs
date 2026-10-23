import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Isolated React/Next browser QA for the real Admin directory before and after.
// Mock authentication and identity records exist only inside this fixture app.
const qa = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(qa, "../..");
const source = path.join(repo, "src");
const temp = await mkdtemp(path.join(process.env.ADMIN_DIRECTORY_QA_WORK || os.tmpdir(), "kt-directory-polish-"));
const output = path.resolve(process.env.ADMIN_DIRECTORY_QA_OUTPUT || path.join(temp, "screenshots"));
const port = process.env.ADMIN_DIRECTORY_QA_PORT || "3209";
const baseline = "e5009cea40495ebfb8d45f8d0f51a201d72b7301";
await mkdir(output, { recursive: true });
const put = async (file, contents) => {
  const target = path.join(temp, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
};
await symlink(path.join(repo, "node_modules"), path.join(temp, "node_modules"));
await symlink(path.join(repo, "public"), path.join(temp, "public"));
await put("package.json", JSON.stringify({ private: true }));
await put("tsconfig.json", JSON.stringify({
  compilerOptions: { jsx: "react-jsx", paths: { "@/*": [path.join(source, "*")] } },
}));
await put("next.config.mjs",
  'import path from "node:path";\n' +
  'export default {devIndicators:false,agentRules:false,experimental:{externalDir:true},webpack(config){\n' +
  'config.resolve.alias["@/lib/auth-guards"]=path.resolve("mocks/auth-guards.js");\n' +
  'config.resolve.alias["@/lib/prisma"]=path.resolve("mocks/prisma.js");\n' +
  'config.resolve.alias["@/lib/env"]=path.resolve("mocks/env.js");\n' +
  'config.resolve.alias["@"]=' + JSON.stringify(source) + ';return config;}};');
await put("postcss.config.mjs", 'export default {plugins:{"@tailwindcss/postcss":{}}};');
await put("app/globals.css",
  await readFile(path.join(source, "app/globals.css"), "utf8") +
  "\n@source " + JSON.stringify(source) + ';\n@source "./";');
await put("app/layout.jsx", 'import "./globals.css";\n' +
  'import {AdminHorizontalShell} from "@/components/admin/AdminHorizontalShell";\n' +
  'export default function Layout({children}) {return <html lang="en"><body>\n' +
  '<div data-testid="qa-directory-label" style={{padding:"6px 16px",background:"#fffbeb",fontSize:12,color:"#7c2d12"}}>Directory QA fixture — synthetic identities only, not staging customer data</div>\n' +
  '<AdminHorizontalShell adminRole="ADMIN" adminEmail="alana@example.invalid" adminName="Alana QA">{children}</AdminHorizontalShell>\n' +
  '</body></html>;}');
await put("app/page.jsx", 'export default function Home(){return <p>Isolated Admin directory browser QA.</p>;}');
await put("app/admin/users/page.tsx", await readFile(path.join(source, "app/admin/users/page.tsx"), "utf8"));
await put("mocks/auth-guards.js", 'export async function requireAdminSession(){return {user:{id:"qa-admin-001",role:"ADMIN"}};}');
await put("mocks/env.js", 'export function getAdminEmails(){return ["alana@example.invalid"];}');
await put("mocks/prisma.js", await readFile(path.join(qa, "data-fixture.js"), "utf8"));

const before = (file) => execFileSync("git", ["show", baseline + ":" + file], { cwd: repo, encoding: "utf8" });
const oldPage = before("src/app/admin/users/page.tsx");
const oldTable = before("src/components/admin/AdminIdentityTable.tsx");
await put("app/before/page.tsx", oldPage.replace('from "@/components/admin/AdminIdentityTable"', 'from "./AdminIdentityTable"'));
await put("app/before/AdminIdentityTable.tsx",
  oldTable.replace('from "./CopyIdentityId"', 'from "@/components/admin/CopyIdentityId"')
    .replace('from "./UserStatusActions"', 'from "@/components/admin/UserStatusActions"'));

const next = spawn(process.execPath,
  [path.join(repo, "node_modules/next/dist/bin/next"), "dev", "--webpack", "-p", port],
  { cwd: temp, stdio: "inherit" });
try {
  const root = "http://localhost:" + port;
  let ready = false;
  for (let attempt = 0; attempt < 70; attempt++) {
    try {
      if ((await fetch(root, { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; }
    } catch { /* startup */ }
    if (next.exitCode !== null) throw new Error("Directory fixture exited: " + next.exitCode);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("Directory fixture Next app did not start");
  const result = await new Promise(resolve => {
    // The navigation workflow reuses the supported current directory fixture
    // rather than the retired Activity-drawer fixture from earlier releases.
    const browserCheck = process.env.ADMIN_DIRECTORY_QA_BROWSER === "navigation"
      ? "browser-check-navigation.mjs" : "browser-check.mjs";
    const child = spawn(process.execPath, [path.join(qa, browserCheck)], {
      cwd: repo, stdio: "inherit",
      env: { ...process.env, ADMIN_DIRECTORY_QA_URL: root, ADMIN_DIRECTORY_QA_OUTPUT: output },
    });
    child.on("exit", resolve);
  });
  console.log("Admin directory before/after screenshots:", output);
  process.exitCode = result ?? 1;
} finally {
  next.kill("SIGTERM");
}
