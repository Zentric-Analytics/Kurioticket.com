import assert from "node:assert/strict";
import test from "node:test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";

const entries = {
  activity: "src/components/admin/ActivityFiltersBar.tsx",
  providers: "src/components/admin/ProviderHealthWindowFilter.tsx",
  monitor: "src/components/admin/SearchMonitorSelect.tsx",
  support: "src/components/admin/SupportTicketActions.tsx",
  content: "src/components/admin/ContentDirectoryToolbar.tsx",
  overview: "src/components/admin/AdminOverviewControls.tsx",
};
const router = 'const router={push:url=>{window.fixtureNavigation.push(url);window.fixtureCommitOnNavigation?.(url);},replace:url=>window.fixtureNavigation.push(url),refresh:()=>window.fixtureRefreshes++};exports.useRouter=()=>router;';
const bundle = () => componentBundle(entries, { "next/navigation": router });
function mount(module: keyof typeof entries, name: string, props: object) {
  return `const React=require('react'),{createRoot}=require('react-dom/client'),Component=require(${JSON.stringify(module)})[${JSON.stringify(name)}];
    const root=createRoot(document.getElementById('root'));window.fixtureRefreshes=0;
    window.fixtureRender=props=>root.render(React.createElement(Component,props));window.fixtureRender(${JSON.stringify(props)});`;
}

test("Activity server-scope resets cancel debounce without remounting or clearing same-scope drafts", async () => {
  const initial = { tab: "all", q: "server", product: "all", stage: "all", order: "newest", from: "", to: "", range: "all" };
  const props = { path: "/admin/searches/activity", initial, directory: "users", tabs: null };
  await withComponentBrowser(bundle(), mount("activity", "ActivityFiltersBar", props), async page => {
    const input = page.getByRole("textbox", { name: "Search activity" });
    await input.fill("local draft");
    await input.evaluate(element => { (window as unknown as { fixtureInput: Element }).fixtureInput = element; });
    await page.evaluate(props => (window as unknown as { fixtureRender: (props: unknown) => void }).fixtureRender(props), props);
    assert.equal(await input.inputValue(), "local draft", "equal scope preserves typing");
    await page.evaluate(props => (window as unknown as { fixtureRender: (props: unknown) => void }).fixtureRender(props), { ...props, initial: { ...initial, q: "history", from: "2030-01-01" } });
    await page.waitForFunction(() => (document.querySelector('[aria-label="Search activity"]') as HTMLInputElement)?.value === "history");
    assert.equal(await input.evaluate(element => element === (window as unknown as { fixtureInput: Element }).fixtureInput), true);
    await page.waitForTimeout(350);
    assert.deepEqual(await page.evaluate(() => (window as unknown as { fixtureNavigation: unknown[] }).fixtureNavigation), [], "old scope cannot submit a pending local search");
    await input.fill("new search");
    await input.press("Enter");
    const navigations = await page.evaluate(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation);
    const url = new URL(navigations.at(-1)!, "http://fixture.local");
    assert.equal(url.searchParams.get("q"), "new search");
    assert.equal(url.searchParams.get("from"), "2030-01-01");
    assert.equal(url.searchParams.get("directory"), "users");
  });
});

test("Provider health drafts reset only on committed scope changes and never read incomplete dates", async () => {
  await withComponentBrowser(bundle(), mount("providers", "ProviderHealthWindowFilter", { product: "CAR", hours: 24, custom: null }), async page => {
    await page.getByRole("button", { name: "Date range: Last 24 hours", exact: true }).click();
    await page.getByRole("option", { name: "Custom range", exact: true }).click();
    await page.getByLabel("From", { exact: true }).fill("2030-01-02");
    assert.deepEqual(await page.evaluate(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation), []);
    await page.evaluate(() => (window as unknown as { fixtureRender: (props: unknown) => void }).fixtureRender({ product: "CAR", hours: 72, custom: null }));
    await page.getByRole("button", { name: "Date range: Last 3 days", exact: true }).waitFor();
    assert.equal(await page.getByLabel("From", { exact: true }).count(), 0);
    await page.getByRole("button", { name: "Date range: Last 3 days", exact: true }).click();
    await page.getByRole("option", { name: "Last 7 days", exact: true }).click();
    const urls = await page.evaluate(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation);
    assert.deepEqual(urls, ["/admin/providers?hours=168&product=CAR"]);
  });
});

