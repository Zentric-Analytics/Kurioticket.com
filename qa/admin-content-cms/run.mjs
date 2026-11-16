import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Local visual fixture: real CMS editors, previews and reorder controls.
// Synthetic records only; no auth, database, publish or other live write APIs.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = path.join(repo, "src");
const temp = await mkdtemp(path.join(os.tmpdir(), "kt-content-cms-"));
const port = process.env.CMS_QA_PORT || "3245";
async function put(file, contents) {
  const target = path.join(temp, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
}
await symlink(path.join(repo, "node_modules"), path.join(temp, "node_modules"));
await symlink(path.join(repo, "public"), path.join(temp, "public"));
await put("package.json", JSON.stringify({ private: true }));
await put("tsconfig.json", JSON.stringify({ compilerOptions: { jsx: "react-jsx", allowJs: true, skipLibCheck: true, paths: { "@/*": [path.join(source, "*")] } } }));
await put("next.config.mjs", `export default {devIndicators:false,experimental:{externalDir:true},webpack(config){config.resolve.alias["@"]=${JSON.stringify(source)};return config;}};`);
await put("postcss.config.mjs", 'export default {plugins:{"@tailwindcss/postcss":{}}};');
await put("app/globals.css", await readFile(path.join(source, "app/globals.css"), "utf8") + "\n@source " + JSON.stringify(source) + ";\n@source \"./\";\nbody {background:white;}\n");
await put("app/layout.jsx", `import "./globals.css"; export default function Layout({children}){return <html lang="en"><body><div style={{background:"#fffbeb",padding:"6px 16px",fontSize:12,color:"#7c2d12"}}>Content CMS visual QA · synthetic drafts · no live writes</div>{children}</body></html>;}`);
await put("app/page.jsx", `import Link from "next/link";
import {ContentPageFrame} from "@/components/admin/ContentWorkspace";
import {FaqCmsEditor} from "@/components/admin/FaqCmsEditor";
import {HomepageCmsEditor} from "@/components/admin/HomepageCmsEditor";
import Reorder from "./reorder";
const faq={question:"How do I book a trip with Kurioticket?",answer:"Compare offers from travel providers.\\n\\nChoose View deal to complete your booking with the provider.",category:"Bookings"};
const base={id:"qa-content-123",key:"qa-content",status:"PUBLISHED",market:"NG",locale:"en",sortOrder:0,version:8,publishedVersion:1,publishedAt:"2026-11-06T10:00:00Z",publishedMarket:"NG",publishedLocale:"en",publishedSortOrder:0};
const hotelOptions=[{canonicalId:"hotel:gb-london",label:"London · United Kingdom",name:"London",country:"United Kingdom",countryCode:"GB",kind:"city",searchValue:"London, United Kingdom",managedItemId:"qa-london"},{canonicalId:"hotel:ng-lagos",label:"Lagos · Nigeria",name:"Lagos",country:"Nigeria",countryCode:"NG",kind:"city",searchValue:"Lagos, Nigeria"}];
export default async function Page({searchParams}) {
 const raw=await searchParams; const section=raw.view || "faq";
 const payload=section==="destinations" ? {city:"London",country:"United Kingdom",countryCode:"GB",originCode:"LOS",destinationCode:"LHR",image:"/images/premium/homepage/destinations/kurioticket-homepage-destination-london-tower-bridge-thames-001.jpg",imageAlt:"London skyline along the River Thames"} : {title:"Lagos to London",originCity:"Lagos",originCode:"LOS",destinationCity:"London",destinationCode:"LHR",routeNote:"Compare flight offers.\\n\\nReview provider baggage terms before booking.",image:"/images/premium/homepage/destinations/kurioticket-homepage-destination-london-tower-bridge-thames-001.jpg",imageAlt:"London skyline along the River Thames"};
 return <div className="px-4 py-6 md:px-8"><nav className="mx-auto mb-5 flex max-w-[1138px] flex-wrap gap-4 text-[13px] text-[#004BB8]">{["faq","destinations","flight-routes","hotel-destinations","reorder"].map(view=><Link key={view} href={"/?view="+view}>{view}</Link>)}</nav><ContentPageFrame title={section==="faq" ? "Edit FAQ" : section==="reorder" ? "Reorder homepage destinations" : section==="hotel-destinations" ? "New Hotel destination" : "Edit " + section} backHref="/?view=faq" backLabel="Back to content">
 {section==="faq" ? <FaqCmsEditor key="faq" initialItem={{...base,market:"GLOBAL",publishedMarket:"GLOBAL",draftPayload:faq,publishedPayload:faq}} /> : section==="reorder" ? <Reorder /> : <HomepageCmsEditor key={section} section={section} markets={["NG","GB","US","GLOBAL"]} initialMarket={section==="hotel-destinations" ? "GLOBAL" : "NG"} hotelOptions={hotelOptions} supportedFlightRoutes={[{originCode:"LOS",destinationCode:"LHR"},{originCode:"JFK",destinationCode:"DXB"}]} initialItem={section==="hotel-destinations" ? undefined : {...base,draftPayload:payload,publishedPayload:payload}} />}
 </ContentPageFrame></div>;
}`);
await put("app/reorder.jsx", `"use client"; import {CmsCardReorder} from "@/components/admin/CmsCardReorder"; export default function Reorder(){return <CmsCardReorder market="NG" section="destinations" onDone={()=>{}} rows={["LOS","JFK"].map((originCode,i)=>({id:"qa-card-"+i,key:"dubai-"+originCode,market:"NG",sortOrder:i,version:1,status:"PUBLISHED",draftPayload:{city:"Dubai",country:"United Arab Emirates",originCode,destinationCode:"DXB"}}))} />;}`);
await put("app/api/admin/content/route.js", 'export async function POST(){return Response.json({error:"Live writes are disabled in this visual fixture."},{status:503});}');
await put("app/api/admin/content/[id]/route.js", 'export async function PATCH(){return Response.json({error:"Live writes are disabled in this visual fixture."},{status:503});}');
const start = () => spawn(process.execPath, [path.join(repo, "node_modules/next/dist/bin/next"), "dev", "--webpack", "--hostname", "0.0.0.0", "-p", port], { cwd: temp, stdio: "inherit" });
let app = start();
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => app.kill(signal));
console.log("CMS visual fixture: http://localhost:" + port + " — sample data only");
if (process.env.CMS_QA_SMOKE === "1") {
  try {
    let ready = false;
    // A fresh Next CLI can ask for a first-run acknowledgement and exit. One
    // restart in the same fixture directory lets ordinary QA continue.
    for (let attempt = 0; attempt < 2 && !ready; attempt++) {
      if (attempt) app = start();
      for (let poll = 0; poll < 50; poll++) {
        if (app.exitCode !== null) break;
        try {
          const response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1500) });
          if (response.ok && (await response.text()).includes("Edit FAQ")) { ready = true; break; }
        } catch { /* compile/startup has not finished */ }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    if (!ready) throw new Error("CMS fixture did not become ready");
    for (const view of ["faq", "destinations", "flight-routes", "hotel-destinations", "reorder"]) {
      const response = await fetch(`http://127.0.0.1:${port}/?view=${view}`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`CMS fixture ${view}: HTTP ${response.status}`);
      console.log(`CMS fixture ${view}: HTTP 200`);
    }
  } finally { app.kill("SIGTERM"); }
}
await new Promise(resolve => app.exitCode !== null ? resolve() : app.on("exit", resolve));
