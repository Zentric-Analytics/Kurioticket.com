import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Animated, Easing, Linking, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Heart, Leaf, Luggage } from "lucide-react-native";
import { flightDetailsRouteLabel } from "../../../../../src/lib/flights/flightDetailsContract";
import type { FlightDetailsFareChoice, FlightDetailsOffer, FlightDetailsSuccess } from "../../../../../src/lib/flights/flightDetailsContract";
import { canUseOfferAirlineLogo, compactFareTerms, resolveSegmentCarrierName } from "../../../../../src/lib/flights/flightDetailsPresentation";
import type { FlightFareTerm, FlightLeg, FlightProviderCondition } from "../../../../../src/lib/types";
import { TravelApiError, travelApi, type FlightResult } from "../../api/travelApi";
import { useAppTheme } from "../../theme/AppTheme";
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
import { AirlineLogo } from "./AirlineLogo";

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const fareSelection = (current: string | null, fares: FlightDetailsFareChoice[]) =>
  (current && fares.some(({ key }) => key === current) ? current : fares.find(({ selectedOffer }) => selectedOffer)?.key ?? fares[0]?.key ?? null);
const loadedFareGap = 10;
const fareRailHorizontalInset = 36;
const nextFareReveal = 54;
const minimumLoadedFareWidth = 236;
const maximumLoadedFareWidth = 330;
const maximumSingleFareWidth = 394;

export const nativeLoadedFareCardWidth = (windowWidth: number, fareCount: number) => {
  const availableWidth = windowWidth - fareRailHorizontalInset;
  if (fareCount <= 1) return Math.min(maximumSingleFareWidth, Math.max(minimumLoadedFareWidth, availableWidth));
  return Math.min(maximumLoadedFareWidth, Math.max(minimumLoadedFareWidth, availableWidth - nextFareReveal));
};

export const nativeInitialFareRailOffset = (selectedIndex: number, cardWidth: number, viewportWidth: number, fareCount: number) => {
  if (selectedIndex <= 0 || fareCount <= 1) return 0;
  const contentWidth = fareCount * cardWidth + (fareCount - 1) * loadedFareGap;
  return Math.max(0, Math.min(selectedIndex * (cardWidth + loadedFareGap) - 18, contentWidth - viewportWidth));
};

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

export function nativeFareBenefitPresentation(category:FlightFareTerm["category"],text:string){
  const scoped=text.match(/^(Outbound|Return|Flight \d+):\s*(.+)$/i);
  const scope=scoped?.[1];
  const body=scoped?.[2]??text;
  if(category==="baggage"){
    const baggage=body.match(/^(\d+)\s+(carry-ons?|checked bags?)\s+included(?:\s+(each way))?$/i);
    if(baggage){
      const title=baggage[2].toLowerCase().startsWith("carry")?"Carry-on baggage":"Checked baggage";
      return {title:scope?`${scope}: ${title}`:title,value:`${baggage[1]} included${baggage[3]?` ${baggage[3]}`:""}`};
    }
  }
  if(category==="change"||category==="refund"){
    const penalty=body.match(/^(.*?)\s+with\s+(.+\s+penalty)$/i);
    if(penalty)return {title:scope?`${scope}: ${penalty[1]}`:penalty[1],detail:penalty[2]};
  }
  return {title:text};
}