test("Monitor selection and provider text synchronize history without replacing input focus", async () => {
  const setup = `const React=require('react'),{createRoot}=require('react-dom/client'),{SearchMonitorSelect,SearchMonitorProviderInput}=require('monitor');
    const root=createRoot(document.getElementById('root'));window.fixtureChanges=[];
    window.fixtureRender=value=>root.render(React.createElement(React.Fragment,null,
      React.createElement(SearchMonitorSelect,{label:'Scope',name:'scope',value,options:[{value:'a',label:'Alpha'},{value:'b',label:'Beta'},{value:'x',label:'Disabled',disabled:true}],onValueChange:v=>window.fixtureChanges.push(v)}),
      React.createElement(SearchMonitorProviderInput,{value})));window.fixtureRender('a');`;
  await withComponentBrowser(bundle(), setup, async page => {
    const input = page.getByRole("textbox", { name: "Provider", exact: true });
    await input.fill("unsent");
    await input.evaluate(element => { (window as unknown as { fixtureInput: Element }).fixtureInput = element; });
    await page.getByRole("button", { name: "Scope: Alpha", exact: true }).press("ArrowDown");
    assert.equal(await page.getByRole("option", { name: "Disabled", exact: true }).isDisabled(), true);
    await page.evaluate(() => (window as unknown as { fixtureRender: (value: string) => void }).fixtureRender("b"));
    await page.getByRole("button", { name: "Scope: Beta", exact: true }).waitFor();
    assert.equal(await page.getByRole("listbox").count(), 0, "server selection closes stale menu");
    assert.equal(await input.inputValue(), "b");
    assert.equal(await input.evaluate(element => element === (window as unknown as { fixtureInput: Element }).fixtureInput), true);
    assert.deepEqual(await page.evaluate(() => (window as unknown as { fixtureChanges: string[] }).fixtureChanges), [], "history synchronization is not user selection");
  });
});

test("Support status refresh resets selection while PATCH errors and exact ticket identity remain truthful", async () => {
  await withComponentBrowser(bundle(), mount("support", "SupportTicketStatusControl", { ticketId: "qa-ticket", status: "OPEN" }) + `
    window.fixtureRequests=[];window.fetch=async(url,options)=>{window.fixtureRequests.push({url,options});return{ok:false,json:async()=>({error:'Not authorized to change status'})};};`, async page => {
    await page.getByRole("combobox", { name: "Ticket status", exact: true }).click();
    await page.getByRole("option", { name: "Resolved", exact: true }).click();
    await page.getByRole("button", { name: "Save status", exact: true }).click();
    await page.getByRole("alert").waitFor();
    assert.match(await page.getByRole("alert").innerText(), /Not authorized/);
    const requests = await page.evaluate(() => (window as unknown as { fixtureRequests: { url: string; options: { method: string; body: string } }[] }).fixtureRequests);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "/api/admin/support/qa-ticket");
    assert.equal(requests[0].options.method, "PATCH");
    assert.deepEqual(JSON.parse(requests[0].options.body), { status: "RESOLVED" });
    await page.evaluate(() => (window as unknown as { fixtureRender: (props: unknown) => void }).fixtureRender({ ticketId: "qa-ticket", status: "WAITING_ON_TEAM" }));
    await page.waitForFunction(() => (document.querySelector('input[name="status"]') as HTMLInputElement)?.value === "WAITING_ON_TEAM");
    assert.equal(await page.getByRole("button", { name: "Save status", exact: true }).isDisabled(), true);
  });
});

test("CMS toolbar renders canonical filter links and keeps accumulated navigation, pagination reset and overview provenance", async () => {
  await withComponentBrowser(bundle(), mount("content", "ContentDirectoryToolbar", { path: "/admin/content/faqs", query: "q=old&cursor=page-2&from=overview", status: "", searchLabel: "Search FAQs", children: "Existing records" }), async page => {
    assert.equal(await page.locator('input[name="from"]').inputValue(), "overview");
    const published = page.getByRole("link", { name: "Published", exact: true });
    const href = new URL((await published.getAttribute("href"))!, "http://fixture.local");
    assert.equal(href.searchParams.get("q"), "old");
    assert.equal(href.searchParams.get("cursor"), null);
    await page.getByRole("searchbox", { name: "Search FAQs", exact: true }).fill("new text");
    await published.click();
    const urls = await page.evaluate(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation);
    const next = new URL(urls.at(-1)!, "http://fixture.local");
    assert.equal(next.searchParams.get("status"), "PUBLISHED");
    assert.equal(next.searchParams.get("q"), "new text");
    assert.equal(next.searchParams.get("cursor"), null);
    assert.equal(next.searchParams.get("from"), "overview");
    await page.getByRole("link", { name: "Clear filters", exact: true }).click();
    const clear = await page.evaluate(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation.at(-1));
    assert.equal(clear, "/admin/content/faqs?from=overview");
  });
});

