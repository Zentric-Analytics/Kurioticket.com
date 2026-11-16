import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, posix, relative } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("./CarPriceAlertControl.tsx", import.meta.url), "utf8");
const globals = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

// Compile the real browser component and its pure helpers. Context/navigation
// are fixtures; fetch is an explicit mock, never a live API or database.
let browserBundle: string | undefined;
function alertBrowserBundle() {
  if (browserBundle) return browserBundle;
  const require = createRequire(import.meta.url);
  const modules: Record<string, string> = {};
  for (const [name, file] of Object.entries({ react: "react/cjs/react.production.js", "react-dom": "react-dom/cjs/react-dom.production.js", "react-dom/client": "react-dom/cjs/react-dom-client.production.js", "react/jsx-runtime": "react/cjs/react-jsx-runtime.production.js", scheduler: "scheduler/cjs/scheduler.production.js" })) modules[name] = readFileSync(`node_modules/${file}`, "utf8");
  modules["lucide-react"] = "const React=require('react');module.exports=new Proxy({}, {get:()=>props=>React.createElement('svg',{'aria-hidden':true,width:props.size||24,height:props.size||24})});";
  modules["next/link"] = "module.exports={__esModule:true,default:props=>require('react').createElement('a',props,props.children)};";
  modules["next/navigation"] = "exports.useRouter=()=>({push:url=>window.redirects.push(url)});";
  modules["@/components/layout/LocaleProvider"] = "exports.useLocale=()=>({t:{}});";
  function add(name: string, file: string) {
    if (Object.hasOwn(modules, name)) return;
    modules[name] = "";
    const raw = readFileSync(file, "utf8");
    let compiled = /\.tsx?$/.test(file) ? ts.transpileModule(raw, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText : raw;
    compiled = compiled.replace(/require\("([^"]+)"\)/g, (_call, dependency: string) => {
      if (Object.hasOwn(modules, dependency)) return `require(${JSON.stringify(dependency)})`;
      const location = dependency.startsWith("@/") ? `src/${dependency.slice(2)}` : dependency.startsWith(".") ? posix.normalize(posix.join(posix.dirname(file), dependency)) : relative(process.cwd(), require.resolve(dependency, { paths: [dirname(`${process.cwd()}/${file}`)] })).replaceAll("\\", "/");
      const resolved = [location, `${location}.ts`, `${location}.tsx`, `${location}/index.ts`, `${location}/index.js`].find((path) => existsSync(path) && statSync(path).isFile());
      assert.ok(resolved, `unexpected fixture dependency: ${dependency}`);
      const id = `file:${resolved}`;
      add(id, resolved);
      return `require(${JSON.stringify(id)})`;
    });
    modules[name] = compiled;
  }
  add("alert", "src/components/results/CarPriceAlertControl.tsx");
  browserBundle = `const registry={${Object.entries(modules).map(([name, code]) => `${JSON.stringify(name)}:function(require,module,exports){${code}\n}`).join(",")}},cache={};function require(name){if(cache[name])return cache[name].exports;if(!registry[name])throw Error(name);const module={exports:{}};cache[name]=module;registry[name](require,module,module.exports);return module.exports;}`;
  return browserBundle;
}

