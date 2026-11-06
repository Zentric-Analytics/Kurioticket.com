import assert from "node:assert/strict";
import { componentBundle, withComponentBrowser } from "./componentBrowser";
import { formatDisplayPrice } from "../lib/currency/formatCurrency";

export async function verifyFlightFilters(contract: "prices" | "facets" | "groups") {
  const bundle = componentBundle({ filters: "src/components/results/DesktopFlightFilters.tsx" }, {
    "@/components/currency/CurrencyRatesProvider": "exports.useCurrencyRates=()=>({rates:{USD:1,VND:25000,IDR:15000},isFallback:false});",
    "@/components/layout/LocaleProvider": "exports.useLocale=()=>({locale:'en',t:{}});",
  });
  await withComponentBrowser(bundle, `const React=require('react'),{createRoot}=require('react-dom/client'),{flushSync}=require('react-dom'),{DesktopFlightFilters}=require('filters');
    window.events=[];const noop=()=>{},props={activeFilterCount:0,maxPrice:99999999.99,setMaxPrice:v=>window.events.push(['price',v]),priceBounds:{min:12345678.9,max:99999999.99},priceLabelCurrency:'USD',selectedCurrency:'USD',originCode:'LAX',destinationCode:'JFK',timeFilterMode:'takeoff',setTimeFilterMode:noop,timeBounds:{takeoff:null,landing:null},maxTakeoffMinutes:null,setMaxTakeoffMinutes:noop,maxLandingMinutes:null,setMaxLandingMinutes:noop,durationBounds:null,maxDurationMinutes:null,setMaxDurationMinutes:noop,stopOptions:[{value:'0',label:'Nonstop with a long translated supplier label',count:12345}],selectedStops:[],setSelectedStops:()=>window.events.push(['stops']),airlineOptions:[],selectedAirlines:[],setSelectedAirlines:noop,airportOptions:[],selectedAirports:[],setSelectedAirports:noop,flightQualityOptions:[],renderFlightQualityFilter:false,selectedFlightQuality:[],setSelectedFlightQuality:noop,baggageIncludedOnly:false,setBaggageIncludedOnly:noop,flexibleOnly:false,setFlexibleOnly:noop,onFilterChange:()=>window.events.push(['change']),onFilterCommit:()=>window.events.push(['commit']),onClear:noop};
    function Fixture({mode,compact,currency,width}){const [stops,setStops]=React.useState([]),[price,setPrice]=React.useState(props.maxPrice);return React.createElement('div',{style:{width}},React.createElement(DesktopFlightFilters,{...props,presentationMode:mode,compact,selectedCurrency:currency,selectedStops:stops,setSelectedStops:value=>{window.events.push(['stops']);setStops(value)},maxPrice:price,setMaxPrice:value=>{window.events.push(['price',value]);setPrice(value)}}));}
    const root=createRoot(document.getElementById('root'));window.mount=(mode='default',compact=false,currency='USD',width=236)=>flushSync(()=>root.render(React.createElement(Fixture,{key:mode+compact+currency+width,mode,compact,currency,width})));window.mount();`, async (page) => {
    if (contract === "prices") {
      for (const mode of ["default", "deals-guided"]) for (const currency of ["USD", "VND", "IDR"]) for (const width of [232, 236, 280, 320]) {
        await page.evaluate(`window.mount('${mode}',false,'${currency}',${width})`);
        const slider = page.getByRole("slider", { name: "Price", exact: true });
        assert.equal(await slider.count(), 1);
        const section = slider.locator("xpath=ancestor::section[1]");
        const text = await section.textContent() || "";
        assert.match(text, /[0-9]/);
        const values = await section.locator("span.truncate").allTextContents();
        assert.equal(values.length, 2);
        assert.notEqual(values[0], values[1]);
        assert.deepEqual(values, [12345678.9, 99999999.99].map((amount) => formatDisplayPrice({ amount, sourceCurrency: "USD", displayCurrency: currency, convertSourceEstimate: true, useFlightResultSymbols: true, rates: { USD: 1, VND: 25000, IDR: 15000 }, isFallbackRate: false }).formatted), "complete converted lower/upper amounts remain available to accessibility text");
        const positions = await section.locator("span.truncate").evaluateAll((nodes) => nodes.map((node) => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right }; }));
        assert.ok(positions[0].right <= positions[1].left, "range labels must not overlap");
        const boundary = await section.evaluate((node) => ({ right: node.getBoundingClientRect().right, width: node.clientWidth, scroll: node.scrollWidth }));
        assert.ok(positions[1].right <= boundary.right, "the upper price must remain inside its visible filter section");
        assert.ok(boundary.scroll <= boundary.width, "the filter section must not clip long-price content");
        await page.evaluate("window.events=[]");
        const previous = await slider.getAttribute("value");
        await slider.focus();
        await page.keyboard.press("ArrowLeft");
        assert.notEqual(await slider.getAttribute("value"), previous);
        assert.ok(await page.evaluate("window.events.some(e=>e[0]==='price')"));
        assert.ok(await page.evaluate("window.events.some(e=>e[0]==='commit')"));
      }
      await page.evaluate("window.mount('default',true,'USD',320);window.events=[]");
      await page.getByRole("button", { name: /Price/ }).click();
      const compactSlider = page.getByRole("slider", { name: "Price", exact: true });
      assert.equal(await compactSlider.count(), 1);
      await compactSlider.focus(); await page.keyboard.press("ArrowLeft");
      assert.ok(await page.evaluate("window.events.some(e=>e[0]==='price')"));
      assert.ok(await page.evaluate("window.events.some(e=>e[0]==='commit')"));
    } else if (contract === "facets") {
      for (const compact of [false, true]) {
        await page.evaluate(`window.mount('default',${compact})`);
        if (compact) { const stops = page.getByRole("button", { name: /Stops/ }); if (await stops.count()) await stops.click(); }
        const input = page.getByRole("checkbox", { name: /Nonstop with a long translated supplier label/ });
        assert.equal(await input.count(), 1);
        const label = input.locator("xpath=ancestor::label[1]");
        assert.match(await label.textContent() || "", /12345/);
        await page.evaluate("window.events=[]");
        await input.focus(); await page.keyboard.press("Space");
        assert.equal(await input.isChecked(), true);
        assert.ok(await page.evaluate("window.events.some(e=>e[0]==='stops')"));
        const geometry = await label.evaluate((node) => ({ height: node.getBoundingClientRect().height, overflow: node.scrollWidth > node.clientWidth }));
        assert.ok(geometry.height >= 28); assert.equal(geometry.overflow, false);
      }
    } else {
      const heading = page.getByRole("button", { name: "Price", exact: true });
      assert.equal(await heading.getAttribute("aria-expanded"), "true");
      const panel = await heading.getAttribute("aria-controls"); assert.ok(panel);
      assert.equal(await page.locator(`[id="${panel}"]`).count(), 1);
      await heading.focus(); await page.keyboard.press("Enter");
      assert.equal(await heading.getAttribute("aria-expanded"), "false");
      await page.keyboard.press("Space");
      assert.equal(await heading.getAttribute("aria-expanded"), "true");
      assert.ok(await page.getByRole("heading", { name: "Stops", exact: true }).count());
    }
  });
}
