import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source=readFileSync("src/features/search/NativeFlightDetails.tsx","utf8");
const between=(start:string,end:string)=>{const startIndex=source.indexOf(start);assert.notEqual(startIndex,-1,`missing ${start}`);const endIndex=source.indexOf(end,startIndex+start.length);assert.notEqual(endIndex,-1,`missing ${end}`);return source.slice(startIndex,endIndex);};
const deck=between('<View testID="fare-information-deck"','</ScrollView><View style={[s.sticky');
const surface=between("function FareSurface", "const s=StyleSheet.create");

test("fare categories and active content form one connected horizontally scrollable deck",()=>{
  const labels=["Compare deals","Fare details","Fare conditions","Optional extras"];
  assert.deepEqual(labels.map(label=>deck.indexOf(`'${label}'`)),[0,1,2,3].map(index=>deck.indexOf(`'${labels[index]}'`)));
  labels.slice(1).forEach((label,index)=>assert.ok(deck.indexOf(`'${labels[index]}'`)<deck.indexOf(`'${label}'`)));
  assert.match(deck,/<ScrollView horizontal showsHorizontalScrollIndicator=\{false\}/);
  assert.match(deck,/<View accessibilityRole="tablist" accessibilityLabel="Fare information" style=\{s\.fareTabList\}>/);
  assert.match(deck,/accessibilityRole="tab"/);
  assert.match(deck,/accessibilityState=\{\{selected:tab===key\}\}/);
  assert.match(deck,/onPress=\{\(\)=>setTab\(key\)\}/);
  assert.match(deck,/<Text numberOfLines=\{1\}/);
  assert.match(deck,/tab===key\?<View style=\{s\.fareTabIndicator\}/);
  assert.match(deck,/<View testID="fare-information-active-content" style=\{s\.fareInfoBody\}><FareSurface tab=\{tab\}/);
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
  assert.doesNotMatch(deals,/providerMark|providerMonogram|charAt\(0\)|Best deal|Good value|Recommended|logoUrl|seller ranking/i);
});

test("fare details preserve cabin, amenity, source price, emissions, and update facts",()=>{
  const details=between('if(tab==="details")', 'if(tab==="conditions")');
  ["Fare brand","Cabin","Cabin product","Fare basis","Seat","Wi-Fi","Power","Price breakdown","Base fare","Taxes","Trip total"].forEach(label=>assert.match(details,new RegExp(label)));
  assert.match(details,/sourceMoney\(p\.price\.baseAmount,p\.price\.baseCurrency\)/);
  assert.match(details,/Additional cabin details not supplied by the provider\./);
  assert.match(details,/Price breakdown not supplied by the provider\./);
  assert.match(details,/groupLabel\("Cabin"\)/); assert.match(details,/groupLabel\("On board"\)/); assert.match(details,/groupLabel\("Price breakdown"\)/);
  assert.match(details,/cabins\.map/); assert.match(details,/c\.amenities\?\.wifi/); assert.match(details,/wifi\.cost/);
});

