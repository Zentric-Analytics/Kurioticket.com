import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { readKayakOffer, saveKayakOffer } from "./kayakOfferStorage";

const clickout = "https://affiliates.kayak.com/sandbox-clickout";
const offer = {id:"safe-offer",title:"Test offer",description:"Supplied by KAYAK",details:["Detail"],price:100,currency:"USD",priceBasis:"total",testUrl:clickout};

test("normal KAYAK results use regular cards with compact labels and details actions", () => {
  const source = readFileSync("src/components/results/KayakResultCard.tsx", "utf8");
  assert.match(source, /providerLabel="KAYAK sandbox · Not bookable"/);
  assert.match(source, /actionLabel="View flight"/);
  assert.match(source, /actionLabel="View hotel"/);
  assert.match(source, /actionLabel="View car"/);
  assert.doesNotMatch(source, /Sandbox only|Simulated/);
  assert.doesNotMatch(source, /Open KAYAK test page/);
});

test("normal metasearch hides the page-level provider panel", () => {
  const source = readFileSync("src/components/results/KayakMetasearchClient.tsx", "utf8");
  assert.match(source, /children \? <>\{destinationChoices\}\{children\}<\/>/);
});

test("the details page keeps the approved sandbox link away from result cards", () => {
  const source = readFileSync("src/app/sandbox/kayak/details/KayakSandboxDetails.tsx", "utf8");
  assert.match(source, /KAYAK sandbox · Not bookable/);
  assert.match(source, /Open KAYAK test page/);
  assert.match(source, /rel="noopener noreferrer"/);
  assert.match(source, /referrerPolicy="no-referrer"/);
});

test("stored offers revalidate the approved sandbox URL and expire", () => {
  const values = new Map<string,string>();
  const storage: Storage = {
    get length(){ return values.size; },
    clear:()=>values.clear(),
    getItem:(key:string)=>values.get(key) ?? null,
    key:(index:number)=>[...values.keys()][index] ?? null,
    removeItem:(key:string)=>{ values.delete(key); },
    setItem:(key:string,value:string)=>{ values.set(key,value); },
  };
  const now = Date.now();
  saveKayakOffer(storage,{offer,vertical:"hotels",criteria:{destination:"London"}});
  const saved = [...values.values()][0];
  const parsed = JSON.parse(saved);
  parsed.savedAt = now;
  values.set([...values.keys()][0],JSON.stringify(parsed));
  assert.equal(readKayakOffer(storage,offer.id,now)?.offer.testUrl,clickout);
  assert.equal(readKayakOffer(storage,offer.id,now + 31*60*1000),null);
  parsed.savedAt = now;
  parsed.offer.testUrl = "https://evil.example/checkout";
  values.set([...values.keys()][0],JSON.stringify(parsed));
  assert.equal(readKayakOffer(storage,offer.id,now),null);
});
