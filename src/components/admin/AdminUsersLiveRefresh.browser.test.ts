import assert from "node:assert/strict";
import test from "node:test";
import { expect, type Page } from "@playwright/test";
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

const activityBundle = () => componentBundle({ ...entries, activity: "src/components/admin/AdminUnifiedActivityList.tsx" }, { "next/navigation": navigation });
function reviewFixtureSetup(overview: boolean) {
  return setup + `
    const {AdminUnifiedActivityList}=require('activity');
    window.fixturePath='/admin/users/user/fixture-account/activity'+${overview ? "''" : "'/all'"};
    ${overview ? "window.fixtureQuery='range=today';" : ""}
    history.replaceState(null,'',window.fixturePath+'?'+window.fixtureQuery);
    function ActivityRecords({snapshot}){
      if(snapshot.wait)React.use(snapshot.wait);
      const events=snapshot.rows.map(id=>({id,label:'Saved item',stage:'ACCOUNT_ACTIVITY',product:'FLIGHT',detail:'Flight',
        at:new Date(Date.UTC(2026,10,26,16,0,id==='newly-recorded-page'?1:-Number(id.slice(7))))}));
      return React.createElement(AdminUnifiedActivityList,{events,overview:${overview},environment:'staging',timeZone:'UTC',
        returnHref:location.pathname+location.search});
    }
    function ReviewFixture(){
      const [snapshot,setSnapshot]=React.useState({count:5,rows:Array.from({length:5},(_,index)=>'record-'+index)});
      window.fixtureServerRefresh=()=>{window.fixtureRefreshes++;if(window.fixtureMode!=='denied')setSnapshot(window.fixtureNext);};
      window.fixtureNavigate=(pathname,query)=>{
        window.fixturePath=pathname;window.fixtureQuery=query;history.pushState(null,'',pathname+'?'+query);
        setSnapshot({count:1,rows:['record-9']});
      };
      return React.createElement(AdminUsersLiveRefresh,null,
        React.createElement(React.Suspense,{fallback:React.createElement('p',null,'Loading recorded actions')},
          React.createElement(ActivityRecords,{snapshot})));
    }
    window.fixtureMount=()=>root.render(React.createElement(ReviewFixture));`;
}

type FixtureWindow = Window & {
  fixtureMount: () => void;
  fixtureRequests: { url: string; cache: string }[];
  fixtureRefreshes: number;
  fixtureNavigation: string[];
  fixtureNext?: { count: number; rows: string[]; wait?: Promise<void> };
  fixtureResolve?: () => void;
  fixtureMode: string;
  fixtureInitialScrollObserved: boolean;
  fixtureVisible: (state: string) => void;
  fixtureNetwork: (online: boolean) => void;
  fixtureNavigate: (pathname: string, query: string) => void;
};

