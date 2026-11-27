import assert from "node:assert/strict";
import test from "node:test";
import { expect } from "@playwright/test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";

const entries = {
  refresh: "src/components/admin/AdminUsersLiveRefresh.tsx",
  filters: "src/components/admin/ActivityFiltersBar.tsx",
};
const navigation = `const router={
  push:url=>window.fixtureNavigation.push(url),replace:url=>window.fixtureNavigation.push(url),
  refresh:()=>window.fixtureServerRefresh()
};exports.useRouter=()=>router;exports.usePathname=()=>window.fixturePath;
exports.useSearchParams=()=>new URLSearchParams(window.fixtureQuery);`;
const bundle = () => componentBundle(entries, { "next/navigation": navigation });
const setup = `
  const React=require('react'),{createRoot}=require('react-dom/client'),
    {AdminUsersLiveRefresh}=require('refresh'),{ActivityFiltersBar}=require('filters');
  const root=createRoot(document.getElementById('root'));
  window.fixturePath='/admin/users/user/fixture-account/activity/all';
  window.fixtureQuery='range=all&q=applied&cursor=fixture-page-two&to=2026-11-26T23%3A59%3A00.000Z';
  history.replaceState(null,'',window.fixturePath+'?'+window.fixtureQuery);
  window.fixtureRequests=[];window.fixtureRefreshes=0;window.fixtureMode='ready';
  window.fixtureVisibility='visible';window.fixtureOnline=true;
  Object.defineProperty(document,'visibilityState',{get:()=>window.fixtureVisibility});
  Object.defineProperty(navigator,'onLine',{get:()=>window.fixtureOnline});
  window.fixtureVisible=value=>{window.fixtureVisibility=value;document.dispatchEvent(new Event('visibilitychange'));};
  window.fixtureNetwork=value=>{window.fixtureOnline=value;window.dispatchEvent(new Event(value?'online':'offline'));};
  window.fetch=async(url,options)=>{
    window.fixtureRequests.push({url,cache:options.cache});
    if(window.fixtureMode==='network')throw Error('Disconnected');
    if(window.fixtureMode==='denied')return Response.json({error:'Admin access required'},{status:403});
    return Response.json({ok:true});
  };
  const initial={tab:'all',q:'applied',product:'all',stage:'all',order:'newest',from:'',to:'2026-11-26T23:59:00.000Z',range:'all'};
  const initialRows=Array.from({length:24},(_,index)=>'record-'+index);
  function Records({snapshot}){
    if(snapshot.wait)React.use(snapshot.wait);
    return React.createElement('section',null,
      React.createElement('p',{'data-testid':'recorded-count'},'Recorded actions: '+snapshot.count),
      ...snapshot.rows.map(id=>React.createElement('div',{key:id,'data-users-refresh-anchor':id,style:{height:72,borderBottom:'1px solid #ddd'}},id)));
  }
  function Fixture(){
    const [snapshot,setSnapshot]=React.useState({count:24,rows:initialRows});
    window.fixtureServerRefresh=()=>{
      window.fixtureRefreshes++;
      if(window.fixtureMode==='denied')return;
      setSnapshot(previous=>window.fixtureNext||{count:previous.count+1,rows:previous.rows});
    };
    return React.createElement(AdminUsersLiveRefresh,null,
      React.createElement(ActivityFiltersBar,{path:window.fixturePath,initial,directory:'tab=REGISTERED',tabs:null,timeZone:'America/Los_Angeles',now:'2026-11-26T16:00:00.000Z'}),
      React.createElement(React.Suspense,{fallback:React.createElement('p',null,'Loading recorded actions')},React.createElement(Records,{snapshot})));
  }
  window.fixtureMount=()=>root.render(React.createElement(Fixture));
`;

type FixtureWindow = Window & {
  fixtureMount: () => void;
  fixtureRequests: { url: string; cache: string }[];
  fixtureRefreshes: number;
  fixtureNavigation: string[];
  fixtureNext?: { count: number; rows: string[]; wait?: Promise<void> };
  fixtureResolve?: () => void;
  fixtureMode: string;
  fixtureVisible: (state: string) => void;
  fixtureNetwork: (online: boolean) => void;
};

