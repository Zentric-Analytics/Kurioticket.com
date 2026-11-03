import assert from "node:assert/strict";
import { componentBundle, withComponentBrowser } from "./componentBrowser";

export async function verifyCarCommerce() {
  const bundle = componentBundle({ card: "src/components/results/CarResultCard.tsx" }, {
    "@/components/region/RegionProvider": "exports.useRegion=()=>({selectedOption:{currency:'USD'}});",
    "@/components/currency/CurrencyRatesProvider": "exports.useCurrencyRates=()=>({rates:{USD:1},isFallback:false});",
    "@/components/layout/LocaleProvider": "exports.useLocale=()=>({t:{}});",
    "@/components/layout/RouteProgress": "exports.useRouteProgress=()=>({start:()=>{}});",
    "@/components/results/useSavedCar": "exports.useSavedCar=()=>({isSaved:false,toggleSavedCar:()=>{}});",
    "@/components/results/CarResultImage": "exports.CarResultImage=()=>null;",
    "@/components/results/CarsRouteLoadingOverlay": "exports.CarsRouteLoadingOverlay=()=>null;",
  });
  for (const width of [375, 1280]) await withComponentBrowser(bundle, `const React=require('react'),{createRoot}=require('react-dom/client'),{flushSync}=require('react-dom'),{CarResultCard}=require('card');
    window.calls=[];window.fetch=async(url,options={})=>{if(url!=='/api/price-alerts'||options.method&&options.method!=='GET')throw Error('Unexpected API '+url);window.calls.push(url);return new Response(JSON.stringify({alerts:[]}),{status:200})};
    const offers=[0,1,2].map(i=>({id:'offer-'+i,bookingProviderName:'Seller '+i,rentalCompanyName:'Rental '+i,totalPrice:100+i*10,pricePerDay:25+i*2.5,currency:'USD',bookingUrl:'https://sandbox-en-us.kayakaffiliates.com/in?offer='+i,suppliedFacts:[{label:'Pickup · address',value:'Fixture pickup '+i}]}));
    const car={id:'car-a',modelName:'Fixture Car',category:'compact',categoryLabel:'Compact',passengers:5,bags:2,doors:4,transmission:'automatic',fuelPolicy:'full-to-full',mileagePolicy:'unlimited',inventorySource:'kayak-sandbox',offers};
    const search={pickupLocation:'Fixture',pickupDate:'2026-11-15',dropoffDate:'2026-11-19',pickupTime:'10:00',dropoffTime:'10:00',driverAge:'30'};
    const root=createRoot(document.getElementById('root'));let version=0;window.mount=url=>flushSync(()=>root.render(React.createElement(CarResultCard,{key:++version,car:{...car,offers:offers.map(o=>({...o,bookingUrl:url===undefined?o.bookingUrl:url}))},search,presentation:'standalone',desktopSurfaceParity:true})));window.mount();`, async (page) => {
    const scope = width < 768 ? "[data-car-card-mobile-offers]" : '[data-region="details"]';
    assert.ok(await page.locator(`${scope} [data-car-rate-info]`).count() >= 2, await page.locator('#root').innerHTML());
    await page.locator(`${scope} [data-car-rate-info]`).nth(1).click();
    const dialog = page.locator("dialog[open]");
    await dialog.getByRole("switch").waitFor();
    assert.equal(await dialog.getByRole("switch").getAttribute("aria-label"), "Track car prices for Seller 1 offer");
    assert.ok((await dialog.locator('a').last().getAttribute("href"))?.endsWith("offer=1"));
    assert.match(await dialog.textContent() || "", /110/);
    await page.keyboard.press("Escape");
    for (const url of ["javascript:alert(1)", "https://user:password@example.com/book", "http://example.com/book", ""]) {
      await page.evaluate(`window.mount(${JSON.stringify(url)})`);
      await page.locator(`${scope} [data-car-rate-info]`).nth(1).click();
      assert.equal(await dialog.locator('a:not([href="/price-alerts"])').count(), 0, `unsafe provider URL rejected: ${url}`);
      assert.equal(await page.locator('a[href="#"]').count(), 0);
      await page.keyboard.press("Escape");
    }
  }, width);
}
