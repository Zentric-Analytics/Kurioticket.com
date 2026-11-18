import assert from "node:assert/strict";
import test from "node:test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";

const entries = {
  select: "src/components/admin/AdminDirectorySelect.tsx",
  audit: "src/components/admin/AdminAuditLogsToolbar.tsx",
  activity: "src/components/admin/ActivityFiltersBar.tsx",
  providers: "src/components/admin/ProviderHealthWindowFilter.tsx",
  monitor: "src/components/admin/SearchMonitorSelect.tsx",
  support: "src/components/admin/SupportTicketActions.tsx",
  content: "src/components/admin/ContentDirectoryToolbar.tsx",
  overview: "src/components/admin/AdminOverviewControls.tsx",
  activityInfo: "src/components/admin/ActivityDataInfo.tsx",
  onlineUsers: "src/components/admin/OnlineUsersValue.tsx",
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
    const root=createRoot(document.getElementById('root'));window.fixtureRender=range=>root.render(React.createElement(AdminOverviewRangeTransitionProvider,{period:{range}},
      React.createElement(AdminOverviewRangeSelect,{period:{range},nowDate:'2026-11-18'}),React.createElement(AdminOverviewRangeSensitive,null,React.createElement('button',null,'Summary action'))));
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

test("Overview preserves the committed period after an unsuccessful navigation", async () => {
  const setup = `const React=require('react'),{createRoot}=require('react-dom/client'),{AdminOverviewRangeTransitionProvider,AdminOverviewRangeSelect,AdminOverviewRangeSensitive}=require('overview');
    const period={range:'24h'};
    createRoot(document.getElementById('root')).render(React.createElement(AdminOverviewRangeTransitionProvider,{period},
      React.createElement(AdminOverviewRangeSelect,{period,nowDate:'2026-11-18'}),
      React.createElement(AdminOverviewRangeSensitive,null,React.createElement('button',null,'Summary action'))));`;
  await withComponentBrowser(bundle(), setup, async page => {
    const trigger = page.getByRole("button", { name: "Overview reporting range: Last 24 hours", exact: true });
    await trigger.click();
    await page.getByRole("option", { name: "Last 7 days", exact: true }).click();
    await page.getByRole("alert").waitFor();
    assert.match(await page.getByRole("alert").innerText(), /Unable to load Last 7 days/);
    assert.equal(await trigger.isEnabled(), true);
    assert.equal(await page.locator('[data-range-updating="true"]').count(), 0);
    assert.equal(await page.getByRole("button", { name: "Summary action" }).isEnabled(), true);
  });
});

test("Online Users pauses while hidden and refreshes on return when the sample is stale", async () => {
  const setup = `const React=require('react'),{createRoot}=require('react-dom/client'),{OnlineUsersValue}=require('onlineUsers');
    const root=createRoot(document.getElementById('root'));
    window.fixtureRequests=[];
    window.fixtureVisibility='visible';
    Object.defineProperty(document,'visibilityState',{get:()=>window.fixtureVisibility});
    window.fixtureSetVisibility=value=>{
      window.fixtureVisibility=value;
      document.dispatchEvent(new Event('visibilitychange'));
    };
    window.fetch=async url=>{
      window.fixtureRequests.push(url);
      return new Response(JSON.stringify({status:'ok',total:1}));
    };
    window.fixtureMount=()=>root.render(React.createElement(OnlineUsersValue,{initial:{status:'ok',total:0}}));`;
  await withComponentBrowser(bundle(), setup, async page => {
    await page.clock.install();
    await page.evaluate(() => (window as unknown as { fixtureMount: () => void }).fixtureMount());
    await page.getByText("0", { exact: true }).waitFor();
    const changeVisibility = (state: string) => page.evaluate(
      value => (window as unknown as { fixtureSetVisibility: (state: string) => void }).fixtureSetVisibility(value),
      state,
    );
    const observedRequests = () => page.evaluate(() => (window as unknown as { fixtureRequests: string[] }).fixtureRequests);
    await page.clock.runFor(10_000);
    await changeVisibility("hidden");
    await page.clock.runFor(60_000);
    assert.deepEqual(await observedRequests(), []);
    await changeVisibility("visible");
    await page.clock.runFor(100);
    await page.getByText("1", { exact: true }).waitFor();
    assert.deepEqual(await observedRequests(), ["/api/admin/overview/online-presence"]);
  });
});

test("the Online Users explanation is available on keyboard focus and dismisses with Escape", async () => {
  const setup = `const React=require('react'),{createRoot}=require('react-dom/client'),{ActivityDataInfo}=require('activityInfo');
    createRoot(document.getElementById('root')).render(React.createElement(ActivityDataInfo,
      {label:'How Online Users are counted'}, 'Activity in the last 90 seconds.'));`;
  await withComponentBrowser(bundle(), setup, async page => {
    const trigger = page.getByRole("button", { name: "How Online Users are counted" });
    await page.keyboard.press("Tab");
    await page.getByRole("tooltip").waitFor();
    assert.equal(await page.getByRole("tooltip").innerText(), "Activity in the last 90 seconds.");
    assert.equal(await trigger.getAttribute("aria-describedby"), await page.getByRole("tooltip").getAttribute("id"));
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("tooltip").count(), 0);
    assert.equal(await trigger.evaluate(element => element === document.activeElement), true);
  }, 390);
});

