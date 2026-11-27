import assert from "node:assert/strict";
import test from "node:test";
import { expect } from "@playwright/test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";
import type { AdminOnlineUsersSnapshot, OnlineIdentityRow } from "../../lib/adminOnlineUsersSnapshot";

const at = new Date().toISOString();
const rows: OnlineIdentityRow[] = Array.from({ length: 60 }, (_, index) => {
  const guest = index >= 30;
  return { id: guest ? "guest-" + index : "qa-account-" + index, kind: guest ? "guest" : "registered",
    name: guest ? "Guest session" : "QA account " + index, email: guest ? null : `qa-${index}@example.invalid`,
    role: guest ? null : "USER", locationLabel: "Nigeria", platforms: [guest ? "android" : "desktop_web"], lastSeenAt: at,
    ...(guest ? { liveReference: "x".repeat(41) + String(index) } : {}) };
});
const initial: AdminOnlineUsersSnapshot = { status: "ok", observedAt: at, windowSeconds: 90,
  total: rows.length, registeredAccounts: 30, guestSessions: 30, rows,
  platforms: { desktop_web: 30, mobile_web: 0, ios: 0, android: 30, website: 30, unclassified: 0 } };

const boundary = `const React=require('react'); const listeners=new Set();
  const changed=()=>{window.fixtureSearch=location.search;for(const listener of listeners)listener();};
  window.addEventListener('popstate',changed);
  const router={push:url=>{window.fixtureNavigation.push(url);history.pushState(null,'',url);changed();},refresh:()=>{window.fixtureRefreshes=(window.fixtureRefreshes||0)+1;}};
  exports.useRouter=()=>router;
  exports.useSearchParams=()=>new URLSearchParams(React.useSyncExternalStore(listener=>{listeners.add(listener);return()=>listeners.delete(listener);},()=>window.fixtureSearch,()=>window.fixtureSearch));`;
const bundle = () => componentBundle({ online: "src/components/admin/AdminOnlineUsersDirectory.tsx" }, { "next/navigation": boundary });
function mount(query: string, deferred = false) {
  return `history.replaceState(null,'','/admin/users/online?'+${JSON.stringify(query)});window.fixtureSearch=location.search;
    const React=require('react'),{createRoot}=require('react-dom/client'),{AdminOnlineUsersDirectory}=require('online');
    const root=createRoot(document.getElementById('root'));window.fixtureProps=${JSON.stringify({ initial, timeZone: "UTC" })};
    window.fixtureRender=props=>root.render(React.createElement(AdminOnlineUsersDirectory,props));
    window.fixtureMount=()=>window.fixtureRender(window.fixtureProps);${deferred ? "" : "window.fixtureMount();"}`;
}

test("Online filters and page survive activity navigation context and browser Back without resetting drafts on refresh", async () => {
  await withComponentBrowser(bundle(), mount("q=Nigeria&type=guest&platform=android&page=2"), async page => {
    const input = page.getByRole("searchbox", { name: "Search online users" });
    await page.getByText("Page 2 of 2", { exact: true }).waitFor();
    assert.equal(await input.inputValue(), "Nigeria");
    assert.equal(await page.getByTestId("online-user-row").count(), 5);
    const activity = new URL((await page.getByRole("link", { name: "View activity", exact: true }).first().getAttribute("href"))!, "http://fixture.local");
    assert.match(activity.pathname, /^\/admin\/users\/live-guest\/[A-Za-z0-9_-]{43}\/activity$/);
    assert.equal(activity.searchParams.get("range"), "today");
    assert.equal(activity.searchParams.get("usersReturn"), "/admin/users/online?q=Nigeria&type=guest&platform=android&page=2");

    await input.fill("unfinished draft");
    await page.evaluate(() => {
      const fixture = window as unknown as { fixtureProps: object; fixtureRender: (props: object) => void };
      fixture.fixtureRender({ ...fixture.fixtureProps });
    });
    assert.equal(await input.inputValue(), "unfinished draft");
    assert.equal(await page.getByTestId("online-user-row").count(), 5, "editing draft filters does not change applied results");
    assert.deepEqual(await page.evaluate(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation), []);

    await input.fill("Guest session");
    await page.getByRole("button", { name: "Apply filters", exact: true }).click();
    await page.getByText("Page 1 of 2", { exact: true }).waitFor();
    assert.equal(await page.getByTestId("online-user-row").count(), 25);
    assert.equal(new URL(page.url()).searchParams.get("q"), "Guest session");
    assert.equal(new URL(page.url()).searchParams.has("page"), false);
    await page.evaluate(() => history.back());
    await page.getByText("Page 2 of 2", { exact: true }).waitFor();
    assert.equal(await input.inputValue(), "Nigeria");
    assert.equal(await page.getByTestId("online-user-row").count(), 5);
  });
});