async function expectRefreshProgress(page: Page, requests: number, refreshes: number) {
  // Timer advancement starts the async probe; body decoding and React commits
  // complete separately. Keep these stages observable without advancing time.
  await expect.poll(() => page.evaluate(() => (window as unknown as FixtureWindow).fixtureRequests.length))
    .toBe(requests);
  await expect.poll(() => page.evaluate(() => (window as unknown as FixtureWindow).fixtureRefreshes))
    .toBe(refreshes);
}

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
      const fixture = window as unknown as FixtureWindow;
      const row = document.querySelector<HTMLElement>('[data-users-refresh-anchor="record-8"]')!;
      fixture.fixtureInitialScrollObserved = false;
      // Match the component's native capture listener so its scroll-version
      // guard sees setup scrolling before the refresh remembers a position.
      window.addEventListener("scroll", () => { fixture.fixtureInitialScrollObserved = true; }, { once: true, capture: true });
      window.scrollTo({ left: 0, top: window.scrollY + row.getBoundingClientRect().top - 120, behavior: "instant" });
      fixture.fixtureNext = { count: 25, rows: ["newly-recorded-page", ...Array.from({ length: 24 }, (_, index) => "record-" + index)] };
    });
    await expect.poll(() => page.evaluate(() => (window as unknown as FixtureWindow).fixtureInitialScrollObserved)).toBe(true);
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
    await expectRefreshProgress(page, 1, 1);
    await expect(page.getByTestId("recorded-count")).toHaveText("Recorded actions: 25");
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
    await expectRefreshProgress(page, 1, 1);
    await expect(page.getByTestId("recorded-count")).toHaveText("Recorded actions: 25");
    await page.evaluate(() => (window as unknown as FixtureWindow).fixtureNetwork(false));
    await page.clock.runFor(30_000);
    await expect(page.getByTestId("users-live-refresh-status")).toContainText("Offline");
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRequests.length), 1);
    await page.evaluate(() => { (window as unknown as FixtureWindow).fixtureMode = "network"; (window as unknown as FixtureWindow).fixtureNetwork(true); });
    await page.clock.runFor(100);
    await expectRefreshProgress(page, 2, 1);
    await expect(page.getByTestId("users-live-refresh-status")).toContainText("Updates delayed");
    assert.equal(await page.getByTestId("recorded-count").innerText(), "Recorded actions: 25");
    await page.evaluate(() => { (window as unknown as FixtureWindow).fixtureMode = "ready"; });
    await page.clock.runFor(30_000);
    await expectRefreshProgress(page, 3, 2);
    await expect(page.getByTestId("recorded-count")).toHaveText("Recorded actions: 26");
    await page.evaluate(() => { (window as unknown as FixtureWindow).fixtureMode = "denied"; });
    await page.clock.runFor(15_100);
    await expectRefreshProgress(page, 4, 3);
    await expect(page.getByTestId("users-live-refresh-status")).toContainText("Checking your access");
    await expect(page.getByTestId("recorded-count"), "revoked access removes retained private content while the canonical guard redirects").toHaveCount(0);
    const before = await page.evaluate(() => ({ requests: (window as unknown as FixtureWindow).fixtureRequests.length, refreshes: (window as unknown as FixtureWindow).fixtureRefreshes }));
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
    await expectRefreshProgress(page, 1, 1);
    assert.equal(await page.getByTestId("recorded-count").innerText(), "Recorded actions: 24", "a transition retains current content while server data is pending");
    await page.clock.runFor(60_000);
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRequests.length), 1, "no overlapping refresh while React is waiting for server content");
    await page.evaluate(() => (window as unknown as FixtureWindow).fixtureResolve!());
    await page.clock.runFor(100);
    await expect(page.getByTestId("recorded-count")).toHaveText("Recorded actions: 25");
    await page.clock.runFor(15_000);
    await expectRefreshProgress(page, 2, 2);
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
    await expectRefreshProgress(page, 1, 1);
    await expect(page.getByTestId("recorded-count"), "a closed native dialog must not pause the page").toHaveText("Recorded actions: 25");
    await page.evaluate(() => (document.getElementById("fixture-management-dialog") as HTMLDialogElement).showModal());
    await page.clock.runFor(60_000);
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRequests.length), 1);
    await page.evaluate(() => (document.getElementById("fixture-management-dialog") as HTMLDialogElement).close());
    await page.clock.runFor(1_100);
    await expectRefreshProgress(page, 2, 2);
    await expect(page.getByTestId("recorded-count")).toHaveText("Recorded actions: 26");
  });
});

test("open activity details retain the reviewed action until closed, then overview and paginated history resume in place", async () => {
  for (const overview of [true, false]) {
    await withComponentBrowser(activityBundle(), reviewFixtureSetup(overview), async page => {
      await page.clock.install();
      await page.evaluate(() => {
        const fixture = window as unknown as FixtureWindow;
        fixture.fixtureMount();
        fixture.fixtureNext = { count: 6, rows: ["newly-recorded-page", ...Array.from({ length: 5 }, (_, index) => "record-" + index)] };
        const unrelated = document.createElement("details");
        unrelated.open = true;
        unrelated.innerHTML = "<summary>Unrelated notes</summary><p>These notes must not suspend activity updates.</p>";
        document.body.append(unrelated);
      });
      const reviewed = page.locator('[data-activity-id="record-4"]');
      await reviewed.locator("summary").click();
      await expect(reviewed.locator("details")).toHaveAttribute("open", "");
      await expect(page.getByTestId("users-live-refresh-status")).toHaveText("Updates paused while reviewing details");
      const url = page.url();
      await page.clock.runFor(30_100);
      assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRequests.length), 0);
      assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRefreshes), 0);
      await expect(reviewed.locator("details")).toHaveAttribute("open", "");
      assert.equal(await page.locator('[data-activity-id="newly-recorded-page"]').count(), 0);
      await reviewed.locator("summary").click();
      await page.clock.runFor(2_100);
      await expectRefreshProgress(page, 1, 1);
      await expect(page.locator('[data-activity-id="newly-recorded-page"]')).toHaveCount(1);
      assert.equal(await reviewed.count(), overview ? 0 : 1, "only the latest-five preview evicts its old fifth action after review ends");
      assert.equal(page.url(), url, "date filters and an older history cursor remain unchanged");
      assert.deepEqual(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureNavigation), []);
      await expect(page.getByTestId("users-live-refresh-status")).toHaveText("Updates automatically");
    });
  }
});