test("new server records and counts appear automatically while draft, focus, scroll anchor and page-two URL survive", async () => {
  await withComponentBrowser(bundle(), setup, async page => {
    await page.clock.install();
    // The broad suite loads built CSS, whose html scroll behavior is smooth.
    // Exercise that same style in the focused suite without animating setup.
    await page.addStyleTag({ content: "html { scroll-behavior: smooth; }" });
    await page.evaluate(() => (window as unknown as FixtureWindow).fixtureMount());
    const search = page.getByRole("textbox", { name: "Search activity" });
    await search.fill("unfinished filter draft");
    const url = page.url();
    await page.evaluate(() => {
      const row = document.querySelector<HTMLElement>('[data-users-refresh-anchor="record-8"]')!;
      window.scrollTo({ left: 0, top: window.scrollY + row.getBoundingClientRect().top - 120, behavior: "instant" });
      (window as unknown as FixtureWindow).fixtureNext = { count: 25, rows: ["newly-recorded-page", ...Array.from({ length: 24 }, (_, index) => "record-" + index)] };
    });
    await expect.poll(() => page.locator('[data-users-refresh-anchor="record-8"]')
      .evaluate(row => Math.abs(row.getBoundingClientRect().top - 120))).toBeLessThanOrEqual(1);
    const before = await page.evaluate(() => ({
      rowTop: document.querySelector<HTMLElement>('[data-users-refresh-anchor="record-8"]')!.getBoundingClientRect().top,
      scrollY: window.scrollY,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    }));
    assert.equal(before.scrollBehavior, "smooth");
    assert.ok(Math.abs(before.rowTop - 120) <= 1, "the fixture reaches its requested baseline before refresh: " + JSON.stringify(before));
    await page.clock.runFor(15_100);
    assert.equal(await page.getByTestId("recorded-count").innerText(), "Recorded actions: 25");
    assert.equal(await page.locator('[data-users-refresh-anchor="newly-recorded-page"]').count(), 1);
    assert.equal(await search.inputValue(), "unfinished filter draft");
    assert.equal(await search.evaluate(element => element === document.activeElement), true, "quiet focus must not prevent refresh or be replaced");
    assert.equal(page.url(), url, "cursor, cutoff and applied filters remain unchanged");
    const after = await page.evaluate(() => ({
      rowTop: document.querySelector<HTMLElement>('[data-users-refresh-anchor="record-8"]')!.getBoundingClientRect().top,
      scrollY: window.scrollY,
      navigations: (window as unknown as FixtureWindow).fixtureNavigation,
      requests: (window as unknown as FixtureWindow).fixtureRequests,
    }));
    assert.ok(Math.abs(after.rowTop - before.rowTop) <= 1,
      "the same visible record keeps its viewport position after a new row is inserted: " + JSON.stringify({ before, after }));
    assert.ok(after.scrollY >= before.scrollY,
      "refresh never scrolls the admin back to the top: " + JSON.stringify({ before, after }));
    assert.deepEqual(after.navigations, []);
    assert.deepEqual(after.requests, [{ url: "/api/admin/users/live-refresh", cache: "no-store" }]);
  });
});

