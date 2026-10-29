import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Browser fixture uses the real Admin Activity route and Admin shell.
// Only authentication and storage are replaced with clearly labelled sample data.
const qa = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(qa, "../..");
const source = path.join(repo, "src");
const temp = await mkdtemp(path.join(process.env.ADMIN_ACTIVITY_QA_WORK || os.tmpdir(), "kt-activity-"));
const output = path.resolve(process.env.ADMIN_ACTIVITY_QA_OUTPUT || path.join(temp, "screenshots"));
const port = process.env.ADMIN_ACTIVITY_QA_PORT || "3199";
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
  'config.resolve.alias["@/lib/stagingSafety"]=path.resolve("mocks/stagingSafety.js");\n' +
  'config.resolve.alias["@/lib/prisma"]=path.resolve("mocks/prisma.js");\n' +
  'config.resolve.alias["@/services/adminIdentityActivityService"]=path.resolve("mocks/activity.js");\n' +
  'config.resolve.alias["@"]=' + JSON.stringify(source) + ';return config;}};');
await put("postcss.config.mjs", 'export default {plugins:{"@tailwindcss/postcss":{}}};');
await put("app/globals.css",
  await readFile(path.join(source, "app/globals.css"), "utf8") +
  "\n@source " + JSON.stringify(source) + ';\n@source "./";');
await put("app/layout.jsx", 'import "./globals.css";\n' +
  'import {AdminHorizontalShell} from "@/components/admin/AdminHorizontalShell";\n' +
  'export default function Layout({children}) {return <html lang="en"><body>\n' +
  '<div data-testid="fixture-label" style={{padding:"5px 15px",background:"#fffbeb",fontSize:12,color:"#7c2d12"}}>Browser QA fixture — synthetic activity, not live customer data</div>\n' +
  '<AdminHorizontalShell adminRole="ADMIN" adminEmail="qa.admin@example.invalid" adminName="QA admin">{children}</AdminHorizontalShell>\n' +
  '</body></html>;}');
await put("app/page.jsx", 'export default function Home(){return <p>Isolated Admin Activity visual QA.</p>;}');
await put("app/admin/users/[kind]/[id]/activity/page.tsx",
  await readFile(path.join(source, "app/admin/users/[kind]/[id]/activity/page.tsx"), "utf8"));
await put("mocks/auth-guards.js", 'export async function requireAdminSession(){return {user:{id:"qa-admin",role:"ADMIN"}};}');
await put("mocks/stagingSafety.js", 'export function getPublicEnvironment(){return "staging";}');
await put("mocks/activity.js", await readFile(path.join(qa, "activity-fixture.js"), "utf8"));
await put("mocks/prisma.js", await readFile(path.join(qa, "old-drawer-fixture.js"), "utf8"));
// Compare the unmodified Activity page and timeline at this change's dev base,
// using the same fictional identity and complete event history.
const baseline = process.env.ADMIN_ACTIVITY_QA_BASE || "1bfa4db410ae11512a2fc1aea74a2a6c3d63ae8d";
const oldTimeline = execFileSync("git", [
  "show", baseline + ":src/components/admin/ActivityTimeline.tsx",
], { cwd: repo, encoding: "utf8" });
await put("app/before/BeforeActivityTimeline.tsx", oldTimeline);
const oldActivity = execFileSync("git", [
  "show", baseline + ":src/app/admin/users/[kind]/[id]/activity/page.tsx",
], { cwd: repo, encoding: "utf8" })
  .replace('from "@/components/admin/ActivityTimeline"', 'from "./BeforeActivityTimeline"');
await put("app/before/OldActivityPage.tsx", oldActivity);
await put("app/before/page.tsx", [
  'import OldActivityPage from "./OldActivityPage";',
  'export default function BeforeActivityPage(){',
  '  return <OldActivityPage params={Promise.resolve({kind:"guest",id:"qa-guest-activity-0001"})} searchParams={Promise.resolve({})} />;',
  '}',
].join("\n"));

const app = spawn(process.execPath,
  [path.join(repo, "node_modules/next/dist/bin/next"), "dev", "--webpack", "-p", port],
  { cwd: temp, stdio: "inherit", env: {...process.env, ADMIN_EMAILS:"protected.qa@example.invalid"} });
try {
  const root = "http://localhost:" + port;
  let running = false;
  for (let attempt = 0; attempt < 65; attempt++) {
    try {
      if ((await fetch(root, { signal: AbortSignal.timeout(2000) })).ok) { running = true; break; }
    } catch { /* awaiting Next */ }
    if (app.exitCode !== null) throw new Error("QA application exited early: " + app.exitCode);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!running) throw new Error("QA Next app did not start");
  // Warm compiled fixture routes before Playwright inspects the real components.
  for (const route of ["/before", "/admin/users/guest/qa-guest-activity-0001/activity"]) {
    let ready = false;
    for (let attempt = 0; attempt < 12; attempt++) {
      try {
        const response = await fetch(root + route, { signal: AbortSignal.timeout(12000) });
        if (response.ok && (await response.text()).includes("synthetic activity")) {
          ready = true;
          break;
        }
      } catch { /* Next is compiling the fixture route */ }
      if (app.exitCode !== null) throw new Error("QA fixture app exited while compiling " + route);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("QA fixture route did not compile successfully: " + route);
  }
  for (const check of ["browser-check.mjs", "actions-check.mjs", "zoom-check.mjs"]) {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(qa, check)], {
        cwd: repo, stdio: "inherit",
        env: { ...process.env, ADMIN_ACTIVITY_QA_URL: root, ADMIN_ACTIVITY_QA_OUTPUT: output },
      });
      child.on("error", reject);
      child.on("exit", resolve);
    });
    if (result !== 0) {
      process.exitCode = result ?? 1;
      break;
    }
  }
  console.log("Customer activity screenshots:", output);
} finally {
  app.kill("SIGTERM");
}