test("Overview applies complete custom UTC dates and can revise a committed custom range", async () => {
  const setup = `const React=require('react'),{createRoot}=require('react-dom/client'),{AdminOverviewRangeTransitionProvider,AdminOverviewRangeSelect}=require('overview');
    const root=createRoot(document.getElementById('root'));window.fixtureRender=period=>root.render(React.createElement(AdminOverviewRangeTransitionProvider,{period},
      React.createElement(AdminOverviewRangeSelect,{period,nowDate:'2026-11-18'})));
    window.fixtureCommitOnNavigation=url=>{const params=new URL(url,'http://fixture.local').searchParams,range=params.get('range')||'24h';
      window.fixtureRender(range==='custom'?{range,fromDate:params.get('from'),toDate:params.get('to')}:{range})};
    window.fixtureRender({range:'24h'});`;
  await withComponentBrowser(bundle(), setup, async page => {
    await page.getByRole("button", { name: "Overview reporting range: Last 24 hours" }).click();
    await page.getByRole("option", { name: "Custom range" }).click();
    await page.getByLabel("From (UTC)", { exact: true }).fill("2026-11-01");
    assert.equal(await page.getByRole("button", { name: "Apply dates" }).isDisabled(), true);
    await page.getByLabel("To (UTC)", { exact: true }).fill("2026-11-03");
    await page.getByRole("button", { name: "Apply dates" }).click();
    await page.getByRole("button", { name: "Overview reporting range: Custom range" }).click();
    await page.getByRole("option", { name: "Custom range" }).click();
    assert.equal(await page.getByLabel("From (UTC)", { exact: true }).inputValue(), "2026-11-01");
    await page.getByLabel("To (UTC)", { exact: true }).fill("2026-11-04");
    await page.getByRole("button", { name: "Apply dates" }).click();
    assert.deepEqual(await page.evaluate(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation), [
      "/admin?range=custom&from=2026-11-01&to=2026-11-03",
      "/admin?range=custom&from=2026-11-01&to=2026-11-04",
    ]);
  }, 390);
});

test("CMS filter drafts survive same-scope updates and only Apply filters navigates", async () => {
  const props = { path: "/admin/content/faqs", query: "q=old&from=overview", status: "", searchLabel: "Search FAQs", children: "Records" };
  await withComponentBrowser(bundle(), mount("content", "ContentDirectoryToolbar", props), async page => {
    const input = page.getByRole("searchbox", { name: "Search FAQs", exact: true });
    await input.fill("draft search");
    await page.evaluate(props => (window as unknown as { fixtureRender: (props: unknown) => void }).fixtureRender(props),
      { ...props, query: "q=old&from=overview&status=DRAFT", status: "DRAFT" });
    assert.equal(await input.inputValue(), "draft search");
    await page.waitForTimeout(350);
    assert.deepEqual(await page.evaluate(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation), []);
    await page.getByRole("button", { name: "Apply filters", exact: true }).click();
    await page.waitForFunction(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation.length === 1);
    const href = await page.evaluate(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation[0]);
    const url = new URL(href, "http://fixture.local");
    assert.equal(url.searchParams.get("q"), "draft search");
    assert.equal(url.searchParams.get("status"), "DRAFT");
    assert.equal(url.searchParams.get("from"), "overview");
  });
});

