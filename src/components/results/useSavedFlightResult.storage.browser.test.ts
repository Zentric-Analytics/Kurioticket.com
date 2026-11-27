import assert from "node:assert/strict";
import test from "node:test";
import { expect } from "@playwright/test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";

const bundle = () => componentBundle({ saved: "src/components/results/useSavedFlightResult.ts" }, {
  "next-auth/react": "exports.useSession=()=>({status:'unauthenticated',data:null}); exports.signIn=async(_provider,options)=>{window.fixtureSignIns.push(options.callbackUrl)};",
});

const mount = (saved: boolean) => `
  window.fixtureStorage=new Map([['kurioticket:analytics-consent:v1','granted'],['kurioticket_saved_items_v1',${JSON.stringify(JSON.stringify(saved ? ["fixture-flight"] : []))}]]);
  window.fixtureBlocked=false; window.fixtureQuota=false; window.fixtureActions=[]; window.fixtureSignIns=[]; window.fixtureStorageWrites=0;
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
    if(url!=='/api/activity/interactions')throw Error('Unexpected fixture request '+url);
    window.fixtureActions.push(JSON.parse(init.body).action);
    return new Response('{}',{status:200});
  };
  const React=require('react'),{createRoot}=require('react-dom/client'),{useSavedFlightResult}=require('saved');
  function Card(){const save=useSavedFlightResult({id:'fixture-flight',price:100,currency:'USD',airlineName:'Fixture Airline',provider:'Fixture Provider'},'/flights/details/fixture-flight');
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