test("an action opened after refresh starts stays visible when the pending payload commits and releases the newest payload on close", async () => {
  await withComponentBrowser(activityBundle(), reviewFixtureSetup(true), async page => {
    await page.clock.install();
    await page.evaluate(() => {
      const fixture = window as unknown as FixtureWindow;
      fixture.fixtureMount();
      fixture.fixtureNext = { count: 6, rows: ["newly-recorded-page", ...Array.from({ length: 5 }, (_, index) => "record-" + index)],
        wait: new Promise<void>(resolve => { fixture.fixtureResolve = resolve; }) };
    });
    const reviewed = page.locator('[data-activity-id="record-4"]');
    await reviewed.waitFor();
    const url = page.url();
    await page.clock.runFor(15_100);
    await expectRefreshProgress(page, 1, 1);
    await expect(page.locator('[data-users-live-refresh="enabled"]')).toHaveAttribute("data-users-refresh-state", "updating");
    await reviewed.locator("summary").click();
    await expect(page.getByTestId("users-live-refresh-status")).toHaveText("Updates paused while reviewing details");
    await page.evaluate(() => (window as unknown as FixtureWindow).fixtureResolve!());
    await page.clock.runFor(100);
    await expect(page.locator('[data-users-live-refresh="enabled"]')).toHaveAttribute("data-users-refresh-state", "live");
    await expect(reviewed.locator("details")).toHaveAttribute("open", "");
    assert.equal(await page.locator('[data-activity-id="newly-recorded-page"]').count(), 0,
      "a settled same-route refresh cannot replace the action currently being read");
    await reviewed.locator("summary").click();
    await expect(page.locator('[data-activity-id="newly-recorded-page"]')).toHaveCount(1);
    await expect(reviewed).toHaveCount(0);
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRefreshes), 1,
      "closing releases the already received payload without requiring another request");
    assert.equal(page.url(), url);
  });
});

test("explicit filter or identity navigation takes precedence over a held activity payload", async () => {
  for (const pathname of ["/admin/users/user/fixture-account/activity", "/admin/users/user/other-account/activity"]) {
    await withComponentBrowser(activityBundle(), reviewFixtureSetup(true), async page => {
      await page.clock.install();
      await page.evaluate(() => (window as unknown as FixtureWindow).fixtureMount());
      const reviewed = page.locator('[data-activity-id="record-4"]');
      await reviewed.locator("summary").click();
      await expect(page.getByTestId("users-live-refresh-status")).toHaveText("Updates paused while reviewing details");
      await page.evaluate(path => (window as unknown as FixtureWindow).fixtureNavigate(path, "range=7d"), pathname);
      await expect(page.locator('[data-activity-id="record-9"]')).toHaveCount(1);
      await expect(reviewed).toHaveCount(0);
      assert.equal(new URL(page.url()).pathname, pathname);
      assert.equal(new URL(page.url()).searchParams.get("range"), "7d");
      await expect(page.getByTestId("users-live-refresh-status")).toHaveText("Updates automatically");
    });
  }
});

test("an authorization failure arriving while an action is open clears the held private content", async () => {
  await withComponentBrowser(activityBundle(), reviewFixtureSetup(true), async page => {
    await page.clock.install();
    await page.evaluate(() => {
      const fixture = window as unknown as FixtureWindow;
      window.fetch = async () => {
        fixture.fixtureRequests.push({ url: "/api/admin/users/live-refresh", cache: "no-store" });
        return new Promise<Response>(resolve => { fixture.fixtureResolve = () => resolve(Response.json({}, { status: 403 })); });
      };
      fixture.fixtureMount();
    });
    const reviewed = page.locator('[data-activity-id="record-4"]');
    await reviewed.waitFor();
    await page.clock.runFor(15_100);
    await expect.poll(() => page.evaluate(() => (window as unknown as FixtureWindow).fixtureRequests.length)).toBe(1);
    await reviewed.locator("summary").click();
    await expect(reviewed.locator("details")).toHaveAttribute("open", "");
    await page.evaluate(() => {
      const fixture = window as unknown as FixtureWindow;
      fixture.fixtureMode = "denied";
      fixture.fixtureResolve!();
    });
    await page.clock.runFor(100);
    await expect(page.getByTestId("users-live-refresh-status")).toHaveText("Checking your access…");
    await expect(page.locator("[data-activity-id]")).toHaveCount(0);
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRefreshes), 1);
  });
});
