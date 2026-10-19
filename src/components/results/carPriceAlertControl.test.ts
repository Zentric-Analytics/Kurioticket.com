import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./CarPriceAlertControl.tsx", import.meta.url), "utf8");
const globals = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

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
  assert.match(source, /flex min-h-11 min-w-0 items-center gap-1/);
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

test("mobile web and desktop use a compact tinted right-side offer tracking pill", () => {
  assert.match(source, /inline-flex w-fit max-w-full shrink-0 items-center rounded-\[10px\] border border-\[#CFE0F8\] bg-\[#EEF6FF\]/);
  assert.match(source, /whitespace-nowrap text-\[11px\] font-semibold leading-4/);
  assert.match(source, /className="relative inline-flex h-11 w-11/);
  assert.doesNotMatch(source, /desktopPortalTarget|sm:rounded-2xl|lg:rounded-xl/);
});

test("Cars rate alerts display Track car prices with an offer-specific accessible name", () => {
  const english = readFileSync(new URL("../../lib/i18n/en.ts", import.meta.url), "utf8");
  assert.match(english, /"carsResults\.priceTracking\.title": "Track car prices"/);
  assert.match(source, /<span className="whitespace-nowrap text-\[11px\][^>]*>\{t\("carsResults\.priceTracking\.title"\)\}<\/span>/);
  assert.match(source, /aria-label=\{`${t\("carsResults\.priceTracking\.title"\)\} for $\{scope\.providerName\} offer`\}/);
});

test("Cars price tracking failures use an accessible blocking dialog", () => {
  assert.match(source, /role="alertdialog" aria-modal="true"/);
  assert.match(source, /aria-labelledby="cars-price-alert-error-title"/);
  assert.match(source, /aria-describedby="cars-price-alert-error-body"/);
  assert.match(source, /carsResults\.priceTracking\.cancel/);
  assert.match(source, /carsResults\.priceTracking\.retry/);
  assert.doesNotMatch(source, /type SuccessFeedback =[^;]*error-/);
});
