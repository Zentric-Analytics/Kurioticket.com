import assert from "node:assert/strict";
import test from "node:test";
import { componentBundle, withComponentBrowser } from "../../test-support/componentBrowser";

const bundle = () => componentBundle({ faq: "src/app/faq/FaqContent.tsx", vi: "src/lib/i18n/vi.ts", pl: "src/lib/i18n/pl.ts", sv: "src/lib/i18n/sv.ts", id: "src/lib/i18n/id.ts", th: "src/lib/i18n/th.ts" }, {
  "@/components/layout/LocaleProvider": "exports.useLocale=()=>({locale:window.locale,t:require(window.locale).translations});",
  "@/components/dashboard/AccountDetailShell": "exports.AccountDetailShell=({children})=>require('react').createElement('section',{'data-account-shell':true},children);",
  "@/components/layout/AppHeader": "exports.AppHeader=()=>null;",
  "@/components/layout/Footer": "exports.Footer=()=>null;",
});
const setup = `const React=require('react'),{createRoot}=require('react-dom/client'),{flushSync}=require('react-dom'),{FaqContent}=require('faq');
window.locale='vi';window.requests=[];window.jsonResolvers={};
window.fetch=(url,options)=>new Promise((resolve,reject)=>window.requests.push({url,signal:options.signal,resolve,reject}));
const root=createRoot(document.getElementById('root'));window.mount=(locale='vi',account=true)=>{window.locale=locale;flushSync(()=>root.render(React.createElement(FaqContent,{showAccountLink:account,initialFaqLocale:'vi',initialFaqItems:[{question:'VI initial CMS',answer:'Initial answer'}]})));};
window.reply=(index,items)=>window.requests[index].resolve({ok:true,json:async()=>({items})});
window.unmount=()=>flushSync(()=>root.render(null));window.mount();`;

test("FAQ cancelled late JSON cannot overwrite newer locale CMS or commit after unmount", async () => {
  await withComponentBrowser(bundle(), setup, async (page) => {
    assert.equal(await page.getByText("VI initial CMS").count(), 1);
    await page.waitForFunction("window.requests.length===1");
    await page.evaluate("window.requests[0].resolve({ok:true,json:()=>new Promise(resolve=>window.jsonResolvers.old=resolve)})");
    await page.waitForFunction("!!window.jsonResolvers.old");
    await page.evaluate("window.mount('pl')");
    await page.waitForFunction("window.requests.length===2");
    assert.equal(await page.evaluate("window.requests[0].signal.aborted"), true);
    await page.evaluate("window.reply(1,[{question:'PL newest CMS',answer:'Current answer'}])");
    await page.getByText("PL newest CMS", { exact: true }).waitFor();
    await page.evaluate("window.jsonResolvers.old({items:[{question:'VI stale CMS',answer:'Old answer'}]})");
    await page.evaluate("new Promise(resolve=>setTimeout(resolve,20))");
    assert.equal(await page.getByText("PL newest CMS", { exact: true }).count(), 1);
    assert.equal(await page.getByText("VI stale CMS", { exact: true }).count(), 0);
    await page.evaluate("window.mount('vi')");
    await page.waitForFunction("window.requests.length===3");
    await page.evaluate("window.requests[2].resolve({ok:true,json:()=>new Promise(resolve=>window.jsonResolvers.unmounted=resolve)})");
    await page.waitForFunction("!!window.jsonResolvers.unmounted");
    await page.evaluate("window.unmount();window.jsonResolvers.unmounted({items:[{question:'Unmounted CMS',answer:'Never visible'}]})");
    assert.equal(await page.locator("#root").textContent(), "");
    assert.equal(await page.evaluate("window.requests[2].signal.aborted"), true);
  });
});

test("FAQ locale fallback, account shell, support links and malformed/error responses preserve content", async () => {
  await withComponentBrowser(bundle(), setup, async (page) => {
    for (const locale of ["vi", "pl", "sv", "id", "th"]) {
      await page.evaluate(`window.mount('${locale}')`);
      assert.equal(await page.locator("h1").textContent(), await page.evaluate(`require('${locale}').translations.faqHeading`));
      assert.equal(await page.locator('a[href="/dashboard/support"]').textContent(), await page.evaluate(`require('${locale}').translations.faqSupportPage`));
      assert.equal(await page.locator("[data-account-shell]").count(), 1);
      assert.ok(await page.locator("details").count() > 0);
    }
    await page.waitForFunction("window.requests.length===5");
    const before = await page.locator("details").allTextContents();
    await page.evaluate("window.requests[4].resolve({ok:true,json:async()=>({items:'invalid'})})");
    await page.evaluate("new Promise(resolve=>setTimeout(resolve,20))");
    assert.deepEqual(await page.locator("details").allTextContents(), before);
    await page.evaluate("window.mount('pl',false)");
    await page.waitForFunction("window.requests.length===6");
    await page.evaluate("window.requests[5].reject(new TypeError('Controlled network failure'))");
    assert.equal(await page.locator("[data-account-shell]").count(), 0);
    assert.ok(await page.locator("details").count() > 0);
    await page.evaluate("window.mount('sv')");
    await page.waitForFunction("window.requests.length===7");
    await page.evaluate("window.requests[6].resolve({ok:false})");
    assert.ok(await page.locator("details").count() > 0);
  }, 375);
});
