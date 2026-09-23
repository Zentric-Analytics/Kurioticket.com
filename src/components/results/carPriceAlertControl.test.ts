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

test("mobile Cars price tracking fills its content gutter without compromising narrow layouts", () => {
  assert.match(source, /data-cars-price-alert/);
  assert.match(source, /w-full min-w-0 max-w-full/);
  assert.match(source, /lg:w-auto/);
  assert.match(source, /bg-\[#EDF6FF\][^"]*px-3 py-0[^"]*sm:py-1/);
  assert.match(source, /min-h-\[52px\] min-w-0 items-center/);
  assert.match(source, /min-w-0 flex-1 \[overflow-wrap:anywhere\]/);
  assert.match(source, /shrink-0 items-center justify-center[^"\n]*sm:h-8 sm:w-8/);
  assert.match(source, /h-11 w-\[51px\] shrink-0 items-center/);
});


test("Cars price tracking failures use an accessible blocking dialog", () => {
  assert.match(source, /role="alertdialog" aria-modal="true"/);
  assert.match(source, /aria-labelledby="cars-price-alert-error-title"/);
  assert.match(source, /aria-describedby="cars-price-alert-error-body"/);
  assert.match(source, /carsResults\.priceTracking\.cancel/);
  assert.match(source, /carsResults\.priceTracking\.retry/);
  assert.doesNotMatch(source, /type SuccessFeedback =[^;]*error-/);
});