async function withAlertBrowser(run: (page: import("playwright").Page, errors: string[]) => Promise<void>) {
  const { chromium } = createRequire(import.meta.url)("playwright") as typeof import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route("**/*", (request) => request.abort());
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: alertBrowserBundle() + `
      const React=require('react'),{createRoot}=require('react-dom/client'),{flushSync}=require('react-dom'),{CarPriceAlertControl}=require('alert');
      window.calls=[];window.redirects=[];window.queue=[];window.deferred={};
      const search={pickupLocation:'Fixture',pickupDate:'2026-11-15',dropoffDate:'2026-11-19',pickupTime:'10:00',dropoffTime:'10:00',driverAge:'30'};
      window.offer=id=>({id,bookingProviderName:'Seller '+id,rentalCompanyName:'Rental',totalPrice:110,pricePerDay:27.5,currency:'USD'});
      window.alert=(status='ACTIVE',offerId='a')=>({id:'alert-'+offerId,type:'CAR',mode:'AUTOMATIC',status,query:{...search,dropoffLocation:'Fixture',offer:{resultId:'car-a',offerId,providerName:'Seller '+offerId}}});
      window.fetch=async(url,options={})=>{const method=options.method||'GET';window.calls.push({url,method,body:options.body?JSON.parse(options.body):null});const next=window.queue.shift();if(!next)throw Error('Unexpected request: '+method+' '+url);if(next.method&&next.method!==method)throw Error('Unexpected method');if(next.reject)throw new TypeError('Fixture network failure');if(next.defer)return new Promise(resolve=>window.deferred[next.defer]=resolve);if(next.deferJson)return {ok:true,status:200,json:()=>new Promise(resolve=>window.deferred[next.deferJson]=resolve)};return new Response(next.invalidJson?'not-json':JSON.stringify(next.body||{}),{status:next.status||200,headers:{'Content-Type':'application/json'}});};
      const root=createRoot(document.getElementById('root'));window.mount=(id='a')=>flushSync(()=>root.render(React.createElement(CarPriceAlertControl,{search,car:{id:'car-a'},offer:window.offer(id)})));window.unmount=()=>flushSync(()=>root.render(null));
    ` });
    await run(page, errors);
  } finally { await browser.close(); }
}

test("Cars Rate details creates an automatic alert for the selected offer", () => {
  assert.match(source, /buildAutomaticCarPriceAlertPayload\(search, baseline\.totalPrice, baseline\.currency, scope\)/);
  assert.match(source, /matchingAutomaticCarPriceAlert\(data\.alerts \?\? \[\], search, scope\)/);
  assert.match(source, /method: "PATCH"/);
  assert.match(source, /response\.status === 409/);
  assert.match(source, /response\.status === 401/);
  assert.match(source, /role="switch"/);
  assert.match(source, /aria-checked=\{tracking\}/);
  assert.match(source, /resultId: car\.id/);
  assert.match(source, /offerId: offer\.id/);
  assert.doesNotMatch(source, /buildCarPriceAlertPayload|Target rental total|inputMode="decimal"/);
});

test("offer alert submits optimistically with accessible confirmation and no loading spinner", () => {
  assert.doesNotMatch(source, /LoaderCircle|animate-spin|w-5 justify-center/);
  assert.match(source, /pendingRef\.current/);
  assert.match(source, /optimisticTracking/);
  assert.match(source, /flex min-h-11 w-full min-w-0 items-center gap-2/);
  assert.match(source, /CAR_PRICE_ALERT_SNACKBAR_DURATION_MS = 3_600/);
  assert.match(source, /window\.clearTimeout\(leave\)/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /href="\/price-alerts"/);
});