test("Overview accepted range clears pending state and another requested range remains operable", async () => {
  const setup = `const React=require('react'),{createRoot}=require('react-dom/client'),{AdminOverviewRangeTransitionProvider,AdminOverviewRangeSelect,AdminOverviewRangeSensitive}=require('overview');
    const root=createRoot(document.getElementById('root'));window.fixtureRender=range=>root.render(React.createElement(AdminOverviewRangeTransitionProvider,{range},
      React.createElement(AdminOverviewRangeSelect,{range}),React.createElement(AdminOverviewRangeSensitive,null,React.createElement('button',null,'Summary action'))));
      window.fixtureCommitOnNavigation=url=>window.fixtureRender(new URL(url,'http://fixture.local').searchParams.get('range')||'24h');window.fixtureRender('24h');`;
  await withComponentBrowser(bundle(), setup, async page => {
    await page.getByRole("button", { name: "Overview reporting range: Last 24 hours", exact: true }).click();
    await page.getByRole("option", { name: "Last 7 days", exact: true }).click();
    await page.getByRole("button", { name: "Overview reporting range: Last 7 days", exact: true }).waitFor();
    assert.equal(await page.locator('[data-range-updating="true"]').count(), 0);
    await page.getByRole("button", { name: "Overview reporting range: Last 7 days", exact: true }).click();
    await page.getByRole("option", { name: "Last 30 days", exact: true }).click();
    assert.deepEqual(await page.evaluate(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation), ["/admin?range=7d", "/admin?range=30d"]);
  });
});

test("CMS acknowledgements with unchanged search do not restart the existing debounce or lose scope", async () => {
  const props = { path: "/admin/content/faqs", query: "q=old&from=overview", status: "", searchLabel: "Search FAQs", children: "Records" };
  const timers = `window.fixtureTimers=new Map();window.fixtureTimerId=100000;const originalSet=window.setTimeout,originalClear=window.clearTimeout;
    window.setTimeout=(fn,delay,...args)=>{if(delay!==300)return originalSet(fn,delay,...args);const id=++window.fixtureTimerId;window.fixtureTimers.set(id,fn);return id;};
    window.clearTimeout=id=>{if(!window.fixtureTimers.delete(id))originalClear(id);};`;
  await withComponentBrowser(bundle(), timers + mount("content", "ContentDirectoryToolbar", props), async page => {
    const input = page.getByRole("searchbox", { name: "Search FAQs", exact: true });
    await input.fill("draft search");
    await page.waitForFunction(() => (window as unknown as { fixtureTimers: Map<number, unknown> }).fixtureTimers.size === 1);
    const first = await page.evaluate(() => [...(window as unknown as { fixtureTimers: Map<number, unknown> }).fixtureTimers.keys()]);
    await page.evaluate(props => (window as unknown as { fixtureRender: (props: unknown) => void }).fixtureRender(props), { ...props, query: "q=old&from=overview&status=DRAFT", status: "DRAFT" });
    await page.waitForFunction(() => document.querySelector('input[name="status"]')?.getAttribute("value") === "DRAFT");
    assert.equal(await input.inputValue(), "draft search");
    assert.deepEqual(await page.evaluate(() => [...(window as unknown as { fixtureTimers: Map<number, unknown> }).fixtureTimers.keys()]), first, "server acknowledgement must not cancel/restart the user's timer");
    await page.evaluate(() => { const timers = (window as unknown as { fixtureTimers: Map<number, () => void> }).fixtureTimers; const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); });
    await page.waitForFunction(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation.length === 1);
    const href = await page.evaluate(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation[0]);
    const url = new URL(href, "http://fixture.local");
    assert.equal(url.searchParams.get("q"), "draft search");
    assert.equal(url.searchParams.get("status"), "DRAFT");
    assert.equal(url.searchParams.get("from"), "overview");
  });
});