test("hidden/offline pages pause, failures preserve displayed records, recovery resumes, and revoked access stops polling", async () => {
  await withComponentBrowser(bundle(), setup, async page => {
    await page.clock.install();
    await page.evaluate(() => (window as unknown as FixtureWindow).fixtureMount());
    await page.getByTestId("recorded-count").waitFor();
    await page.evaluate(() => (window as unknown as FixtureWindow).fixtureVisible("hidden"));
    await page.clock.runFor(60_000);
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRequests.length), 0);
    await page.evaluate(() => (window as unknown as FixtureWindow).fixtureVisible("visible"));
    await page.clock.runFor(100);
    assert.equal(await page.getByTestId("recorded-count").innerText(), "Recorded actions: 25");
    await page.evaluate(() => (window as unknown as FixtureWindow).fixtureNetwork(false));
    await page.clock.runFor(30_000);
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRequests.length), 1);
    assert.match(await page.getByTestId("users-live-refresh-status").innerText(), /Offline/);
    await page.evaluate(() => { (window as unknown as FixtureWindow).fixtureMode = "network"; (window as unknown as FixtureWindow).fixtureNetwork(true); });
    await page.clock.runFor(100);
    assert.match(await page.getByTestId("users-live-refresh-status").innerText(), /Updates delayed/);
    assert.equal(await page.getByTestId("recorded-count").innerText(), "Recorded actions: 25");
    await page.evaluate(() => { (window as unknown as FixtureWindow).fixtureMode = "ready"; });
    await page.clock.runFor(30_000);
    assert.equal(await page.getByTestId("recorded-count").innerText(), "Recorded actions: 26");
    await page.evaluate(() => { (window as unknown as FixtureWindow).fixtureMode = "denied"; });
    await page.clock.runFor(15_100);
    const before = await page.evaluate(() => ({ requests: (window as unknown as FixtureWindow).fixtureRequests.length, refreshes: (window as unknown as FixtureWindow).fixtureRefreshes }));
    assert.match(await page.getByTestId("users-live-refresh-status").innerText(), /Checking your access/);
    assert.equal(await page.getByTestId("recorded-count").count(), 0, "revoked access removes retained private content while the canonical guard redirects");
    await page.clock.runFor(120_000);
    assert.deepEqual(await page.evaluate(() => ({ requests: (window as unknown as FixtureWindow).fixtureRequests.length, refreshes: (window as unknown as FixtureWindow).fixtureRefreshes })), before);
    assert.equal(before.refreshes, 3, "two successful updates and one canonical auth guard refresh");
  });
});

test("an open filter menu defers refresh and a pending React server payload serializes later polls", async () => {
  await withComponentBrowser(bundle(), setup, async page => {
    await page.clock.install();
    await page.evaluate(() => (window as unknown as FixtureWindow).fixtureMount());
    await page.getByRole("button", { name: /^Date range:/ }).click();
    await page.getByRole("listbox", { name: "Date range" }).waitFor();
    await page.clock.runFor(16_000);
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRequests.length), 0);
    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      const value = window as unknown as FixtureWindow;
      value.fixtureNext = { count: 25, rows: Array.from({ length: 24 }, (_, index) => "record-" + index), wait: new Promise<void>(resolve => { value.fixtureResolve = resolve; }) };
    });
    await page.clock.runFor(2_100);
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRefreshes), 1);
    assert.equal(await page.getByTestId("recorded-count").innerText(), "Recorded actions: 24", "a transition retains current content while server data is pending");
    await page.clock.runFor(60_000);
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRequests.length), 1, "no overlapping refresh while React is waiting for server content");
    await page.evaluate(() => (window as unknown as FixtureWindow).fixtureResolve!());
    await page.clock.runFor(100);
    assert.equal(await page.getByTestId("recorded-count").innerText(), "Recorded actions: 25");
    await page.clock.runFor(15_000);
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRequests.length), 2);
  });
});

test("open native dialogs defer automatic updates while closed dialogs do not", async () => {
  await withComponentBrowser(bundle(), setup, async page => {
    await page.clock.install();
    await page.evaluate(() => {
      (window as unknown as FixtureWindow).fixtureMount();
      const dialog = document.createElement("dialog");
      dialog.id = "fixture-management-dialog";
      dialog.textContent = "Manage account";
      document.body.append(dialog);
    });
    await page.getByTestId("recorded-count").waitFor();
    await page.clock.runFor(15_100);
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRequests.length), 1, "a closed native dialog must not pause the page");
    await page.evaluate(() => (document.getElementById("fixture-management-dialog") as HTMLDialogElement).showModal());
    await page.clock.runFor(60_000);
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRequests.length), 1);
    await page.evaluate(() => (document.getElementById("fixture-management-dialog") as HTMLDialogElement).close());
    await page.clock.runFor(1_100);
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRequests.length), 2);
  });
});
