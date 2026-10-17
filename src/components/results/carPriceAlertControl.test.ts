import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./CarPriceAlertControl.tsx", import.meta.url), "utf8");
const globals = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

test("Cars Results uses server-authoritative automatic price tracking", () => {
  assert.match(source, /buildAutomaticCarPriceAlertPayload\(search, baseline\.totalPrice, baseline\.currency\)/);
  assert.match(source, /matchingAutomaticCarPriceAlert/);
  assert.match(source, /method: "PATCH"/);
  assert.match(source, /response\.status === 409/);
  assert.match(source, /response\.status === 401/);
  assert.match(source, /role="switch"/);
  assert.match(source, /aria-checked=\{tracking\}/);
  assert.doesNotMatch(source, /buildCarPriceAlertPayload|Target rental total|inputMode="decimal"/);
});

test("submission is optimistic without visible loading UI and feedback remains accessible", () => {
  assert.doesNotMatch(source, /LoaderCircle|animate-spin|w-5 justify-center/);
  assert.match(source, /pendingRef\.current/);
  assert.match(source, /optimisticTracking/);
  assert.match(source, /h-11 w-\[51px\] shrink-0 items-center justify-end/);
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

test("mobile Cars stays flat while desktop spans map width and matches Flight styling", () => {
  const section = source.match(/data-cars-price-alert\s+className="([^"]+)"/)?.[1];
  assert.ok(section, "tracking section remains a scroll-indicator anchor");
  const mobileClasses = section.split(/\s+/).filter((name) => !name.includes(":"));
  assert.deepEqual(mobileClasses, ["col-start-2", "row-start-1", "mb-0", "w-auto", "min-w-0", "max-w-full", "justify-self-end", "bg-transparent", "px-0", "py-0"]);
  assert.doesNotMatch(mobileClasses.join(" "), /rounded|border|shadow|bg-\[#/);
  assert.match(section, /sm:col-span-2 sm:col-start-1 sm:row-start-1 sm:w-full sm:justify-self-center/);
  assert.match(section, /sm:rounded-2xl sm:border sm:border-blue-100 sm:bg-\[#EDF6FF\] sm:px-4 sm:py-1 sm:shadow-sm/);
  assert.match(section, /lg:col-span-1 lg:w-full lg:max-w-none lg:justify-self-stretch/);
  assert.match(source, /desktopPortalTarget\?: HTMLElement \| null/);
  assert.match(source, /matchMedia\("\(min-width: 1024px\)"\)/);
  assert.match(source, /createPortal\(trackingControl, desktopPortalTarget\)/);
  assert.match(source, /data-cars-price-alert-inline/);
  assert.equal((source.match(/role="switch"/g) ?? []).length, 1);
  assert.equal((source.match(/fetch\("\/api\/price-alerts"/g) ?? []).length, 2, "one GET reconciliation and one POST creation path");
  assert.match(section, /lg:rounded-xl lg:border-\[#CFE0F8\] lg:bg-\[#EEF6FF\] lg:px-2 lg:py-0/);
  assert.doesNotMatch(section, /lg:mx-auto|lg:w-\[calc\(100%_-_12rem\)\]/);
  assert.match(source, /sm:min-h-\[52px\] sm:justify-start sm:gap-2\.5 lg:min-h-9 lg:gap-1\.5/);
  assert.match(source, /sm:bg-blue-50 sm:text-\[#004BB8\] lg:h-6 lg:w-6/);
  assert.match(source, /sm:text-sm sm:text-slate-950 lg:overflow-hidden lg:whitespace-nowrap lg:text-\[13px\] lg:font-semibold lg:leading-4/);
  assert.match(source, /lg:h-9 lg:w-12/);
  assert.match(source, /flex min-h-11 min-w-0 items-center justify-end gap-1\.5 max-\[359px\]:gap-1 sm:min-h-\[52px\] sm:justify-start sm:gap-2\.5/);
  assert.match(source, /min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-\[12px\] font-semibold leading-\[17px\] text-\[#07133B\]/);
  assert.match(source, /max-\[359px\]:text-\[10\.5px\] sm:flex-1 sm:overflow-visible sm:whitespace-normal/);
  assert.match(source, /h-4 w-4 max-\[359px\]:h-\[15px\] max-\[359px\]:w-\[15px\] sm:h-\[17px\] sm:w-\[17px\]/);
  assert.match(source, /h-11 w-\[51px\] shrink-0 items-center/);
  assert.match(source, /className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full[^"]*sm:w-12 lg:h-9"/);
  assert.match(source, /aria-hidden="true" className=\{`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors sm:h-7 sm:w-12/);
  assert.match(source, /h-\[18px\] w-\[18px\] rounded-full bg-white shadow transition-transform sm:h-5 sm:w-5/);
  assert.match(source, /translate-x-\[23px\] rtl:-translate-x-\[23px\] sm:translate-x-\[22px\] sm:rtl:-translate-x-\[22px\]/);
  assert.match(source, /translate-x-\[3px\] rtl:-translate-x-\[3px\]/);
  assert.match(source, /role="switch" aria-checked=\{tracking\}/);
  assert.match(source, /onClick=\{\(\) => void toggle\(!tracking\)\}/);
});

test("mobile Cars switch has a 44px visual track, 24px height, 18px thumb, and full 44px hit target", () => {
  const mobile = { trackWidth: 44, trackHeight: 24, thumbSize: 18, offOffset: 3, onOffset: 23 };
  assert.equal((mobile.trackHeight - mobile.thumbSize) / 2, 3);
  assert.equal(mobile.trackWidth - mobile.thumbSize - mobile.onOffset, 3);
  assert.equal(mobile.offOffset, 3);
  assert.match(source, /flex h-11 w-\[51px\] shrink-0 items-center justify-end/);
  assert.match(source, /<button ref=\{switchRef\} type="button" role="switch"/);
  assert.match(source, /className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full[^"]*sm:w-12 lg:h-9"/);
  assert.match(source, /aria-hidden="true" className=\{`relative inline-flex h-6 w-11[^}]*sm:h-7 sm:w-12 lg:h-6 lg:w-11/);
  assert.match(source, /h-\[18px\] w-\[18px\][^}]*sm:h-5 sm:w-5/);
  assert.match(source, /tracking \? "translate-x-\[23px\] rtl:-translate-x-\[23px\] sm:translate-x-\[22px\] sm:rtl:-translate-x-\[22px\] lg:translate-x-5 lg:rtl:-translate-x-5"/);
  assert.match(source, /: "translate-x-\[3px\] rtl:-translate-x-\[3px\] lg:translate-x-0\.5 lg:rtl:-translate-x-0\.5"/);
  assert.equal((source.match(/role="switch"/g) ?? []).length, 1);
  assert.match(source, /aria-checked=\{tracking\} aria-busy=\{pending\} disabled=\{disabled\}/);
  assert.match(source, /onClick=\{\(\) => void toggle\(!tracking\)\}/);
});

test("desktop Cars copies the Flight price switch visual size and surface without shrinking mobile targets", () => {
  const flight = readFileSync(new URL("./FlightPriceAlertControl.tsx", import.meta.url), "utf8");
  assert.match(flight, /surface === "desktop" \? "h-6 w-11" : "h-7 w-12"/);
  assert.match(flight, /surface === "desktop" \? "h-5 w-5" : "h-6 w-6"/);
  assert.match(flight, /border-\[#CFE0F8\] bg-\[#EEF6FF\]/);
  assert.match(source, /sm:h-7 sm:w-12 lg:h-6 lg:w-11/);
  assert.match(source, /h-\[18px\] w-\[18px\][^}]*sm:h-5 sm:w-5/);
  assert.match(source, /lg:translate-x-5 lg:rtl:-translate-x-5/);
  assert.match(source, /lg:translate-x-0\.5 lg:rtl:-translate-x-0\.5/);
  assert.match(source, /className="relative inline-flex h-11 w-11[^"]*sm:w-12 lg:h-9"/);
  assert.match(source, /onClick=\{\(\) => void toggle\(!tracking\)\}/);
});

test("Cars tracking title and accessible control use the shortened shared translation", () => {
  const english = readFileSync(new URL("../../lib/i18n/en.ts", import.meta.url), "utf8");
  assert.match(english, /"carsResults\.priceTracking\.title": "Track car prices"/);
  assert.match(source, /aria-label=\{t\("carsResults\.priceTracking\.title"\)\}/);
  assert.match(source, /<h2 className="[^"]*"[^>]*>\{t\("carsResults\.priceTracking\.title"\)\}<\/h2>/);
  assert.match(source, /role="switch"[^>]*aria-label=\{t\("carsResults\.priceTracking\.title"\)\}/);
});

test("Cars price tracking failures use an accessible blocking dialog", () => {
  assert.match(source, /role="alertdialog" aria-modal="true"/);
  assert.match(source, /aria-labelledby="cars-price-alert-error-title"/);
  assert.match(source, /aria-describedby="cars-price-alert-error-body"/);
  assert.match(source, /carsResults\.priceTracking\.cancel/);
  assert.match(source, /carsResults\.priceTracking\.retry/);
  assert.doesNotMatch(source, /type SuccessFeedback =[^;]*error-/);
});