function savedFlightOffer(details: FlightDetailsSuccess, choice: FlightDetailsFareChoice): FlightResult {
  const offer = choice.offer;
  return {
    ...offer,
    // Authoritative native Details never receives provider URLs. These legacy
    // fields remain empty in the Saved snapshot; checkout continues through
    // the server-owned ID-based redirect handoff.
    bookingUrl: "",
    partnerRedirectUrl: "",
    searchPolicy: {
      source: "duffel",
      bookable: choice.handoff.available,
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
  const inset = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [details, setDetails] = useState<FlightDetailsSuccess | null>(null);
  const [state, setState] = useState<"loading"|"error"|"unavailable"|"available">("loading");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string|null>(null);
  const [tab, setTab] = useState<"deals"|"details"|"conditions"|"extras">("deals");
  const [booking, setBooking] = useState(false);
  const [displayPrices, setDisplayPrices] = useState<Record<string,DisplayPrice>>({});
  const rates = useRef<ExchangeRates|null>(null);
  const fareRailRef = useRef<ScrollView|null>(null);
  const positionedFareSetRef = useRef<string|null>(null);
  const sharePending = useRef(false);
  const hasScrolledRef = useRef(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const preserveMessageOnReload = useRef(false);
  const savedFlights = useSavedFlights();

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    positionedFareSetRef.current=null;
    setState("loading");
    if (preserveMessageOnReload.current) preserveMessageOnReload.current = false;
    else setMessage("");
    travelApi.flightDetails(id, { signal: controller.signal }).then((response) => {
      if (response.status !== "available") { setDetails(null); setMessage(response.error); setState("unavailable"); return; }
      setDetails(response); setSelectedKey((current) => fareSelection(current, response.fareChoices)); setState("available");
    }).catch((error) => { if (controller.signal.aborted) return; setDetails(null); setMessage(error instanceof Error ? error.message : "Flight details could not be loaded."); setState(error instanceof TravelApiError && [404,409].includes(error.status) ? "unavailable" : "error"); });
    return () => controller.abort();
  }, [id, revision]);
  const selected = details?.fareChoices.find(({ key }) => key === selectedKey) ?? null;
  const fareCardWidth = Math.min(290, Math.max(250, windowWidth - 86));
  const loadedFareCardWidth = nativeLoadedFareCardWidth(windowWidth, details?.fareChoices.length ?? 0);
  const fare = selected ? displayPrices[selected.key] ?? null : null;
  const fareReady = Boolean(fare);
  useEffect(() => {
    if (!details) { setDisplayPrices({}); return; }
    let active=true;
    Promise.all([
      readCurrencyPreference().catch(()=>null),
      travelApi.location().catch(()=>null),
      rates.current ? Promise.resolve(rates.current) : travelApi.currencyRates().then(({ rates })=>rates).catch(()=>({})),
    ]).then(([preferred, location, exchange]) => {
      if (!active) return;
      if (Object.keys(exchange).length) rates.current=exchange;
      const currency=resolveDisplayCurrencyContext({ preferredCurrency: preferred, ipCountryCode: location?.countryCode, locale: Intl.DateTimeFormat().resolvedOptions().locale }).resolvedCurrency;
      setDisplayPrices(Object.fromEntries(details.fareChoices.map((choice)=>[choice.key,createFlightDetailFare(choice.offer.price,choice.offer.currency,currency,exchange)]).concat(details.fareChoices.flatMap(choice=>choice.deals.map(deal=>[`deal:${deal.key}`,createFlightDetailFare(deal.price,deal.currency,currency,exchange)])))));
    }); return()=>{active=false;};
  }, [details, revision]);

  if (state === "loading") return <FlightDetailsLoadingSkeleton theme={theme} bottomInset={inset.bottom} fareCardWidth={fareCardWidth}/>;
  if (state !== "available" || !details || !selected) return <SafeAreaView edges={["top"]} style={[s.safe,{backgroundColor:theme.background}]}><TopBar backgroundColor={theme.background}/><View style={s.center}><Text accessibilityRole="header" style={[s.title,{color:theme.textPrimary}]}>{state === "unavailable" ? "This flight is no longer available" : "We couldn’t load this flight"}</Text><Text style={[s.bodyText,{color:theme.textSecondary}]}>{message}</Text><Button label="Retry" onPress={reload}/><Button label="Back to results" onPress={()=>router.back()}/></View></SafeAreaView>;

  const offer=selected.offer; const provider=selected.handoff.available ? selected.handoff.providerName : "provider";
  const savedOffer=savedFlightOffer(details, selected);
  const saved=savedFlights.savedFlights.has(flightSavedSignature(savedOffer));
  const tripMetadata=`${FLIGHT_TRIP_TYPE_LABELS[details.search.tripType]} • ${details.search.travelers} traveler${details.search.travelers===1?"":"s"}`;
  const handoff=async(offerId:string) => { if(booking||!fareReady)return; setBooking(true); setMessage(""); try { const response=await travelApi.flightRedirect(offerId); await Linking.openURL(response.url); } catch(error) { if(error instanceof TravelApiError && error.status===409 && error.details?.code==="offer_changed") { preserveMessageOnReload.current=true; setMessage("The provider updated this offer. Review the refreshed price and terms before continuing."); reload(); } else setMessage(error instanceof Error?error.message:"Booking is currently unavailable."); } finally { setBooking(false); } };
  const share=async()=>{if(sharePending.current)return;sharePending.current=true;try{const outcome=await shareFlightForAuthenticatedSession({readSession,share:(message)=>Share.share({message}),message:flightShareMessage(offer,fare?.formatted??"price unavailable")});if(outcome==="sign-in-required")Alert.alert("Sign in required","Sign in to share this flight.",[{text:"Sign in",onPress:()=>router.push("/email-auth")},{text:"Cancel",style:"cancel"}]);}finally{sharePending.current=false;}};
  return <SafeAreaView edges={["top"]} style={[s.safe,{backgroundColor:theme.background}]}><TopBar backgroundColor={theme.background} hasScrolled={hasScrolled}><View style={s.topActions}><IconButton label={saved?"Remove saved flight":"Save flight"} onPress={()=>savedFlights.toggle(savedOffer,nativeFlightEditSearchParams(details,one(params.currency)))}><Heart size={20} color={saved ? androidFavoriteColors.savedStroke : androidFavoriteColors.unsavedStroke} fill={saved?androidFavoriteColors.savedFill:androidFavoriteColors.unsavedFill}/></IconButton><IconButton label="Share flight" onPress={()=>void share()}><FlowIcon name="share" size={20} color={theme.icon}/></IconButton></View></TopBar><ScrollView testID="flight-details-scroll-content" scrollEventThrottle={16} onScroll={({nativeEvent})=>{const next=nativeEvent.contentOffset.y>1;if(next!==hasScrolledRef.current){hasScrolledRef.current=next;setHasScrolled(next);}}} contentContainerStyle={[s.content,{paddingBottom:120+inset.bottom}]}>
    {message?<View accessibilityRole="alert" style={s.notice}><Text style={s.noticeText}>{message}</Text></View>:null}
    <View testID="flight-details-route-summary" style={s.routeSummary}><View style={s.routeContent}><Text accessibilityRole="header" style={[s.route,{color:theme.textPrimary}]}>{flightDetailsRouteLabel(details.search.tripType,offer.legs??[],offer.originAirport,offer.destinationAirport)}</Text><Text style={[s.bodyText,{color:theme.textSecondary}]}>{tripMetadata}</Text></View></View>
    <View style={s.itineraryStack}>{(offer.legs?.length?offer.legs:[]).map((leg,index)=><Itinerary key={`${leg.departureTime}-${index}`} leg={leg} index={index} offerAirlineName={offer.airlineName} offerAirlineLogo={offer.airlineLogo} theme={theme}/>)}</View>
    <Text style={[s.fareSectionTitle,{color:theme.textPrimary}]}>Pick your fare</Text>
    <ScrollView ref={fareRailRef} accessibilityRole="radiogroup" accessibilityLabel="Available fares" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.fares,details.fareChoices.length>1?s.faresMultiple:s.faresSingle]} onContentSizeChange={()=>{const fareSet=details.fareChoices.map(({key})=>key).join("|");if(positionedFareSetRef.current===fareSet)return;positionedFareSetRef.current=fareSet;const selectedIndex=details.fareChoices.findIndex(({key})=>key===selected.key);fareRailRef.current?.scrollTo({x:nativeInitialFareRailOffset(selectedIndex,loadedFareCardWidth,windowWidth-fareRailHorizontalInset,details.fareChoices.length),animated:false});}}>
      {details.fareChoices.map((choice)=>{
        const isSelected=choice.key===selected.key;
        const fareTerms=compactFareTerms(choice.distinguishingTerms,details.search.tripType);
        return <Pressable accessibilityRole="radio" accessibilityState={{selected:isSelected}} key={choice.key} onPress={()=>setSelectedKey(choice.key)} style={[s.fareCard,{width:loadedFareCardWidth,backgroundColor:theme.surface,borderColor:isSelected?ui.blue:theme.border},isSelected?s.fareCardSelected:s.fareCardUnselected]}>
          <View style={s.fareIdentity}>
            <View style={[s.fareIconContainer,{backgroundColor:isSelected?"rgba(7, 94, 232, 0.08)":theme.background}]}><Luggage size={18} color={ui.blue}/></View>
            <View style={s.fareIdentityCopy}>
              <Text style={[s.fareLabel,{color:theme.textPrimary}]}>{choice.label}</Text>
              <Text accessibilityLabel={displayPrices[choice.key]?.accessibilityLabel} style={[s.farePrice,{color:isSelected?ui.blue:theme.textPrimary}]}>{displayPrices[choice.key]?.formatted??"—"}</Text>
            </View>
          </View>
          {fareTerms.length?<View style={s.fareBenefits}>{fareTerms.map((row,i)=><FareBenefitRow key={`${row.index}-${row.rowIndex}-${i}`} category={row.term.category} semantic={row.term.semantic} text={row.text} titleColor={theme.textPrimary} detailColor={theme.textSecondary}/>)}</View>:null}
        </Pressable>;
      })}
    </ScrollView>
    <View testID="fare-information-deck" style={[s.fareInfoDeck,{backgroundColor:theme.surface,borderColor:theme.border}]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.fareTabRail} contentContainerStyle={s.fareTabRailContent}>
        <View accessibilityRole="tablist" style={s.fareTabList}>{([['deals','Compare deals'],['details','Fare details'],['conditions','Fare conditions'],['extras','Optional extras']] as const).map(([key,label])=><Pressable accessibilityRole="tab" accessibilityState={{selected:tab===key}} key={key} onPress={()=>setTab(key)} style={s.fareInfoTab}><Text numberOfLines={1} style={[s.fareInfoTabText,{color:tab===key?ui.blue:theme.textSecondary},tab===key&&s.fareInfoTabTextActive]}>{label}</Text>{tab===key?<View style={s.fareTabIndicator}/>:null}</Pressable>)}</View>
      </ScrollView>
      <View style={[s.fareInfoDivider,{backgroundColor:theme.border}]}/>
      <View style={s.fareInfoBody}><FareSurface tab={tab} choice={selected} dealPrices={displayPrices} onDeal={handoff} booking={booking} fareReady={fareReady} theme={theme}/></View>
    </View>
  </ScrollView><View style={[s.sticky,{paddingBottom:Math.max(inset.bottom,10),backgroundColor:theme.surface,borderTopColor:theme.border}]}><View><Text style={[s.small,{color:theme.textSecondary}]}>Total for {details.search.travelers} traveler{details.search.travelers===1?"":"s"}</Text><Text style={[s.total,{color:theme.textPrimary}]}>{fare?.formatted??"—"}</Text></View><Button label={booking?"Checking offer…":`Continue to ${provider}`} disabled={booking||!fareReady||!selected.handoff.available} onPress={()=>void handoff(offer.id)}/></View></SafeAreaView>;
}


