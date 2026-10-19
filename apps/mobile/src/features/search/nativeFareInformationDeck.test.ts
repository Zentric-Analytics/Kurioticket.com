import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source=readFileSync("src/features/search/NativeFlightDetails.tsx","utf8");
const between=(start:string,end:string)=>{const startIndex=source.indexOf(start);assert.notEqual(startIndex,-1,`missing ${start}`);const endIndex=source.indexOf(end,startIndex+start.length);assert.notEqual(endIndex,-1,`missing ${end}`);return source.slice(startIndex,endIndex);};
const deck=between('<View testID="fare-information-deck"','</ScrollView></SafeAreaView>;');
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

test("selection uses blue outlines and underline-only fare tabs without changing surface fills",()=>{
  const fareRail=between('<Text style={[s.fareSectionTitle,{color:fareHeadingTextColor}]}>Pick your fare</Text>','<View testID="fare-information-deck"');
  assert.match(deck,/style=\{\[s\.fareInfoTabText,\{color:fareTabTextColor\}\]\}/);
  assert.match(deck,/tab===key\?<View style=\{s\.fareTabIndicator\}/);
  assert.match(source,/fareTabIndicator:\{[^}]*backgroundColor:ui\.blue/);
  assert.doesNotMatch(deck,/fareInfoTabTextActive|color:tab===key\?/);
  assert.match(fareRail,/backgroundColor:theme\.surface,borderColor:isSelected\?ui\.blue:surfaceBorderColor/);
  assert.match(fareRail,/s\.farePrice,\{color:farePriceTextColor\}/);
  assert.doesNotMatch(fareRail,/FLIGHT_DETAILS_(?:LIGHT|DARK)_SELECTED/);
});

test("FareSurface renders only the selected category without a generic nested card",()=>{
  assert.doesNotMatch(surface,/s\.card/);
  assert.match(surface,/if\(tab==="deals"\) return/);
  assert.match(surface,/if\(tab==="details"\) return/);
  assert.match(surface,/if\(tab==="conditions"\) return/);
  assert.match(surface,/if\(tab==="extras"\) return/);
  assert.doesNotMatch(surface,/display:\s*"none"|opacity:\s*0/);
});

test("deal comparison presents provider cards with direct booking actions",()=>{
  const deals=between('if(tab==="deals")', 'if(tab==="details")');
  assert.match(surface,/const displayedDeals=choice\.deals\.length/);
  assert.match(deals,/deal\.providerName/);
  assert.match(deals,/dealPrices\[deal\.priceKey\]/);
  assert.match(deals,/const canViewDeal=deal\.canContinue&&pricesReady&&Boolean\(price\)/);
  assert.match(deals,/accessibilityRole="radiogroup"/);
  assert.match(deals,/accessibilityRole="radio"/);
  assert.match(deals,/onSelectDeal\(deal\.offerId\)/);
  assert.match(deals,/accessibilityRole="button"/);
  assert.match(deals,/View deal/);
  assert.match(deals,/onViewDeal\(deal\.offerId\)/);
  assert.match(deals,/ProviderLogo provider=\{deal\.providerName\} logoUrl=\{deal\.providerLogoUrl\}/);
  assert.match(deals,/Trip total/);
  assert.match(surface,/fallbackProviderName/);
  assert.match(deals,/No fare price available/);
  assert.doesNotMatch(deals,/dealRadio|dealRadioDot|Best deal|Good value|Recommended|seller ranking/i);
});

