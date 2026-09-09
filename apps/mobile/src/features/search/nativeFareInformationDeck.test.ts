import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source=readFileSync("src/features/search/NativeFlightDetails.tsx","utf8");
const between=(start:string,end:string)=>{const startIndex=source.indexOf(start);assert.notEqual(startIndex,-1,`missing ${start}`);const endIndex=source.indexOf(end,startIndex+start.length);assert.notEqual(endIndex,-1,`missing ${end}`);return source.slice(startIndex,endIndex);};
const deck=between('<View testID="fare-information-deck"','</ScrollView><View style={[s.sticky');
const surface=between("function FareSurface", "function InfoRow");

test("fare categories and active content form one connected horizontally scrollable deck",()=>{
  const labels=["Compare deals","Fare details","Fare conditions","Optional extras"];
  assert.deepEqual(labels.map(label=>deck.indexOf(`'${label}'`)),[0,1,2,3].map(index=>deck.indexOf(`'${labels[index]}'`)));
  labels.slice(1).forEach((label,index)=>assert.ok(deck.indexOf(`'${labels[index]}'`)<deck.indexOf(`'${label}'`)));
  assert.match(deck,/<ScrollView horizontal showsHorizontalScrollIndicator=\{false\}/);
  assert.match(deck,/<View accessibilityRole="tablist" style=\{s\.fareTabList\}>/);
  assert.match(deck,/accessibilityRole="tab"/);
  assert.match(deck,/accessibilityState=\{\{selected:tab===key\}\}/);
  assert.match(deck,/onPress=\{\(\)=>setTab\(key\)\}/);
  assert.match(deck,/<Text numberOfLines=\{1\}/);
  assert.match(deck,/tab===key\?<View style=\{s\.fareTabIndicator\}/);
  assert.match(deck,/<View style=\{s\.fareInfoBody\}><FareSurface tab=\{tab\}/);
});

test("FareSurface renders only the selected category without a generic nested card",()=>{
  assert.doesNotMatch(surface,/s\.card|borderRadius|backgroundColor:theme\.surface/);
  assert.match(surface,/if\(tab==="deals"\) return/);
  assert.match(surface,/if\(tab==="details"\) return/);
  assert.match(surface,/if\(tab==="conditions"\) return/);
  assert.match(surface,/if\(tab==="extras"\) return/);
  assert.doesNotMatch(surface,/display:\s*"none"|opacity:\s*0/);
});

test("deal comparison retains authoritative provider handoff data and intentional emptiness",()=>{
  const deals=between('if(tab==="deals")', 'if(tab==="details")');
  assert.match(deals,/choice\.deals\.length\?choice\.deals\.map/);
  assert.match(deals,/deal\.providerName/);
  assert.match(deals,/dealPrices\[`deal:\$\{deal\.key\}`\]\?\.formatted/);
  assert.match(deals,/"View deal"/);
  assert.match(deals,/onDeal\(deal\.offerId\)/);
  assert.match(deals,/booking\|\|!fareReady/);
  assert.match(deals,/No booking deals available/);
  assert.match(deals,/No additional live provider deals were supplied for this fare\./);
  assert.doesNotMatch(deals,/Best deal|Good value|Recommended|logoUrl|seller ranking/i);
});

test("fare details preserve cabin, amenity, source price, emissions, and update facts",()=>{
  const details=between('if(tab==="details")', 'if(tab==="conditions")');
  ["Fare brand","Cabin","Cabin product","Fare basis","Seat","Wi-Fi","Power","Price breakdown","Base fare","Taxes","Trip total"].forEach(label=>assert.match(details,new RegExp(label)));
  assert.match(details,/sourceMoney\(p\.price\.baseAmount,p\.price\.baseCurrency\)/);
  assert.match(details,/Additional cabin details not supplied by the provider\./);
  assert.match(details,/Price breakdown not supplied by the provider\./);
});

