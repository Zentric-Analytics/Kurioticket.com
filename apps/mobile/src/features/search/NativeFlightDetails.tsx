import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Animated, Easing, ImageBackground, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { ArrowLeft, ChevronDown, Heart, Leaf, Luggage } from "lucide-react-native";
import { flightDetailsRouteLabel } from "../../../../../src/lib/flights/flightDetailsContract";
import type { FlightDetailsFareChoice, FlightDetailsOffer, FlightDetailsSuccess } from "../../../../../src/lib/flights/flightDetailsContract";
import { canUseOfferAirlineLogo, resolveSegmentCarrierName } from "../../../../../src/lib/flights/flightDetailsPresentation";
import type { FlightFareTerm, FlightLeg, FlightProviderCondition } from "../../../../../src/lib/types";
import { TravelApiError, travelApi, type FlightResult } from "../../api/travelApi";
import { useAppTheme } from "../../theme/AppTheme";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { mobileLocales } from "../../localization/mobileLocalizationCatalog";
import { readCurrencyPreference } from "../../storage/preferenceStorage";
import { readSession } from "../../storage/sessionStorage";
import { useSavedFlights } from "../../storage/useSavedFlights";
import { flightSavedSignature } from "../../storage/savedMapping";
import { resolveDisplayCurrencyContext, type DisplayPrice, type ExchangeRates } from "../currency/displayCurrency";
import { createFlightDetailFare } from "./flightDetailCurrency";
import { flightShareMessage, shareFlightForAuthenticatedSession } from "./flightDetailInteractions";
import { Button, clock, ui } from "./SearchUi";
import { FlowIcon } from "../flow/FlowIcon";
import { FLIGHT_TRIP_TYPE_LABELS } from "../flow/flightTripTypeLabels";
import { androidFavoriteColors } from "../home/AndroidFavoriteButton";
import { DetailGlassSurface } from "./DetailGlassSurface";
import { AirlineLogo } from "./AirlineLogo";
import { providerLocalFlightDate, providerLocalFlightDateLong } from "./flightArrivalDayOffset";
import { nativeLoadedFareCardWidth } from "./nativeFareRailGeometry";
import { nativeFareBenefitRows } from "./nativeFareBenefitPresentation";
import { nativeFlightDealSelection } from "./nativeFlightDealSelection";
import { FLIGHT_RESULTS_LIGHT_CANVAS } from "./FlightResultsSheetShell";
export { nativeLoadedFareCardWidth } from "./nativeFareRailGeometry";
export { nativeFareBenefitPresentation } from "./nativeFareBenefitPresentation";

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const fareSelection = (current: string | null, fares: FlightDetailsFareChoice[]) =>
  (current && fares.some(({ key }) => key === current) ? current : fares.find(({ selectedOffer }) => selectedOffer)?.key ?? fares[0]?.key ?? null);

export function nativeFlightDetailsCityRouteLabel(tripType: FlightDetailsSuccess["search"]["tripType"], legs: FlightLeg[], fallbackOrigin: string, fallbackDestination: string) {
  const endpointCity=(leg:FlightLeg,endpoint:"origin"|"destination",fallback:string)=>{const segment=endpoint==="origin"?leg.segments[0]:leg.segments.at(-1);const point=endpoint==="origin"?segment?.originDetails:segment?.destinationDetails;return point?.cityName??fallback;};
  if (!legs.length) return `${fallbackOrigin} to ${fallbackDestination}`;
  if (tripType !== "multi-city") return `${endpointCity(legs[0],"origin",fallbackOrigin)} to ${endpointCity(legs[0],"destination",fallbackDestination)}`;
  let route = `${endpointCity(legs[0],"origin",legs[0].originAirport)} to ${endpointCity(legs[0],"destination",legs[0].destinationAirport)}`;
  for (let index=1; index<legs.length; index+=1) {
    const previous=legs[index-1]; const leg=legs[index];
    const origin=endpointCity(leg,"origin",leg.originAirport); const destination=endpointCity(leg,"destination",leg.destinationAirport);
    route += previous.destinationAirport===leg.originAirport ? ` to ${destination}` : ` · ${origin} to ${destination}`;
  }
  return route;
}

export function nativeFlightEditSearchParams(details: FlightDetailsSuccess, incomingCurrency?: string) {
  const { search } = details;
  const result: Record<string, string> = { tripType: search.tripType, origin: search.legs[0]?.origin ?? details.flight.originAirport, destination: search.legs.at(-1)?.destination ?? details.flight.destinationAirport, departureDate: search.departureDate, adults: String(search.adults), children: String(search.children), infants: String(search.infants), travelers: String(search.travelers), cabin: search.cabinClass };
  if (search.returnDate) result.returnDate = search.returnDate;
  if (incomingCurrency && /^[A-Za-z]{3}$/.test(incomingCurrency)) result.currency = incomingCurrency.toUpperCase();
  if (search.tripType === "multi-city") { result.legCount = String(search.legs.length); search.legs.forEach((leg, index) => { const n=index+1; result[`origin${n}`]=leg.origin; result[`destination${n}`]=leg.destination; result[`departureDate${n}`]=leg.departureDate; }); }
  return result;
}

