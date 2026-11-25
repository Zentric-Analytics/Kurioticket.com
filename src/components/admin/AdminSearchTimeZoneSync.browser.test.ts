import assert from "node:assert/strict";
import test from "node:test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";
import type { AdminReportingTimeZonePreference } from "../../lib/adminReportingTimeZonePreference";

type FixtureWindow = Window & {
  fixtureDeviceZone: string;
  fixtureRequests: { preference: AdminReportingTimeZonePreference; intent: string }[];
  fixtureNavigate: (path: string) => void;
  fixtureRemount: () => void;
  fixtureDeferred: boolean;
  fixtureSettle: () => void;
};

const bundle = () => componentBundle({ reporting: "src/components/admin/AdminSearchTimeZoneSync.tsx" }, {
  "next/navigation": `const router={refresh:()=>window.fixtureRefresh()}; exports.useRouter=()=>router; exports.usePathname=()=>window.fixturePath;`,
  "@/app/admin/reportingTimeZoneActions": `exports.setAdminReportingTimeZone=(preference,intent)=>window.fixtureSetPreference(preference,intent);`,
});

const setup = `
  const React=require('react'),{createRoot}=require('react-dom/client');
  const {AdminReportingTimeZoneProvider,AdminReportingTimeZoneControl}=require('reporting');
  const root=createRoot(document.getElementById('root'));
  let preference={mode:'automatic',timeZone:'UTC'}, generation=0;
  window.fixturePath='/admin'; window.fixtureDeviceZone='Africa/Lagos'; window.fixtureRequests=[];
  Intl.DateTimeFormat=new Proxy(Intl.DateTimeFormat,{apply(target,receiver,args){
    return args.length===0 ? {resolvedOptions:()=>({timeZone:window.fixtureDeviceZone})} : Reflect.apply(target,receiver,args);
  }});
  function render(){root.render(React.createElement(AdminReportingTimeZoneProvider,{preference,key:generation},
    React.createElement('p',{'data-testid':'report-zone'},preference.timeZone),
    React.createElement(AdminReportingTimeZoneControl)));}
  window.fixtureNavigate=path=>{window.fixturePath=path;render();};
  window.fixtureRemount=()=>{generation++;render();};
  window.fixtureRefresh=render;
  window.fixtureSetPreference=async(next,intent)=>{
    window.fixtureRequests.push({preference:next,intent});
    if(window.fixtureDeferred) await new Promise(resolve=>{window.fixtureSettle=resolve;});
    const changed=preference.mode!==next.mode||preference.timeZone!==next.timeZone;
    preference=next;render();return {ok:true,preference,changed};
  };
  render();
`;

test("Admin automatically synchronizes the device zone on hydration, visibility, navigation and focus", async () => {
  await withComponentBrowser(bundle(), setup, async (page) => {
    await page.getByText("Africa/Lagos", { exact: true }).and(page.getByTestId("report-zone")).waitFor();
    await page.evaluate(() => {
      (window as unknown as FixtureWindow).fixtureDeviceZone = "Europe/London";
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.getByText("Europe/London", { exact: true }).and(page.getByTestId("report-zone")).waitFor();
    await page.evaluate(() => {
      const fixture = window as unknown as FixtureWindow;
      fixture.fixtureDeviceZone = "America/New_York";
      fixture.fixtureNavigate("/admin/searches/activity");
    });
    await page.getByText("America/New_York", { exact: true }).and(page.getByTestId("report-zone")).waitFor();
    await page.evaluate(() => {
      (window as unknown as FixtureWindow).fixtureDeviceZone = "Invalid/Zone";
      window.dispatchEvent(new Event("focus"));
    });
    await page.getByText("UTC", { exact: true }).and(page.getByTestId("report-zone")).waitFor();

    const requests = await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRequests);
    assert.deepEqual(requests.map(({ preference, intent }) => [preference.timeZone, intent]), [
      ["Africa/Lagos", "synchronize"], ["Europe/London", "synchronize"], ["America/New_York", "synchronize"], ["UTC", "synchronize"],
    ]);
  });
});

test("Admin keeps the committed report zone until a manual choice applies and can resume device tracking", async () => {
  await withComponentBrowser(bundle(), setup, async (page) => {
    const reportZone = page.getByTestId("report-zone");
    const options = page.getByRole("combobox", { name: "Reporting time zone" });
    const apply = page.getByRole("button", { name: "Apply time zone" });
    await page.getByText("Africa/Lagos", { exact: true }).and(reportZone).waitFor();
    assert.equal(await options.inputValue(), "automatic");
    await page.evaluate(() => { (window as unknown as FixtureWindow).fixtureDeferred = true; });
    await options.selectOption("Asia/Dubai");
    assert.equal(await reportZone.innerText(), "Africa/Lagos");
    await apply.press("Enter");
    await page.getByRole("button", { name: "Applying…" }).waitFor();
    assert.equal(await reportZone.innerText(), "Africa/Lagos");
    await page.evaluate(() => {
      const fixture = window as unknown as FixtureWindow;
      fixture.fixtureDeferred = false;
      fixture.fixtureSettle();
    });
    await page.getByText("Asia/Dubai", { exact: true }).and(reportZone).waitFor();
    await page.evaluate(() => {
      const fixture = window as unknown as FixtureWindow;
      fixture.fixtureDeviceZone = "Europe/London";
      fixture.fixtureRemount();
      window.dispatchEvent(new Event("focus"));
      fixture.fixtureNavigate("/admin/providers");
    });
    assert.equal(await options.inputValue(), "Asia/Dubai");
    await options.selectOption("automatic");
    await apply.click();
    await page.getByText("Europe/London", { exact: true }).and(reportZone).waitFor();

    const requests = await page.evaluate(() => (window as unknown as FixtureWindow).fixtureRequests);
    assert.deepEqual(requests.slice(1), [
      { preference: { mode: "manual", timeZone: "Asia/Dubai" }, intent: "select" },
      { preference: { mode: "automatic", timeZone: "Europe/London" }, intent: "select" },
    ]);
  }, 375);
});
