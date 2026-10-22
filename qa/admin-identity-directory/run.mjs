import { spawn, execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile, symlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Build a separate local app from the real Users page/components. Authentication
// and database adapters are replaced only in this disposable fixture app.
const qa = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(qa, "../..");
const scratch = path.resolve(
  process.env.ADMIN_IDENTITY_QA_WORK || path.join(repo, "work"),
);
await mkdir(scratch, { recursive: true });
const app = await mkdtemp(path.join(scratch, "admin-directory-"));
const output = path.resolve(
  process.env.ADMIN_IDENTITY_QA_OUTPUT || path.join(app, "screenshots"),
);
const port = process.env.ADMIN_IDENTITY_QA_PORT || "3101";
const base =
  process.env.ADMIN_IDENTITY_QA_BASE ||
  "acc6378e4668d506b2c2045289c890bb544d07e1";
const source = path.join(repo, "src");
const put = async (name, text) => {
  await mkdir(path.dirname(path.join(app, name)), { recursive: true });
  await writeFile(path.join(app, name), text);
};
const before = (file) =>
  execFileSync("git", ["show", `${base}:${file}`], {
    cwd: repo,
    encoding: "utf8",
  });
await symlink(path.join(repo, "node_modules"), path.join(app, "node_modules"));
await symlink(path.join(repo, "public"), path.join(app, "public"));
await put("package.json", JSON.stringify({ private: true }));
await put(
  "tsconfig.json",
  JSON.stringify({
    compilerOptions: {
      jsx: "react-jsx",
      paths: { "@/*": [path.join(source, "*")] },
    },
  }),
);
await put(
  "next.config.mjs",
  `import path from "node:path";
export default {devIndicators:false,agentRules:false,experimental:{externalDir:true},webpack(config){
for(const name of ["prisma","auth-guards","env"])config.resolve.alias["@/lib/"+name]=path.resolve("mocks/"+name+".js");
config.resolve.alias["@"]=${JSON.stringify(source)};return config;}};`,
);
await put(
  "postcss.config.mjs",
  'export default {plugins:{"@tailwindcss/postcss":{}}};',
);
await put(
  "app/globals.css",
  `${await readFile(path.join(source, "app/globals.css"), "utf8")}\n@source ${JSON.stringify(source)};\n@source "./";`,
);
await put(
  "app/layout.jsx",
  `import "./globals.css";
import {AdminHorizontalShell} from "@/components/admin/AdminHorizontalShell";
export default function Layout({children}) {return <html lang="en"><body>
<div style={{padding:"4px 16px",background:"#fff7ed",fontSize:12}}>QA fixtures only — no customer data or production statistics</div>
<AdminHorizontalShell adminRole="ADMIN" adminEmail="qa-self@example.invalid" adminName="QA admin" showPreviewTesters={false}>{children}</AdminHorizontalShell>
</body></html>;}`,
);
await put(
  "app/page.tsx",
  await readFile(path.join(source, "app/admin/users/page.tsx"), "utf8"),
);
await put(
  "app/before/page.tsx",
  before("src/app/admin/users/page.tsx").replace(
    "@/components/admin/UserStatusActions",
    "./BeforeUserStatusActions",
  ),
);
await put(
  "app/before/BeforeUserStatusActions.tsx",
  before("src/components/admin/UserStatusActions.tsx"),
);
await put(
  "app/admin/users/page.jsx",
  `import Before from "../../before/page";import After from "../../page";
export default async function Page(props) { const params=await props.searchParams;return params?.version==="before"?Before(props):After(props);}`,
);
await put(
  "mocks/auth-guards.js",
  'export async function requireAdminSession(){return {user:{id:"qa-self",email:"qa-self@example.invalid",role:"ADMIN"}};}',
);
await put(
  "mocks/env.js",
  'export function getAdminEmails(){return ["qa-protected@example.invalid"];}',
);
await put(
  "mocks/prisma.js",
  await readFile(path.join(qa, "fixture-db.js"), "utf8"),
);

const server = spawn(
  process.execPath,
  [
    path.join(repo, "node_modules/next/dist/bin/next"),
    "dev",
    "--webpack",
    "-p",
    port,
  ],
  { cwd: app, stdio: "inherit" },
);
try {
  const url = `http://localhost:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(2000) })).ok) {
        ready = true;
        break;
      }
    } catch {
      /* startup */
    }
    if (server.exitCode !== null)
      throw new Error(`Fixture server exited: ${server.exitCode}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("Fixture server did not become ready");
  const exitCode = await new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [path.join(qa, "browser-check.mjs")],
      {
        cwd: repo,
        stdio: "inherit",
        env: {
          ...process.env,
          ADMIN_IDENTITY_QA_URL: url,
          ADMIN_IDENTITY_QA_OUTPUT: output,
        },
      },
    );
    child.on("exit", resolve);
  });
  console.log(`QA screenshots and results: ${output}`);
  process.exitCode = exitCode ?? 1;
} finally {
  server.kill("SIGTERM");
}