function FlightDetailsLoadingSkeleton({theme,bottomInset,fareCardWidth}:{theme:ReturnType<typeof useAppTheme>["theme"];bottomInset:number;fareCardWidth:number}) {
  const [reduceMotion,setReduceMotion]=useState(true);
  const opacity=useRef(new Animated.Value(.55)).current;
  useEffect(()=>{let mounted=true;void AccessibilityInfo.isReduceMotionEnabled().then((enabled)=>{if(mounted)setReduceMotion(enabled);});const subscription=AccessibilityInfo.addEventListener("reduceMotionChanged",setReduceMotion);return()=>{mounted=false;subscription.remove();};},[]);
  useEffect(()=>{opacity.stopAnimation();if(reduceMotion){opacity.setValue(.7);return;}opacity.setValue(.55);const pulse=Animated.loop(Animated.sequence([Animated.timing(opacity,{toValue:1,duration:900,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),Animated.timing(opacity,{toValue:.55,duration:900,easing:Easing.inOut(Easing.sin),useNativeDriver:true})]));pulse.start();return()=>pulse.stop();},[opacity,reduceMotion]);
  const placeholder={backgroundColor:theme.border};
  return <SafeAreaView edges={["top"]} style={[s.safe,{backgroundColor:theme.background}]}>
    <TopBar backgroundColor={theme.background}/>
    <ScrollView testID="flight-details-loading-skeleton" accessibilityRole="progressbar" accessibilityState={{busy:true}} accessibilityLabel="Loading flight details" contentContainerStyle={[s.loadingContent,{paddingBottom:32+bottomInset}]}>
      <Animated.View pointerEvents="none" style={[s.loadingBody,{opacity}]}>
        <View style={s.loadingRouteSummary}><View style={[s.loadingLine,s.loadingRouteLine,placeholder]}/><View style={[s.loadingLine,s.loadingMetadataLine,placeholder]}/></View>
        <View style={[s.loadingItineraryCard,{backgroundColor:theme.surface,borderColor:theme.border}]}><View style={[s.loadingLine,s.loadingDirectionLine,placeholder]}/><View style={s.loadingJourneyRow}><View style={[s.loadingLine,s.loadingTimeLine,placeholder]}/><View style={[s.loadingLine,s.loadingPathLine,placeholder]}/><View style={[s.loadingLine,s.loadingTimeLine,placeholder]}/></View><View style={s.loadingAirportRow}><View style={[s.loadingLine,s.loadingAirportLine,placeholder]}/><View style={[s.loadingLine,s.loadingAirportLine,placeholder]}/></View><View style={[s.loadingDivider,{backgroundColor:theme.border}]}/><View style={[s.loadingLine,s.loadingAirlineLine,placeholder]}/></View>
        <View style={[s.loadingLine,s.loadingFareHeading,placeholder]}/>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.loadingFares}>
          {[0,1].map(key=><View key={key} style={[s.loadingFareCard,{width:fareCardWidth,backgroundColor:theme.surface,borderColor:theme.border}]}><View style={s.loadingFareIdentity}><View style={[s.loadingFareIcon,placeholder]}/><View style={s.loadingFareCopy}><View style={[s.loadingLine,s.loadingFareName,placeholder]}/><View style={[s.loadingLine,s.loadingFarePrice,placeholder]}/></View></View>{(["88%","72%","80%"] as const).map((width,index)=><View key={index} style={s.loadingBenefitRow}><View style={[s.loadingBenefitDot,placeholder]}/><View style={[s.loadingLine,{width},placeholder]}/></View>)}</View>)}
        </ScrollView>
        <View style={[s.loadingInfoDeck,{backgroundColor:theme.surface,borderColor:theme.border}]}><View style={s.loadingTabs}>{(["27%","22%","25%"] as const).map((width,index)=><View key={index} style={[s.loadingLine,{width},placeholder]}/>)}</View><View style={[s.loadingDivider,{backgroundColor:theme.border}]}/><View style={s.loadingInfoBody}>{(["92%","68%","84%"] as const).map((width,index)=><View key={index} style={[s.loadingLine,{width},placeholder]}/>)}</View></View>
      </Animated.View>
    </ScrollView>
  </SafeAreaView>;
}