export const nativeFlightFareSelection = fareSelection;
export function nativeCarrierConditionsLinks(offer: FlightDetailsOffer) {
  const carriers = (offer.legs ?? []).flatMap((leg) => leg.segments.flatMap((segment) => [segment.marketingCarrier, segment.operatingCarrier]));
  const entries = carriers.flatMap((carrier) => carrier?.conditionsOfCarriageUrl && /^https:\/\//i.test(carrier.conditionsOfCarriageUrl) ? [{ name: carrier.name, url: carrier.conditionsOfCarriageUrl }] : []);
  const owner = offer.providerDetails?.offerOwner;
  if (owner?.conditionsOfCarriageUrl && /^https:\/\//i.test(owner.conditionsOfCarriageUrl)) entries.push({ name: owner.name, url: owner.conditionsOfCarriageUrl });
  return [...new Map(entries.map((entry) => [entry.url, entry])).values()];
}
const titleCase = (value: string) => value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const sourceMoney = (amount:number,currency:string) => { try{return new Intl.NumberFormat(undefined,{style:"currency",currency,currencyDisplay:"code"}).format(amount)}catch{return `${currency} ${amount.toFixed(2)}`} };
const providerTimestamp = (value:string) => {const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(date)};
const amenityState=(state?:string)=>state==="included"?"Available":state==="not-included"?"Not available":"Not supplied by provider";
const conditionScope=(condition:FlightProviderCondition)=>condition.scope==="trip"?"Whole trip":condition.legIndex!==undefined?`Flight ${condition.legIndex+1}`:condition.scope==="outbound"?"Outbound only":condition.scope==="return"?"Return only":"Leg";
const conditionCategory=(condition:FlightProviderCondition)=>condition.category==="change"?"Changes":titleCase(condition.category);
const conditionState=(condition:FlightProviderCondition)=>{const permission=condition.category==="change"||condition.category==="refund";return condition.state==="allowed"?(permission?"Allowed":"Included"):condition.state==="not-allowed"?(permission?"Not allowed":"Not included"):"Not supplied by provider"};

function savedFlightOffer(details: FlightDetailsSuccess, choice: FlightDetailsFareChoice): FlightResult {
  const offer = choice.offer;
  return {
    ...offer,
    bookingUrl: "",
    partnerRedirectUrl: "",
    searchPolicy: {
      source: offer.provider === "KAYAK sandbox" ? "kayak-sandbox" : "duffel",
      bookable: offer.provider === "KAYAK sandbox" ? false : choice.handoff.available,
      action: {
        kind: "internal-detail",
        href: `/flights/details/${encodeURIComponent(offer.id)}`,
        enabled: true,
      },
    },
  };
}

export function NativeFlightDetails({ params }: { params: Params }) {
  const id = one(params.id) ?? "";
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const intlLocale = mobileLocales.find((option) => option.code === locale)?.intl ?? "en-US";
  const inset = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [details, setDetails] = useState<FlightDetailsSuccess | null>(null);
  const [state, setState] = useState<"loading"|"error"|"unavailable"|"available">("loading");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string|null>(null);
  const [selectedDealOfferId, setSelectedDealOfferId] = useState<string|null>(null);
  const [expandedFareBenefit, setExpandedFareBenefit] = useState<string|null>(null);
  const [tab, setTab] = useState<"deals"|"details"|"conditions"|"extras">("deals");
  const fareHeadingTextColor=theme.dark?theme.textPrimary:"#1A1A1A";
  const contentCanvasColor=theme.dark?theme.background:FLIGHT_RESULTS_LIGHT_CANVAS;
  const [booking, setBooking] = useState(false);
  const [displayPrices, setDisplayPrices] = useState<Record<string,DisplayPrice>>({});
  const [displayPricesReady,setDisplayPricesReady]=useState(false);
  const rates = useRef<ExchangeRates|null>(null);
  const sharePending = useRef(false);
  const preserveMessageOnReload = useRef(false);
  const savedFlights = useSavedFlights();

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState("loading");
    setDisplayPrices({});
    setDisplayPricesReady(false);
    if (preserveMessageOnReload.current) preserveMessageOnReload.current = false;
    else setMessage("");

    const currencyContext = Promise.all([
      readCurrencyPreference().catch(()=>null),
      travelApi.location().catch(()=>null),
      rates.current ? Promise.resolve(rates.current) : travelApi.currencyRates().then(({ rates })=>rates).catch(()=>({})),
    ]).then(([preferred, location, exchange]) => {
      if (Object.keys(exchange).length) rates.current=exchange;
      return {
        currency: resolveDisplayCurrencyContext({ preferredCurrency: preferred, ipCountryCode: location?.countryCode, locale: Intl.DateTimeFormat().resolvedOptions().locale }).resolvedCurrency,
        exchange,
      };
    });

    travelApi.flightDetails(id, { signal: controller.signal }).then((response) => {
      if (!active || controller.signal.aborted) return;
      if (response.status !== "available") { setDetails(null); setMessage(response.error); setState("unavailable"); return; }
      const currentDetails = response;
      setDetails(currentDetails);
      setSelectedKey((current) => fareSelection(current,currentDetails.fareChoices));
      setState("available");
      void currencyContext.then(({ currency, exchange }) => {
        if (!active || controller.signal.aborted) return;
        setDisplayPrices(Object.fromEntries(currentDetails.fareChoices.map((choice)=>[choice.key,createFlightDetailFare(choice.offer.price,choice.offer.currency,currency,exchange)]).concat(currentDetails.fareChoices.flatMap(choice=>choice.deals.map(deal=>[`deal:${deal.key}`,createFlightDetailFare(deal.price,deal.currency,currency,exchange)])))));
        setDisplayPricesReady(true);
      });
    }).catch((error) => { if (!active || controller.signal.aborted) return; setDetails(null); setMessage(error instanceof Error ? error.message : "Flight details could not be loaded."); setState(error instanceof TravelApiError && [404,409].includes(error.status) ? "unavailable" : "error"); });
    return () => { active=false; controller.abort(); };
  }, [id, revision]);
  const selected = details?.fareChoices.find(({ key }) => key === selectedKey) ?? null;
  const fareCardWidth = nativeLoadedFareCardWidth(windowWidth);
  const loadedFareCardWidth = nativeLoadedFareCardWidth(windowWidth, details?.fareChoices.length ?? 0);
  const fare = selected ? displayPrices[selected.key] ?? null : null;
  const selectedDeal=selected?nativeFlightDealSelection(selectedDealOfferId,selected):null;
  useEffect(()=>{if(selected)setSelectedDealOfferId((current)=>nativeFlightDealSelection(current,selected)?.offerId??null);},[selected]);
  const selectedDealPrice=selectedDeal?displayPrices[`deal:${selectedDeal.key}`]??null:null;
  const activePrice=selectedDeal?selectedDealPrice:fare;
  const fareReady = Boolean(displayPricesReady&&activePrice);

  if (state === "loading") return <FlightDetailsLoadingSkeleton theme={theme} topInset={inset.top} bottomInset={inset.bottom} fareCardWidth={fareCardWidth}/>;
  if (state !== "available" || !details || !selected) return <SafeAreaView edges={["top"]} style={[s.safe,{backgroundColor:theme.background}]}><TopBar backgroundColor={theme.background}/><View style={s.center}><Text accessibilityRole="header" style={[s.title,{color:theme.textPrimary}]}>{state === "unavailable" ? "This flight is no longer available" : "We couldn’t load this flight"}</Text><Text style={[s.bodyText,{color:theme.textSecondary}]}>{message}</Text><Button label="Retry" onPress={reload}/><Button label="Back to results" onPress={()=>router.back()}/></View></SafeAreaView>;

  const offer=selected.offer; const activeOffer=selectedDeal?.offer??offer; const provider=selectedDeal?.providerName??(selected.handoff.available ? selected.handoff.providerName : "provider");
  const savedOffer=savedFlightOffer(details, selected);
  const saved=savedFlights.savedFlights.has(flightSavedSignature(savedOffer));
  const tripMetadata=[FLIGHT_TRIP_TYPE_LABELS[details.search.tripType],`${details.search.travelers} traveler${details.search.travelers===1?"":"s"}`,titleCase(details.search.cabinClass)].join(" · ");
  const handoff=async(offerId:string) => { if(booking||!fareReady)return; setBooking(true); setMessage(""); try { const response=await travelApi.flightRedirect(offerId); await Linking.openURL(response.url); } catch(error) { if(error instanceof TravelApiError && error.status===409 && error.details?.code==="offer_changed") { preserveMessageOnReload.current=true; setMessage("The provider updated this offer. Review the refreshed price and terms before continuing."); reload(); } else setMessage(error instanceof Error?error.message:"Booking is currently unavailable."); } finally { setBooking(false); } };
  const share=async()=>{if(sharePending.current)return;sharePending.current=true;try{const outcome=await shareFlightForAuthenticatedSession({readSession,share:(message)=>Share.share({message}),message:flightShareMessage(activeOffer,activePrice?.formatted??"price unavailable")});if(outcome==="sign-in-required")Alert.alert("Sign in required","Sign in to share this flight.",[{text:"Sign in",onPress:()=>router.push("/email-auth")},{text:"Cancel",style:"cancel"}]);}finally{sharePending.current=false;}};
  return <SafeAreaView edges={[]} style={[s.safe,{backgroundColor:contentCanvasColor}]}><StatusBar style="light" translucent backgroundColor="transparent"/><View testID="flight-details-floating-controls" style={[s.heroControls,s.floatingControls,{top:inset.top+8}]}><Pressable accessibilityRole="button" accessibilityLabel="Back to results" onPress={()=>router.back()} style={s.heroIconButton}><DetailGlassSurface dark={false} style={s.heroIconGlass}/><ArrowLeft size={20} color="#0F172A"/></Pressable><View style={s.heroActions}><DetailGlassSurface dark={false} style={s.heroActionsGlass}/><IconButton label={saved?"Remove saved flight":"Save flight"} onPress={()=>savedFlights.toggle(savedOffer,nativeFlightEditSearchParams(details,one(params.currency)))} iconStyle={s.heroHeartIcon}><Heart size={17} color={saved ? androidFavoriteColors.savedStroke : androidFavoriteColors.unsavedStroke} fill={saved?androidFavoriteColors.savedFill:androidFavoriteColors.unsavedFill}/></IconButton><IconButton label="Share flight" onPress={()=>void share()} iconStyle={s.heroShareIcon}><FlowIcon name="share" size={17} color="#0F172A"/></IconButton></View></View><ScrollView testID="flight-details-scroll-content" style={{backgroundColor:contentCanvasColor}} contentContainerStyle={[s.content,{paddingBottom:120+inset.bottom}]}>
    <ImageBackground testID="flight-details-hero" source={require("../../../assets/heroes/flight-details-hero.webp")} resizeMode="cover" style={[s.hero,{paddingTop:inset.top+64}]} imageStyle={s.heroImage}>
      <View style={s.heroOverlay}/>
      <View testID="flight-details-route-summary" style={s.heroCopy}><Text accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={s.route}>{flightDetailsRouteLabel(details.search.tripType,offer.legs??[],offer.originAirport,offer.destinationAirport)}</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={s.routeMetadata}>{tripMetadata}</Text></View>
      <HeroCurve testID="flight-details-hero-curve" color={contentCanvasColor}/>
    </ImageBackground>
    <View style={s.contentBody}>
    <View testID="flight-details-itinerary-overlap" style={s.itineraryStack}>{(offer.legs?.length?offer.legs:[]).map((leg,index)=><Itinerary key={`${leg.departureTime}-${index}`} leg={leg} index={index} offerAirlineName={offer.airlineName} offerAirlineLogo={offer.airlineLogo} theme={theme} intlLocale={intlLocale}/>)}</View>
    {message?<View accessibilityRole="alert" style={s.notice}><Text style={s.noticeText}>{message}</Text></View>:null}
    <Text style={[s.fareSectionTitle,{color:theme.textPrimary}]}>Pick your fare</Text>
    {displayPricesReady?<ScrollView accessibilityRole="radiogroup" accessibilityLabel="Available fares" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.fares,details.fareChoices.length>1?s.faresMultiple:s.faresSingle]}>
      {details.fareChoices.map((choice)=>{
        const isSelected=choice.key===selected.key;
        const isKayak=choice.offer.provider==="KAYAK sandbox";
        const fareTerms=nativeFareBenefitRows(choice.distinguishingTerms,details.search.tripType,3,isKayak?{ensureStandardRows:true,conditions:choice.offer.providerDetails?.conditions}:undefined);
        return <View key={choice.key} style={[s.fareCard,{width:loadedFareCardWidth,backgroundColor:theme.surface,borderColor:isSelected?ui.blue:theme.border},isSelected?s.fareCardSelected:s.fareCardUnselected]}>
          <Pressable accessibilityRole="radio" accessibilityState={{selected:isSelected}} accessibilityLabel={`${choice.label}, ${displayPrices[choice.key]?.accessibilityLabel??"price unavailable"}`} onPress={()=>{setSelectedKey(choice.key);setSelectedDealOfferId(nativeFlightDealSelection(null,choice)?.offerId??null);}} style={StyleSheet.absoluteFillObject}/>
          <View pointerEvents="box-none" style={s.fareContent}>
            <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={s.fareSelectionControl}>
              <View style={s.fareIdentity}><View style={s.fareIconContainer}><Luggage size={15} color={ui.blue}/></View><Text numberOfLines={2} ellipsizeMode="tail" style={[s.fareLabel,{color:theme.textPrimary}]}>{choice.label}</Text></View>
            </View>
            {fareTerms.length?<View pointerEvents="box-none" style={s.fareBenefits}>{fareTerms.map((row)=>{const benefitKey=`${choice.key}:${row.key}`;return <FareBenefitRow key={benefitKey} title={row.title} detail={row.detail} semantic={row.semantic} titleColor={theme.textPrimary} detailColor={theme.textSecondary} expanded={expandedFareBenefit===benefitKey} onToggle={()=>setExpandedFareBenefit((current)=>current===benefitKey?null:benefitKey)}/>})}</View>:null}
          </View>
          <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={s.farePriceBlock}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[s.farePrice,{color:fareHeadingTextColor}]}>{displayPrices[choice.key]?.formatted??"Price unavailable"}</Text></View>
        </View>;
      })}
    </ScrollView>:<ScrollView testID="flight-details-fare-price-loading" accessibilityRole="progressbar" accessibilityState={{busy:true}} accessibilityLabel="Loading fare prices" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.loadingFares,details.fareChoices.length>1?s.faresMultiple:s.faresSingle]}>
      {details.fareChoices.slice(0,2).map((choice)=><View key={choice.key} style={[s.loadingFareCard,{width:loadedFareCardWidth,backgroundColor:theme.surface,borderColor:theme.border}]}>
        <View style={s.loadingFareContent}><View style={s.loadingFareIdentity}><View style={s.loadingFareNameRow}><View style={[s.loadingFareIcon,{backgroundColor:theme.border}]}/><View style={[s.loadingLine,s.loadingFareName,{backgroundColor:theme.border}]}/></View></View>
          {(["88%","72%","80%"] as const).map((width,index)=><View key={index} style={s.loadingBenefitRow}><View style={[s.loadingBenefitDot,{backgroundColor:theme.border}]}/><View style={[s.loadingLine,{width,backgroundColor:theme.border}]}/></View>)}
        </View>
        <View style={s.loadingFarePriceBlock}><View style={[s.loadingLine,s.loadingFarePrice,{backgroundColor:theme.border}]}/></View>
      </View>)}
    </ScrollView>}
    <View testID="fare-information-deck" style={s.fareInfoDeck}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.fareTabRail,{borderBottomColor:theme.border}]} contentContainerStyle={s.fareTabRailContent}>
        <View accessibilityRole="tablist" accessibilityLabel="Fare information" style={s.fareTabList}>{([['deals','Compare deals'],['details','Fare details'],['conditions','Fare conditions'],['extras','Optional extras']] as const).map(([key,label])=><Pressable accessibilityRole="tab" accessibilityState={{selected:tab===key}} key={key} onPress={()=>setTab(key)} style={s.fareInfoTab}><Text numberOfLines={1} style={[s.fareInfoTabText,{color:fareHeadingTextColor},tab===key&&s.fareInfoTabTextActive]}>{label}</Text>{tab===key?<View style={s.fareTabIndicator}/>:null}</Pressable>)}</View>
      </ScrollView>
      <View testID="fare-information-active-content" style={s.fareInfoBody}><FareSurface tab={tab} choice={selected} dealPrices={displayPrices} selectedDealOfferId={selectedDeal?.offerId??null} onSelectDeal={setSelectedDealOfferId} activeOffer={activeOffer} theme={theme}/></View>
    </View>
    </View>
  </ScrollView><View style={[s.sticky,{paddingBottom:Math.max(inset.bottom,10),backgroundColor:theme.surface,borderTopColor:theme.border}]}><View><Text style={[s.small,{color:theme.textSecondary}]}>Total for {details.search.travelers} traveler{details.search.travelers===1?"":"s"}</Text><Text style={[s.total,{color:theme.textPrimary}]}>{displayPricesReady?(activePrice?.formatted??"Price unavailable") : "Loading price…"}</Text></View><Button label={booking?"Checking offer…":`Continue to ${provider}`} disabled={booking||!fareReady||(!selectedDeal&&!selected.handoff.available)} onPress={()=>void handoff(selectedDeal?.offerId??offer.id)}/></View></SafeAreaView>;
}