test("CMS all-market navigation preserves draft search, selected market and overview scope", async () => {
  const props = { path: "/admin/content/homepage/destinations", query: "market=ALL&from=overview&cursor=old", status: "", market: "ALL", markets: ["US", "CANADA"], searchLabel: "Search content", children: "Records" };
  await withComponentBrowser(bundle(), mount("content", "ContentDirectoryToolbar", props), async page => {
    assert.equal(await page.getByRole("link", { name: "Clear filters", exact: true }).count(), 0);
    const input = page.getByRole("searchbox", { name: "Search content", exact: true });
    await input.fill("draft market search");
    await page.getByRole("combobox", { name: "Content market", exact: true }).click();
    await page.getByRole("option", { name: "Canada", exact: true }).click();
    assert.deepEqual(await page.evaluate(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation), [],
      "Market choice must remain a draft");
    await page.getByRole("button", { name: "Apply filters", exact: true }).click();
    await page.waitForFunction(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation.length === 1);
    const href = await page.evaluate(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation.at(-1)!);
    const url = new URL(href, "http://fixture.local");
    assert.equal(url.searchParams.get("market"), "CANADA");
    assert.equal(url.searchParams.get("q"), "draft market search");
    assert.equal(url.searchParams.get("from"), "overview");
    assert.equal(url.searchParams.get("cursor"), null);
  });
});

test("Audit Logs drafts never fetch until Apply filters and preserve typed values", async () => {
  const props = { action: "", adminEmail: "", targetType: "", targetEmail: "", range: "24h", fromDate: "", toDate: "", pageHref: "/admin/logs?range=24h" };
  await withComponentBrowser(bundle(), mount("audit", "AdminAuditLogsToolbar", props), async page => {
    const admin = page.getByRole("searchbox", { name: "Search admin email", exact: true });
    await admin.fill("draft@example.test");
    await page.getByRole("combobox", { name: "Date range", exact: true }).click();
    await page.getByRole("option", { name: "Last 7 days", exact: true }).click();
    await page.getByRole("combobox", { name: "Action", exact: true }).click();
    await page.getByRole("option", { name: "CMS actions", exact: true }).click();
    await page.getByRole("combobox", { name: "Target type", exact: true }).click();
    await page.getByRole("option", { name: "Provider", exact: true }).click();
    await page.waitForTimeout(350);
    assert.deepEqual(await page.evaluate(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation), []);
    assert.equal(await admin.inputValue(), "draft@example.test");
    await page.getByRole("button", { name: "Apply filters", exact: true }).click();
    await page.waitForFunction(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation.length === 1);
    const href = await page.evaluate(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation[0]);
    const url = new URL(href, "http://fixture.local");
    assert.equal(url.searchParams.get("range"), "7d");
    assert.equal(url.searchParams.get("action"), "CMS");
    assert.equal(url.searchParams.get("targetType"), "Provider");
    assert.equal(url.searchParams.get("adminEmail"), "draft@example.test");
  });
});

test("Admin directory selection follows committed values and closes when disabled", async () => {
  const props = { name: "scope", label: "Scope", value: "a", options: [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }] };
  await withComponentBrowser(bundle(), mount("select", "AdminDirectorySelect", props), async page => {
    const trigger = page.getByRole("combobox", { name: "Scope", exact: true });
    await trigger.click();
    await page.getByRole("listbox").waitFor();
    await page.evaluate(p => (window as unknown as { fixtureRender: (p: object) => void }).fixtureRender(p), { ...props, value: "b" });
    await page.waitForFunction(() => document.querySelector('[role="combobox"]')?.textContent?.includes("Beta"));
    assert.equal(await page.getByRole("listbox").count(), 0);
    await trigger.click();
    await page.getByRole("listbox").waitFor();
    await page.evaluate(p => (window as unknown as { fixtureRender: (p: object) => void }).fixtureRender(p), { ...props, value: "b", disabled: true });
    await page.waitForFunction(() => !(document.querySelector('[role="listbox"]')));
    assert.equal(await trigger.isDisabled(), true);
    assert.deepEqual(await page.evaluate(() => (window as unknown as { fixtureNavigation: string[] }).fixtureNavigation), []);
  });
});
