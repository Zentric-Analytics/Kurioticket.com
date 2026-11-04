import { spawn, execFileSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { once } from "node:events";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Render real repository components; only auth and operational records are
// isolated fixtures. Never connect this QA app to a live database or mail API.
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const source = path.join(repo, "src");
const output = path.resolve(process.env.ADMIN_SYSTEM_QA_OUTPUT || path.join(os.tmpdir(), "admin-system-cleanup-evidence"));
const baseline = "c0094622f709304aebce13acc2a6e5b9f886069b";
const port = "3218";
await mkdir(output, { recursive: true });
const pages = ["system", "logs", "system/cms-health", "email-delivery", "notifications", "settings"];
const mocks = {
  "@/lib/admin-data": 'export async function getSafeSystemStatus(){return {appEnvironment:"Staging",databaseConfigured:true,databaseConnected:true,authConfigured:false,sessionConfigured:false,emailConfigured:false,providerCredentialsPresent:false,adminEmailsConfigured:false};} export function formatDateTime(value){return String(value);}',
  "@/lib/env": 'export function getAdminEmails(){return [];} export function getFeatureControlProductionAdmins(){return [];}',
  "@/lib/auth-guards": 'export async function requireAdminSession(){return {user:{id:"qa-admin",email:"operator@example.invalid",name:"QA Operator",role:"ADMIN"}};}',
  "@/lib/admin": 'export function isProtectedAdminEmail(){return true;}',
  "@/lib/adminDatabaseOutageAccess": 'export async function getCurrentDatabaseOutageAdminToken(){return null;}',
  "@/lib/auth": 'export const authOptions={};',
  "next-auth$": 'export async function getServerSession(){return {user:{email:"operator@example.invalid"}};}',
  "@/lib/feature-controls/service": 'export async function listFeatureControls(){return {environment:"STAGING",dataAvailable:true,controls:[]};}',
  "@/services/adminAuditReadService": 'export const adminAuditReads={async list(){return {status:"ok",data:{items:[],nextCursor:null}};}};',
  "@/services/cmsHardeningService": 'export async function getCmsHealthOverview(){return {available:true,totals:{scopes:0,healthy:0,unhealthy:0,retiredFallback:0,unpublishedChanges:0},scopes:[]};}',
  "@/services/emailDeliveryService": 'export async function getEmailDeliveryHealthSnapshot(){return {dataAvailable:true,last24Hours:0,failures:0,delayed:0,suppressed:0,latest:[]};}',
  "@/services/adminAlertService": `
const at="2026-11-04T14:00:00.000Z";
const items=[
 {key:"qa.support",source:"SUPPORT",title:"Urgent support tickets need team attention",actionHref:"/admin/support?priority=URGENT&status=OPEN",signalToken:"qa-support"},
 {key:"qa.email",source:"EMAIL",title:"Email configuration incomplete",actionHref:"/admin/email-delivery",signalToken:"qa-email"},
 {key:"system.database.unavailable",source:"SYSTEM",title:"Synthetic database outage example",actionHref:"/admin/notifications",signalToken:"database-outage"},
 {key:"qa.unpersisted",source:"SEARCH",title:"Synthetic monitoring-state storage example",actionHref:"/admin/searches/activity",signalToken:"unpersisted:qa"}
];
export async function getAdminAlertSnapshot(){return {generatedAt:at,activeCount:4,unreadCount:4,criticalCount:0,warningCount:4,alerts:items.map(item=>({...item,id:item.key,severity:"WARNING",message:"Labelled QA data only; no live incident is asserted.",signalAt:at,acknowledged:false,acknowledgedAt:null}))};}
export function getDatabaseOutageAlertSnapshot(){throw new Error("Unexpected live outage path in QA");}
`,
};
for (const variant of ["before", "after"]) {
  const temp = await mkdtemp(path.join(os.tmpdir(), `kt-system-${variant}-`));
  const put = async (file, content) => { const target = path.join(temp, file); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, content); };
  await symlink(path.join(repo, "node_modules"), path.join(temp, "node_modules"));
  await symlink(path.join(repo, "public"), path.join(temp, "public"));
  await put("package.json", JSON.stringify({ private: true }));
  await put("tsconfig.json", JSON.stringify({ compilerOptions: { jsx: "react-jsx", paths: { "@/*": [path.join(source, "*")] } } }));
  const aliases = {};
  let n = 0;
  for (const [key, content] of Object.entries(mocks)) {
    const file = `mocks/mock-${n++}.js`; await put(file, content); aliases[key] = path.join(temp, file);
  }
  if (variant === "before") {
    await put("mocks/navigation.ts", execFileSync("git", ["show", `${baseline}:src/lib/adminNavigation.ts`], { cwd: repo, encoding: "utf8" }));
    aliases["@/lib/adminNavigation"] = path.join(temp, "mocks/navigation.ts");
  }
  await put("next.config.mjs", `export default {devIndicators:false,agentRules:false,experimental:{externalDir:true},webpack(config){Object.assign(config.resolve.alias,${JSON.stringify(aliases)});config.resolve.alias["@"]=${JSON.stringify(source)};return config;}};`);
  await put("postcss.config.mjs", 'export default {plugins:{"@tailwindcss/postcss":{}}};');
  await put("app/globals.css", await readFile(path.join(source, "app/globals.css"), "utf8") + `\n@source ${JSON.stringify(source)};\n@source "./";`);
  await put("app/layout.jsx", `import "./globals.css";import {AdminHorizontalShell} from "@/components/admin/AdminHorizontalShell";
export default function Layout({children}){return <html lang="en"><body><div data-qa-label style={{padding:"6px 16px",background:"#fffbeb",color:"#7c2d12",fontSize:12}}>System cleanup ${variant}: real components with synthetic QA records only</div><AdminHorizontalShell adminRole="ADMIN" adminEmail="operator@example.invalid" adminName="QA Operator">{children}</AdminHorizontalShell></body></html>;}`);
  await put("app/page.jsx", 'export default function Home(){return <p>System cleanup QA fixture</p>;}');
  await put("app/api/admin/notifications/route.js", 'export async function GET(){return Response.json({unreadCount:4});}');
  await put("app/api/admin/notifications/acknowledge/route.js", 'export async function POST(){return Response.json({ok:true});}');
  for (const route of pages) {
    const file = `src/app/admin/${route}/page.tsx`;
    const content = variant === "before" ? execFileSync("git", ["show", `${baseline}:${file}`], { cwd: repo, encoding: "utf8" }) : await readFile(path.join(repo, file), "utf8");
    await put(`app/admin/${route}/page.tsx`, content);
  }
  const log = createWriteStream(path.join(output, `${variant}-server.log`));
  const server = spawn(process.execPath, [path.join(repo, "node_modules/next/dist/bin/next"), "dev", "--webpack", "-p", port], { cwd: temp, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", RESEND_API_KEY: "", RESEND_FROM_EMAIL: "", RESEND_WEBHOOK_SECRET: "" } });
  server.stdout.pipe(log); server.stderr.pipe(log);
  try {
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      try { if ((await fetch(`http://localhost:${port}`, { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; } } catch { /* Startup only. */ }
      if (server.exitCode !== null) throw new Error(`QA fixture exited ${server.exitCode}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error(`System ${variant} fixture did not start`);
    const check = spawn(process.execPath, [path.join(here, "browser.mjs")], { cwd: repo, stdio: "inherit", env: { ...process.env, ADMIN_SYSTEM_QA_URL: `http://localhost:${port}`, ADMIN_SYSTEM_QA_OUTPUT: output, ADMIN_SYSTEM_QA_VARIANT: variant } });
    const [code] = await once(check, "exit");
    if (code !== 0) throw new Error(`System ${variant} browser QA failed (${code})`);
  } finally {
    if (server.exitCode === null) { server.kill("SIGTERM"); await once(server, "exit"); }
    log.end();
  }
}
await writeFile(path.join(output, "README.txt"), "Before/after screenshots render the real repository components with isolated synthetic auth and records. They are not staging or production evidence. No mail, CMS mutation, or live database call is made. Baseline: " + baseline + "\n");
console.log(`Verified System cleanup evidence: ${output}`);
