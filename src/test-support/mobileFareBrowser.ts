import assert from "node:assert/strict";
import ts from "typescript";
import { componentBundle, withComponentBrowser } from "./componentBrowser";
import { nodesWhere, parseSource } from "./sourceStructure";

export async function verifyMobileFares(source: string) {
  const root = parseSource(source);
  const rails = nodesWhere(root, (node) => ts.isJsxElement(node) && node.openingElement.attributes.properties.some((property) => ts.isJsxAttribute(property) && property.name.getText(root) === "data-nearby-fare-presentation" && property.initializer?.getText(root) === '"mobile"'));
  assert.equal(rails.length, 1);
  assert.doesNotMatch(source, /data-desktop-nearby-fare-rail/);
  const jsx = ts.transpileModule(`window.renderFare = () => (${rails[0].getText(root)});`, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  await withComponentBrowser(componentBundle({ currency: "src/lib/currency/formatCurrency.ts" }), `const React=require('react'),{createRoot}=require('react-dom/client'),{flushSync}=require('react-dom'),{formatDisplayPrice}=require('currency');
    const currencyRates={rates:{USD:1},isFallback:false},selectedCurrency='USD',calendarLocale='en-US',nearbyFareRangeSize=7;
    const body={departureDate:'2026-12-01'},mobileNearbyFareRailRef=React.createRef(),mobileSelectedNearbyFareRef=React.createRef();
    let loading=false,cheaperNearbyFare=null;window.selectedDates=[];const handleNearbyFareDateSelect=date=>window.selectedDates.push(date),cn=(...classes)=>classes.filter(Boolean).join(' '),formatFareStripDateLabel=date=>date,formatFareStripWeekdayLabel=()=> 'Mon';
    let nearbyFares=Array.from({length:7},(_,i)=>({date:'2026-12-0'+(i+1),status:'success',amount:12345678.9+i,currency:'USD'}));
    const exports={};${jsx}
    const root=createRoot(document.getElementById('root'));window.mount=(state='success')=>{loading=state==='loading';nearbyFares=nearbyFares.map(fare=>({...fare,status:state}));flushSync(()=>root.render(window.renderFare()));};window.mount();`, async (page) => {
    const buttons = page.locator("[data-fare-date-cell]");
    assert.equal(await buttons.count(), 7);
    assert.equal(await buttons.first().getAttribute("aria-current"), "date");
    assert.equal(await buttons.first().isDisabled(), true);
    const full = await buttons.nth(1).getAttribute("aria-label");
    assert.match(full || "", /12,345,679/);
    await buttons.nth(1).focus(); await page.keyboard.press("Enter");
    assert.deepEqual(await page.evaluate("window.selectedDates"), ["2026-12-02"]);
    await page.evaluate("window.mount('loading')");
    for (const button of await buttons.all()) assert.equal(await button.isDisabled(), true);
    assert.match(await buttons.nth(1).getAttribute("aria-label") || "", /Fare loading/);
    await page.evaluate("window.mount('unavailable')");
    assert.match(await buttons.nth(1).getAttribute("aria-label") || "", /Fare unavailable/);
    await page.evaluate("window.mount('error')");
    assert.match(await buttons.nth(1).getAttribute("aria-label") || "", /could not be checked/);
  }, 375);
}
