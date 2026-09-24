import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const client = readFileSync(
  new URL("../CarDetailsClient.tsx", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const hero = readFileSync(
  new URL("./CarDetailsHero.tsx", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const nav = readFileSync(
  new URL("./CarDetailsSectionNav.tsx", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const css = readFileSync(
  new URL("../../../app/globals.css", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");

test("mobile vehicle identity and specification typography mirrors native", () => {
  assert.match(
    client,
    /text-\[22px\] font-extrabold leading-7 tracking-\[-0\.5px\] text-\[#071A48\]/,
  );
  assert.match(
    client,
    /text-sm font-semibold leading-5 tracking-normal text-\[#56658E\]/,
  );
  assert.match(
    client,
    /text-\[10px\] font-bold uppercase leading-\[14px\] tracking-\[\.14em\]/,
  );
  assert.match(
    hero,
    /text-xs font-semibold leading-\[18px\] text-slate-700/,
  );
});

test("mobile tabs use native responsive sizes and native selected color", () => {
  assert.match(
    nav,
    /text-\[12px\] font-semibold leading-\[18px\][^"]*min-\[390px\]:text-\[13px\][^"]*lg:text-sm lg:font-bold lg:leading-normal/,
  );
  assert.match(nav, /whitespace-nowrap/);
  assert.match(nav, /text-\[#075EE8\] lg:text-blue/);
  assert.match(nav, /bg-\[#075EE8\][^"]*lg:bg-blue/);
});

test("mobile comparison typography retains the native compact hierarchy", () => {
  assert.match(
    client,
    /text-xs font-bold leading-\[18px\] tracking-\[-0\.2px\] text-slate-950/,
  );
  assert.match(
    client,
    /text-\[11px\] font-medium leading-4 text-slate-600/,
  );
  assert.match(
    client,
    /text-\[10\.5px\] font-semibold leading-\[15px\]/,
  );
  assert.match(
    client,
    /text-\[19px\] font-semibold leading-\[22px\] tracking-\[-0\.015em\] text-\[#071A48\][^"]*tabular-nums/,
  );
  assert.match(
    client,
    /text-\[10px\] font-medium leading-\[13px\] text-\[#075EE8\]/,
  );
});

test("pickup and return uses native timeline, copy, and requirement typography", () => {
  assert.match(
    client,
    /text-xs font-bold leading-\[18px\] tracking-\[-0\.2px\] text-\[#020617\]/,
  );
  assert.match(
    client,
    /text-\[15px\] font-bold leading-\[22px\] text-\[#071A48\][^"]*lg:text-base/,
  );
  assert.match(
    client,
    /text-\[14px\] font-medium leading-5 text-\[#071A48\][^"]*lg:text-sm lg:font-normal/,
  );
  assert.match(
    client,
    /text-\[13px\] font-normal leading-5 text-\[#56658E\] lg:text-sm/,
  );
  assert.match(client, /"Pick-up",[\s\S]*?copy\("carDetails\.pickup"\)/);
  assert.match(client, /Pickup requirements/);
  assert.match(
    client,
    /text-\[14px\] font-bold leading-5 text-\[#071A48\][^"]*lg:text-base/,
  );
  assert.match(
    client,
    /text-\[14px\] font-medium leading-5 text-\[#071A48\][^"]*lg:text-sm/,
  );
  assert.match(
    client,
    /mt-4 hidden text-sm font-medium leading-5 lg:block/,
  );
  assert.match(
    client,
    /mt-2 hidden text-sm font-normal leading-5 lg:block/,
  );
});

test("location identity, timeline, directions, and body typography mirror native", () => {
  assert.match(
    client,
    /text-\[13px\] font-semibold leading-5 text-slate-800/,
  );
  assert.match(client, /text-xs leading-5 text-slate-500/);
  assert.match(
    client,
    /text-sm font-bold text-\[#075EE8\][^"]*lg:text-blue/,
  );
  assert.match(
    client,
    /text-\[15px\] font-bold leading-\[22px\] text-\[#071A48\][^"]*lg:uppercase/,
  );
  assert.match(
    client,
    /text-\[14px\] font-medium leading-5 text-\[#071A48\]/,
  );
  assert.match(
    client,
    /text-\[13px\] font-normal leading-5 text-\[#56658E\]/,
  );
  assert.match(
    client,
    /text-\[14px\] font-bold leading-5 text-\[#071A48\] lg:text-base/,
  );
  assert.match(
    client,
    /text-\[14px\] font-normal leading-5 text-\[#334155\][^"]*lg:leading-6/,
  );
});

test("mobile booking dock uses native typography and copy", () => {
  const dock = client.slice(client.indexOf("function MobileBookingDock"));
  assert.match(
    dock,
    /text-\[19px\] font-semibold leading-\[22px\] tracking-\[-0\.25px\] text-\[#071A48\][^"]*tabular-nums/,
  );
  assert.doesNotMatch(dock, /text-\[clamp\(/);
  assert.match(
    dock,
    /text-\[11px\] font-semibold leading-4 text-\[#56658E\]/,
  );
  assert.match(dock, /Estimated rental total/);
  assert.match(dock, /text-xs font-bold leading-4 text-white/);
});

test("Safari cannot inflate Cars Details mobile text beyond native sizes", () => {
  assert.match(
    css,
    /@media \(max-width: 1023px\) \{ \[data-car-details-experience\] \{ -webkit-text-size-adjust: 100%; text-size-adjust: 100%; \} \}/,
  );
});

test("desktop Cars Details typography overrides remain intact", () => {
  assert.match(
    client,
    /lg:text-xl lg:font-extrabold lg:leading-normal lg:tracking-tight/,
  );
  assert.match(
    client,
    /lg:text-base lg:font-semibold lg:leading-normal/,
  );
  assert.match(client, /lg:text-base lg:leading-normal/);
  assert.match(nav, /lg:text-sm lg:font-bold lg:leading-normal/);
});
