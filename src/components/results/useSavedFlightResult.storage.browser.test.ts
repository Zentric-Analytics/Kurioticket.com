import assert from "node:assert/strict";
import test from "node:test";
import { expect } from "@playwright/test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";

const bundle = () => componentBundle({ saved: "src/components/results/useSavedFlightResult.ts" }, {
  "next-auth/react": "exports.useSession=()=>window.fixtureSignedIn?{status:'authenticated',data:{user:{id:'fixture-account',email:'fixture@example.test'}}}:{status:'unauthenticated',data:null}; exports.signIn=async(_provider,options)=>{window.fixtureSignIns.push(options.callbackUrl)};",
});

const mount = (saved: boolean, signedIn = false) => `
  window.fixtureSignedIn=${signedIn};
  window.fixtureStorage=new Map([['kurioticket:analytics-consent:v1','granted'],['kurioticket_saved_items_v1',${JSON.stringify(JSON.stringify(saved ? ["fixture-flight"] : []))}]]);
  window.fixtureBlocked=false; window.fixtureQuota=false; window.fixtureActions=[]; window.fixtureSignIns=[]; window.fixtureStorageWrites=0;
  window.fixtureReports=[]; window.fixtureFinishMutation=null;
  Object.defineProperty(window,'localStorage',{configurable:true,get(){
    if(window.fixtureBlocked)throw new DOMException('Fixture storage denied','SecurityError');
    return {getItem:key=>window.fixtureStorage.get(key)||null,setItem(key,value){
      if(window.fixtureQuota)throw new DOMException('Fixture quota full','QuotaExceededError');
      window.fixtureStorageWrites++; window.fixtureStorage.set(key,value);
    },removeItem:key=>{window.fixtureStorageWrites++; window.fixtureStorage.delete(key)}};
  }});
  let fixtureEvent=0;
  Object.defineProperty(window.crypto,'randomUUID',{configurable:true,value:()=> '00000000-0000-4000-8000-'+String(++fixtureEvent).padStart(12,'0')});
  window.fetch=async(url,init)=>{
    if(url==='/api/dashboard/saved?type=flight')return Response.json({items:[]});
    if(url==='/api/dashboard/saved'){
      return new Promise(resolve=>{window.fixtureFinishMutation=()=>{
        window.fixtureFinishMutation=null;
        resolve(Response.json(init.method==='POST'?{item:{id:'fixture-saved',payload:{flightResultId:'fixture-flight'}}}:{}));
      };});
    }
    if(url!=='/api/activity/interactions')throw Error('Unexpected fixture request '+url);
    const event=JSON.parse(init.body);
    window.fixtureActions.push(event.action);
    window.fixtureReports.push({event,context:new Headers(init.headers).get('x-kt-analytics-context')});
    return Response.json({accepted:true});
  };
  const React=require('react'),{createRoot}=require('react-dom/client'),{useSavedFlightResult}=require('saved');
  const consent=require('file:src/lib/analyticsConsentClient.ts');
  window.fixtureConfirm=(account,proof)=>{
    consent.setBrowserAnalyticsAccount(account);
    consent.setBrowserAnalyticsConfirmation(account,true,proof);
  };
  function Card(){const save=useSavedFlightResult({id:'fixture-flight',price:100,currency:'USD',airlineName:'Fixture Airline',provider:'Fixture Provider',originAirport:'BOS',destinationAirport:'LAX',departureTime:'2027-04-01T15:00:00Z',arrivalTime:'2027-04-01T21:00:00Z'},'/flights/details/fixture-flight');
    return React.createElement('main',null,
      React.createElement('button',{onClick:save.toggleSavedFlight,disabled:save.pending},save.isSaved?'Remove saved flight':'Save flight'),
      React.createElement('output',{'data-testid':'save-error'},save.savedFlightError||''));
  }
  createRoot(document.getElementById('root')).render(React.createElement(Card));
`;

for (const failure of ["normal", "quota", "blocked"] as const) for (const saved of [false, true]) {
  test(`guest flight save requires sign-in with ${failure} storage and legacy saved=${saved}`, async () => {
    await withComponentBrowser(bundle(), mount(saved), async page => {
      const button = page.getByRole("button", { name: "Save flight", exact: true });
      await expect(button).toBeVisible();
      await page.evaluate(mode => {
        const fixture = window as unknown as { fixtureQuota: boolean; fixtureBlocked: boolean };
        fixture.fixtureQuota = mode === "quota";
        fixture.fixtureBlocked = mode === "blocked";
      }, failure);
      await button.click();
      await expect(button).toBeEnabled();
      await expect(page.getByTestId("save-error")).toBeEmpty();
      const outcome = await page.evaluate(() => {
        const fixture = window as unknown as { fixtureActions: string[]; fixtureStorage: Map<string, string>; fixtureSignIns: string[]; fixtureStorageWrites: number };
        return { actions: fixture.fixtureActions, stored: fixture.fixtureStorage.get("kurioticket_saved_items_v1"), signIns: fixture.fixtureSignIns, storageWrites: fixture.fixtureStorageWrites, href: window.location.href };
      });
      assert.deepEqual(outcome.actions, []);
      assert.equal(outcome.stored, JSON.stringify(saved ? ["fixture-flight"] : []));
      assert.deepEqual(outcome.signIns, [outcome.href]);
      assert.equal(outcome.storageWrites, 0);
    });
  });
}

test("a confirmed business mutation reports only under the browser confirmation from its initiation", async () => {
  await withComponentBrowser(bundle(), mount(false, true), async page => {
    type Fixture = {
      fixtureConfirm: (account: string, proof: string) => void;
      fixtureFinishMutation: () => void;
      fixtureReports: Array<{ event: { action: string; resultId: string }; context: string }>;
    };
    const save = page.getByRole("button", { name: "Save flight", exact: true });
    const remove = page.getByRole("button", { name: "Remove saved flight", exact: true });
    await save.click();
    await page.evaluate(() => {
      const fixture = window as unknown as Fixture;
      fixture.fixtureConfirm("fixture-account", "a".repeat(64));
      fixture.fixtureFinishMutation();
    });
    await expect(remove).toBeEnabled();
    assert.deepEqual(await page.evaluate(() => (window as unknown as Fixture).fixtureReports), []);

    await remove.click();
    await page.evaluate(() => (window as unknown as Fixture).fixtureFinishMutation());
    await expect(save).toBeEnabled();
    const reports = await page.evaluate(() => (window as unknown as Fixture).fixtureReports);
    assert.equal(reports.length, 1);
    assert.equal(reports[0].event.action, "saved_item_removed");
    assert.equal(reports[0].event.resultId, "fixture-flight");
    assert.equal(reports[0].context, "a".repeat(64));

    await save.click();
    await page.evaluate(() => {
      const fixture = window as unknown as Fixture;
      fixture.fixtureConfirm("other-account", "b".repeat(64));
      fixture.fixtureFinishMutation();
    });
    await expect(remove).toBeEnabled();
    assert.deepEqual(await page.evaluate(() => (window as unknown as Fixture).fixtureReports), reports);
  });
});