test("fare details give provider emissions a dedicated dark-mode-safe sustainability treatment",()=>{
  const details=between('if(tab==="details")', 'if(tab==="conditions")');
  const emissions=between('p?.totalEmissionsKg!==undefined?', 'p?.updatedAt?');
  const emissionsStyles=between("emissionsCard:", "secondaryFacts:");
  assert.match(emissions,/p\?\.totalEmissionsKg/);
  assert.match(emissions,/<View style=\{\[s\.emissionsCard,\{backgroundColor:theme\.dark\?"#0F2F26":"#ECFDF5"\}\]\}>/);
  assert.match(emissions,/<Leaf size=\{17\} color=\{theme\.dark\?"#6EE7B7":"#047857"\}/);
  assert.match(emissions,/Estimated CO₂ emissions/);
  assert.match(emissions,/p\.totalEmissionsKg\.toLocaleString\(\)/);
  assert.match(emissions,/>\{p\.totalEmissionsKg\.toLocaleString\(\)\} kg<\/Text>/);
  assert.match(emissions,/>for this offer<\/Text>/);
  assert.match(emissions,/s\.emissionsLabel,\{color:theme\.dark\?"#6EE7B7":"#047857"\}/);
  assert.match(emissions,/s\.emissionsValue,\{color:theme\.textPrimary\}/);
  assert.match(emissions,/s\.emissionsContext,\{color:supportingColor\}/);
  assert.doesNotMatch(emissions,/<Pressable|detailRow\("Estimated CO₂"/);
  assert.doesNotMatch(emissionsStyles,/backgroundColor:|color:/);
  assert.match(emissionsStyles,/flexWrap:"wrap"/);
  assert.doesNotMatch(details,/detailRow\("Estimated CO₂"|carbon footprint|sustainability/i);
});

test("provider update fact remains a separate row after emissions",()=>{
  const details=between('if(tab==="details")', 'if(tab==="conditions")');
  const provider='<View style={[s.secondaryFacts,{borderTopColor:theme.border}]}>{freshness(p.updatedAt)}</View>';
  assert.match(details,/p\?\.updatedAt\?/);
  assert.ok(details.indexOf("s.emissionsCard")<details.indexOf(provider));
  assert.equal(details.split(provider).length-1,1);
});

test("conditions use structured state, shared statuses, scope, penalties, identity facts, and accessible legal links",()=>{
  const conditions=between('if(tab==="conditions")', 'if(tab==="extras")');
  assert.match(conditions,/condition\.state==="allowed"\?"positive":condition\.state==="not-allowed"\?"negative":"informational"/);
  assert.match(conditions,/<FareStatusIcon semantic=\{semantic\}/);
  assert.match(conditions,/conditionCategory\(group\.conditions\[0\]\)/);
  assert.match(surface,/conditionGroups=.*reduce/);
  assert.match(conditions,/conditionState\(condition\)/);
  assert.match(conditions,/conditionScope\(condition\)/);
  assert.match(conditions,/condition\.penaltyAmount/);
  assert.match(conditions,/passengerIdentityDocumentsRequired/);
  assert.match(conditions,/supportedIdentityDocumentTypes/);
  assert.match(conditions,/offerOwner/);
  assert.match(conditions,/accessibilityRole="link"/);
  assert.match(conditions,/Linking\.openURL\(link\.url\)/);
  assert.match(conditions,/<FlowIcon name="external"/);
  assert.match(conditions,/freshness\(p\.updatedAt\)/);
  assert.match(conditions,/groupLabel\("Travel documents"\)/); assert.match(conditions,/groupLabel\("Airline"\)/); assert.doesNotMatch(conditions,/Allowed with/);
});

test("optional extras remain non-interactive provider-authored information",()=>{
  const extras=between('if(tab==="extras")', "const s=StyleSheet.create");
  assert.match(extras,/p\?\.optionalServices\?\.length/);
  assert.match(extras,/service\.description/);
  assert.match(extras,/sourceMoney\(service\.price,service\.currency\)/);
  assert.match(extras,/service\.travelerCount/);
  assert.match(extras,/service\.maximumQuantity/);
  assert.match(extras,/service\.journeyContext/);
  assert.match(extras,/service\.pricedPerTraveler\?" each":""/);
  assert.doesNotMatch(extras,/serviceIcon|service\.type==="baggage"/);
  assert.match(extras,/supportedLoyaltyProgrammes/);
  assert.match(extras,/groupLabel\("Optional services"\)/);
  assert.match(extras,/groupLabel\("Loyalty programmes"\)/);
  assert.match(extras,/No optional services were supplied by this provider\./);
  assert.doesNotMatch(extras,/<Pressable|chevron/);
});

test("deck baseline adds a 10dp local inset to the unchanged 14dp content gap for 24dp total separation",()=>{
  const deckStyles=between("fareInfoDeck:", "notice:");
  assert.match(deckStyles,/fareInfoDeck:\{gap:0,marginTop:10\}/);
  assert.match(deckStyles,/fareTabRail:\{flexGrow:0,borderBottomWidth:1,marginHorizontal:-10\}/);
  assert.match(deckStyles,/fareTabRailContent:\{paddingHorizontal:0\}/);
  assert.match(deckStyles,/fareInfoBody:\{paddingHorizontal:4,paddingVertical:4\}/);
  assert.doesNotMatch(deckStyles,/fareInfoBody:\{[^}]*(?:borderWidth|borderRadius|backgroundColor)/);
  assert.match(deckStyles,/fareTabList:\{flexDirection:"row",gap:22\}/);
  assert.match(deckStyles,/fareInfoTab:\{minHeight:48,justifyContent:"center",position:"relative",paddingHorizontal:0\}/);
  assert.match(deckStyles,/fareTabIndicator:\{position:"absolute",height:2,borderRadius:1,backgroundColor:ui\.blue,left:0,right:0,bottom:0\}/);
  assert.match(deckStyles,/sectionDivider:\{borderTopWidth:StyleSheet\.hairlineWidth\}/);
  assert.match(deckStyles,/fareGroupDivider:\{height:StyleSheet\.hairlineWidth,marginVertical:11\}/);
  assert.match(deckStyles,/secondaryFacts:\{borderTopWidth:StyleSheet\.hairlineWidth,paddingVertical:11\}/);
  assert.doesNotMatch(deckStyles,/fareInfoTab(?:Text)?:\{[^}]*(?:transform|position:"absolute")/);
  assert.match(source,/loadingTabs:\{[^}]*marginHorizontal:-10\}/);
  assert.match(deck,/borderBottomColor:theme\.border/);
  assert.doesNotMatch(deckStyles,/elevation|shadow/);
  assert.match(source,/content:\{paddingHorizontal:18,paddingTop:5,gap:14\}/);
  assert.match(deckStyles,/fareInfoDeck:\{gap:0,marginTop:10\}/);
  assert.doesNotMatch(deckStyles,/fareInfoDeck:\{[^}]*marginTop:24/);
  assert.equal(14+10,24,"the global gap and local deck inset provide the intended total separation");
  assert.match(source,/loadingInfoDeck:\{height:174,marginTop:10\}/);
  assert.match(source,/card:\{borderWidth:1,borderRadius:14,padding:14,gap:7\}/);
  assert.match(source,/fareCard:\{borderRadius:15,minHeight:142,position:"relative",paddingHorizontal:12,paddingTop:4,paddingBottom:8,gap:4\}/);
  assert.doesNotMatch(source,/fareCard:\{[^}]*marginHorizontal/);
  assert.match(source,/fareCardSelected:\{borderWidth:1\.5\}/);
});

test("fare information typography strengthens state-driven navigation while preserving content metrics",()=>{
  const deckStyles=between("fareInfoDeck:", "notice:");
  assert.match(deckStyles,/fareInfoTabText:\{fontSize:15,lineHeight:21,fontWeight:"600"\}/);
  assert.match(deckStyles,/fareInfoTabTextActive:\{fontWeight:"700"\}/);
  assert.match(source,/const fareTabActiveTextColor=theme\.dark\?"#8FB5FF":"#004BB8"/);
  assert.match(source,/const fareTabInactiveTextColor=theme\.dark\?theme\.textPrimary:"#1A1A1A"/);
  assert.match(deck,/color:tab===key\?fareTabActiveTextColor:fareTabInactiveTextColor/);
  assert.doesNotMatch(deck,/color:tab===key\?ui\.blue:/);
  assert.doesNotMatch(source,/#3F506F|#D3DBEA|#2F466A|#D8E1F0/);
  assert.doesNotMatch(deck,/Fare conditions[^\n]*color:ui\.blue/);
  assert.match(deckStyles,/fareGroupLabel:\{fontSize:11,lineHeight:15,fontWeight:"600"/);
  assert.match(deckStyles,/detailLabel:\{[^}]*fontWeight:"500"\}/);
  assert.match(deckStyles,/detailValue:\{[^}]*fontWeight:"400"[^}]*\}/);
  assert.match(deckStyles,/conditionState:\{[^}]*fontWeight:"500"\}/);
  assert.match(deckStyles,/conditionScope:\{[^}]*fontWeight:"400"\}/);
  assert.match(deckStyles,/serviceDescription:\{[^}]*fontWeight:"500"\}/);
  assert.match(deckStyles,/serviceMeta:\{[^}]*fontWeight:"400"\}/);
  assert.doesNotMatch(deckStyles,/detailValue:\{[^}]*fontWeight:"600"\}|emptyTitle:\{[^}]*fontWeight:"700"\}/);
});