test("Cars price tracking snackbar matches the compact native presentation", () => {
  assert.match(source, /fixed bottom-\[calc\(max\(env\(safe-area-inset-bottom\),12px\)\+12px\)\] left-4 right-4/);
  assert.match(source, /max-w-md items-center gap-2\.5 rounded-\[14px\]/);
  assert.match(source, /border-\[0\.5px\] border-\[#C8DFF7\] bg-\[#EDF6FF\]/);
  assert.match(source, /px-\[13px\] py-\[11px\]/);
  assert.match(source, /shadow-\[0_4px_16px_rgba\(15,23,42,0\.16\)\]/);
  assert.match(source, /CheckCircle2 className="h-5 w-5 shrink-0 text-\[#1769AA\]"/);
  assert.match(source, /text-\[14px\] font-bold leading-\[19px\]/);
  assert.match(source, /text-\[12\.5px\] leading-\[17px\]/);
  assert.match(source, /min-h-11 shrink-0 items-center px-1 text-\[13\.5px\] font-bold text-\[#1769AA\]/);
  assert.doesNotMatch(source, /border-slate-200 bg-white|border-slate-300\/80 bg-white/);
});

test("Cars price tracking snackbar renders complete on and off content and action", () => {
  assert.match(source, /carsResults\.priceTracking\.inactive/);
  assert.match(source, /carsResults\.priceTracking\.inactiveBody/);
  assert.match(source, /<Link href="\/price-alerts"/);
  assert.doesNotMatch(source, /min-h-\[(?:7[0-9]|[89][0-9])px\]/);
});

test("Cars price tracking snackbar defines enter, exit, and reduced-motion behavior", () => {
  assert.match(source, /cars-price-alert-snackbar-leaving/);
  assert.match(source, /cars-price-alert-snackbar-entering/);
  assert.match(globals, /cars-price-alert-snackbar-rise[\s\S]*translate3d\(0, 10px, 0\)[\s\S]*200ms/);
  assert.match(globals, /cars-price-alert-snackbar-fade-in[\s\S]*160ms/);
  assert.match(globals, /cars-price-alert-snackbar-settle[\s\S]*translate3d\(0, 8px, 0\)[\s\S]*180ms/);
  assert.match(globals, /cars-price-alert-snackbar-fade-out[\s\S]*160ms/);
  assert.match(globals, /prefers-reduced-motion: reduce[\s\S]*cars-price-alert-snackbar-entering,[\s\S]*cars-price-alert-snackbar-leaving \{ animation: none; \}/);
});

test("Cars tracking appears only inside Rate details on phone and desktop", () => {
  const picker = readFileSync(new URL("./CarDealPicker.tsx", import.meta.url), "utf8");
  const results = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
  assert.match(picker, /data-car-rate-provider-alert-row/);
  assert.match(picker, /Booking provider · \{selectedGroup\.providerName\}/);
  assert.match(picker, /<CarPriceAlertControl key=\{car\.id \+ ":" \+ selectedOffer\.id\} search=\{search\} car=\{car\} offer=\{selectedOffer\} \/>/);
  assert.doesNotMatch(results, /<CarPriceAlertControl|data-cars-price-alert-sidebar-slot/);
  assert.doesNotMatch(source, /desktopPortalTarget|createPortal|matchMedia/);
  assert.match(source, /data-cars-price-alert/);
  assert.match(source, /\{t\("carsResults\.priceTracking\.title"\)\}<\/span>/);
  assert.equal((source.match(/role="switch"/g) ?? []).length, 1);
  assert.equal((source.match(/fetch\("\/api\/price-alerts"/g) ?? []).length, 2);
});

test("Cars rate-details toggle preserves the accessible 44px touch target and 24px track", () => {
  assert.match(source, /className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full/);
  assert.match(source, /aria-hidden="true" className=\{`relative inline-flex h-6 w-11/);
  assert.match(source, /h-\[18px\] w-\[18px\] rounded-full/);
  assert.match(source, /translate-x-\[23px\] rtl:-translate-x-\[23px\]/);
  assert.match(source, /translate-x-\[3px\] rtl:-translate-x-\[3px\]/);
  assert.match(source, /aria-checked=\{tracking\} aria-busy=\{pending\} disabled=\{disabled\}/);
  assert.match(source, /onClick=\{\(\) => void toggle\(!tracking\)\}/);
});

test("mobile web and desktop restore one softly tinted offer-rate tracking bar", () => {
  assert.match(source, /mt-2 flex w-full min-w-0 items-center rounded-xl border border-\[#CFE0F8\] bg-\[#EEF6FF\]/);
  assert.match(source, /min-w-0 flex-1 text-\[13px\] font-semibold leading-\[18px\]/);
  assert.match(source, /className="relative inline-flex h-11 w-11/);
  assert.doesNotMatch(source, /desktopPortalTarget|sm:rounded-2xl|lg:rounded-xl/);
});

test("Cars rate alerts display Track car prices with an offer-specific accessible name", () => {
  const english = readFileSync(new URL("../../lib/i18n/en.ts", import.meta.url), "utf8");
  assert.match(english, /"carsResults\.priceTracking\.title": "Track car prices"/);
  assert.match(source, /<span className="min-w-0 flex-1 text-\[13px\][^>]*>\{t\("carsResults\.priceTracking\.title"\)\}<\/span>/);
  const component = ts.createSourceFile("CarPriceAlertControl.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const switches: ts.JsxOpeningElement[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(component) === "button" && node.attributes.properties.some((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(component) === "role" && attribute.initializer && ts.isStringLiteral(attribute.initializer) && attribute.initializer.text === "switch")) switches.push(node);
    ts.forEachChild(node, visit);
  }
  visit(component);
  assert.equal(switches.length, 1);
  const attributeExpression = (name: string) => {
    const attribute = switches[0].attributes.properties.find((item) => ts.isJsxAttribute(item) && item.name.getText(component) === name);
    assert.ok(attribute && ts.isJsxAttribute(attribute) && attribute.initializer && ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression);
    return attribute.initializer.expression.getText(component);
  };
  for (const providerName of ["Fixture Seller", "Other $ Seller"]) {
    const translated = "Suivre les prix des voitures";
    const label = runInNewContext(attributeExpression("aria-label"), {
      t: (key: string) => { assert.equal(key, "carsResults.priceTracking.title"); return translated; },
      scope: { providerName },
    });
    assert.equal(label, `${translated} for ${providerName} offer`);
  }
  assert.equal(attributeExpression("aria-checked"), "tracking");
  assert.equal(attributeExpression("aria-busy"), "pending");
  assert.equal(attributeExpression("disabled"), "disabled");
});

test("Cars price tracking failures use an accessible blocking dialog", () => {
  assert.match(source, /role="alertdialog" aria-modal="true"/);
  assert.match(source, /aria-labelledby="cars-price-alert-error-title"/);
  assert.match(source, /aria-describedby="cars-price-alert-error-body"/);
  assert.match(source, /carsResults\.priceTracking\.cancel/);
  assert.match(source, /carsResults\.priceTracking\.retry/);
  assert.doesNotMatch(source, /type SuccessFeedback =[^;]*error-/);
});

test("failed Cars alert lookups stay unavailable and retry only the current lookup", async () => {
  await withAlertBrowser(async (page, errors) => {
    for (const failure of [{ reject: true }, { invalidJson: true }, { status: 503 }, { body: {} }]) {
      await page.evaluate((failure) => { Object.assign(window, { queue: [failure], calls: [] }); }, failure);
      await page.evaluate("window.mount()");
      await page.waitForFunction("window.calls.length===1");
      await page.waitForTimeout(50);
      assert.deepEqual(errors, [], "lookup rejection must be handled inside the component");
      assert.ok(await page.locator('[role="switch"]').isDisabled());
      const error = page.locator('[role="alert"]');
      assert.match(await error.textContent() ?? "", /could not load your alerts/i);
      assert.equal(await page.locator('[role="switch"]').getAttribute("aria-busy"), "false");
      await page.evaluate("window.queue.push({defer:'retry'})");
      await error.getByRole("button", { name: "Try again" }).click();
      assert.ok(await page.locator('[role="switch"]').isDisabled());
      assert.equal(await page.locator('[role="switch"]').getAttribute("aria-busy"), "true");
      await page.evaluate("window.deferred.retry(new Response(JSON.stringify({alerts:[]})))");
      await page.waitForFunction("!document.querySelector('[role=switch]').disabled");
      assert.equal(await page.locator('[role="switch"]').getAttribute("aria-checked"), "false");
      assert.equal(await page.locator('[role="alert"]').count(), 0);
      assert.deepEqual(await page.evaluate("window.calls.map(c=>c.method)"), ["GET", "GET"]);
      await page.evaluate("window.unmount()");
    }
  });
});

test("Cars alert lookup preserves empty, active, paused, scope and mutation behavior", async () => {
  await withAlertBrowser(async (page, errors) => {
    for (const status of ["empty", "ACTIVE", "PAUSED", "other-offer"]) {
      await page.evaluate((status) => { Object.assign(window, { scenario: status }); }, status);
      await page.evaluate("window.queue=[{body:{alerts:window.scenario==='empty'?[]:[window.alert(window.scenario==='PAUSED'?'PAUSED':'ACTIVE',window.scenario==='other-offer'?'b':'a')]}}];window.mount()");
      await page.waitForFunction("!document.querySelector('[role=switch]').disabled");
      assert.equal(await page.locator('[role="switch"]').getAttribute("aria-checked"), status === "ACTIVE" ? "true" : "false");
      assert.equal(await page.locator('[role="switch"]').getAttribute("aria-label"), "Track car prices for Seller a offer");
      await page.evaluate("window.unmount()");
    }
    await page.evaluate("window.calls=[];window.queue=[{body:{alerts:[]}},{method:'POST',body:{alert:window.alert()}},{method:'PATCH',body:{alert:window.alert('PAUSED')}},{method:'PATCH',body:{alert:window.alert()}}];window.mount()");
    await page.waitForFunction("!document.querySelector('[role=switch]').disabled");
    for (const expected of ["true", "false", "true"]) {
      await page.locator('[role="switch"]').click();
      await page.waitForFunction("document.querySelector('[role=switch]').getAttribute('aria-busy')==='false'");
      assert.equal(await page.locator('[role="switch"]').getAttribute("aria-checked"), expected);
    }
    const calls = await page.evaluate("window.calls") as Array<{ method: string; body: { query: { offer: { resultId: string; offerId: string; providerName: string } }; baselinePrice: number; currency: string; status: string } }>;
    assert.deepEqual(calls.map((call: { method: string }) => call.method), ["GET", "POST", "PATCH", "PATCH"]);
    assert.deepEqual(calls[1].body.query.offer, { resultId: "car-a", offerId: "a", providerName: "Seller a" });
    assert.equal(calls[1].body.baselinePrice, 110);
    assert.equal(calls[1].body.currency, "USD");
    assert.deepEqual(calls.slice(2).map((call: { body: { status: string } }) => call.body.status), ["PAUSED", "ACTIVE"]);
    assert.deepEqual(errors, []);
  });
});

test("Cars alert authentication is distinct from a confirmed empty lookup", async () => {
  await withAlertBrowser(async (page, errors) => {
    await page.evaluate("window.queue=[{status:401}];window.mount()");
    await page.waitForFunction("window.calls.length===1");
    await page.waitForTimeout(50);
    assert.ok(await page.locator('[role="switch"]').isDisabled());
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    assert.match(await page.evaluate("window.redirects[0]"), /^\/auth\/signin\?callbackUrl=/);
    assert.deepEqual(await page.evaluate("window.calls.map(c=>c.method)"), ["GET"]);
    for (const method of ["POST", "PATCH"]) {
      await page.evaluate("window.unmount()");
      await page.evaluate((method) => { Object.assign(window, { method }); }, method);
      await page.evaluate("window.redirects=[];window.queue=[{body:{alerts:window.method==='PATCH'?[window.alert()]:[]}},{status:401}];window.mount()");
      await page.waitForFunction("!document.querySelector('[role=switch]').disabled");
      await page.locator('[role="switch"]').click();
      await page.waitForFunction("window.redirects.length===1");
      assert.match(await page.evaluate("window.redirects[0]"), /^\/auth\/signin\?callbackUrl=/);
    }
    assert.deepEqual(errors, []);
  });
});

test("Cars alert reconciliation rejects late prior-offer responses and unmounted work", async () => {
  await withAlertBrowser(async (page, errors) => {
    for (const deferred of ["defer", "deferJson"]) {
      await page.evaluate((deferred) => { Object.assign(window, { deferKind: deferred }); }, deferred);
      await page.evaluate("window.queue=[{[window.deferredName=window.deferKind==='defer'?'defer':'deferJson']:'old'},{body:{alerts:[]}}];window.mount('a')");
      await page.waitForFunction("typeof window.deferred.old==='function'");
      await page.evaluate("window.mount('b')");
      await page.waitForFunction("!document.querySelector('[role=switch]').disabled");
      await page.evaluate("window.deferred.old(window.deferredName==='defer'?new Response(JSON.stringify({alerts:[window.alert()]})):{alerts:[window.alert()]})");
      await page.waitForTimeout(50);
      assert.equal(await page.locator('[role="switch"]').getAttribute("aria-label"), "Track car prices for Seller b offer");
      assert.equal(await page.locator('[role="switch"]').getAttribute("aria-checked"), "false");
      assert.ok(!(await page.locator('[role="switch"]').isDisabled()), "late prior-offer work cannot replace current successful lookup state");
      await page.evaluate("window.unmount()");
    }
    await page.evaluate("window.queue=[{defer:'unmounted'}];window.mount()");
    await page.waitForFunction("typeof window.deferred.unmounted==='function'");
    await page.evaluate("window.unmount();window.deferred.unmounted(new Response('not-json'))");
    await page.waitForTimeout(50);
    assert.equal(await page.locator('[role="switch"]').count(), 0);
    assert.deepEqual(errors, []);
    await page.evaluate("window.queue=[{reject:true}];window.mount('a')");
    await page.getByRole("alert").waitFor();
    await page.evaluate("window.queue=[{reject:true}];window.mount('b')");
    await page.getByRole("alert").waitFor();
    await page.evaluate("window.queue=[{body:{alerts:[window.alert('ACTIVE','b')]}}]");
    await page.getByRole("alert").getByRole("button", { name: "Try again" }).click();
    await page.waitForFunction("!document.querySelector('[role=switch]').disabled");
    assert.equal(await page.locator('[role="switch"]').getAttribute("aria-checked"), "true");
    assert.deepEqual(errors, []);
  });
});

test("Cars alert mutation failures and 409 recovery remain scoped after lookup", async () => {
  await withAlertBrowser(async (page, errors) => {
    for (const status of ["POST", "PATCH", "409-active", "409-paused", "409-wrong-offer"]) {
      await page.evaluate((status) => { Object.assign(window, { scenario: status }); }, status);
      await page.evaluate("window.calls=[];window.queue=[{body:{alerts:window.scenario==='PATCH'?[window.alert()]:[]}},window.scenario.startsWith('409')?{status:409,body:{alert:window.alert(window.scenario==='409-paused'?'PAUSED':'ACTIVE',window.scenario==='409-wrong-offer'?'b':'a')}}:{status:503},...(window.scenario==='409-paused'?[{method:'PATCH',body:{alert:window.alert()}}]:[])];window.mount()");
      await page.waitForFunction("!document.querySelector('[role=switch]').disabled");
      await page.locator('[role="switch"]').click();
      await page.waitForFunction("document.querySelector('[role=switch]').getAttribute('aria-busy')==='false'");
      const succeeded = status === "409-active" || status === "409-paused";
      assert.equal(await page.locator('[role="alertdialog"]').count(), succeeded ? 0 : 1);
      assert.equal(await page.locator('[role="switch"]').getAttribute("aria-checked"), succeeded || status === "PATCH" ? "true" : "false");
      if (status === "409-wrong-offer") assert.ok(!(await page.evaluate("window.calls.some(c=>c.method==='PATCH')")));
      if (status === "409-paused") assert.equal(await page.evaluate("window.calls.at(-1).url"), "/api/price-alerts/alert-a");
      await page.evaluate("window.unmount()");
    }
    assert.deepEqual(errors, []);
  });
});