test("fare details give provider emissions a dedicated non-interactive sustainability treatment",()=>{
  const details=between('if(tab==="details")', 'if(tab==="conditions")');
  const emissions=between('p?.totalEmissionsKg!==undefined?', 'p?.updatedAt?');
  const emissionsStyles=between("emissionsCard:", "secondaryFacts:");
  assert.match(emissions,/p\?\.totalEmissionsKg/);
  assert.match(emissions,/<View style=\{s\.emissionsCard\}>/);
  assert.match(emissions,/<Leaf size=\{17\}/);
  assert.match(emissions,/Estimated CO₂ emissions/);
  assert.match(emissions,/p\.totalEmissionsKg\.toLocaleString\(\)/);
  assert.match(emissions,/>\{p\.totalEmissionsKg\.toLocaleString\(\)\} kg<\/Text>/);
  assert.match(emissions,/>for this offer<\/Text>/);
  assert.doesNotMatch(emissions,/<Pressable|detailRow\("Estimated CO₂"/);
  assert.match(emissionsStyles,/backgroundColor:"rgba\(236, 253, 245, 0\.72\)"/);
  assert.match(emissionsStyles,/flexWrap:"wrap"/);
  assert.doesNotMatch(details,/detailRow\("Estimated CO₂"|carbon footprint|sustainability/i);
});

test("provider update fact remains a separate row after emissions",()=>{
  const details=between('if(tab==="details")', 'if(tab==="conditions")');
  const provider='<View style={[s.secondaryFacts,{borderTopColor:theme.border}]}>{detailRow("Provider offer last updated",providerTimestamp(p.updatedAt))}</View>';
  assert.match(details,/p\?\.updatedAt\?/);
  assert.ok(details.indexOf("s.emissionsCard")<details.indexOf(provider));
  assert.equal(details.split(provider).length-1,1);
});

test("conditions use structured state, shared statuses, scope, penalties, identity facts, and accessible legal links",()=>{
  const conditions=between('if(tab==="conditions")', 'if(tab==="extras")');
  assert.match(conditions,/condition\.state==="allowed"\?"positive":condition\.state==="not-allowed"\?"negative":"informational"/);
  assert.match(conditions,/<FareStatusIcon semantic=\{semantic\}/);
  assert.match(conditions,/conditionCategory\(condition\)/);
  assert.match(conditions,/conditionState\(condition\)/);
  assert.match(conditions,/conditionScope\(condition\)/);
  assert.match(conditions,/condition\.penaltyAmount/);
  assert.match(conditions,/passengerIdentityDocumentsRequired/);
  assert.match(conditions,/supportedIdentityDocumentTypes/);
  assert.match(conditions,/offerOwner/);
  assert.match(conditions,/accessibilityRole="link"/);
  assert.match(conditions,/Linking\.openURL\(link\.url\)/);
  assert.match(conditions,/<FlowIcon name="external"/);
  assert.match(conditions,/Provider offer last updated/);
});

test("optional extras remain non-interactive provider-authored information",()=>{
  const extras=between('if(tab==="extras")', "function InfoRow");
  assert.match(extras,/p\?\.optionalServices\?\.length/);
  assert.match(extras,/service\.description/);
  assert.match(extras,/sourceMoney\(service\.price,service\.currency\)/);
  assert.match(extras,/service\.travelerCount/);
  assert.match(extras,/service\.maximumQuantity/);
  assert.match(extras,/service\.journeyContext/);
  assert.match(extras,/service\.pricedPerTraveler\?" each":""/);
  assert.match(extras,/service\.type==="baggage"/);
  assert.match(extras,/supportedLoyaltyProgrammes/);
  assert.match(extras,/No optional extras/);
  assert.match(extras,/No optional services were supplied by this provider\./);
  assert.doesNotMatch(extras,/<Pressable|chevron/);
});

test("deck styles are scoped and leave generic cards and fare cards intact",()=>{
  const deckStyles=between("fareInfoDeck:", "notice:");
  assert.match(deckStyles,/borderWidth:1,borderRadius:15,overflow:"hidden"/);
  assert.match(deckStyles,/fareTabList:\{flexDirection:"row",gap:22\}/);
  assert.match(deckStyles,/fareInfoTab:\{minHeight:48/);
  assert.match(deckStyles,/fareTabIndicator:\{position:"absolute",height:3/);
  assert.match(deckStyles,/fareInfoDivider:\{height:StyleSheet\.hairlineWidth\}/);
  assert.doesNotMatch(deckStyles,/elevation|shadow/);
  assert.match(source,/card:\{borderWidth:1,borderRadius:14,padding:14,gap:7\}/);
  assert.match(source,/fareCardSelected:\{borderWidth:2\}/);
});