test("fare content uses category, primary, and supporting colors without duplicating icon semantics in text",()=>{
  assert.match(surface,/const categoryColor=theme\.dark\?"#AAB5CD":"#596984"/);
  assert.match(surface,/const supportingColor=theme\.dark\?"#94A3B8":"#64748B"/);
  assert.doesNotMatch(surface,/const categoryColor=[^;]*#D3DBEA|const categoryColor=[^;]*#3F506F/);
  assert.doesNotMatch(surface,/const supportingColor=[^;]*#D3DBEA|const supportingColor=[^;]*#3F506F/);
  assert.match(surface,/s\.fareGroupLabel,\{color:categoryColor\}/);
  assert.match(surface,/s\.conditionState,\{color:theme\.textPrimary\}/);
  assert.match(surface,/s\.conditionPenalty,\{color:supportingColor\}/);
  assert.doesNotMatch(surface,/s\.conditionState,\{color:conditionColors\[semantic\]\}/);
  assert.doesNotMatch(surface,/s\.conditionPenalty,\{color:conditionColors\.penalty\}/);
  assert.match(surface,/s\.dealProvider,\{color:theme\.textPrimary\}/);
  assert.match(surface,/s\.detailLabel[^\n]*color:supportingColor/);
  assert.match(surface,/s\.detailValue[^\n]*color:theme\.textPrimary/);
  assert.match(surface,/s\.serviceDescription,\{color:theme\.textPrimary\}/);
  assert.match(surface,/s\.serviceMeta,\{color:supportingColor\}/);
  assert.match(surface,/s\.loyaltyProgrammes,\{color:theme\.textPrimary\}/);
  assert.match(surface,/s\.conditionScope,\{color:supportingColor\}/);
  assert.match(surface,/s\.emptyDescription,\{color:supportingColor\}/);
  assert.doesNotMatch(surface,/const conditionColors=/);
  assert.match(source,/semantic==="positive"\?s\.fareStatusPositive:s\.fareStatusNeutral/);
  assert.match(source,/semantic==="positive"\?<FlowIcon name="check"/);
  assert.match(source,/semantic==="negative"\?<View style=\{s\.fareStatusMinus\}/);
  assert.match(source,/:<View style=\{s\.fareStatusDot\}/);
});
