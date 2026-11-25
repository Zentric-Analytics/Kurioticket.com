import assert from "node:assert/strict";
import test from "node:test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";

test("product records preserve today's applied range and react to an exact bookmark without losing product scope", async () => {
  const bundle = componentBundle({ records: "src/components/admin/ProductSearchRecordsPanel.tsx" });
  await withComponentBrowser(bundle, `const React=require('react'),{createRoot}=require('react-dom/client'),{ProductSearchRecordsPanel}=require('records');
    window.requests=[];
    window.fetch=async(url,options)=>{window.requests.push({url,method:options.method,credentials:options.credentials});return {json:async()=>({status:'ok',data:{items:[],nextCursor:null,product:'CAR',filter:'EXCEPTIONS',window:'today',timeZone:'UTC'}})}};
    createRoot(document.getElementById('root')).render(React.createElement(ProductSearchRecordsPanel,{product:'CAR'}));`, async page => {
    const apply = page.getByRole("button", { name: "Apply filters", exact: true });
    await apply.waitFor();
    assert.equal(await page.getByRole("button", { name: "Date range: Today · UTC", exact: true }).count(), 1);
    await apply.click();
    assert.equal(await page.getByRole("button", { name: "Date range: Today · UTC", exact: true }).count(), 1);
    const initial = await page.evaluate<Array<{ url: string; method: string; credentials: string }>>("window.requests");
    assert.ok(initial.length >= 2);
    for (const request of initial) {
      const url = new URL(request.url, "http://fixture.local");
      assert.equal(url.searchParams.get("window"), "today");
      assert.equal(url.searchParams.get("product"), "CAR");
      assert.equal(request.method, "GET");
      assert.equal(request.credentials, "include");
    }
    await page.evaluate("window.location.hash='car-search-records'");
    await page.getByRole("button", { name: "Outcome: All searches", exact: true }).waitFor();
    const final = await page.evaluate<string>("window.requests.at(-1).url");
    assert.equal(new URL(final, "http://fixture.local").searchParams.get("filter"), "ALL");
    assert.equal(new URL(final, "http://fixture.local").searchParams.get("product"), "CAR");
  });
});