function TopBar({backgroundColor,hasScrolled=false,children}:{backgroundColor:string;hasScrolled?:boolean;children?:React.ReactNode}){return <View testID="flight-details-top-bar" style={[s.topBar,{backgroundColor},hasScrolled&&s.topBarScrolled]}><Pressable accessibilityRole="button" accessibilityLabel="Back to results" onPress={()=>router.back()} style={s.back}><ArrowLeft size={18} color={ui.blue}/><Text numberOfLines={1} ellipsizeMode="tail" style={s.backText}>Back to results</Text></Pressable>{children}</View>}
function IconButton({label,onPress,children}:{label:string;onPress:()=>void;children:React.ReactNode}){return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.iconButton}>{children}</Pressable>}
function FareStatusIcon({semantic}:{semantic:"positive"|"negative"|"informational"}){return <View style={[s.fareStatus,semantic==="positive"?s.fareStatusPositive:s.fareStatusNeutral]}>{semantic==="positive"?<FlowIcon name="check" size={11} color={ui.green}/>:semantic==="negative"?<View style={s.fareStatusMinus}/>:<View style={s.fareStatusDot}/>}</View>}
function FareBenefitRow({category,semantic,text,titleColor,detailColor}:{category:FlightFareTerm["category"];semantic:FlightFareTerm["semantic"];text:string;titleColor:string;detailColor:string}){const presentation=nativeFareBenefitPresentation(category,text);return <View style={s.fareBenefitRow}><View style={s.fareStatusColumn}><FareStatusIcon semantic={semantic}/></View><View style={s.fareBenefitCopy}><View style={s.fareBenefitHeading}><Text style={[s.fareBenefitTitle,{color:titleColor}]}>{presentation.title}</Text>{presentation.value?<Text style={[s.fareBenefitValue,{color:detailColor}]}>{presentation.value}</Text>:null}</View>{presentation.detail?<Text style={[s.fareBenefitDetail,{color:detailColor}]}>{presentation.detail}</Text>:null}</View></View>}
function Itinerary({leg,index,offerAirlineName,offerAirlineLogo,theme}:{leg:FlightLeg;index:number;offerAirlineName:string;offerAirlineLogo?:string|null;theme:ReturnType<typeof useAppTheme>["theme"]}) {
  const label=leg.direction==="outbound"?"Outbound":leg.direction==="return"?"Return":`Flight ${leg.legIndex??index+1}`;
  const departurePoint=leg.segments[0]?.originDetails;
  const arrivalPoint=leg.segments.at(-1)?.destinationDetails;
  const airportName=(point:typeof departurePoint,fallback:string)=>point?.name??point?.cityName??point?.iataCode??fallback;
  const stopStatus=leg.stops===0?"Non-stop":`${leg.stops} ${leg.stops===1?"stop":"stops"}`;
  const departureTimeZone=departurePoint?.timeZone;
  const arrivalTimeZone=arrivalPoint?.timeZone;
  const distanceSegments=leg.segments.filter((segment)=>segment.distanceKm!==undefined);
  const hasTechnicalInformation=distanceSegments.length>0||Boolean(departureTimeZone)||Boolean(arrivalTimeZone);
  const departureDate=new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric"}).format(new Date(leg.departureTime));
  return <View style={[s.itineraryCard,{backgroundColor:theme.surface,borderColor:theme.border}]}>
    <View style={s.itineraryHeader}>
      <Text style={s.direction}>{label}</Text>
      <Text style={[s.itineraryDate,{color:theme.textSecondary}]}>{departureDate}</Text>
    </View>
    <View style={s.airlineRows}>{leg.segments.map((segment,i)=>{
      const carrier=resolveSegmentCarrierName(segment,offerAirlineName);
      const flightNumber=segment.marketingFlightNumber??segment.flightNumber;
      const operatingDiffers=Boolean(segment.operatingCarrier&&(segment.operatingCarrier.name!==segment.marketingCarrier?.name||segment.operatingFlightNumber!==segment.marketingFlightNumber));
      return <View key={`${segment.originAirport}-${segment.destinationAirport}-${segment.departureTime}-${i}`} style={s.airlineRow}>
        {carrier?<AirlineLogo airlineName={carrier} logoUrl={canUseOfferAirlineLogo(segment,offerAirlineName,offerAirlineLogo)?offerAirlineLogo:null}/>:null}
        <View style={s.airlineCopy}>
          <Text style={[s.airlineName,{color:theme.textPrimary}]}>{carrier||"Carrier not supplied"}</Text>
          {flightNumber?<Text style={[s.flightNumber,{color:theme.textSecondary}]}>{flightNumber}</Text>:null}
          {operatingDiffers?<Text style={[s.operatedBy,{color:theme.textSecondary}]}>Operated by {segment.operatingCarrier?.name}{segment.operatingFlightNumber?` · ${segment.operatingFlightNumber}`:""}</Text>:null}
        </View>
      </View>;
    })}</View>
    <View style={s.journeySummary}>
      <View style={s.journeyEndpoint}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[s.journeyTime,{color:theme.textPrimary}]}>{clock(leg.departureTime)}</Text>
        <Text style={[s.airportCode,{color:theme.textPrimary}]}>{leg.originAirport}</Text>
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
      </View>
    </View>
    <View style={s.airportDetails}>
      <View style={s.airportColumn}>
        <Text style={[s.airportName,{color:theme.textSecondary}]}>{airportName(departurePoint,leg.originAirport)}</Text>
        {departurePoint?.terminal?<Text style={[s.terminal,{color:theme.textSecondary}]}>Terminal {departurePoint.terminal}</Text>:null}
      </View>
      <View style={[s.airportColumn,s.arrivalAirportColumn]}>
        <Text style={[s.airportName,s.arrivalText,{color:theme.textSecondary}]}>{airportName(arrivalPoint,leg.destinationAirport)}</Text>
        {arrivalPoint?.terminal?<Text style={[s.terminal,s.arrivalText,{color:theme.textSecondary}]}>Terminal {arrivalPoint.terminal}</Text>:null}
      </View>
    </View>
    {leg.stops>0&&leg.layovers.length>0?<View style={[s.connectionList,{backgroundColor:theme.background}]}>{leg.layovers.map((layover,i)=><View key={`${layover.airport}-${layover.duration}-${i}`} style={s.connectionRow}><Text style={[s.connectionDuration,{color:theme.textPrimary}]}>{layover.duration} layover</Text><Text style={[s.connectionAirport,{color:theme.textSecondary}]}>{layover.airport}</Text></View>)}</View>:null}
    {hasTechnicalInformation?<>
      <View style={[s.itineraryDivider,{backgroundColor:theme.border}]}/>
      <View style={s.technicalInformation}>
        {distanceSegments.map((segment,i)=><View key={`${segment.originAirport}-${segment.destinationAirport}-distance-${i}`} style={s.technicalRow}><Text style={[s.technicalLabel,{color:theme.textSecondary}]}>{leg.segments.length===1?"Flight distance":`${segment.originAirport} → ${segment.destinationAirport} distance`}</Text><Text style={[s.technicalValue,{color:theme.textSecondary}]}>{Math.round(segment.distanceKm!).toLocaleString()} km</Text></View>)}
        {departureTimeZone&&arrivalTimeZone&&departureTimeZone===arrivalTimeZone?<View style={s.technicalRow}><Text style={[s.technicalLabel,{color:theme.textSecondary}]}>Time zone</Text><Text style={[s.technicalValue,{color:theme.textSecondary}]}>{departureTimeZone}</Text></View>:<>
          {departureTimeZone?<View style={s.technicalRow}><Text style={[s.technicalLabel,{color:theme.textSecondary}]}>Departure time zone</Text><Text style={[s.technicalValue,{color:theme.textSecondary}]}>{departureTimeZone}</Text></View>:null}
          {arrivalTimeZone?<View style={s.technicalRow}><Text style={[s.technicalLabel,{color:theme.textSecondary}]}>Arrival time zone</Text><Text style={[s.technicalValue,{color:theme.textSecondary}]}>{arrivalTimeZone}</Text></View>:null}
        </>}
      </View>
    </>:null}
  </View>;
}
function FareSurface({tab,choice,dealPrices,onDeal,booking,fareReady,theme}:{tab:"deals"|"details"|"conditions"|"extras";choice:FlightDetailsFareChoice;dealPrices:Record<string,DisplayPrice>;onDeal:(id:string)=>Promise<void>;booking:boolean;fareReady:boolean;theme:ReturnType<typeof useAppTheme>["theme"]}) {
  const offer=choice.offer,p=offer.providerDetails;
  const cabins=(offer.legs??[]).flatMap(l=>l.segments.flatMap(segment=>(segment.cabinDetails??[]).map(cabin=>({segment,cabin}))));
  const links=nativeCarrierConditionsLinks(offer);
  const detailRow=(label:string,value:unknown,strong=false)=>value===undefined||value===null||value===""?null:<View style={s.detailRow}><Text style={[s.detailLabel,strong&&s.detailTotal,{color:theme.textSecondary}]}>{label}</Text><Text style={[s.detailValue,strong&&s.detailTotal,{color:theme.textPrimary}]}>{String(value)}</Text></View>;
  const emptyState=(title:string,description:string)=><View style={s.emptyState}><Text style={[s.emptyTitle,{color:theme.textPrimary}]}>{title}</Text><Text style={[s.emptyDescription,{color:theme.textSecondary}]}>{description}</Text></View>;

  if(tab==="deals") return <View>{choice.deals.length?choice.deals.map((deal,index)=><View key={deal.key} style={[s.dealRow,index>0&&{borderTopColor:theme.border,borderTopWidth:StyleSheet.hairlineWidth}]}><View style={s.dealIdentity}><View style={[s.providerMark,{borderColor:theme.border}]}><Text style={[s.providerMonogram,{color:theme.textPrimary}]}>{deal.providerName.trim().charAt(0).toUpperCase()||"?"}</Text></View><Text style={[s.dealProvider,{color:theme.textPrimary}]}>{deal.providerName}</Text></View><View style={s.dealAction}><Text style={[s.dealPrice,{color:theme.textPrimary}]}>{dealPrices[`deal:${deal.key}`]?.formatted??"—"}</Text><Pressable accessibilityRole="button" disabled={booking||!fareReady} onPress={()=>void onDeal(deal.offerId)} hitSlop={8} style={[s.viewDealAction,{opacity:booking||!fareReady?0.55:1}]}><Text style={s.viewDeal}>{booking?"Checking…":"View deal"}</Text></Pressable></View></View>):emptyState("No booking deals available","No additional live provider deals were supplied for this fare.")}</View>;

  if(tab==="details") return <View style={s.infoSections}>
    <View style={s.infoSection}>{cabins.length?cabins.map(({segment,cabin:c},i)=><View key={i} style={[s.cabinGroup,i>0&&{borderTopColor:theme.border,borderTopWidth:StyleSheet.hairlineWidth}]}><Text style={[s.groupLabel,{color:theme.textPrimary}]}>{segment.originAirport} → {segment.destinationAirport}{segment.marketingFlightNumber??segment.flightNumber?` · ${segment.marketingFlightNumber??segment.flightNumber}`:""}</Text>{detailRow("Fare brand",c.fareBrandName)}{detailRow("Cabin",c.cabinClass&&titleCase(c.cabinClass))}{detailRow("Cabin product",c.cabinMarketingName)}{detailRow("Fare basis",c.fareBasisCode)}{detailRow("Seat",[c.amenities?.seat?.type&&titleCase(c.amenities.seat.type),c.amenities?.seat?.pitch&&`${c.amenities.seat.pitch} in pitch`,c.amenities?.seat?.legroom&&`${titleCase(c.amenities.seat.legroom)} legroom`].filter(Boolean).join(" · "))}{c.amenities?.wifi?detailRow("Wi-Fi",amenityState(c.amenities.wifi.state)):null}{c.amenities?.power?detailRow("Power",amenityState(c.amenities.power.state)):null}</View>):<Text style={[s.quietText,{color:theme.textSecondary}]}>Additional cabin details not supplied by the provider.</Text>}</View>
    <View style={[s.infoSection,s.sectionDivider,{borderTopColor:theme.border}]}><Text style={[s.groupLabel,{color:theme.textPrimary}]}>Price breakdown</Text>{p?.price?<>{p.price.baseAmount!==undefined&&p.price.baseCurrency?detailRow("Base fare",sourceMoney(p.price.baseAmount,p.price.baseCurrency)):null}{p.price.taxAmount!==undefined&&p.price.taxCurrency?detailRow("Taxes",sourceMoney(p.price.taxAmount,p.price.taxCurrency)):null}{detailRow("Trip total",sourceMoney(p.price.totalAmount,p.price.totalCurrency),true)}</>:<Text style={[s.quietText,{color:theme.textSecondary}]}>Price breakdown not supplied by the provider.</Text>}</View>
    {p?.totalEmissionsKg!==undefined?<View style={[s.emissionsCard,{backgroundColor:theme.dark?"#0F2F26":"#ECFDF5"}]}><View style={s.emissionsIdentity}><Leaf size={17} color={theme.dark?"#6EE7B7":"#047857"}/><Text style={[s.emissionsLabel,{color:theme.dark?"#6EE7B7":"#047857"}]}>Estimated CO₂ emissions</Text></View><View style={s.emissionsValueGroup}><Text style={[s.emissionsValue,{color:theme.textPrimary}]}>{p.totalEmissionsKg.toLocaleString()} kg</Text><Text style={[s.emissionsContext,{color:theme.textSecondary}]}>for this offer</Text></View></View>:null}
    {p?.updatedAt?<View style={[s.secondaryFacts,{borderTopColor:theme.border}]}>{detailRow("Provider offer last updated",providerTimestamp(p.updatedAt))}</View>:null}
  </View>;

  if(tab==="conditions") return <View style={s.infoSections}>
    <View>{p?.conditions?.length?p.conditions.map((condition,index)=>{const semantic=condition.state==="allowed"?"positive":condition.state==="not-allowed"?"negative":"informational";const penalty=condition.penaltyAmount!==undefined&&condition.penaltyCurrency?` with ${sourceMoney(condition.penaltyAmount,condition.penaltyCurrency)} penalty`:"";return <View key={`${condition.scope}-${condition.category}-${index}`} style={[s.conditionRow,index>0&&{borderTopColor:theme.border,borderTopWidth:StyleSheet.hairlineWidth}]}><FareStatusIcon semantic={semantic}/><View style={s.conditionCopy}><Text style={[s.conditionTitle,{color:theme.textPrimary}]}>{conditionCategory(condition)}</Text><Text style={[s.conditionState,{color:theme.textSecondary}]}>{conditionState(condition)}{penalty}</Text><Text style={[s.conditionScope,{color:theme.textSecondary}]}>{conditionScope(condition)}</Text></View></View>}):emptyState("Fare conditions unavailable","Conditions were not supplied by the provider.")}</View>
    {p?.passengerIdentityDocumentsRequired?<InfoRow title="Identity documents" theme={theme}>Passport or identity information is required to complete booking.</InfoRow>:null}
    {p?.supportedIdentityDocumentTypes?.length?<InfoRow title="Supported documents" theme={theme}>{p.supportedIdentityDocumentTypes.map(titleCase).join(", ")}</InfoRow>:null}
    {p?.offerOwner?<InfoRow title="Offer airline" theme={theme}>{p.offerOwner.name}{p.offerOwner.iataCode?` (${p.offerOwner.iataCode})`:""}</InfoRow>:null}
    {links.length?<View style={[s.infoSection,s.sectionDivider,{borderTopColor:theme.border}]}><Text style={[s.groupLabel,{color:theme.textPrimary}]}>Airline conditions</Text>{links.map(link=><Pressable key={link.url} accessibilityRole="link" accessibilityLabel={`${link.name} conditions of carriage`} onPress={()=>void Linking.openURL(link.url).catch(()=>Alert.alert("Unable to open link","Please try again."))} style={s.linkRow}><Text style={[s.linkText,{color:ui.blue}]}>{link.name} conditions of carriage</Text><FlowIcon name="external" size={17} color={ui.blue}/></Pressable>)}</View>:null}
    {p?.updatedAt?<View style={[s.secondaryFacts,{borderTopColor:theme.border}]}>{detailRow("Provider offer last updated",providerTimestamp(p.updatedAt))}</View>:null}
  </View>;

  if(tab==="extras") return <View style={s.infoSections}>{p?.optionalServices?.length?<View>{p.optionalServices.map((service,index)=><View key={`${service.type}-${service.description}-${service.journeyContext||"trip"}-${service.price}-${service.currency}-${service.maximumQuantity??"na"}-${service.travelerCount??"na"}-${index}`} style={[s.serviceRow,index>0&&{borderTopColor:theme.border,borderTopWidth:StyleSheet.hairlineWidth}]}><View style={[s.serviceIcon,{borderColor:theme.border}]}><FlowIcon name={service.type==="baggage"?"briefcase":"plus"} size={16} color={ui.blue}/></View><View style={s.serviceCopy}><View style={s.serviceHeading}><Text style={[s.serviceDescription,{color:theme.textPrimary}]}>{service.description}</Text><Text style={[s.servicePrice,{color:theme.textPrimary}]}>{sourceMoney(service.price,service.currency)}{service.pricedPerTraveler?" each":""}</Text></View>{service.travelerCount?<Text style={[s.serviceMeta,{color:theme.textSecondary}]}>Available for {service.travelerCount} traveler{service.travelerCount===1?"":"s"}</Text>:null}{service.maximumQuantity!==undefined?<Text style={[s.serviceMeta,{color:theme.textSecondary}]}>{service.pricedPerTraveler?"Maximum quantity per traveler":"Maximum quantity"}: {service.maximumQuantity}</Text>:null}{service.journeyContext?<Text style={[s.serviceMeta,{color:theme.textSecondary}]}>{service.journeyContext}</Text>:null}</View></View>)}</View>:emptyState("No optional extras","No optional services were supplied by this provider.")}{p?.supportedLoyaltyProgrammes?.length?<InfoRow title="Supported loyalty airline codes" theme={theme}>{p.supportedLoyaltyProgrammes.join(", ")}</InfoRow>:null}</View>;
}
function InfoRow({title,theme,children}:{title:string;theme:ReturnType<typeof useAppTheme>["theme"];children:React.ReactNode}){return <View style={s.infoRow}><View style={[s.infoIcon,{borderColor:theme.border}]}><Text style={[s.infoGlyph,{color:ui.blue}]}>i</Text></View><View style={s.infoCopy}><Text style={[s.infoTitle,{color:theme.textPrimary}]}>{title}</Text><Text style={[s.infoDescription,{color:theme.textSecondary}]}>{children}</Text></View></View>}
const s=StyleSheet.create({safe:{flex:1},loadingContent:{paddingHorizontal:18,paddingTop:5},loadingBody:{gap:14},loadingRouteSummary:{gap:8,marginBottom:4},loadingLine:{height:10,borderRadius:5},loadingRouteLine:{width:"62%",height:25,borderRadius:8},loadingMetadataLine:{width:"38%",height:12},loadingItineraryCard:{height:226,borderWidth:1,borderRadius:15,padding:15},loadingDirectionLine:{width:"24%",height:10},loadingJourneyRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:18,marginTop:25},loadingTimeLine:{width:"22%",height:22},loadingPathLine:{flex:1,height:4},loadingAirportRow:{flexDirection:"row",justifyContent:"space-between",marginTop:11},loadingAirportLine:{width:"18%",height:15},loadingDivider:{height:StyleSheet.hairlineWidth,marginVertical:28},loadingAirlineLine:{width:"48%",height:13},loadingFareHeading:{width:142,height:20,marginTop:8},loadingFares:{gap:10,paddingRight:38},loadingFareCard:{height:176,borderWidth:1,borderRadius:15,padding:15,gap:14},loadingFareIdentity:{flexDirection:"row",alignItems:"center",gap:11},loadingFareIcon:{width:40,height:40,borderRadius:10},loadingFareCopy:{flex:1,gap:7},loadingFareName:{width:"48%",height:13},loadingFarePrice:{width:"36%",height:18},loadingBenefitRow:{flexDirection:"row",alignItems:"center",gap:9},loadingBenefitDot:{width:19,height:19,borderRadius:10},loadingInfoDeck:{height:174,borderWidth:1,borderRadius:15,overflow:"hidden"},loadingTabs:{height:48,flexDirection:"row",alignItems:"center",gap:22,paddingHorizontal:14},loadingInfoBody:{padding:18,gap:17},topBar:{minHeight:52,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:16,paddingVertical:4,zIndex:1},topBarScrolled:{borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:"rgba(15, 23, 42, 0.12)"},topActions:{flexDirection:"row",alignItems:"center",gap:2,flexShrink:0},back:{minHeight:44,flexShrink:1,minWidth:0,flexDirection:"row",alignItems:"center",gap:7},backText:{color:ui.blue,fontWeight:"800",flexShrink:1},center:{flex:1,justifyContent:"center",padding:24,gap:16},content:{paddingHorizontal:18,paddingTop:5,gap:14},routeSummary:{flexDirection:"row",alignItems:"flex-start",gap:10,marginBottom:4},routeContent:{flex:1,minWidth:0,gap:2},title:{fontSize:23,fontWeight:"900"},route:{fontSize:27,fontWeight:"900"},bodyText:{fontSize:14,lineHeight:20},iconButton:{width:44,height:44,alignItems:"center",justifyContent:"center"},sectionTitle:{fontSize:20,fontWeight:"900",marginTop:8},fareSectionTitle:{fontSize:18,lineHeight:23,fontWeight:"700",marginTop:8},card:{borderWidth:1,borderRadius:14,padding:14,gap:7},itineraryStack:{gap:14,marginTop:-8},itineraryCard:{borderWidth:1,borderRadius:15,padding:15,gap:0,shadowColor:"#0F172A",shadowOffset:{width:0,height:3},shadowOpacity:.07,shadowRadius:12,elevation:1},itineraryHeader:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:12},direction:{color:ui.blue,fontSize:12,lineHeight:17,fontWeight:"700",letterSpacing:.4,textTransform:"uppercase",flexShrink:1},itineraryDate:{fontSize:12,lineHeight:17,fontWeight:"500",textAlign:"right",flexShrink:0},journeySummary:{flexDirection:"row",alignItems:"center",gap:8,marginTop:14},journeyEndpoint:{flex:1.1,minWidth:0,gap:3},arrivalEndpoint:{alignItems:"flex-end"},journeyTime:{fontSize:22,lineHeight:28,fontWeight:"700"},airportCode:{fontSize:17,lineHeight:22,fontWeight:"700"},journeyCenter:{flex:.8,minWidth:72,alignItems:"center",gap:5},journeyDuration:{fontSize:12,lineHeight:17,fontWeight:"600",textAlign:"center"},flightPath:{alignSelf:"stretch",flexDirection:"row",alignItems:"center"},pathDot:{width:6,height:6,borderRadius:3,backgroundColor:ui.blue,flexShrink:0},pathLine:{height:StyleSheet.hairlineWidth,flex:1,minWidth:4},stopStatus:{fontSize:12,lineHeight:17,fontWeight:"500",textAlign:"center"},connectionList:{marginTop:12,borderRadius:9,paddingHorizontal:11,paddingVertical:8,gap:7},connectionRow:{gap:1},connectionDuration:{fontSize:12,lineHeight:17,fontWeight:"600"},connectionAirport:{fontSize:11,lineHeight:16,fontWeight:"400"},airportDetails:{flexDirection:"row",alignItems:"flex-start",gap:20,marginTop:14},airportColumn:{flex:1,minWidth:0,gap:6},arrivalAirportColumn:{alignItems:"flex-end"},airportName:{fontSize:13,lineHeight:18,fontWeight:"500"},terminal:{fontSize:12,lineHeight:17,fontWeight:"400"},arrivalText:{textAlign:"right"},itineraryDivider:{height:StyleSheet.hairlineWidth,marginVertical:12},airlineRows:{gap:8,marginTop:8},airlineRow:{flexDirection:"row",alignItems:"flex-start",gap:10},airlineCopy:{flex:1,minWidth:0,gap:1},airlineName:{fontSize:14,lineHeight:19,fontWeight:"600"},flightNumber:{fontSize:12,lineHeight:17,fontWeight:"500"},technicalInformation:{gap:6},technicalRow:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:12},technicalLabel:{flex:1,minWidth:0,fontSize:11,lineHeight:16,fontWeight:"400"},technicalValue:{flexShrink:0,maxWidth:"48%",fontSize:11,lineHeight:16,fontWeight:"500",textAlign:"right"},operatedBy:{fontSize:11,lineHeight:16,fontWeight:"400",marginTop:1},small:{fontSize:12,lineHeight:17},fares:{gap:10},faresMultiple:{paddingRight:38},faresSingle:{paddingRight:0},fareCard:{borderRadius:15,padding:15,gap:14},fareCardSelected:{borderWidth:1.5},fareCardUnselected:{borderWidth:1},fareIdentity:{flexDirection:"row",alignItems:"flex-start",gap:11},fareIconContainer:{width:38,height:38,borderRadius:9,alignItems:"center",justifyContent:"center",marginTop:1},fareIdentityCopy:{flex:1,minWidth:0,gap:1},fareLabel:{fontSize:15,lineHeight:20,fontWeight:"700"},farePrice:{fontSize:22,lineHeight:27,fontWeight:"800"},fareBenefits:{gap:12},fareBenefitRow:{flexDirection:"row",alignItems:"flex-start",gap:9},fareStatusColumn:{width:20,alignItems:"center",paddingTop:1},fareStatus:{width:19,height:19,borderRadius:10,borderWidth:1,alignItems:"center",justifyContent:"center"},fareStatusPositive:{borderColor:ui.green},fareStatusNeutral:{borderColor:"#94A3B8"},fareStatusMinus:{width:8,height:1.5,borderRadius:1,backgroundColor:"#64748B"},fareStatusDot:{width:3,height:3,borderRadius:2,backgroundColor:"#64748B"},fareBenefitCopy:{flex:1,minWidth:0,gap:2},fareBenefitHeading:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:10},fareBenefitTitle:{flex:1,minWidth:0,fontSize:13,lineHeight:18,fontWeight:"600"},fareBenefitValue:{flexShrink:0,maxWidth:"44%",fontSize:12,lineHeight:18,fontWeight:"600",textAlign:"right"},fareBenefitDetail:{fontSize:12,lineHeight:17,fontWeight:"400"},fareInfoDeck:{borderWidth:1,borderRadius:15,overflow:"hidden"},fareTabRail:{flexGrow:0},fareTabRailContent:{paddingHorizontal:14},fareTabList:{flexDirection:"row",gap:22},fareInfoTab:{minHeight:48,justifyContent:"center",position:"relative",paddingHorizontal:2},fareInfoTabText:{fontSize:13,lineHeight:18,fontWeight:"600"},fareInfoTabTextActive:{fontWeight:"700"},fareTabIndicator:{position:"absolute",height:3,borderRadius:2,backgroundColor:ui.blue,left:2,right:2,bottom:0},fareInfoDivider:{height:StyleSheet.hairlineWidth},fareInfoBody:{paddingHorizontal:14,paddingVertical:4},infoSections:{gap:0},infoSection:{paddingVertical:12},sectionDivider:{borderTopWidth:StyleSheet.hairlineWidth},groupLabel:{fontSize:14,lineHeight:19,fontWeight:"600",marginBottom:7},cabinGroup:{paddingVertical:8,gap:7},detailRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",gap:16},detailLabel:{flexShrink:0,fontSize:13,lineHeight:18,fontWeight:"500"},detailValue:{flex:1,fontSize:13,lineHeight:18,fontWeight:"600",textAlign:"right"},detailTotal:{fontWeight:"800"},quietText:{fontSize:13,lineHeight:19,fontWeight:"400"},emissionsCard:{marginVertical:12,borderRadius:8,paddingHorizontal:11,paddingVertical:9,flexDirection:"row",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:8},emissionsIdentity:{flexDirection:"row",alignItems:"center",flexGrow:1,flexShrink:1,minWidth:180,gap:7},emissionsLabel:{flexShrink:1,fontSize:13,lineHeight:18,fontWeight:"600"},emissionsValueGroup:{marginLeft:"auto",alignItems:"flex-end",flexShrink:1},emissionsValue:{fontSize:14,lineHeight:18,fontWeight:"700",textAlign:"right"},emissionsContext:{fontSize:11,lineHeight:15,fontWeight:"500",textAlign:"right"},secondaryFacts:{borderTopWidth:StyleSheet.hairlineWidth,paddingVertical:12,gap:7},emptyState:{paddingVertical:24,paddingHorizontal:10,alignItems:"center",gap:5},emptyTitle:{fontSize:14,lineHeight:19,fontWeight:"700",textAlign:"center"},emptyDescription:{fontSize:13,lineHeight:19,fontWeight:"400",textAlign:"center"},dealRow:{minHeight:68,paddingVertical:13,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},dealIdentity:{flex:1,minWidth:0,flexDirection:"row",alignItems:"center",gap:10},providerMark:{width:32,height:32,borderRadius:8,borderWidth:1,alignItems:"center",justifyContent:"center"},providerMonogram:{fontSize:13,fontWeight:"700"},dealProvider:{flex:1,fontSize:13,lineHeight:18,fontWeight:"600"},dealAction:{alignItems:"flex-end",gap:3},dealPrice:{fontSize:13,lineHeight:18,fontWeight:"700"},viewDealAction:{minHeight:44,justifyContent:"center"},viewDeal:{color:ui.blue,fontSize:12,lineHeight:17,fontWeight:"700"},conditionRow:{paddingVertical:13,flexDirection:"row",alignItems:"flex-start",gap:11},conditionCopy:{flex:1,minWidth:0,gap:2},conditionTitle:{fontSize:14,lineHeight:19,fontWeight:"600"},conditionState:{fontSize:13,lineHeight:18,fontWeight:"500"},conditionScope:{fontSize:11,lineHeight:16,fontWeight:"400"},infoRow:{paddingVertical:12,flexDirection:"row",alignItems:"flex-start",gap:11},infoIcon:{width:20,height:20,borderRadius:10,borderWidth:1,alignItems:"center",justifyContent:"center"},infoGlyph:{fontSize:12,lineHeight:15,fontWeight:"800"},infoCopy:{flex:1,minWidth:0,gap:2},infoTitle:{fontSize:13,lineHeight:18,fontWeight:"600"},infoDescription:{fontSize:13,lineHeight:19,fontWeight:"400"},linkRow:{minHeight:44,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},linkText:{flex:1,fontSize:13,lineHeight:18,fontWeight:"700"},serviceRow:{paddingVertical:13,flexDirection:"row",alignItems:"flex-start",gap:11},serviceIcon:{width:32,height:32,borderRadius:8,borderWidth:1,alignItems:"center",justifyContent:"center"},serviceCopy:{flex:1,minWidth:0,gap:3},serviceHeading:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:12},serviceDescription:{flex:1,fontSize:13,lineHeight:18,fontWeight:"600"},servicePrice:{flexShrink:0,maxWidth:"42%",fontSize:13,lineHeight:18,fontWeight:"700",textAlign:"right"},serviceMeta:{fontSize:12,lineHeight:17,fontWeight:"400"},notice:{padding:12,borderRadius:10,borderWidth:1,borderColor:ui.blue},noticeText:{color:ui.blue,fontWeight:"700"},sticky:{position:"absolute",left:0,right:0,bottom:0,minHeight:88,borderTopWidth:1,paddingHorizontal:18,paddingTop:10,flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:12},total:{fontSize:22,fontWeight:"900"}});