test("Online pagination is URL-backed for accounts and repeated filters show an explicit recovery state", async () => {
  await withComponentBrowser(bundle(), mount("type=registered&platform=website"), async page => {
    await page.getByText("Page 1 of 2", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByText("Page 2 of 2", { exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("page"), "2");
    const activity = new URL((await page.getByRole("link", { name: "View activity", exact: true }).first().getAttribute("href"))!, "http://fixture.local");
    assert.match(activity.pathname, /^\/admin\/users\/user\/qa-account-\d+\/activity$/);
    assert.equal(activity.searchParams.get("usersReturn"), "/admin/users/online?type=registered&platform=website&page=2");
  });
  await withComponentBrowser(bundle(), mount("type=registered&type=guest"), async page => {
    await page.getByText("Repeated filters are not supported.", { exact: true }).waitFor();
    assert.equal(await page.getByTestId("online-user-row").count(), 0);
    assert.equal(await page.getByRole("link", { name: "Reset online filters" }).getAttribute("href"), "/admin/users/online");
  });
});

test("a new server roster updates in place and an older pending poll cannot overwrite it or an unfinished draft", async () => {
  const setup = mount("type=guest&platform=android&page=2", true) + `
    window.fixtureRequests=0;
    window.fetch=()=>{window.fixtureRequests++;return new Promise(resolve=>{window.fixtureResolve=resolve;});};`;
  await withComponentBrowser(bundle(), setup, async page => {
    await page.clock.install();
    await page.evaluate(() => (window as unknown as { fixtureMount: () => void }).fixtureMount());
    const input = page.getByRole("searchbox", { name: "Search online users" });
    await input.fill("unsubmitted country search");
    const url = page.url();
    await page.clock.runFor(30_100);
    assert.equal(await page.evaluate(() => (window as unknown as { fixtureRequests: number }).fixtureRequests), 1);
    const newer: AdminOnlineUsersSnapshot = { ...initial, observedAt: new Date(Date.parse(at) + 60_000).toISOString(),
      rows: rows.slice(0, 59), total: 59, guestSessions: 29, platforms: { ...initial.platforms, android: 29 } };
    await page.evaluate(snapshot => {
      const fixture = window as unknown as { fixtureProps: object; fixtureRender: (props: object) => void };
      fixture.fixtureRender({ ...fixture.fixtureProps, initial: snapshot });
    }, newer);
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="online-user-row"]').length === 4);
    const older = { ...initial, observedAt: new Date(Date.parse(at) + 30_000).toISOString() };
    await page.evaluate(snapshot => (window as unknown as { fixtureResolve: (response: Response) => void })
      .fixtureResolve(Response.json(snapshot)), older);
    await page.clock.runFor(100);
    assert.equal(await page.getByTestId("online-user-row").count(), 4);
    assert.equal(await input.inputValue(), "unsubmitted country search");
    assert.equal(page.url(), url);
    assert.equal(await page.getByText("Page 2 of 2", { exact: true }).count(), 1);
  });
});

test("Online polling waits while a filter is open or an administrator is typing, then resumes without applying the draft", async () => {
  const setup = mount("type=registered", true) + `
    window.fixtureRequests=0;
    window.fetch=async()=>{window.fixtureRequests++;const observedAt=new Date().toISOString();return Response.json({
      ...window.fixtureProps.initial,observedAt,rows:window.fixtureProps.initial.rows.map(row=>({...row,lastSeenAt:observedAt}))});};`;
  await withComponentBrowser(bundle(), setup, async page => {
    await page.clock.install();
    await page.evaluate(() => (window as unknown as { fixtureMount: () => void }).fixtureMount());
    const input = page.getByRole("searchbox", { name: "Search online users" });
    await input.waitFor();
    await page.getByRole("combobox", { name: "Identity type", exact: true }).click();
    await page.getByRole("listbox").waitFor();
    await page.clock.runFor(30_100);
    assert.equal(await page.evaluate(() => (window as unknown as { fixtureRequests: number }).fixtureRequests), 0,
      "a roster must not reorder underneath an open filter");
    await page.getByRole("listbox").press("Escape");
    await input.fill("unfinished country search");
    await page.clock.runFor(1_000);
    assert.equal(await page.evaluate(() => (window as unknown as { fixtureRequests: number }).fixtureRequests), 0,
      "typing gives the administrator a short quiet period");
    await page.clock.runFor(2_100);
    await expect.poll(() => page.evaluate(() => (window as unknown as { fixtureRequests: number }).fixtureRequests)).toBe(1);
    assert.equal(await input.inputValue(), "unfinished country search");
    assert.equal(await page.getByTestId("online-user-row").count(), 25);
    assert.equal(new URL(page.url()).searchParams.get("type"), "registered");
    assert.equal(new URL(page.url()).searchParams.has("q"), false, "a refresh cannot apply an unfinished draft");
  });
});

test("an open Online filter cannot extend the live claim past the snapshot's 90-second window", async () => {
  const setup = mount("type=registered", true) + `
    window.fixtureRequests=0;
    window.fetch=async()=>{window.fixtureRequests++;const observedAt=new Date().toISOString();return Response.json({
      ...window.fixtureProps.initial,observedAt,rows:window.fixtureProps.initial.rows.map(row=>({...row,lastSeenAt:observedAt}))});};`;
  await withComponentBrowser(bundle(), setup, async page => {
    await page.clock.install({ time: new Date(at) });
    await page.evaluate(() => (window as unknown as { fixtureMount: () => void }).fixtureMount());
    await expect(page.getByTestId("online-user-row").getByText("Online", { exact: true })).toHaveCount(25);
    await page.getByRole("combobox", { name: "Identity type", exact: true }).click();
    await page.getByRole("listbox").waitFor();
    await page.clock.runFor(90_100);
    assert.equal(await page.evaluate(() => (window as unknown as { fixtureRequests: number }).fixtureRequests), 0);
    await expect(page.getByTestId("online-user-row").getByText("Last observed", { exact: true })).toHaveCount(25);
    assert.match(await page.locator("body").innerText(), /Current online status is unverified/);
    await page.getByRole("listbox").press("Escape");
    await page.clock.runFor(2_100);
    await expect.poll(() => page.evaluate(() => (window as unknown as { fixtureRequests: number }).fixtureRequests)).toBe(1);
    await expect(page.getByTestId("online-user-row").getByText("Online", { exact: true })).toHaveCount(25);
  });
});

test("an identity already 89 seconds old expires after one second while an open filter retains rows and sampled counts", async () => {
  const setup = mount("type=registered", true) + `
    window.fixtureRequests=0;
    window.fixtureProps.initial={...window.fixtureProps.initial,
      rows:window.fixtureProps.initial.rows.map((row,index)=>index===0?{...row,
        lastSeenAt:new Date(Date.parse(window.fixtureProps.initial.observedAt)-89000).toISOString()}:row)};
    window.fetch=async()=>{window.fixtureRequests++;return Response.json(window.fixtureProps.initial);};`;
  await withComponentBrowser(bundle(), setup, async page => {
    await page.clock.install({ time: new Date(at) });
    await page.evaluate(() => (window as unknown as { fixtureMount: () => void }).fixtureMount());
    await expect(page.getByTestId("online-user-row").getByText("Online", { exact: true })).toHaveCount(25);
    const before = await page.getByTestId("online-user-row").allTextContents();
    const url = page.url();
    await page.getByRole("combobox", { name: "Identity type", exact: true }).click();
    await page.getByRole("listbox").waitFor();
    await page.clock.runFor(900);
    await expect(page.getByTestId("online-user-row").getByText("Online", { exact: true })).toHaveCount(25);
    await page.clock.runFor(200);
    await expect(page.getByTestId("online-user-row").getByText("Last observed", { exact: true })).toHaveCount(25);
    assert.equal(await page.getByTestId("online-user-row").getByText("Online", { exact: true }).count(), 0);
    await expect(page.getByRole("group", { name: "Last observed online counts", exact: true }).getByText("60", { exact: true })).toHaveCount(1);
    assert.match(await page.locator("body").innerText(), /Showing last observed counts and identities/);
    assert.equal(await page.evaluate(() => (window as unknown as { fixtureRequests: number }).fixtureRequests), 0);
    assert.equal(await page.getByTestId("online-user-row").count(), 25);
    assert.deepEqual((await page.getByTestId("online-user-row").allTextContents()).map(text => text.replace("Last observed", "Online")), before,
      "expiry changes only the current-status claim, not the identities, order or sampled fields");
    assert.equal(page.url(), url);
  });
});

test("a roster response arriving during a pointer interaction cannot move the selected identity", async () => {
  const setup = mount("type=registered", true) + `
    window.fixtureRequests=0;window.fixtureDecoded=0;
    window.fetch=async()=>{
      window.fixtureRequests++;
      if(window.fixtureRequests===1)return new Promise(resolve=>{window.fixtureResolve=body=>resolve({ok:true,status:200,
        json:async()=>{window.fixtureDecoded++;return body;}});});
      const observedAt=new Date().toISOString();return Response.json({...window.fixtureProps.initial,observedAt,
        rows:[...window.fixtureProps.initial.rows].reverse().map(row=>({...row,lastSeenAt:observedAt}))});
    };`;
  await withComponentBrowser(bundle(), setup, async page => {
    await page.clock.install();
    await page.evaluate(() => (window as unknown as { fixtureMount: () => void }).fixtureMount());
    const first = page.getByTestId("online-user-row").first();
    await expect(first).toContainText("QA account 0");
    await page.clock.runFor(30_100);
    await expect.poll(() => page.evaluate(() => (window as unknown as { fixtureRequests: number }).fixtureRequests)).toBe(1);
    const link = first.getByRole("link", { name: "View activity", exact: true });
    const href = await link.getAttribute("href");
    await link.dispatchEvent("pointerdown");
    await page.evaluate(() => {
      const fixture = window as unknown as { fixtureProps: { initial: AdminOnlineUsersSnapshot & { rows: OnlineIdentityRow[] } }; fixtureResolve: (value: unknown) => void };
      const observedAt = new Date().toISOString();
      fixture.fixtureResolve({ ...fixture.fixtureProps.initial, observedAt,
        rows: [...fixture.fixtureProps.initial.rows].reverse().map(row => ({ ...row, lastSeenAt: observedAt })) });
    });
    await expect.poll(() => page.evaluate(() => (window as unknown as { fixtureDecoded: number }).fixtureDecoded)).toBe(1);
    await page.clock.runFor(2_100);
    assert.equal(await first.getByRole("link", { name: "View activity", exact: true }).getAttribute("href"), href,
      "the identity under the held pointer remains unchanged after a late response");
    assert.equal(await page.evaluate(() => (window as unknown as { fixtureRequests: number }).fixtureRequests), 1);
    await link.dispatchEvent("pointerup");
    await page.clock.runFor(3_100);
    await expect.poll(() => page.evaluate(() => (window as unknown as { fixtureRequests: number }).fixtureRequests)).toBe(2);
    await expect(first).toContainText("QA account 29");
  });
});

test("Online failures retain labelled historical samples, hidden aborts cannot repaint, and revoked access stops polling", async () => {
  const setup = mount("type=guest&platform=android&page=2", true) + `
    window.fixtureMode='network';window.fixtureRequests=0;window.fixtureDecoded=0;window.fixtureVisibility='visible';
    Object.defineProperty(document,'visibilityState',{get:()=>window.fixtureVisibility});
    window.fixtureVisible=value=>{window.fixtureVisibility=value;document.dispatchEvent(new Event('visibilitychange'));};
    const observedResponse=response=>{const json=response.json.bind(response);response.json=async()=>{const body=await json();window.fixtureDecoded++;return body;};return response;};
    window.fetch=async()=>{
      window.fixtureRequests++;
      if(window.fixtureMode==='network')throw Error('Network unavailable');
      if(window.fixtureMode==='denied')return Response.json({},{status:403});
      if(window.fixtureMode==='pending')return new Promise(resolve=>{window.fixtureResolve=response=>resolve(observedResponse(response));});
      const observedAt=new Date().toISOString();
      return observedResponse(Response.json({...window.fixtureProps.initial,observedAt,
        rows:window.fixtureProps.initial.rows.map(row=>({...row,lastSeenAt:observedAt}))}));
    };`;
  await withComponentBrowser(bundle(), setup, async page => {
    await page.clock.install();
    await page.evaluate(() => (window as unknown as { fixtureMount: () => void }).fixtureMount());
    await page.getByText("Page 2 of 2", { exact: true }).waitFor();
    const url = page.url();
    await page.clock.runFor(30_100);
    await expect.poll(() => page.evaluate(() => (window as unknown as { fixtureRequests: number }).fixtureRequests)).toBe(1);
    assert.equal(await page.getByTestId("online-user-row").count(), 5, "network failure does not drop the current page");
    await expect(page.getByTestId("online-user-row").getByText("Last observed", { exact: true })).toHaveCount(5);
    assert.equal(await page.getByTestId("online-user-row").getByText("Online", { exact: true }).count(), 0, "old evidence must not claim current presence");
    assert.match(await page.locator("body").innerText(), /Current online status is unverified/);
    await page.evaluate(() => { (window as unknown as { fixtureMode: string }).fixtureMode = "ready"; });
    await page.clock.runFor(60_000);
    await expect.poll(() => page.evaluate(() => (window as unknown as { fixtureRequests: number }).fixtureRequests)).toBe(2);
    // Advancing the browser clock starts the retry; response-body decoding and
    // the React commit settle separately. Wait for the actual recovered UI.
    await expect(page.getByTestId("online-user-row").getByText("Online", { exact: true })).toHaveCount(5);
    assert.equal(await page.evaluate(() => (window as unknown as { fixtureDecoded: number }).fixtureDecoded), 1);
    await page.evaluate(() => { (window as unknown as { fixtureMode: string }).fixtureMode = "pending"; });
    await page.clock.runFor(30_000);
    await expect.poll(() => page.evaluate(() => (window as unknown as { fixtureRequests: number }).fixtureRequests)).toBe(3);
    await page.evaluate(() => (window as unknown as { fixtureVisible: (value: string) => void }).fixtureVisible("hidden"));
    await page.evaluate(() => (window as unknown as { fixtureResolve: (response: Response) => void }).fixtureResolve(Response.json({ status: "unavailable", observedAt: new Date().toISOString(), windowSeconds: 90 })));
    await expect.poll(() => page.evaluate(() => (window as unknown as { fixtureDecoded: number }).fixtureDecoded)).toBe(2);
    await page.clock.runFor(100);
    assert.equal(await page.getByTestId("online-user-row").count(), 5, "an aborted late response cannot replace retained rows");
    await page.evaluate(() => {
      (window as unknown as { fixtureMode: string }).fixtureMode = "ready";
      (window as unknown as { fixtureVisible: (value: string) => void }).fixtureVisible("visible");
    });
    await page.clock.runFor(100);
    await expect.poll(() => page.evaluate(() => (window as unknown as { fixtureRequests: number }).fixtureRequests)).toBe(4);
    await expect(page.getByTestId("online-user-row").getByText("Online", { exact: true })).toHaveCount(5);
    assert.equal(page.url(), url);
    await page.evaluate(() => { (window as unknown as { fixtureMode: string }).fixtureMode = "denied"; });
    await page.clock.runFor(30_100);
    await expect.poll(() => page.evaluate(() => (window as unknown as { fixtureRequests: number }).fixtureRequests)).toBe(5);
    await expect(page.getByTestId("online-user-row"), "access revocation clears the roster and rechecks the canonical page guard").toHaveCount(0);
    const stopped = await page.evaluate(() => ({ requests: (window as unknown as { fixtureRequests: number }).fixtureRequests,
      refreshes: (window as unknown as { fixtureRefreshes: number }).fixtureRefreshes }));
    assert.equal(stopped.refreshes, 1);
    await page.evaluate(() => {
      const fixture = window as unknown as { fixtureProps: { initial: { observedAt: string } }; fixtureRender: (props: object) => void };
      fixture.fixtureRender({ ...fixture.fixtureProps, initial: { ...fixture.fixtureProps.initial, observedAt: new Date(Date.now() + 1_000).toISOString() } });
    });
    await page.clock.runFor(100);
    assert.equal(await page.getByTestId("online-user-row").count(), 0, "late route props cannot restore a roster after access was revoked");
    await page.clock.runFor(90_000);
    assert.deepEqual(await page.evaluate(() => ({ requests: (window as unknown as { fixtureRequests: number }).fixtureRequests,
      refreshes: (window as unknown as { fixtureRefreshes: number }).fixtureRefreshes })), stopped);
    assert.equal(await page.getByTestId("online-user-row").count(), 0, "revoked access stays empty after all later timers settle");
  });
});