function FlightDetailsLoadingSkeleton({theme,topInset,bottomInset,fareCardWidth}:{theme:ReturnType<typeof useAppTheme>["theme"];topInset:number;bottomInset:number;fareCardWidth:number}) {
  const [reduceMotion,setReduceMotion]=useState(true);
  const opacity=useRef(new Animated.Value(.55)).current;
  useEffect(()=>{let mounted=true;void AccessibilityInfo.isReduceMotionEnabled().then((enabled)=>{if(mounted)setReduceMotion(enabled);});const subscription=AccessibilityInfo.addEventListener("reduceMotionChanged",setReduceMotion);return()=>{mounted=false;subscription.remove();};},[]);
  useEffect(()=>{opacity.stopAnimation();if(reduceMotion){opacity.setValue(.7);return;}opacity.setValue(.55);const pulse=Animated.loop(Animated.sequence([Animated.timing(opacity,{toValue:1,duration:900,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),Animated.timing(opacity,{toValue:.55,duration:900,easing:Easing.inOut(Easing.sin),useNativeDriver:true})]));pulse.start();return()=>pulse.stop();},[opacity,reduceMotion]);
  const placeholder={backgroundColor:theme.border};
  const contentCanvasColor=theme.dark?theme.background:FLIGHT_RESULTS_LIGHT_CANVAS;
  return <SafeAreaView edges={[]} style={[s.safe,{backgroundColor:contentCanvasColor}]}>
    <StatusBar style={theme.dark?"light":"dark"} translucent backgroundColor="transparent"/>
    {/* Keep the busy announcement separate so it does not group/hide the safe Back action. */}
    <View testID="flight-details-loading-skeleton" accessibilityRole="progressbar" accessibilityState={{busy:true}} accessibilityLabel="Loading flight details" accessible pointerEvents="none" style={StyleSheet.absoluteFillObject}/>
    <View testID="flight-details-loading-controls" style={[s.heroControls,s.floatingControls,{top:topInset+8}]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to results" onPress={()=>router.back()} style={s.heroIconButton}><DetailGlassSurface dark={false} style={s.heroIconGlass}/><ArrowLeft size={20} color="#0F172A"/></Pressable>
      <View testID="flight-details-loading-actions" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.heroActions}>
        <DetailGlassSurface dark={false} style={s.heroActionsGlass}/>
        <View style={s.heroAction}><View style={s.heroHeartIcon}><Heart size={17} color="#94A3B8"/></View></View>
        <View style={s.heroAction}><View style={s.heroShareIcon}><FlowIcon name="share" size={17} color="#94A3B8"/></View></View>
      </View>
    </View>
    <ScrollView testID="flight-details-loading-scroll" style={{backgroundColor:contentCanvasColor}} contentContainerStyle={[s.content,{paddingBottom:120+bottomInset}]}>
      <View testID="flight-details-loading-hero" style={[s.hero,{paddingTop:topInset+64,backgroundColor:theme.dark?"#27272A":"#E2E8F0"}]}>
        <Animated.View testID="flight-details-loading-copy" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.heroCopy,{opacity}]}>
          <View testID="flight-details-loading-route" style={[s.loadingLine,s.loadingRouteLine,placeholder]}/>
          <View testID="flight-details-loading-metadata" style={[s.loadingLine,s.loadingMetadataLine,placeholder]}/>
        </Animated.View>
        <HeroCurve testID="flight-details-loading-hero-curve" color={contentCanvasColor}/>
      </View>
      <Animated.View testID="flight-details-loading-body" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.contentBody,{opacity}]}>
        <View testID="flight-details-loading-itinerary-overlap" style={s.itineraryStack}>
          <View testID="flight-details-loading-itinerary" style={[s.itineraryCard,s.loadingItineraryCard,{backgroundColor:theme.surface,borderColor:theme.border}]}>
            <View testID="flight-details-loading-direction-date" style={s.itineraryHeader}><View style={[s.loadingLine,s.loadingDirectionLine,placeholder]}/><View style={[s.loadingLine,s.loadingDateLine,placeholder]}/></View>
            <View testID="flight-details-loading-journey" style={s.loadingJourneyRow}><View style={[s.loadingLine,s.loadingTimeLine,placeholder]}/><View style={[s.loadingLine,s.loadingPathLine,placeholder]}/><View style={[s.loadingLine,s.loadingTimeLine,placeholder]}/></View>
            <View testID="flight-details-loading-airports" style={s.loadingAirportRow}><View style={[s.loadingLine,s.loadingAirportLine,placeholder]}/><View style={[s.loadingLine,s.loadingAirportLine,placeholder]}/></View>
            <View style={[s.loadingDivider,{backgroundColor:theme.border}]}/>
            <View testID="flight-details-loading-airline" style={[s.loadingLine,s.loadingAirlineLine,placeholder]}/>
          </View>
        </View>
        <View testID="flight-details-loading-fare-heading" style={[s.loadingLine,s.loadingFareHeading,placeholder]}/>
        <ScrollView testID="flight-details-loading-fares" horizontal showsHorizontalScrollIndicator={false} scrollEnabled={false} contentContainerStyle={s.loadingFares}>
          {[0,1].map(key=><View key={key} style={[s.loadingFareCard,{width:fareCardWidth,backgroundColor:theme.surface,borderColor:theme.border}]}>
            <View style={s.loadingFareContent}><View style={s.loadingFareIdentity}><View style={s.loadingFareNameRow}><View style={[s.loadingFareIcon,placeholder]}/><View style={[s.loadingLine,s.loadingFareName,placeholder]}/></View></View>
              {(["88%","72%","80%"] as const).map((width,index)=><View key={index} style={s.loadingBenefitRow}><View style={[s.loadingBenefitDot,placeholder]}/><View style={[s.loadingLine,{width},placeholder]}/></View>)}
            </View>
            <View style={s.loadingFarePriceBlock}><View style={[s.loadingLine,s.loadingFarePrice,placeholder]}/></View>
          </View>)}
        </ScrollView>
        <View testID="flight-details-loading-info" style={s.loadingInfoDeck}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={false} style={s.loadingTabRail}>
            <View testID="flight-details-loading-tabs" style={[s.loadingTabs,{borderBottomColor:theme.border}]}>{[110,90,120,110].map((width,index)=><View key={index} style={[s.loadingLine,{width},placeholder]}/>)}</View>
          </ScrollView>
          <View testID="flight-details-loading-info-content" style={s.loadingInfoBody}>{(["92%","68%","84%"] as const).map((width,index)=><View key={index} style={[s.loadingLine,{width},placeholder]}/>)}</View>
        </View>
      </Animated.View>
    </ScrollView>
    <View testID="flight-details-loading-checkout" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.sticky,{paddingBottom:Math.max(bottomInset,10),backgroundColor:theme.surface,borderTopColor:theme.border}]}>
      <Animated.View style={[s.loadingCheckoutTotal,{opacity}]}><View style={[s.loadingLine,s.loadingCheckoutLabel,placeholder]}/><View style={[s.loadingLine,s.loadingCheckoutPrice,placeholder]}/></Animated.View>
      <Animated.View style={[s.loadingCheckoutButton,placeholder,{opacity}]}/>
    </View>
  </SafeAreaView>;
}

