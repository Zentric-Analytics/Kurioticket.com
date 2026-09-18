import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("app/car-details.tsx", "utf8");
const sandboxDetail = readFileSync("src/features/search/NativeKayakCarDetailScreen.tsx", "utf8");
const normalDetail = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
const providerPresentation = readFileSync("src/features/search/nativeCarProviderPresentation.ts", "utf8");
const glassSurface = readFileSync("src/features/search/CarDetailGlassSurface.tsx", "utf8");
const kayakDockStart = sandboxDetail.indexOf("{offer ? <View style={[s.dock");
const kayakDockEnd = sandboxDetail.indexOf("</SafeAreaView>;", kayakDockStart);
const kayakDock = kayakDockStart >= 0 && kayakDockEnd > kayakDockStart ? sandboxDetail.slice(kayakDockStart, kayakDockEnd) : "";
const kayakCompare = sandboxDetail.slice(sandboxDetail.indexOf("function KayakCompare("), sandboxDetail.indexOf("function TimelineEntry("));

test("native Cars details keep provider detection while KAYAK mirrors the approved Cars Details structure", () => {
  assert.match(route, /NativeKayakCarDetailScreen/);
  assert.match(route, /ApprovedCarDetailScreen/);
  assert.match(route, /resultId\?\.startsWith\("kayak-sandbox:"\)/);
  assert.match(route, /parsed\.inventorySource === "kayak-sandbox"/);
  assert.match(route, /parsed\.searchPolicy\?\.source === "kayak-sandbox"/);
  assert.match(route, /\? <NativeKayakCarDetailScreen \/>[\s\S]*: <ApprovedCarDetailScreen \/>/);
  for (const marker of [
    /stickyHeaderIndices=\{\[1\]\}/,
    /Compare deals/,
    /Pickup and return/,
    /Location/,
    /carTabCompare/,
    /carTabPickup/,
    /carTabLocation/,
    /dockContent/,
  ]) {
    assert.match(normalDetail, marker);
    assert.match(sandboxDetail, marker);
  }
});

test("approved and KAYAK Cars details share the light canvas and vehicle image surface contract", () => {
  for (const detail of [normalDetail, sandboxDetail]) {
    assert.match(detail, /const CAR_DETAIL_LIGHT_CANVAS = "#F5F7FB"/);
    assert.match(detail, /const carCanvasColor\s*=\s*theme\.dark\s*\?\s*theme\.background\s*:\s*CAR_DETAIL_LIGHT_CANVAS/);
    assert.doesNotMatch(detail, /carInformationSurface|#E7EBF1/);
    assert.match(detail, /s\.safe,\s*\{\s*backgroundColor:\s*carCanvasColor\s*\}/);
    assert.equal((detail.match(/<CarDetailGlassSurface /g) ?? []).length, 2);
    assert.match(detail, /import \{ CarDetailGlassSurface \} from "\.\/CarDetailGlassSurface"/);
    assert.doesNotMatch(detail, /hero(?:Back|Actions):\s*\{[^}]*backgroundColor:\s*"#(?:FFFFFF|E7EBF1)"/);
    assert.match(detail, /<ScrollView[^>]*style=\{\{\s*backgroundColor:\s*carCanvasColor\s*\}\}/);
    assert.match(detail, /s\.hero,\s*\{\s*backgroundColor:\s*carCanvasColor,\s*borderColor:\s*theme\.border\s*\}/);
    assert.match(detail, /s\.imageBox,\s*\{[^}]*backgroundColor:\s*theme\.surface\s*\}/);
  }
  assert.match(glassSurface, /import \{ BlurView \} from "expo-blur"/);
  assert.match(glassSurface, /experimentalBlurMethod=\{Platform\.OS === "android" \? "dimezisBlurView" : undefined\}/);
  assert.match(glassSurface, /borderWidth: StyleSheet\.hairlineWidth/);
});