test("provider-authored money uses the same canonical symbols as Flight Results",()=>{
  assert.match(source,/import \{ formatCurrency, resolveDisplayCurrencyContext/);
  assert.match(source,/const sourceMoney = \(amount:number,currency:string\) => formatCurrency\(amount,currency\);/);
  assert.doesNotMatch(source,/currencyDisplay:"code"/);
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

test("deck baseline matches the mobile-web inset and spacing rhythm",()=>{
  const deckStyles=between("fareInfoDeck:", "notice:");
  assert.match(deckStyles,/fareInfoDeck:\{gap:0,marginTop:12\}/);
  assert.match(deckStyles,/fareTabRail:\{flexGrow:0,borderBottomWidth:1,marginHorizontal:-8\}/);
  assert.match(deckStyles,/fareTabRailContent:\{paddingHorizontal:0\}/);
  assert.match(deckStyles,/fareInfoBody:\{paddingHorizontal:4,paddingTop:12,paddingBottom:4\}/);
  assert.doesNotMatch(deckStyles,/fareInfoBody:\{[^}]*(?:borderWidth|borderRadius|backgroundColor)/);
  assert.match(deckStyles,/fareTabList:\{flexDirection:"row",gap:14\}/);
  assert.match(deckStyles,/fareInfoTab:\{minHeight:48,justifyContent:"center",position:"relative",paddingHorizontal:0\}/);
  assert.match(deckStyles,/fareTabIndicator:\{position:"absolute",height:3,borderRadius:2,backgroundColor:ui\.blue,left:2,right:2,bottom:-1\}/);
  assert.match(source,/loadingTabRail:\{[^}]*marginHorizontal:-10\}/);
  assert.match(source,/contentBody:\{paddingHorizontal:12,gap:12\}/);
  assert.match(source,/loadingInfoDeck:\{height:177,marginTop:12\}/);
});

test("fare information typography keeps neutral tabs with underline-only selection",()=>{
  const deckStyles=between("fareInfoDeck:", "notice:");
  assert.match(deckStyles,/fareInfoTabText:\{fontSize:14,lineHeight:20,fontWeight:"600"\}/);
  assert.doesNotMatch(deckStyles,/fareInfoTabTextActive/);
  assert.match(source,/const fareTabTextColor=theme\.dark\?theme\.textSecondary:FLIGHT_DETAILS_LIGHT_SECONDARY/);
  assert.match(deck,/color:fareTabTextColor/);
  assert.doesNotMatch(deck,/color:tab===key\?|fontWeight:tab===key/);
  assert.match(deckStyles,/fareGroupLabel:\{fontSize:11,lineHeight:15,fontWeight:"700"/);
});

test("provider selection never highlights a seller that is not the active native deal",()=>{
  assert.match(source,/const selectedDeal=selected\?\(nativeFlightDealSelection\(selectedDealOfferId,selected\)\?\?selected\.deals\[0\]\?\?null\):null/);
  assert.match(source,/setSelectedDealOfferId\(\(current\)=>\(nativeFlightDealSelection\(current,selected\)\?\?selected\.deals\[0\]\?\?null\)\?\.offerId\?\?null\)/);
  const deals=between('if(tab==="deals")', 'if(tab==="details")');
  assert.match(deals,/const isSelected=deal\.offerId===selectedDealOfferId/);
  assert.doesNotMatch(deals,/!selectedDealOfferId&&index===0/);
});

test("provider deal cards use neutral Hotel-style surfaces and direct actions",()=>{
  const deals=between('if(tab==="deals")', 'if(tab==="details")');
  const dealStyles=between("dealList:", "conditionGroup:");
  assert.match(deals,/backgroundColor:theme\.surface,borderColor:theme\.dark\?theme\.border:FLIGHT_DETAILS_LIGHT_DEAL_BORDER/);
  assert.match(deals,/style=\{\(\{pressed\}\)=>\[s\.viewDealButton/);
  assert.match(dealStyles,/dealCard:\{minHeight:76,borderWidth:1,borderRadius:12,paddingHorizontal:12,paddingVertical:12,justifyContent:"center"\}/);
  assert.match(dealStyles,/viewDealButton:\{minHeight:32,minWidth:76,paddingHorizontal:6,borderRadius:8/);
  assert.doesNotMatch(dealStyles,/dealCardSelected|dealRadio/);
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
  assert.match(surface,/s\.dealProvider,\{color:theme\.dark\?theme\.textPrimary:FLIGHT_DETAILS_LIGHT_DEAL_TEXT\}/);
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


test("native Flight fare tabs consume the shared structured contract without supplier rows or label parsing",()=>{
  assert.doesNotMatch(source,/NativeSupplierInformation|Supplier information|suppliedFacts/);
  const details=between('if(tab==="details")','if(tab==="conditions")');
  assert.match(details,/c\.onboardFeatures\?\.map/);
  assert.match(details,/flightOnboardFeatureLabel\(feature\.kind\)/);
  assert.match(details,/detailRow\("Aircraft",segment\.aircraft/);
  const conditions=between('if(tab==="conditions")','if(tab==="extras")');
  assert.match(conditions,/groupLabel\("Baggage allowance"\)/);
  assert.match(conditions,/groupLabel\("Airline baggage policy"\)/);
  assert.match(conditions,/policy\.carrierName/);
  assert.match(source,/p\?\.airlineBaggagePolicies/);
  const extras=surface.slice(surface.indexOf('if(tab==="extras")'));
  assert.match(extras,/service\.pricing==="fee-unspecified"\?"Available for a fee"/);
});

test("native policy-only and entitlement-only conditions suppress the unavailable fallback",()=>{
  const conditions=between('if(tab==="conditions")','if(tab==="extras")');
  assert.match(conditions,/baggageTerms\.length\|\|policies\.length\?null:emptyState\("Fare conditions unavailable"/);
});

test("native provider baggage copy uses the existing flexible condition column for long rules",()=>{
  const conditions=between('if(tab==="conditions")','if(tab==="extras")');
  assert.match(conditions,/<FareStatusIcon semantic=\{term\.semantic\}\/><View style=\{s\.conditionCopy\}><Text/);
});