function HeroCurve({testID,color}:{testID:string;color:string}) { return <Svg testID={testID} pointerEvents="none" style={s.heroCurve} viewBox="0 0 100 64" preserveAspectRatio="none"><Path d="M0 12 Q50 64 100 12 L100 64 L0 64 Z" fill={color}/></Svg>; }

function TopBar({backgroundColor,hasScrolled=false,children}:{backgroundColor:string;hasScrolled?:boolean;children?:React.ReactNode}){return <View testID="flight-details-top-bar" style={[s.topBar,{backgroundColor},hasScrolled&&s.topBarScrolled]}><Pressable accessibilityRole="button" accessibilityLabel="Back to results" onPress={()=>router.back()} style={s.back}><ArrowLeft size={18} color={ui.blue}/><Text numberOfLines={1} ellipsizeMode="tail" style={s.backText}>Back to results</Text></Pressable>{children}</View>}
function IconButton({label,onPress,iconStyle,children}:{label:string;onPress:()=>void;iconStyle?:React.ComponentProps<typeof View>["style"];children:React.ReactNode}){return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.heroAction}><View pointerEvents="none" style={iconStyle}>{children}</View></Pressable>}
function FareStatusIcon({semantic}:{semantic:"positive"|"negative"|"informational"}){return <View style={[s.fareStatus,semantic==="positive"?s.fareStatusPositive:s.fareStatusNeutral]}>{semantic==="positive"?<FlowIcon name="check" size={10} color={ui.green}/>:semantic==="negative"?<View style={s.fareStatusMinus}/>:<View style={s.fareStatusDot}/>}</View>}
function FareBenefitRow({title,detail,semantic,titleColor,detailColor,expanded,onToggle}:{title:string;detail:string;semantic:FlightFareTerm["semantic"];titleColor:string;detailColor:string;expanded:boolean;onToggle:()=>void}){const accessibilityTitle=title.replace("/"," and ");return <Pressable accessibilityRole="button" accessibilityLabel={`${accessibilityTitle}${expanded?`, ${detail}`:""}, ${expanded?"collapse details":"expand details"}`} accessibilityState={{expanded}} onPress={onToggle} style={s.fareBenefitRow}><View style={s.fareStatusColumn}><FareStatusIcon semantic={semantic}/></View><View style={s.fareBenefitCopy}><Text style={[s.fareBenefitTitle,{color:titleColor}]}>{title}</Text>{expanded?<Text style={[s.fareBenefitDetail,{color:detailColor}]}>{detail}</Text>:null}</View><View style={s.fareBenefitChevron}><ChevronDown size={13} color={detailColor} style={expanded?s.fareBenefitChevronExpanded:undefined}/></View></Pressable>}
function Itinerary({leg,index,offerAirlineName,offerAirlineLogo,theme,intlLocale}:{leg:FlightLeg;index:number;offerAirlineName:string;offerAirlineLogo?:string|null;theme:ReturnType<typeof useAppTheme>["theme"];intlLocale:string}) {
  const label=leg.direction==="outbound"?"Outbound":leg.direction==="return"?"Return":`Flight ${leg.legIndex??index+1}`;
  const departurePoint=leg.segments[0]?.originDetails;
  const arrivalPoint=leg.segments.at(-1)?.destinationDetails;
  const airportName=(point:typeof departurePoint,fallback:string)=>point?.name??point?.cityName??point?.iataCode??fallback;
  const stopStatus=leg.stops===0?"Non-stop":`${leg.stops} ${leg.stops===1?"stop":"stops"}`;
  const departureTimeZone=departurePoint?.timeZone;
  const arrivalTimeZone=arrivalPoint?.timeZone;
  const hasTechnicalInformation=Boolean(departureTimeZone)||Boolean(arrivalTimeZone);
  const departureDate=providerLocalFlightDateLong(leg.departureTime,intlLocale);
  const departureShortDate=providerLocalFlightDate(leg.departureTime,intlLocale);
  const arrivalShortDate=providerLocalFlightDate(leg.arrivalTime,intlLocale);
  const layoverLabel=(airport:string)=>{const point=leg.segments.flatMap((segment)=>[segment.destinationDetails,segment.originDetails]).find((candidate)=>candidate?.iataCode===airport);return point?.cityName&&point.cityName!==airport?`${point.cityName} • ${airport}`:airport;};
  return <View style={[s.itineraryCard,{backgroundColor:theme.surface,borderColor:theme.border}]}>
    <View style={s.itineraryHeader}>
      <Text style={s.direction}>{label}</Text>
      <Text style={[s.itineraryDate,{color:theme.textSecondary}]}>{departureDate}</Text>
    </View>
    <View style={s.journeySummary}>
      <View style={s.journeyEndpoint}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[s.journeyTime,{color:theme.textPrimary}]}>{clock(leg.departureTime)}</Text>
        <Text style={[s.airportCode,{color:theme.textPrimary}]}>{leg.originAirport}</Text>
        {departureShortDate?<Text numberOfLines={1} style={[s.airportDate,{color:theme.textSecondary}]}>{departureShortDate}</Text>:null}
      </View>
      <View style={s.journeyCenter}>
        <Text style={[s.journeyDuration,{color:theme.textSecondary}]}>{leg.duration}</Text>
        <View style={s.flightPath} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={s.pathDot}/><View style={[s.pathLine,{backgroundColor:theme.border}]}/><FlowIcon name="flight" size={16} color={ui.blue}/><View style={[s.pathLine,{backgroundColor:theme.border}]}/><View style={s.pathDot}/>
        </View>
        <Text style={[s.stopStatus,{color:theme.textSecondary}]}>{stopStatus}</Text>
      </View>
      <View style={[s.journeyEndpoint,s.arrivalEndpoint]}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[s.journeyTime,{color:theme.textPrimary}]}>{clock(leg.arrivalTime)}</Text>
        <Text style={[s.airportCode,{color:theme.textPrimary}]}>{leg.destinationAirport}</Text>
        {arrivalShortDate?<Text numberOfLines={1} style={[s.airportDate,s.arrivalText,{color:theme.textSecondary}]}>{arrivalShortDate}</Text>:null}
      </View>
    </View>
    <View style={s.airportDetails}>
      <View style={s.airportColumn}>
        <Text style={[s.airportName,{color:theme.textPrimary}]}>{airportName(departurePoint,leg.originAirport)}</Text>
        {departurePoint?.terminal?<Text style={[s.terminal,{color:theme.textSecondary}]}>Terminal {departurePoint.terminal}</Text>:null}
      </View>
      <View style={[s.airportColumn,s.arrivalAirportColumn]}>
        <Text style={[s.airportName,s.arrivalText,{color:theme.textPrimary}]}>{airportName(arrivalPoint,leg.destinationAirport)}</Text>
        {arrivalPoint?.terminal?<Text style={[s.terminal,s.arrivalText,{color:theme.textSecondary}]}>Terminal {arrivalPoint.terminal}</Text>:null}
      </View>
    </View>
    <View style={[s.itineraryDivider,{backgroundColor:theme.border}]}/>
    <View style={s.segmentList}>{leg.segments.map((segment,i)=>{
      const carrier=resolveSegmentCarrierName(segment,offerAirlineName);
      const flightNumber=segment.marketingFlightNumber??segment.flightNumber;
      const operatingDiffers=Boolean(segment.operatingCarrier&&(segment.operatingCarrier.name!==segment.marketingCarrier?.name||segment.operatingFlightNumber!==segment.marketingFlightNumber));
      const aircraftName=segment.aircraft?.name?.trim()||segment.aircraft?.iataCode?.trim();
      const aircraftSuffix=segment.aircraft?.name?.trim()&&segment.aircraft?.iataCode?.trim()?` (${segment.aircraft.iataCode.trim()})`:"";
      const layover=i>0?leg.layovers[i-1]:undefined;
      return <View key={`${segment.originAirport}-${segment.destinationAirport}-${segment.departureTime}-${i}`} style={s.segmentItem}>
        {layover?<View style={[s.segmentConnection,{backgroundColor:theme.background}]}><Text style={[s.segmentConnectionText,{color:theme.textSecondary}]}>Connection at {layoverLabel(layover.airport)} · {layover.duration}</Text></View>:null}
        <View style={s.segmentRow}>
          {carrier?<AirlineLogo airlineName={carrier} logoUrl={segment.airlineLogo??(canUseOfferAirlineLogo(segment,offerAirlineName,offerAirlineLogo)?offerAirlineLogo:null)} variant="result-card"/>:null}
          <View style={s.segmentCopy}>
            <View style={s.segmentHeading}><Text style={[s.segmentRoute,{color:theme.textPrimary}]}>{segment.originAirport} → {segment.destinationAirport}</Text><Text style={[s.segmentTimes,{color:theme.textSecondary}]}>{clock(segment.departureTime)} – {clock(segment.arrivalTime)}</Text></View>
            <Text style={[s.segmentMeta,{color:theme.textSecondary}]}>{carrier||"Carrier not supplied"}{flightNumber?` · Flight ${flightNumber}`:""}</Text>
            {operatingDiffers?<Text style={[s.segmentDetail,{color:theme.textSecondary}]}>Operated by {segment.operatingCarrier?.name}{segment.operatingFlightNumber?` · Flight ${segment.operatingFlightNumber}`:""}</Text>:null}
            {aircraftName?<Text style={[s.segmentDetail,{color:theme.textSecondary}]}>Aircraft: {aircraftName}{aircraftSuffix}</Text>:null}
            {segment.distanceKm!==undefined?<Text style={[s.segmentDetail,{color:theme.textSecondary}]}>Flight distance: {Math.round(segment.distanceKm).toLocaleString()} km</Text>:null}
          </View>
        </View>
      </View>;
    })}</View>
    {hasTechnicalInformation?<>
      <View style={[s.itineraryDivider,{backgroundColor:theme.border}]}/>
      <View style={s.technicalInformation}>
        <Text style={[s.technicalHeading,{color:theme.textPrimary}]}>Flight info</Text>
        {departureTimeZone&&arrivalTimeZone&&departureTimeZone===arrivalTimeZone?<View style={s.technicalRow}><Text style={[s.technicalLabel,{color:theme.textPrimary}]}>Time zone</Text><Text style={[s.technicalValue,{color:theme.textSecondary}]}>{departureTimeZone}</Text></View>:<>
          {departureTimeZone?<View style={s.technicalRow}><Text style={[s.technicalLabel,{color:theme.textPrimary}]}>Departure time zone</Text><Text style={[s.technicalValue,{color:theme.textSecondary}]}>{departureTimeZone}</Text></View>:null}
          {arrivalTimeZone?<View style={s.technicalRow}><Text style={[s.technicalLabel,{color:theme.textPrimary}]}>Arrival time zone</Text><Text style={[s.technicalValue,{color:theme.textSecondary}]}>{arrivalTimeZone}</Text></View>:null}
        </>}
      </View>
    </>:null}
  </View>;
}
function FareSurface({tab,choice,dealPrices,selectedDealOfferId,onSelectDeal,activeOffer,theme}:{tab:"deals"|"details"|"conditions"|"extras";choice:FlightDetailsFareChoice;dealPrices:Record<string,DisplayPrice>;selectedDealOfferId:string|null;onSelectDeal:(id:string)=>void;activeOffer:FlightDetailsOffer;theme:ReturnType<typeof useAppTheme>["theme"]}) {
  const offer=activeOffer,p=offer.providerDetails;
  const categoryColor=theme.dark?"#AAB5CD":"#596984";
  const supportingColor=theme.dark?"#94A3B8":"#64748B";
  const cabins=(offer.legs??[]).flatMap(l=>l.segments.flatMap(segment=>(segment.cabinDetails??[]).map(cabin=>({segment,cabin}))));
  const links=nativeCarrierConditionsLinks(offer);
  const conditionGroups=(p?.conditions??[]).reduce<Array<{category:string;conditions:FlightProviderCondition[]}>>((groups,condition)=>{const group=groups.find(({category})=>category===condition.category);if(group)group.conditions.push(condition);else groups.push({category:condition.category,conditions:[condition]});return groups;},[]);
  const detailRow=(label:string,value:unknown,strong=false)=>value===undefined||value===null||value===""?null:<View style={s.detailRow}><Text style={[s.detailLabel,strong&&s.detailTotal,{color:supportingColor}]}>{label}</Text><Text style={[s.detailValue,strong&&s.detailTotal,{color:theme.textPrimary}]}>{String(value)}</Text></View>;
  const groupLabel=(label:string)=><Text style={[s.fareGroupLabel,{color:categoryColor}]}>{label}</Text>;
  const divider=(key:string)=><View key={key} style={[s.fareGroupDivider,{backgroundColor:theme.border}]}/>;
  const freshness=(updatedAt:string)=><View style={s.providerFreshness}><Text style={[s.providerFreshnessLabel,{color:supportingColor}]}>Provider offer last updated</Text><Text style={[s.providerFreshnessValue,{color:supportingColor}]}>{providerTimestamp(updatedAt)}</Text></View>;
  const emptyState=(title:string,description:string)=><View style={s.emptyState}><Text style={[s.emptyTitle,{color:theme.textPrimary}]}>{title}</Text><Text style={[s.emptyDescription,{color:supportingColor}]}>{description}</Text></View>;

  if(tab==="deals") return <View accessibilityRole="radiogroup" accessibilityLabel="Flight deal options" style={s.dealList}>{choice.deals.length?choice.deals.map((deal)=>{const isSelected=deal.offerId===selectedDealOfferId;const price=dealPrices[`deal:${deal.key}`];return <Pressable key={deal.key} accessibilityRole="radio" accessibilityState={{selected:isSelected}} accessibilityLabel={`${deal.providerName}, ${price?.accessibilityLabel??"price unavailable"}, ${choice.label}`} onPress={()=>onSelectDeal(deal.offerId)} style={({pressed})=>[s.dealCard,{backgroundColor:theme.surface,borderColor:isSelected?ui.blue:theme.border},pressed&&s.dealCardPressed]}><View style={s.dealTop}><Text style={[s.dealProvider,{color:theme.textPrimary}]}>{deal.providerName}</Text><View style={[s.dealRadio,{borderColor:isSelected?ui.blue:theme.icon}]}>{isSelected?<View style={s.dealRadioDot}/>:null}</View></View><View style={s.dealBottom}><Text style={[s.dealFareLabel,{color:theme.textSecondary}]}>{choice.label}</Text><Text style={[s.dealPrice,{color:theme.textPrimary}]}>{price?.formatted??"—"}</Text></View></Pressable>}):emptyState("No booking deals available","No additional live provider deals were supplied for this fare.")}</View>;

  if(tab==="details") return <View style={s.infoSections}>
    <View style={s.infoSection}>{cabins.length?cabins.map(({segment,cabin:c},i)=>{const seat=[c.amenities?.seat?.type&&titleCase(c.amenities.seat.type),c.amenities?.seat?.pitch&&`${c.amenities.seat.pitch} in pitch`,c.amenities?.seat?.legroom&&`${titleCase(c.amenities.seat.legroom)} legroom`].filter(Boolean).join(" · ");const hasCabin=Boolean(c.fareBrandName||c.cabinClass||c.cabinMarketingName||c.fareBasisCode);const hasOnBoard=Boolean(seat||c.amenities?.wifi||c.amenities?.power);const wifi=c.amenities?.wifi;const wifiValue=wifi?`${amenityState(wifi.state)}${wifi.state==="included"&&wifi.cost?` (${titleCase(wifi.cost)})`:""}`:undefined;return <View key={i} style={[s.cabinGroup,i>0&&{borderTopColor:theme.border,borderTopWidth:StyleSheet.hairlineWidth}]}><Text style={[s.segmentContext,{color:theme.textPrimary}]}>{segment.originAirport} → {segment.destinationAirport}{segment.marketingFlightNumber??segment.flightNumber?` · ${segment.marketingFlightNumber??segment.flightNumber}`:""}</Text>{hasCabin?<View style={s.fareFactGroup}>{groupLabel("Cabin")}{detailRow("Fare brand",c.fareBrandName)}{detailRow("Cabin",c.cabinClass&&titleCase(c.cabinClass))}{detailRow("Cabin product",c.cabinMarketingName)}{detailRow("Fare basis",c.fareBasisCode)}</View>:null}{hasCabin&&hasOnBoard?divider(`cabin-${i}`):null}{hasOnBoard?<View style={s.fareFactGroup}>{groupLabel("On board")}{detailRow("Seat",seat)}{detailRow("Wi-Fi",wifiValue)}{c.amenities?.power?detailRow("Power",amenityState(c.amenities.power.state)):null}</View>:null}</View>}):<Text style={[s.quietText,{color:supportingColor}]}>Additional cabin details not supplied by the provider.</Text>}</View>
    <View style={[s.infoSection,s.sectionDivider,{borderTopColor:theme.border}]}>{groupLabel("Price breakdown")}{p?.price?<>{p.price.baseAmount!==undefined&&p.price.baseCurrency?detailRow("Base fare",sourceMoney(p.price.baseAmount,p.price.baseCurrency)):null}{p.price.taxAmount!==undefined&&p.price.taxCurrency?detailRow("Taxes",sourceMoney(p.price.taxAmount,p.price.taxCurrency)):null}{detailRow("Trip total",sourceMoney(p.price.totalAmount,p.price.totalCurrency),true)}</>:<Text style={[s.quietText,{color:supportingColor}]}>Price breakdown not supplied by the provider.</Text>}</View>
    {p?.totalEmissionsKg!==undefined?<View style={[s.emissionsCard,{backgroundColor:theme.dark?"#0F2F26":"#ECFDF5"}]}><View style={s.emissionsIdentity}><Leaf size={17} color={theme.dark?"#6EE7B7":"#047857"}/><Text style={[s.emissionsLabel,{color:theme.dark?"#6EE7B7":"#047857"}]}>Estimated CO₂ emissions</Text></View><View style={s.emissionsValueGroup}><Text style={[s.emissionsValue,{color:theme.textPrimary}]}>{p.totalEmissionsKg.toLocaleString()} kg</Text><Text style={[s.emissionsContext,{color:supportingColor}]}>for this offer</Text></View></View>:null}
    {p?.updatedAt?<View style={[s.secondaryFacts,{borderTopColor:theme.border}]}>{freshness(p.updatedAt)}</View>:null}
  </View>;

  if(tab==="conditions") return <View style={s.infoSections}>
    <View>{conditionGroups.length?conditionGroups.map((group,groupIndex)=><View key={group.category} style={[s.conditionGroup,groupIndex>0&&s.sectionDivider,{borderTopColor:theme.border}]}>{groupLabel(conditionCategory(group.conditions[0]))}{group.conditions.map((condition,index)=>{const semantic=condition.state==="allowed"?"positive":condition.state==="not-allowed"?"negative":"informational";const penalty=condition.penaltyAmount!==undefined&&condition.penaltyCurrency?`${sourceMoney(condition.penaltyAmount,condition.penaltyCurrency)} penalty`:null;return <View key={`${condition.scope}-${condition.category}-${index}`} style={[s.conditionRow,index>0&&{borderTopColor:theme.border,borderTopWidth:StyleSheet.hairlineWidth}]}><FareStatusIcon semantic={semantic}/><View style={s.conditionCopy}><Text style={[s.conditionState,{color:theme.textPrimary}]}>{conditionState(condition)}</Text><Text style={[s.conditionScope,{color:supportingColor}]}>{conditionScope(condition)}</Text>{penalty?<Text style={[s.conditionPenalty,{color:supportingColor}]}>{penalty}</Text>:null}</View></View>;})}</View>):emptyState("Fare conditions unavailable","Conditions were not supplied by the provider.")}</View>
    {(p?.passengerIdentityDocumentsRequired||p?.supportedIdentityDocumentTypes?.length)?<View style={[s.infoSection,s.sectionDivider,{borderTopColor:theme.border}]}>{groupLabel("Travel documents")}{p.passengerIdentityDocumentsRequired?<Text style={[s.factDescription,{color:theme.textPrimary}]}>Passport or identity information is required to complete booking.</Text>:null}{p.supportedIdentityDocumentTypes?.length?detailRow("Supported documents",p.supportedIdentityDocumentTypes.map(titleCase).join(", ")):null}</View>:null}
    {(p?.offerOwner||links.length)?<View style={[s.infoSection,s.sectionDivider,{borderTopColor:theme.border}]}>{groupLabel("Airline")}{p?.offerOwner?<Text style={[s.airlineIdentity,{color:theme.textPrimary}]}>{p.offerOwner.name}{p.offerOwner.iataCode?` • ${p.offerOwner.iataCode}`:""}</Text>:null}{links.map(link=><Pressable key={link.url} accessibilityRole="link" accessibilityLabel={`${link.name} conditions of carriage`} onPress={()=>void Linking.openURL(link.url).catch(()=>Alert.alert("Unable to open link","Please try again."))} style={s.linkRow}><Text style={[s.linkText,{color:ui.blue}]}>{link.name} conditions of carriage</Text><FlowIcon name="external" size={17} color={ui.blue}/></Pressable>)}</View>:null}
    {p?.updatedAt?<View style={[s.secondaryFacts,{borderTopColor:theme.border}]}>{freshness(p.updatedAt)}</View>:null}
  </View>;

  if(tab==="extras") return <View style={s.infoSections}><View style={s.infoSection}>{groupLabel("Optional services")}{p?.optionalServices?.length?p.optionalServices.map((service,index)=><View key={`${service.type}-${service.description}-${service.journeyContext||"trip"}-${service.price}-${service.currency}-${service.maximumQuantity??"na"}-${service.travelerCount??"na"}-${index}`} style={[s.serviceRow,index>0&&{borderTopColor:theme.border,borderTopWidth:StyleSheet.hairlineWidth}]}><View style={s.serviceCopy}><View style={s.serviceHeading}><Text style={[s.serviceDescription,{color:theme.textPrimary}]}>{service.description}</Text><Text style={[s.servicePrice,{color:theme.textPrimary}]}>{sourceMoney(service.price,service.currency)}{service.pricedPerTraveler?" each":""}</Text></View>{service.travelerCount?<Text style={[s.serviceMeta,{color:supportingColor}]}>Available for {service.travelerCount} traveler{service.travelerCount===1?"":"s"}</Text>:null}{service.maximumQuantity!==undefined?<Text style={[s.serviceMeta,{color:supportingColor}]}>{service.pricedPerTraveler?"Maximum quantity per traveler":"Maximum quantity"}: {service.maximumQuantity}</Text>:null}{service.journeyContext?<Text style={[s.serviceMeta,{color:supportingColor}]}>{service.journeyContext}</Text>:null}</View></View>):<Text style={[s.quietText,s.optionalServicesEmpty,{color:supportingColor}]}>No optional services were supplied by this provider.</Text>}</View>{p?.supportedLoyaltyProgrammes?.length?<View style={[s.infoSection,s.sectionDivider,{borderTopColor:theme.border}]}>{groupLabel("Loyalty programmes")}<Text style={[s.loyaltyProgrammes,{color:theme.textPrimary}]}>{p.supportedLoyaltyProgrammes.join(", ")}</Text></View>:null}</View>;
}
const s=StyleSheet.create({safe:{flex:1},loadingLine:{height:10,borderRadius:5},loadingRouteLine:{width:"62%",height:32,borderRadius:8},loadingMetadataLine:{width:"58%",height:16},loadingItineraryCard:{height:226},loadingDateLine:{width:"34%",height:12},loadingDirectionLine:{width:"24%",height:9},loadingJourneyRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:18,marginTop:25},loadingTimeLine:{width:"22%",height:16},loadingPathLine:{flex:1,height:4},loadingAirportRow:{flexDirection:"row",justifyContent:"space-between",marginTop:11},loadingAirportLine:{width:"18%",height:12},loadingDivider:{height:StyleSheet.hairlineWidth,marginVertical:28},loadingAirlineLine:{width:"48%",height:12},loadingFareHeading:{width:132,height:22,marginTop:8},loadingFares:{gap:10,paddingRight:38},loadingFareCard:{height:142,position:"relative",borderWidth:1,borderRadius:15,paddingHorizontal:12,paddingTop:4,paddingBottom:8,gap:4},loadingFareContent:{alignSelf:"stretch",gap:4,paddingBottom:28},loadingFareIdentity:{alignSelf:"stretch",alignItems:"center",gap:1},loadingFareNameRow:{maxWidth:"100%",flexDirection:"row",alignItems:"flex-start",gap:6},loadingFareIcon:{width:16,height:16,borderRadius:4,flexShrink:0},loadingFareName:{width:72,height:12,marginTop:2},loadingFarePriceBlock:{position:"absolute",bottom:6,left:12,right:12,alignItems:"center"},loadingFarePrice:{width:82,height:16},loadingBenefitRow:{flexDirection:"row",alignItems:"center",gap:7},loadingBenefitDot:{width:16,height:16,borderRadius:8},loadingCheckoutTotal:{gap:7,flex:1},loadingCheckoutLabel:{width:"80%",maxWidth:130,height:12},loadingCheckoutPrice:{width:"70%",maxWidth:112,height:26},loadingCheckoutButton:{width:"48%",maxWidth:190,height:45,borderRadius:8},loadingInfoDeck:{height:174,marginTop:10},loadingTabRail:{flexGrow:0,marginHorizontal:-10},loadingTabs:{height:48,borderBottomWidth:1,flexDirection:"row",alignItems:"center",gap:22},loadingInfoBody:{flex:1,paddingHorizontal:4,paddingVertical:18,gap:17},topBar:{minHeight:52,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:16,paddingVertical:4,zIndex:1},topBarScrolled:{borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:"rgba(15, 23, 42, 0.12)"},back:{minHeight:44,flexShrink:1,minWidth:0,flexDirection:"row",alignItems:"center",gap:7},backText:{color:ui.blue,fontWeight:"800",flexShrink:1},center:{flex:1,justifyContent:"center",padding:24,gap:16},content:{paddingTop:0},contentBody:{paddingHorizontal:18,gap:14},hero:{minHeight:318,justifyContent:"flex-end",paddingHorizontal:18,paddingBottom:122},heroImage:{},heroOverlay:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(5, 13, 26, 0.38)"},heroCurve:{position:"absolute",left:0,right:0,bottom:-1,width:"100%",height:65},heroControls:{position:"absolute",left:16,right:16,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},floatingControls:{zIndex:20,elevation:12},heroActions:{width:88,height:44,flexDirection:"row",shadowColor:"#0F172A",shadowOffset:{width:0,height:2},shadowOpacity:.12,shadowRadius:6,elevation:6},heroActionsGlass:{position:"absolute",left:0,right:0,top:2,bottom:2,borderRadius:20},heroAction:{width:44,height:44,alignItems:"center",justifyContent:"center"},heroHeartIcon:{transform:[{translateX:4}]},heroShareIcon:{transform:[{translateX:-4}]},heroIconButton:{width:44,height:44,borderRadius:22,alignItems:"center",justifyContent:"center",shadowColor:"#0F172A",shadowOffset:{width:0,height:2},shadowOpacity:.12,shadowRadius:6,elevation:6},heroIconGlass:{position:"absolute",left:2,right:2,top:2,bottom:2,borderRadius:20},heroCopy:{gap:3},title:{fontSize:23,fontWeight:"900"},route:{color:"#FFFFFF",fontSize:27,lineHeight:32,fontWeight:"800",textShadowColor:"rgba(0, 0, 0, 0.35)",textShadowOffset:{width:0,height:1},textShadowRadius:4},routeMetadata:{color:"#FFFFFF",fontSize:11,lineHeight:16,fontWeight:"700",letterSpacing:.55,textTransform:"uppercase",textShadowColor:"rgba(0, 0, 0, 0.4)",textShadowOffset:{width:0,height:1},textShadowRadius:3},bodyText:{fontSize:14,lineHeight:20},sectionTitle:{fontSize:20,fontWeight:"900",marginTop:8},fareSectionTitle:{fontSize:17,lineHeight:22,fontWeight:"700",marginTop:8},card:{borderWidth:1,borderRadius:14,padding:14,gap:7},itineraryStack:{gap:14,marginHorizontal:-10,marginTop:-104,zIndex:1},itineraryCard:{borderWidth:1,borderRadius:15,padding:15,gap:0,shadowColor:"#0F172A",shadowOffset:{width:0,height:3},shadowOpacity:.07,shadowRadius:12,elevation:1},itineraryHeader:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:12},direction:{color:ui.blue,flexShrink:1,fontSize:10,lineHeight:14,fontWeight:"700",letterSpacing:.4,textTransform:"uppercase"},itineraryDate:{flexShrink:0,fontSize:11,lineHeight:15,fontWeight:"500",textAlign:"right"},journeySummary:{flexDirection:"row",alignItems:"center",gap:8,marginTop:14},journeyEndpoint:{flex:1.1,minWidth:0,gap:3},arrivalEndpoint:{alignItems:"flex-end"},journeyTime:{fontSize:16,lineHeight:21,fontWeight:"700"},airportCode:{fontSize:12,lineHeight:16,fontWeight:"700"},airportDate:{marginTop:1,fontSize:9.5,lineHeight:12,fontWeight:"500"},journeyCenter:{flex:.8,minWidth:72,alignItems:"center",gap:5},journeyDuration:{fontSize:11,lineHeight:16,fontWeight:"600",textAlign:"center"},flightPath:{alignSelf:"stretch",flexDirection:"row",alignItems:"center"},pathDot:{width:6,height:6,borderRadius:3,backgroundColor:ui.blue,flexShrink:0},pathLine:{height:StyleSheet.hairlineWidth,flex:1,minWidth:4},stopStatus:{fontSize:10,lineHeight:13,fontWeight:"500",textAlign:"center"},airportDetails:{flexDirection:"row",alignItems:"flex-start",gap:20,marginTop:14},airportColumn:{flex:1,minWidth:0,gap:6},arrivalAirportColumn:{alignItems:"flex-end"},airportName:{fontSize:12,lineHeight:17,fontWeight:"500"},terminal:{fontSize:11,lineHeight:16,fontWeight:"400"},arrivalText:{textAlign:"right"},itineraryDivider:{height:StyleSheet.hairlineWidth,marginVertical:12},segmentList:{gap:0},segmentItem:{gap:0},segmentConnection:{borderRadius:9,paddingHorizontal:11,paddingVertical:9,marginBottom:2},segmentConnectionText:{fontSize:11,lineHeight:16,fontWeight:"500"},segmentRow:{flexDirection:"row",alignItems:"flex-start",gap:10,paddingVertical:9},segmentCopy:{flex:1,minWidth:0,gap:2},segmentHeading:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:10},segmentRoute:{flexShrink:1,fontSize:13,lineHeight:18,fontWeight:"600"},segmentTimes:{flexShrink:0,maxWidth:"48%",fontSize:11,lineHeight:16,fontWeight:"500",textAlign:"right"},segmentMeta:{fontSize:11,lineHeight:16,fontWeight:"500"},segmentDetail:{fontSize:11,lineHeight:16,fontWeight:"400"},technicalInformation:{gap:6},technicalHeading:{fontSize:11,lineHeight:15,fontWeight:"600",letterSpacing:.7,textTransform:"uppercase",marginBottom:2},technicalRow:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:12},technicalLabel:{flex:1,minWidth:0,fontSize:11,lineHeight:16,fontWeight:"500"},technicalValue:{flexShrink:1,maxWidth:"52%",fontSize:11,lineHeight:16,fontWeight:"400",textAlign:"right"},small:{fontSize:12,lineHeight:17},fares:{alignItems:"flex-start",gap:10},faresMultiple:{paddingRight:38},faresSingle:{paddingRight:0},fareCard:{borderRadius:15,minHeight:142,position:"relative",paddingHorizontal:12,paddingTop:4,paddingBottom:8,gap:4},fareCardSelected:{borderWidth:1.5},fareCardUnselected:{borderWidth:1},fareContent:{alignSelf:"stretch",gap:4,paddingBottom:28},fareSelectionControl:{alignSelf:"stretch",alignItems:"flex-start"},fareIdentity:{alignSelf:"center",maxWidth:"100%",flexDirection:"row",alignItems:"flex-start",gap:6},fareIconContainer:{width:16,alignItems:"center",justifyContent:"center",flexShrink:0,paddingTop:1},fareLabel:{flexShrink:1,minWidth:0,fontSize:13,lineHeight:17,fontWeight:"700"},farePriceBlock:{position:"absolute",bottom:6,left:12,right:12,alignItems:"center",maxWidth:"100%"},farePrice:{maxWidth:"100%",fontSize:18,lineHeight:22,fontWeight:"800",textAlign:"center"},fareBenefits:{alignSelf:"stretch",alignItems:"flex-start",gap:4},fareBenefitRow:{alignSelf:"stretch",maxWidth:"100%",paddingRight:10,flexDirection:"row",alignItems:"flex-start",gap:7},fareStatusColumn:{width:15,alignItems:"center"},fareStatus:{width:14,height:14,borderRadius:7,borderWidth:1,alignItems:"center",justifyContent:"center"},fareStatusPositive:{borderColor:ui.green},fareStatusNeutral:{borderColor:"#94A3B8"},fareStatusMinus:{width:7,height:1.5,borderRadius:1,backgroundColor:"#64748B"},fareStatusDot:{width:3,height:3,borderRadius:2,backgroundColor:"#64748B"},fareBenefitCopy:{flex:1,minWidth:0,gap:1},fareBenefitTitle:{fontSize:12,lineHeight:17,fontWeight:"600"},fareBenefitChevron:{width:15,flexShrink:0,alignItems:"center",paddingTop:2},fareBenefitChevronExpanded:{transform:[{rotate:"180deg"}]},fareBenefitDetail:{fontSize:11,lineHeight:16,fontWeight:"400"},fareInfoDeck:{gap:0,marginTop:10},fareTabRail:{flexGrow:0,borderBottomWidth:1,marginHorizontal:-10},fareTabRailContent:{paddingHorizontal:0},fareTabList:{flexDirection:"row",gap:22},fareInfoTab:{minHeight:48,justifyContent:"center",position:"relative",paddingHorizontal:0},fareInfoTabText:{fontSize:15,lineHeight:21,fontWeight:"600"},fareInfoTabTextActive:{fontWeight:"700"},fareTabIndicator:{position:"absolute",height:2,borderRadius:1,backgroundColor:ui.blue,left:0,right:0,bottom:0},fareInfoBody:{paddingHorizontal:4,paddingVertical:4},infoSections:{gap:0},infoSection:{paddingVertical:12},sectionDivider:{borderTopWidth:StyleSheet.hairlineWidth},fareGroupLabel:{fontSize:11,lineHeight:15,fontWeight:"600",letterSpacing:.7,textTransform:"uppercase",marginBottom:8},segmentContext:{fontSize:14,lineHeight:19,fontWeight:"500",marginBottom:10},cabinGroup:{paddingVertical:10},fareFactGroup:{gap:7},fareGroupDivider:{height:StyleSheet.hairlineWidth,marginVertical:11},detailRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",gap:16},detailLabel:{flexShrink:0,fontSize:13,lineHeight:18,fontWeight:"500"},detailValue:{flex:1,fontSize:13,lineHeight:18,fontWeight:"400",textAlign:"right"},detailTotal:{fontWeight:"600"},quietText:{fontSize:13,lineHeight:19,fontWeight:"400"},emissionsCard:{marginVertical:12,borderRadius:8,paddingHorizontal:11,paddingVertical:9,flexDirection:"row",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:8},emissionsIdentity:{flexDirection:"row",alignItems:"center",flexGrow:1,flexShrink:1,minWidth:180,gap:7},emissionsLabel:{flexShrink:1,fontSize:13,lineHeight:18,fontWeight:"600"},emissionsValueGroup:{marginLeft:"auto",alignItems:"flex-end",flexShrink:1},emissionsValue:{fontSize:14,lineHeight:18,fontWeight:"600",textAlign:"right"},emissionsContext:{fontSize:11,lineHeight:15,fontWeight:"400",textAlign:"right"},secondaryFacts:{borderTopWidth:StyleSheet.hairlineWidth,paddingVertical:11},providerFreshness:{gap:1},providerFreshnessLabel:{fontSize:11,lineHeight:16,fontWeight:"500"},providerFreshnessValue:{fontSize:11,lineHeight:16,fontWeight:"400"},emptyState:{paddingVertical:18,paddingHorizontal:10,alignItems:"center",gap:5},emptyTitle:{fontSize:14,lineHeight:19,fontWeight:"500",textAlign:"center"},emptyDescription:{fontSize:13,lineHeight:19,fontWeight:"400",textAlign:"center"},dealList:{gap:10,paddingVertical:12},dealCard:{minHeight:96,borderWidth:1,borderRadius:14,paddingHorizontal:14,paddingVertical:12,justifyContent:"space-between",gap:14},dealCardPressed:{opacity:.88},dealTop:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:12},dealProvider:{flex:1,minWidth:0,fontSize:15,lineHeight:20,fontWeight:"700"},dealRadio:{width:18,height:18,borderRadius:9,borderWidth:1.5,alignItems:"center",justifyContent:"center"},dealRadioDot:{width:7,height:7,borderRadius:4,backgroundColor:ui.blue},dealBottom:{flexDirection:"row",alignItems:"flex-end",justifyContent:"space-between",gap:12},dealFareLabel:{flex:1,minWidth:0,fontSize:12,lineHeight:17,fontWeight:"500"},dealPrice:{flexShrink:0,maxWidth:"60%",fontSize:18,lineHeight:22,fontWeight:"800",textAlign:"right",fontVariant:["tabular-nums"]},conditionGroup:{paddingVertical:12},conditionRow:{paddingVertical:7,flexDirection:"row",alignItems:"flex-start",gap:11},conditionCopy:{flex:1,minWidth:0,gap:1},conditionState:{fontSize:13,lineHeight:18,fontWeight:"500"},conditionScope:{fontSize:11,lineHeight:16,fontWeight:"400"},conditionPenalty:{fontSize:11,lineHeight:16,fontWeight:"400"},factDescription:{fontSize:13,lineHeight:19,fontWeight:"400",marginBottom:7},airlineIdentity:{fontSize:13,lineHeight:19,fontWeight:"500",marginBottom:3},linkRow:{minHeight:44,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},linkText:{flex:1,fontSize:13,lineHeight:18,fontWeight:"600"},serviceRow:{paddingVertical:12},serviceCopy:{minWidth:0,gap:3},serviceHeading:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:12},serviceDescription:{flex:1,fontSize:13,lineHeight:18,fontWeight:"500"},servicePrice:{flexShrink:0,maxWidth:"42%",fontSize:13,lineHeight:18,fontWeight:"500",textAlign:"right"},serviceMeta:{fontSize:12,lineHeight:17,fontWeight:"400"},optionalServicesEmpty:{paddingBottom:2},loyaltyProgrammes:{fontSize:13,lineHeight:19,fontWeight:"500",flexWrap:"wrap"},notice:{padding:12,borderRadius:10,borderWidth:1,borderColor:ui.blue},noticeText:{color:ui.blue,fontWeight:"700"},sticky:{position:"absolute",left:0,right:0,bottom:0,minHeight:88,borderTopWidth:1,paddingHorizontal:18,paddingTop:10,flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:12},total:{fontSize:22,fontWeight:"900"}});