test("KAYAK Cars only show or similar when the normalized provider result says so", () => {
  assert.match(normalDetail, /\{result\.modelName\}<Text style=\{\[s\.orSimilar,/);
  assert.match(sandboxDetail, /\{result\.modelName\}\{result\.orSimilar \? <Text style=\{\[s\.orSimilar,/);
  assert.doesNotMatch(sandboxDetail, /\{result\.modelName\}<Text style=\{\[s\.orSimilar,/);
});

test("native KAYAK Cars details recover only through the canonical server Cars API", () => {
  assert.match(sandboxDetail, /travelApi\.searchCars\(plan\.plan\.payload\)/);
  assert.match(sandboxDetail, /safeCanonicalCarResult\(item\)/);
  assert.match(sandboxDetail, /isKayakSandboxCar\(item\)/);
  assert.doesNotMatch(sandboxDetail, /api\/sandbox\/kayak|KAYAK_SANDBOX_API_KEY/);
});

test("native KAYAK Cars details render provider-owned specs and omit authored missing-data labels", () => {
  assert.match(sandboxDetail, /nativeCarPrimarySpecLabels\(result\)/);
  assert.match(providerPresentation, /sandboxPresentation\?\.specs/);
  assert.match(providerPresentation, /authoredMissingSpecLabels/);
  for (const authored of ["Passengers not supplied", "Baggage capacity not supplied", "Doors not supplied", "Transmission not supplied", "Specifications not supplied"]) {
    assert.match(providerPresentation, new RegExp(authored.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(sandboxDetail, /specs\.passengers \? <Spec/);
  assert.match(sandboxDetail, /specs\.bags \? <Spec/);
  assert.match(sandboxDetail, /specs\.doors \? <Spec/);
  assert.match(sandboxDetail, /specs\.transmission \? <Spec/);
  assert.doesNotMatch(sandboxDetail, /\$\{result\.passengers\} passengers|\$\{result\.bags\} bags|\$\{result\.doors\} doors/);
  assert.doesNotMatch(sandboxDetail, /nativeCarFuelPolicyLabel|nativeCarMileageLabel|result\.airConditioning|result\.fuelPolicy|result\.mileagePolicy/);
});

test("native KAYAK Cars remove Kurioticket-authored sandbox commentary while retaining provider facts and neutral UI", () => {
  for (const authoredCopy of [
    "KAYAK sandbox · Simulated · Not bookable",
    "Simulated KAYAK provider inventory for staging. No real booking or payment is enabled.",
    "KAYAK sandbox · Simulated",
    "KAYAK sandbox · not bookable",
    "per day · simulated",
    "Open KAYAK test page",
    "Test page unavailable",
    "Exact collection instructions were not supplied by the sandbox provider.",
    "KAYAK sandbox inventory is simulated and does not provide a verified collection counter or booking confirmation.",
    "Confirm the exact collection point and accessibility requirements with the rental provider before pickup.",
  ]) assert.doesNotMatch(sandboxDetail, new RegExp(authoredCopy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(sandboxDetail, />Not bookable<\/Text>/);
  assert.doesNotMatch(sandboxDetail, /sandboxBookingUrl|sandboxHref/);
  assert.match(sandboxDetail, /providerValue\(offer\.bookingProviderName\)/);
  assert.match(sandboxDetail, /providerValue\(offer\.rentalCompanyName\)/);
  assert.match(sandboxDetail, /provider \? <Text numberOfLines=\{1\} style=\{\[s\.providerName/);
  assert.match(sandboxDetail, /supplier \? <View style=\{s\.benefits\}>/);
  assert.match(kayakCompare, /money\(offer\.currency, offer\.pricePerDay\)/);
  assert.match(kayakCompare, />per day<\/Text>/);
  assert.match(sandboxDetail, />Compare deals<\/Text>/);
  assert.match(sandboxDetail, />Pickup and return<\/Text>/);
  assert.match(sandboxDetail, />Location<\/Text>/);
});

test("native KAYAK Cars dock uses the total-only disabled handoff", () => {
  const source = kayakDock.replace(/\s/g, "");
  assert.match(source, /formatMarketCurrency\(offer\.totalPrice,offer\.currency\)/);
  assert.match(source, />Estimatedrentaltotal<\/Text>/);
  assert.match(source, />Continuedeal<\/Text>/);
  assert.match(source, /accessibilityRole="button"accessibilityState=\{\{disabled:true\}\}disabled/);
  assert.doesNotMatch(source, /offer\.pricePerDay|>perday<|dockPerDay|onPress|Linking|router|sandboxBookingUrl|sandboxHref|OpenKAYAKtestpage/);
  assert.match(source, /dockContent/);
  assert.match(source, /dockPrice/);
  assert.match(source, /dockAction/);
  assert.match(source, /dockActionAndroid/);
  assert.match(source, /s\.continue/);
  assert.match(source, /s\.continueText/);
  const detailSource = sandboxDetail.replace(/\s/g, "");
  assert.match(detailSource, /import\{colors\}from"\.\.\/\.\.\/theme\/tokens"/);
  assert.match(detailSource, /dockAction:\{flex:0\.78,minWidth:140,maxWidth:180\}/);
  assert.match(detailSource, /dockActionAndroid:\{flex:0\.76,minWidth:132,maxWidth:176\}/);
  assert.match(detailSource, /continue:\{width:"100%",minHeight:48,borderRadius:8,backgroundColor:colors\.blue,paddingHorizontal:12,alignItems:"center",justifyContent:"center"\}/);
  assert.match(detailSource, /continueText:\{fontSize:12,lineHeight:16,fontWeight:"700",fontFamily:appFonts\.bold,color:"white",textAlign:"center"\}/);
});

test("native KAYAK Cars details do not invent unsupported static-provider facts or fallback notes", () => {
  assert.doesNotMatch(sandboxDetail, /Kurioticket-logo|kurioticket-logo-primary-light-bg/);
  assert.doesNotMatch(sandboxDetail, /Free cancellation|Non-refundable|Unlimited mileage|Full-to-full|Same-to-same|Air conditioning|Valid driver's license/);
  assert.doesNotMatch(sandboxDetail, /Provider pickup location|Search pickup/);
  assert.doesNotMatch(sandboxDetail, /Pickup and location details/);
  assert.match(sandboxDetail, /categoryLabel = result\.categoryLabel\.trim\(\) === "Category not supplied" \? "" : result\.categoryLabel/);
});

test("sandbox native results omit recommendations while retaining provider data and standard save/share actions", () => {
  const card = readFileSync("src/features/search/CarResultCard.tsx", "utf8");
  assert.match(card, /rank === 0 && !sandbox/);
  assert.doesNotMatch(card, /!sandbox \? <View style=\{c\.utilityColumn\}>/);
  assert.match(card, /accessibilityLabel=\{savedState\.saved \? `Remove \$\{result\.modelName\} from saved` : `Save \$\{result\.modelName\}`\}/);
  assert.match(card, /accessibilityLabel=\{`Share \$\{result\.modelName\}`\}/);
  assert.doesNotMatch(card, /KAYAK sandbox · Simulated · Not bookable/);
  assert.match(card, /categoryLabel = sandbox && result\.categoryLabel\.trim\(\) === "Category not supplied" \? "" : result\.categoryLabel/);
  assert.match(card, /specLabels\.passengers \? <Spec/);
  assert.match(card, /specLabels\.transmission \? <Spec/);
  assert.match(card, /specLabels\.doors \? <Spec/);
  assert.match(card, /specLabels\.bags \? <Spec/);
});

test("native KAYAK Cars details use the standard accessible save and share contract", () => {
  assert.match(sandboxDetail, /const saved = useSavedCar\(result, params\)/);
  assert.match(sandboxDetail, /accessibilityLabel=\{saved\.saved \? "Remove car from saved" : "Save car"\}/);
  assert.match(sandboxDetail, /accessibilityState=\{\{ selected: saved\.saved \}\} onPress=\{saved\.toggle\}/);
  assert.match(sandboxDetail, /accessibilityLabel="Share car" onPress=\{\(\) => void Share\.share/);
  assert.match(sandboxDetail, /<Heart size=\{22\}/);
  assert.match(sandboxDetail, /<Share2 size=\{21\}/);
});

test("approved and KAYAK detail rails and content use the Cars canvas", () => {
  for (const detail of [normalDetail, sandboxDetail]) {
    assert.match(detail, /backgroundColor:\s*carTabsPinned\s*\?\s*carCanvasColor\s*:\s*"transparent"/);
    assert.match(detail, /s\.carsTabsRow,\s*\{\s*backgroundColor:\s*carCanvasColor/);
    assert.match(detail, /s\.page,\s*\{\s*backgroundColor:\s*carCanvasColor/);
    assert.doesNotMatch(detail, /s\.carsTabsShell,\s*\{\s*backgroundColor:\s*theme\.surface/);
    assert.doesNotMatch(detail, /s\.pickupSection,\s*\{\s*backgroundColor:\s*theme\.surface/);
  }
});

test("approved and KAYAK details inherit the Results-card price typography contract", () => {
  const resultCard = readFileSync("src/features/search/CarResultCard.tsx", "utf8");
  const compact = (value: string) => value.replace(/\s/g, "");
  for (const detail of [normalDetail, sandboxDetail]) {
    const source = compact(detail);
    assert.match(source, /daily:\{maxWidth:"100%",fontSize:19,lineHeight:22,fontWeight:"600",fontFamily:appFonts\.semibold,letterSpacing:-0\.25,textAlign:"right",fontVariant:\["tabular-nums"\]\}/);
    assert.match(source, /perDay:\{fontSize:10,lineHeight:13,fontWeight:"500",fontFamily:appFonts\.medium/);
    assert.match(source, /dockTotal:\{maxWidth:"100%",fontSize:19,lineHeight:22,fontWeight:"600",fontFamily:appFonts\.semibold,letterSpacing:-0\.25,textAlign:"left",fontVariant:\["tabular-nums"\]\}/);
    assert.match(source, /dockEyebrow:\{flexShrink:1,minWidth:0,fontSize:11,lineHeight:16,fontWeight:"600",fontFamily:appFonts\.semibold\}/);
    assert.doesNotMatch(source, /dockPerDay:/);
  }
  const resultSource = compact(resultCard);
  assert.match(resultSource, /dailyPrice:\{maxWidth:"100%",fontSize:19,fontWeight:"600",fontFamily:appFonts\.semibold,lineHeight:22,letterSpacing:-0\.25,fontVariant:\["tabular-nums"\]/);
  assert.match(resultSource, /perDayLabel:\{maxWidth:"100%",marginTop:1,fontSize:10,fontWeight:"500",fontFamily:appFonts\.medium,lineHeight:13/);
});
