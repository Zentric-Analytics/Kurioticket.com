import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,"../.."),source=path.join(repo,"src");
const output=path.resolve(process.env.STAGE06_QA_OUTPUT||path.join(repo,"../../outputs/stage-06-evidence/browser"));
await mkdir(output,{recursive:true});
const temp=await mkdtemp(path.join(repo,"../s6-ui-"));
const put=async(file,value)=>{const target=path.join(temp,file);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,value);};
await symlink(path.join(repo,"node_modules"),path.join(temp,"node_modules"),"junction");
await symlink(path.join(repo,"public"),path.join(temp,"public"),"junction");
const fixturePath=path.join(here,"fixtures.ts").replaceAll("\\","/");
const mocks={
 "@/lib/auth-guards":`import {headers} from 'next/headers';import {redirect} from 'next/navigation';export async function requireAdminSession(){if((await headers()).get('x-qa-role')==='SUPPORT')redirect('/auth/signin');return {user:{id:'qa-admin',role:'ADMIN',email:'qa@example.invalid'}};}`,
 "@/lib/admin":`export async function requireAdminApiSession(){return {session:{user:{id:'qa-admin'}}};}`,
 "@/lib/adminViewerTimeZone.server":`import {headers} from 'next/headers';import {resolveAdminTimeZone} from '@/lib/adminLocalTime';export async function getAdminViewerTimeZone(){return resolveAdminTimeZone((await headers()).get('x-qa-reporting-time-zone'));}`,
 "@/services/platformOperationsService":`import {platformFixture} from ${JSON.stringify(fixturePath)};import {headers} from 'next/headers';import {viewerTodayStart} from '@/lib/adminLocalTime';export async function readPlatformOperations(hours=24,period='rolling',timeZone='UTC'){const d=platformFixture((await headers()).get('x-qa-unavailable')==='1');d.timeZone=timeZone;if(period==='today'){const to=new Date(Date.parse(d.window.to)+12*3600000);d.window.to=to.toISOString();d.window.from=viewerTodayStart(to,timeZone);}else{d.window.from=new Date(Date.parse(d.window.to)-hours*3600000).toISOString();}return d;}`,
 "@/lib/stagingSafety":`export function getPublicEnvironment(){return 'staging';}`,
 "@/services/travel/providerIntegrationStatus":`export function getProviderIntegrationStatuses(){return [];}`,
 "@/services/adminOperationalReadService":`import {stage06SearchActivityReads} from ${JSON.stringify(fixturePath)};export const adminOperationalReads={searchActivity:stage06SearchActivityReads};`,
};
const aliases={};let n=0;for(const[id,content]of Object.entries(mocks)){const file='mocks/mock-'+n+++'.js';await put(file,content);aliases[id]=path.join(temp,file);}
await put('package.json',JSON.stringify({private:true,type:'module'}));
await put('tsconfig.json',JSON.stringify({compilerOptions:{jsx:'react-jsx',paths:{'@/*':[path.join(source,'*')]}}}));
await put('next.config.mjs',`export default {devIndicators:false,experimental:{externalDir:true},webpack(config){Object.assign(config.resolve.alias,${JSON.stringify(aliases)});config.resolve.alias['@']=${JSON.stringify(source)};return config;}}`);
await put('postcss.config.mjs',`export default {plugins:{'@tailwindcss/postcss':{}}};`);
await put('app/globals.css',(await readFile(path.join(source,'app/globals.css'),'utf8'))+'\n@source '+JSON.stringify(source.replaceAll('\\','/'))+';\n');
await put('app/layout.jsx',`import './globals.css';import {AdminHorizontalShell} from '@/components/admin/AdminHorizontalShell';export default function Layout({children}){return <html lang="en"><body><div data-qa-label style={{padding:'6px 16px',background:'#fffbeb',color:'#7c2d12',fontSize:12}}>Stage 06 QA · synthetic records · no live database</div><AdminHorizontalShell adminRole="ADMIN" adminEmail="qa@example.invalid" adminName="QA Operator">{children}</AdminHorizontalShell></body></html>}`);
await put('app/page.jsx',`export default function Home(){return <p>Isolated Stage 06 QA</p>}`);
await put('app/auth/signin/page.jsx',`export default function Denied(){return <h1>QA admin access required</h1>}`);
await put('app/api/admin/notifications/route.js',`export async function GET(){return Response.json({generatedAt:new Date().toISOString(),activeCount:0,unreadCount:0,criticalCount:0,warningCount:0,alerts:[]})}`);
await put('app/api/admin/search/route.js',`export async function GET(){return Response.json({pages:[{id:'health',title:'Platform Health',detail:'Combined operational health',href:'/admin/platform-health',status:'Workspace'}],users:[],searches:[],providers:[],databaseUnavailable:false})}`);
// Exercise the real refresh endpoint with the synthetic operational reader instead of a 404.
await put('app/api/admin/platform-operations/route.ts',await readFile(path.join(source,'app/api/admin/platform-operations/route.ts'),'utf8'));
await put('app/api/admin/searches/activity/route.ts',await readFile(path.join(source,'app/api/admin/searches/activity/route.ts'),'utf8'));
for(const route of ['platform-health','searches/activity','searches/[id]'])await put('app/admin/'+route+'/page.tsx',await readFile(path.join(source,'app/admin',route,'page.tsx'),'utf8'));
await put('app/admin/preview-testers/page.jsx',`import {PreviewTesterRegistry} from '@/components/admin/PreviewTesterRegistry';
const member={id:'qa-member',email:'test-member@example.invalid',status:'ACTIVE',roles:['TESTER'],expiresAt:new Date('2026-11-18T17:40:00.000Z'),approvedAt:new Date('2026-11-01T08:00:00.000Z'),suspendedAt:null,revokedAt:null,updatedAt:new Date('2026-11-15T00:00:00.000Z'),reason:'QA only',approvedByAdmin:null,suspendedByAdmin:null,revokedByAdmin:null};
export default function TeamAccessUIFixture(){return <div className="min-w-0 bg-white"><h1 className="mb-4 text-xl font-semibold">Team Access QA</h1><PreviewTesterRegistry testers={[member]}/></div>;}`);
for(const file of ['loading.tsx','error.tsx'])await put('app/admin/platform-health/'+file,await readFile(path.join(source,'app/admin/platform-health',file),'utf8'));
await put('app/admin/error.tsx',await readFile(path.join(source,'app/admin/error.tsx'),'utf8'));
const log=createWriteStream(path.join(output,'fixture-server.log'));
const server=spawn(process.execPath,[path.join(repo,'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','-p','3226'],{cwd:temp,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,DATABASE_URL:'',POSTGRES_URL:'',POSTGRES_PRISMA_URL:'',POSTGRES_URL_NON_POOLING:'',NEXT_TELEMETRY_DISABLED:'1'}});
server.stdout.pipe(log);server.stderr.pipe(log);
let browser;const results=[];const base='http://127.0.0.1:3226';
try{
 for(let i=0;i<120;i++){try{if((await fetch(base,{signal:AbortSignal.timeout(2000)})).ok)break;}catch{}if(server.exitCode!==null)throw Error('Fixture exited');await new Promise(r=>setTimeout(r,500));}
 browser=await chromium.launch({headless:true});
 for(const width of [1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',timezoneId:'UTC',extraHTTPHeaders:{'x-qa-reporting-time-zone':'Africa/Lagos'}});const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/admin/platform-health',{waitUntil:'networkidle',timeout:120000});await expect(page.getByRole('heading',{name:'Platform Health',exact:true}).first()).toBeAttached();await expect(page.getByText('Search operations',{exact:true})).toBeVisible();
  await expect(page.getByRole('combobox',{name:'Activity window',exact:true})).toHaveAccessibleDescription('WAT (UTC+1)');
  await expect(page.locator('time[datetime="2026-11-15T23:00:00.000Z"]')).toHaveText(/Nov 16.*12:00 AM/);
  await expect(page.getByRole('navigation',{name:'Admin navigation'})).toBeVisible();await expect(page.getByRole('button',{name:'Open admin navigation'})).toHaveCount(0);
  await page.keyboard.press('Control+k');await page.getByRole('textbox',{name:'Search admin workspaces and records'}).fill('Platform Health');await expect(page.getByRole('link',{name:/Platform Health.*Workspace/})).toBeVisible();await page.keyboard.press('Escape');
  const applicationSelect=page.getByRole('combobox',{name:'Application',exact:true});
  await expect(applicationSelect).toContainText('All Platforms');
  await applicationSelect.click();
  await expect(page.getByRole('listbox',{name:'Application'})).toBeVisible();
  await page.getByRole('listbox',{name:'Application'}).press('i');
  await page.getByRole('listbox',{name:'Application'}).press('Enter');
  await expect(applicationSelect).toContainText('iOS');
  await expect(page.locator('form[aria-label="Platform health filters"] input[name="application"]')).toHaveValue('IOS');
  const windowSelect=page.getByRole('combobox',{name:'Activity window',exact:true});
  await windowSelect.click();
  await page.getByRole('listbox',{name:'Activity window'}).getByRole('option',{name:'Last 7 days'}).click();
  await expect(page.locator('form[aria-label="Platform health filters"] input[name="window"]')).toHaveValue('168');
  await page.getByRole('button',{name:'Apply view',exact:true}).click();
  await expect(page).toHaveURL(/application=IOS/);
  await expect(page).toHaveURL(/window=168/);
  await expect(page.getByRole('heading',{name:'iOS activity'})).toBeVisible();
  const overflow=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));expect(overflow.document).toBeLessThanOrEqual(width+1);
  const runningMotion=await page.locator('[data-platform-health]').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length);expect(runningMotion).toBe(0);
  const table=page.getByRole('region',{name:'Scheduled-job observations table'});await table.focus();await page.keyboard.press('ArrowRight');expect(await table.evaluate(el=>el.scrollWidth>=el.clientWidth)).toBeTruthy();
  await page.screenshot({path:path.join(output,'health-'+width+'.png'),fullPage:true});
  await page.getByRole('link',{name:'Investigate searches',exact:false}).click();
  await expect(page).toHaveURL(/applicationSource=IOS/);
  await expect(page).not.toHaveURL(/viewerTimeZone=/);
  await expect(page.getByRole('button',{name:/^Date range:.*WAT \(UTC\+1\)$/})).toBeVisible();
  const searchRows=page.getByRole('region',{name:'Search activity table'}).locator('tbody tr');
  const openSearchDetail=async row=>{
    await row.getByRole('link',{name:/View details for Flight search/}).click();
    await page.waitForURL(/\/admin\/searches\/search_qa\d+\?/);
  };
  const backToSearchActivity=async ()=>{
    await page.getByRole('link',{name:'Search activity',exact:true}).click();
    await page.waitForURL(/\/admin\/searches\/activity\?/);
  };
  await expect(searchRows).toHaveCount(1);
  await expect(searchRows.locator('td[data-label="Platform"]')).toHaveText('iOSv1.2.3');
  await expect(searchRows.locator('td[data-label="Identity"]')).toHaveText('Guest');
  await openSearchDetail(searchRows);
  await expect(page.getByText('Platform',{exact:true})).toBeVisible();
  await expect(page.getByText('1.2.3',{exact:true})).toBeVisible();
  await expect(page.getByText('Guest',{exact:true})).toBeVisible();
  await expect(page.locator('a[href^="/admin/users/"][href$="/activity"]')).toHaveCount(0);
  await backToSearchActivity();
  await expect(page).toHaveURL(/applicationSource=IOS/);

  const platformTrigger=page.getByRole('button',{name:/^Platform:/});
  const platformList=page.getByRole('listbox',{name:'Platform',exact:true});
  await platformTrigger.click();
  await expect(platformList.getByRole('option')).toHaveText(['All platforms','Website','iOS','Android']);
  await platformList.getByRole('option',{name:'All platforms',exact:true}).click();
  const paging=page.waitForRequest(request=>request.url().includes('/api/admin/searches/activity?')&&request.url().includes('cursor='));
  await page.getByRole('button',{name:'Apply filters'}).click();
  const total=page.getByText('All searches',{exact:true}).locator('..').locator('p').last();
  await expect(total).toHaveText('5');
  await searchRows.last().scrollIntoViewIfNeeded();
  await paging;
  await expect.poll(()=>searchRows.count()).toBeGreaterThanOrEqual(4);
  await searchRows.last().scrollIntoViewIfNeeded();
  await expect(searchRows).toHaveCount(5);
  const historicalRow=searchRows.filter({hasText:'Source not recorded'});
  await expect(historicalRow.locator('td[data-label="Identity"]')).toHaveText('Guest');
  await page.evaluate(()=>window.scrollTo(0,0));
  const searchOverflow=await page.evaluate(()=>{
    const content=Array.from(document.querySelectorAll('body *'));
    return {
      document:document.documentElement.scrollWidth,viewport:innerWidth,
      outside:content.map(el=>{
        const r=el.getBoundingClientRect(),style=getComputedStyle(el);
        return {tag:el.tagName,className:typeof el.className==='string'?el.className.slice(0,160):'',left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,overflowX:style.overflowX};
      }).filter(x=>x.right>innerWidth+1&&x.width>40).slice(0,35),
    };
  });
  if(searchOverflow.document>width+1)console.error('SEARCH_ACTIVITY_OVERFLOW_DIAGNOSTIC',JSON.stringify(searchOverflow));
  expect(searchOverflow.document).toBeLessThanOrEqual(width+1);
  await page.screenshot({path:path.join(output,'search-'+width+'.png'),fullPage:true});
  if (width===1440) {
    const identityTrigger=page.getByRole('button',{name:/^Identity:/});
    const identityList=page.getByRole('listbox',{name:'Identity',exact:true});
    await identityTrigger.click();
    await expect(identityList.getByRole('option')).toHaveText(['All identities','Registered','Guest','Bot']);
    await identityList.getByRole('option',{name:'Bot',exact:true}).click();
    await page.getByRole('button',{name:'Apply filters'}).click();
    await expect(total).toHaveText('1');
    await expect(searchRows).toHaveCount(1);
    await expect(searchRows.locator('td[data-label="Identity"]')).toHaveText('Bot');
    await openSearchDetail(searchRows);
    await expect(page.getByText('Googlebot',{exact:true})).toBeVisible();
    await expect(page.getByText('User-Agent identified',{exact:true})).toBeVisible();
    await expect(page.locator('a[href^="/admin/users/"][href$="/activity"]')).toHaveCount(0);
    await backToSearchActivity();
    await expect(page).toHaveURL(/identity=bot/);
    await expect(page).toHaveURL(/range=custom/);

    const allTimeSearches=base+'/admin/searches/activity?range=all';
    for (const [source,platform] of [['WEB','Website'],['ANDROID','Android']]) {
      await page.goto(allTimeSearches+'&identity=bot&applicationSource='+source);
      await expect(platformTrigger).toHaveText(platform);
      await expect(identityTrigger).toHaveText('Bot');
      await expect(total).toHaveText('0');
      await expect(page.getByText('No searches found',{exact:true})).toBeVisible();
    }
    await page.goto(allTimeSearches+'&applicationSource=WEB&identity=registered');
    await expect(total).toHaveText('1');
    await expect(searchRows.locator('td[data-label="Identity"]')).toHaveText('Registered');
    await openSearchDetail(searchRows);
    await expect(page.getByText('Registered',{exact:true})).toBeVisible();
    await expect(page.getByRole('link',{name:/View user details/})).toHaveAttribute('href','/admin/users/user/user_qa000/activity');

    await page.goto(allTimeSearches+'&applicationSource=UNKNOWN');
    await expect(total).toHaveText('1');
    await expect(page.getByRole('link',{name:'Clear legacy source filter'})).toBeVisible();
    await openSearchDetail(historicalRow);
    await expect(page.getByText('Source not recorded',{exact:true})).toBeVisible();
    await expect(page.getByText('Guest',{exact:true})).toBeVisible();
    await expect(page.locator('a[href^="/admin/users/"][href$="/activity"]')).toHaveCount(0);

    await page.goto(allTimeSearches+'&product=FLIGHT&applicationSource=BOT');
    await expect(page).toHaveURL(/identity=bot/);
    await expect(page).toHaveURL(/range=all/);
    await expect(page).toHaveURL(/product=FLIGHT/);
    await expect(page).not.toHaveURL(/applicationSource=BOT/);
    await expect(total).toHaveText('1');
  }
  await page.setExtraHTTPHeaders({'x-qa-unavailable':'1'});await page.goto(base+'/admin/platform-health',{waitUntil:'networkidle'});await expect(page.getByText('Telemetry could not be read')).toHaveCount(3);await page.setExtraHTTPHeaders({});await page.getByRole('button',{name:'Refresh observations'}).click();await expect(page.getByText('Recorded operations · sample size')).toHaveCount(3);
  await page.goto(base+'/admin/platform-health?hours=24&hours=168');const invalidFilterAlert=page.getByRole('alert').filter({hasText:'Check the health filters'});await expect(invalidFilterAlert).toBeVisible();await expect(invalidFilterAlert).toContainText('Choose an application and a Today, 7-day or 30-day window.');
  expect(errors).toEqual([]);results.push({width,overflow,keyboardPolishedFilters:true,filterNavigation:true,detailBackContext:true,searchActivityFilters:true,unavailableRefreshRecovery:true,reducedMotion:true,runningMotion,pageErrors:errors});await context.close();
 }

 // Actual Team Access client component and calendar/time picker (synthetic member).
 // Assert aligned, bounded desktop fields and unchanged UTC edit values.
 for (const width of [1440, 1280, 1024, 390]) {
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',timezoneId:'America/Los_Angeles'});
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/admin/preview-testers',{waitUntil:'networkidle',timeout:120000});
  await expect(page.getByRole('heading',{name:'Team Access QA'})).toBeVisible();
  const addForm=page.locator('form').filter({has:page.getByRole('button',{name:'Add team member',exact:true})});
  const email=addForm.locator('#team-add-email');
  const expiry=addForm.locator('#team-add-expiry-trigger');
  const roles=addForm.locator('fieldset');
  await expect(email).toBeVisible();await expect(expiry).toBeVisible();
  if (width>=1024) {
   const [emailBox,expiryBox,rolesBox]=await Promise.all([email.boundingBox(),expiry.boundingBox(),roles.boundingBox()]);
   if(!emailBox||!expiryBox||!rolesBox)throw Error('Add Team Access fields were not laid out');
   expect(emailBox.x+emailBox.width).toBeLessThanOrEqual(expiryBox.x);
   expect(expiryBox.x+expiryBox.width).toBeLessThanOrEqual(rolesBox.x);
  }
  await expiry.click();
  const calendar=page.getByRole('dialog',{name:'Choose access expiration in UTC'});
  await expect(calendar).toBeVisible();
  await expect(calendar.getByRole('button',{name:'Previous month'})).toBeVisible();
  await calendar.getByRole('button',{name:'Next month'}).click();
  await calendar.locator('button[role="gridcell"]').first().click();
  await calendar.getByRole('textbox',{name:'Hour (UTC)'}).fill('17');
  await calendar.getByRole('textbox',{name:'Minute (UTC)'}).fill('40');
  await calendar.getByRole('button',{name:'Apply',exact:true}).click();
  await expect(calendar).toBeHidden();
  const addIso=await addForm.locator('input[name="expiresAt"]').inputValue();
  expect(addIso).toMatch(/T17:40:00\.000Z$/);
  await expiry.click();await page.getByRole('dialog',{name:'Choose access expiration in UTC'}).getByRole('button',{name:'Clear'}).click();
  await expect(addForm.locator('input[name="expiresAt"]')).toHaveValue('');
  await page.locator('details[data-team-member="qa-member"] > summary').click();
  const editForm=page.locator('details[data-team-member="qa-member"] form').first();
  await expect(editForm.locator('input[name="expiresAt"]')).toHaveValue('2026-11-18T17:40:00.000Z');
  await editForm.locator('#team-edit-expiry-qa-member-trigger').click();
  const editPicker=page.getByRole('dialog',{name:'Choose access expiration in UTC'});
  await expect(editPicker.getByRole('textbox',{name:'Hour (UTC)'})).toHaveValue('17');
  await expect(editPicker.getByRole('textbox',{name:'Minute (UTC)'})).toHaveValue('40');
  await editPicker.getByRole('button',{name:'Cancel'}).click();
  await expect(editForm.locator('input[name="expiresAt"]')).toHaveValue('2026-11-18T17:40:00.000Z');
  const overflow=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,width:innerWidth}));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width+1);
  expect(errors).toEqual([]);
  await page.screenshot({path:path.join(output,'team-access-'+width+'.png'),fullPage:false});
  results.push({teamAccessWidth:width,utcEditUnchanged:true,expirationsWorking:true,overflow,errors});
  await context.close();
 }
 const denied=await browser.newContext({extraHTTPHeaders:{'x-qa-role':'SUPPORT'}});const page=await denied.newPage();await page.goto(base+'/admin/platform-health');await expect(page).toHaveURL(/auth\/signin/);await expect(page.getByText('QA admin access required')).toBeVisible();await denied.close();
 await writeFile(path.join(output,'results.json'),JSON.stringify({scope:'Real Next pages/components and CSS with isolated synthetic auth/readers; not staging or production evidence',results,deniedFixtureRole:true},null,2));
 console.log('Stage 06 browser QA passed:',output);
}finally{await browser?.close();if(server.exitCode===null){server.kill('SIGTERM');await once(server,'exit');}log.end();}
