import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const client = readFileSync(
  new URL("../CarDetailsClient.tsx", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const hero = readFileSync(new URL("./CarDetailsHero.tsx", import.meta.url), "utf8").replace(
  /\s+/g,
  " ",
);
const nav = readFileSync(
  new URL("./CarDetailsSectionNav.tsx", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");

test("mobile vehicle identity and specification typography mirrors native", () => {
  assert.match(client, /text-\[22px\] font-extrabold leading-7 tracking-\[-0\.5px\]/);
  assert.match(client, /text-sm font-semibold leading-5 tracking-normal text-slate-500/);
  assert.match(client, /text-\[10px\] font-bold uppercase leading-\[14px\] tracking-\[\.14em\]/);
  assert.match(hero, /text-xs font-semibold leading-\[18px\] text-slate-700/);
});

test("mobile tabs use native responsive sizes while retaining desktop typography", () => {
  assert.match(
    nav,
    /text-\[12px\] font-semibold leading-\[18px\][^\"]*min-\[390px\]:text-\[13px\][^\"]*lg:text-sm lg:font-bold lg:leading-normal/,
  );
  assert.match(nav, /whitespace-nowrap/);
});

test("mobile comparison typography retains the native compact hierarchy", () => {
  assert.match(client, /text-xs font-bold leading-\[18px\] tracking-\[-0\.2px\] text-slate-950/);
  assert.match(client, /text-\[11px\] font-medium leading-4 text-slate-600/);
  assert.match(client, /text-\[10\.5px\] font-semibold leading-\[15px\]/);
  assert.match(client, /text-\[19px\] font-semibold leading-\[22px\] tracking-\[-0\.015em\][^\"]*tabular-nums/);
  assert.match(client, /text-\[10px\] font-medium leading-\[13px\] text-\[#075EE8\]/);
});

test("pickup and return uses native timeline and requirement typography", () => {
  assert.match(client, /text-xs font-bold leading-\[18px\] tracking-\[-0\.2px\] text-\[#102A43\]/);
  assert.match(client, /text-\[15px\] font-bold leading-\[22px\] lg:text-base/);
  assert.match(client, /text-\[14px\] font-medium leading-5 lg:text-sm lg:font-normal/);
  assert.match(client, /text-\[13px\] font-normal leading-5 text-slate-600 lg:text-sm/);
  assert.match(client, /Pickup requirements/);
  assert.match(client, /text-\[14px\] font-bold leading-5 lg:text-base/);
  assert.match(client, /text-\[14px\] font-medium leading-5 lg:text-sm/);
  assert.match(client, /text-sm font-normal leading-5 lg:leading-normal/);
});

test("location identity, timeline, directions, and body typography mirror native", () => {
  assert.match(client, /text-\[13px\] font-semibold leading-5 text-slate-800/);
  assert.match(client, /text-xs leading-5 text-slate-500/);
  assert.match(client, /text-sm font-bold text-blue/);
  assert.match(client, /text-\[15px\] font-bold leading-\[22px\] text-slate-900[^\"]*lg:uppercase/);
  assert.match(client, /text-\[14px\] font-medium leading-5 text-slate-900/);
  assert.match(client, /text-\[13px\] font-normal leading-5 text-slate-600/);
  assert.match(client, /text-\[14px\] font-bold leading-5 text-slate-950 lg:text-base/);
  assert.match(client, /text-sm leading-5 text-slate-700 lg:leading-6/);
});

test("mobile booking dock uses native typography without an oversized clamp", () => {
  const dock = client.slice(client.indexOf("function MobileBookingDock"));
  assert.match(
    dock,
    /text-\[19px\] font-semibold leading-\[22px\] tracking-\[-0\.25px\][^\"]*tabular-nums/,
  );
  assert.doesNotMatch(dock, /text-\[clamp\(/);
  assert.match(dock, /text-\[11px\] font-semibold leading-4 text-slate-600/);
  assert.match(dock, /text-xs font-bold leading-4 text-white/);
});

test("desktop Cars Details typography overrides remain intact", () => {
  assert.match(client, /lg:text-xl lg:font-extrabold lg:leading-normal lg:tracking-tight/);
  assert.match(client, /lg:text-base lg:font-semibold lg:leading-normal/);
  assert.match(client, /lg:text-base lg:leading-normal/);
  assert.match(nav, /lg:text-sm lg:font-bold lg:leading-normal/);
});
