import { useCallback, useEffect, useRef, useState } from "react";
import { flightBaggageTerms, flightFareDetailCabins, flightOnboardFeatureLabel } from "../../../../../src/lib/flights/flightFareInformation";
import { AccessibilityInfo, Alert, Animated, Easing, ImageBackground, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { ArrowLeft, ChevronDown, Heart, Leaf, Luggage } from "lucide-react-native";
import { flightDetailsRouteLabel } from "../../../../../src/lib/flights/flightDetailsContract";
import type { FlightDetailsFareChoice, FlightDetailsOffer, FlightDetailsSuccess } from "../../../../../src/lib/flights/flightDetailsContract";
import { canUseOfferAirlineLogo, resolveDealIdentityMark, resolveSegmentCarrierName } from "../../../../../src/lib/flights/flightDetailsPresentation";
import type { FlightFareTerm, FlightLeg, FlightProviderCondition } from "../../../../../src/lib/types";
import { TravelApiError, travelApi, type FlightResult } from "../../api/travelApi";
import { journeyEvents } from "../privacy/journeyEvents";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { mobileLocales } from "../../localization/mobileLocalizationCatalog";
import { readCurrencyPreference } from "../../storage/preferenceStorage";
import { readSession } from "../../storage/sessionStorage";
import { useSavedFlights } from "../../storage/useSavedFlights";
import { flightSavedSignature } from "../../storage/savedMapping";
import { formatCurrency, resolveDisplayCurrencyContext, type DisplayPrice, type ExchangeRates } from "../currency/displayCurrency";
import { createFlightDetailFare } from "./flightDetailCurrency";
import { flightShareMessage, shareFlightForAuthenticatedSession } from "./flightDetailInteractions";
import { Button, clock, ui } from "./SearchUi";
import { FlowIcon } from "../flow/FlowIcon";
import { FLIGHT_TRIP_TYPE_LABELS } from "../flow/flightTripTypeLabels";
import { androidFavoriteColors } from "../home/AndroidFavoriteButton";
import { DetailGlassSurface } from "./DetailGlassSurface";
import { AirlineLogo } from "./AirlineLogo";
import { ProviderLogo } from "./ProviderLogo";
import { providerLocalFlightDate, providerLocalFlightDateLong } from "./flightArrivalDayOffset";
import { nativeLoadedFareCardWidth } from "./nativeFareRailGeometry";
import { nativeFareBenefitRows } from "./nativeFareBenefitPresentation";
import { nativeFlightDealSelection } from "./nativeFlightDealSelection";
import { flightDetailsHeaderProtectionGeometry } from "./flightDetailsHeaderProtection";
export { nativeLoadedFareCardWidth } from "./nativeFareRailGeometry";
export { nativeFareBenefitPresentation } from "./nativeFareBenefitPresentation";

const FLIGHT_DETAILS_LIGHT_CANVAS = "#FFFFFF";
const FLIGHT_DETAILS_LOADING_LIGHT_CANVAS = "#F3F6FA";
const FLIGHT_DETAILS_LIGHT_BORDER = "#D7E0EC";
const FLIGHT_DETAILS_LIGHT_ITINERARY_SURFACE = "#FFFFFF";
const FLIGHT_DETAILS_LIGHT_ITINERARY_BORDER = "#E1E7EF";
const FLIGHT_DETAILS_ITINERARY_RADIUS = 15;
const FLIGHT_DETAILS_DARK_BORDER = "#344154";
const FLIGHT_DETAILS_LIGHT_CONNECTION_SURFACE = "#F3F7FC";
const FLIGHT_DETAILS_LIGHT_CONNECTION_BORDER = "#D6E2F0";
const FLIGHT_DETAILS_LIGHT_CONNECTION_ACCENT = "#5D7496";
const FLIGHT_DETAILS_DARK_CONNECTION_SURFACE = "#182536";
const FLIGHT_DETAILS_DARK_CONNECTION_ACCENT = "#9AB2D2";
const FLIGHT_DETAILS_LIGHT_PRIMARY = "#0F172A";
const FLIGHT_DETAILS_LIGHT_STRONG = "#020617";
const FLIGHT_DETAILS_LIGHT_SECONDARY = "#64748B";
const FLIGHT_DETAILS_LIGHT_DURATION = "#475569";
const FLIGHT_DETAILS_LIGHT_PATH = "rgba(148, 163, 184, 0.60)";
const FLIGHT_DETAILS_LIGHT_TAB_BORDER = "#D8E1EC";
const FLIGHT_DETAILS_LIGHT_DEAL_BORDER = "#D9E2E8";
const FLIGHT_DETAILS_LIGHT_DEAL_TEXT = "#1A1A1A";
const FLIGHT_DETAILS_LIGHT_DEAL_META = "#595959";
const FLIGHT_DETAILS_DEAL_ACTION = "#004BB8";
function useFlightDetailsHeaderProtection(topInset: number) {
  const { protectedHeight } = flightDetailsHeaderProtectionGeometry(topInset, 0);
  const protectedRef = useRef(false);
  const thresholdRef = useRef<number | null>(null);
  const heroHeightRef = useRef<number | null>(null);
  const foregroundOffsetRef = useRef<number | null>(null);
  const [headerProtected, setHeaderProtected] = useState(false);
  const syncMeasuredThreshold = useCallback(() => {
    const heroHeight = heroHeightRef.current;
    const foregroundOffset = foregroundOffsetRef.current;
    thresholdRef.current = heroHeight === null || foregroundOffset === null
      ? null
      : flightDetailsHeaderProtectionGeometry(topInset, heroHeight, foregroundOffset).threshold;
  }, [topInset]);
  const measureHeaderHero = useCallback((heroHeight: number) => {
    heroHeightRef.current = heroHeight;
    syncMeasuredThreshold();
  }, [syncMeasuredThreshold]);
  const measureHeaderForeground = useCallback((foregroundOffset: number) => {
    foregroundOffsetRef.current = foregroundOffset;
    syncMeasuredThreshold();
  }, [syncMeasuredThreshold]);
  const resetHeaderProtection = useCallback(() => {
    thresholdRef.current = null;
    heroHeightRef.current = null;
    foregroundOffsetRef.current = null;
    protectedRef.current = false;
    setHeaderProtected(false);
  }, []);
  const syncHeaderProtection = useCallback((offset: number) => {
    const threshold = thresholdRef.current;
    if (threshold === null) return;
    const nextProtected = offset >= threshold;
    if (nextProtected === protectedRef.current) return;
    protectedRef.current = nextProtected;
    setHeaderProtected(nextProtected);
  }, []);
  return { headerProtected, protectedHeaderHeight: protectedHeight, measureHeaderForeground, measureHeaderHero, resetHeaderProtection, syncHeaderProtection };
}

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
const sourceMoney = (amount:number,currency:string) => formatCurrency(amount,currency);
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
  const journeyRequestId = one(params.journeyRequestId);
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
  const fareHeadingTextColor=theme.dark?theme.textPrimary:FLIGHT_DETAILS_LIGHT_PRIMARY;
  const farePriceTextColor=theme.dark?theme.textPrimary:FLIGHT_DETAILS_LIGHT_STRONG;
  const fareTabTextColor=theme.dark?theme.textSecondary:FLIGHT_DETAILS_LIGHT_SECONDARY;
  const contentCanvasColor=theme.dark?theme.background:FLIGHT_DETAILS_LIGHT_CANVAS;
  const {headerProtected,protectedHeaderHeight,measureHeaderForeground,measureHeaderHero,resetHeaderProtection,syncHeaderProtection}=useFlightDetailsHeaderProtection(inset.top);
  const surfaceBorderColor=theme.dark?FLIGHT_DETAILS_DARK_BORDER:FLIGHT_DETAILS_LIGHT_BORDER;
  const heroIconColor="#0F172A";
  const [booking, setBooking] = useState(false);
  const [displayPrices, setDisplayPrices] = useState<Record<string,DisplayPrice>>({});
  const [displayPricesReady,setDisplayPricesReady]=useState(false);
  const rates = useRef<ExchangeRates|null>(null);
  const sharePending = useRef(false);
  const preserveMessageOnReload = useRef(false);
  const savedFlights = useSavedFlights();

  const reload = useCallback(() => { resetHeaderProtection(); setRevision((value) => value + 1); }, [resetHeaderProtection]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    resetHeaderProtection();
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
  }, [id, revision, resetHeaderProtection]);
  const selected = details?.fareChoices.find(({ key }) => key === selectedKey) ?? null;
  const fareCardWidth = nativeLoadedFareCardWidth(windowWidth);
  const loadedFareCardWidth = nativeLoadedFareCardWidth(windowWidth, details?.fareChoices.length ?? 0);
  const fare = selected ? displayPrices[selected.key] ?? null : null;
  const selectedDeal=selected?(nativeFlightDealSelection(selectedDealOfferId,selected)??selected.deals[0]??null):null;
  useEffect(()=>{if(selected)setSelectedDealOfferId((current)=>(nativeFlightDealSelection(current,selected)??selected.deals[0]??null)?.offerId??null);},[selected]);
  const selectedDealPrice=selectedDeal?displayPrices[`deal:${selectedDeal.key}`]??null:null;
  const activePrice=selectedDeal?selectedDealPrice:fare;

  if (state === "loading") return <FlightDetailsLoadingSkeleton theme={theme} topInset={inset.top} bottomInset={inset.bottom} fareCardWidth={fareCardWidth} viewportWidth={windowWidth}/>;
  if (state !== "available" || !details || !selected) return <SafeAreaView edges={["top"]} style={[s.safe,{backgroundColor:theme.background}]}><TopBar backgroundColor={theme.background}/><View style={s.center}><Text accessibilityRole="header" style={[s.title,{color:theme.textPrimary}]}>{state === "unavailable" ? "This flight is no longer available" : "We couldn’t load this flight"}</Text><Text style={[s.bodyText,{color:theme.textSecondary}]}>{message}</Text><Button label="Retry" onPress={reload}/><Button label="Back to results" onPress={()=>router.back()}/></View></SafeAreaView>;

  const offer=selected.offer; const activeOffer=selectedDeal?.offer??offer;
  const savedOffer=savedFlightOffer(details, selected);
  const saved=savedFlights.savedFlights.has(flightSavedSignature(savedOffer));
  const tripMetadata=[FLIGHT_TRIP_TYPE_LABELS[details.search.tripType],`${details.search.travelers} traveler${details.search.travelers===1?"":"s"}`,titleCase(details.search.cabinClass)].join(" · ");
  const trackSelectedOffer = (offerId: string) => {
    const deal = details.fareChoices.flatMap(choice => choice.deals).find(candidate => candidate.offerId === offerId);
    const choice = details.fareChoices.find(candidate => candidate.offer.id === offerId);
    if (deal || choice) journeyEvents.offerSelected(journeyRequestId, offerId, deal?.providerName ?? choice?.offer.provider, "/flight-details");
  };
  const selectDeal = (offerId: string) => { setSelectedDealOfferId(offerId); trackSelectedOffer(offerId); };
  const handoff=async(offerId:string) => { if(booking||!displayPricesReady)return; trackSelectedOffer(offerId); setBooking(true); setMessage(""); try { const response=await travelApi.flightRedirect(offerId, { handoff: journeyEvents.prepareHandoff(journeyRequestId) }); await Linking.openURL(response.url); } catch(error) { if(error instanceof TravelApiError && error.status===409 && error.details?.code==="offer_changed") { preserveMessageOnReload.current=true; setMessage("The provider updated this offer. Review the refreshed price and terms before continuing."); reload(); } else setMessage(error instanceof Error?error.message:"Booking is currently unavailable."); } finally { setBooking(false); } };
  const share=async()=>{if(sharePending.current)return;sharePending.current=true;try{const outcome=await shareFlightForAuthenticatedSession({readSession,share:(message)=>Share.share({message}),message:flightShareMessage(activeOffer,activePrice?.formatted??"price unavailable")});if(outcome==="sign-in-required")Alert.alert("Sign in required","Sign in to share this flight.",[{text:"Sign in",onPress:()=>router.push("/email-auth")},{text:"Cancel",style:"cancel"}]);}finally{sharePending.current=false;}};
  return <SafeAreaView edges={[]} style={[s.safe,{backgroundColor:contentCanvasColor}]}><View testID="flight-details-protected-header" pointerEvents="none" style={[s.protectedHeader,Platform.OS==="android"&&s.androidFlatControlLayer,{height:protectedHeaderHeight,backgroundColor:headerProtected?contentCanvasColor:"transparent"}]}/><View testID="flight-details-back-control" style={[s.heroBackControl,{top:inset.top+8}]}><Pressable accessibilityRole="button" accessibilityLabel="Back to results" onPress={()=>router.back()} style={s.heroIconButton}><DetailGlassSurface dark={false} variant="hotelLight" style={s.heroIconGlass}/><ArrowLeft size={20} color={heroIconColor}/></Pressable></View><View testID="flight-details-floating-actions" style={[s.heroActions,s.floatingControl,{top:inset.top+8}]}><DetailGlassSurface dark={false} variant="hotelLight" style={s.heroActionsGlass}/><IconButton label={saved?"Remove saved flight":"Save flight"} onPress={()=>savedFlights.toggle(savedOffer,nativeFlightEditSearchParams(details,one(params.currency)))} iconStyle={s.heroHeartIcon}><Heart size={17} strokeWidth={androidFavoriteColors.strokeWidth} color={saved ? androidFavoriteColors.savedStroke : androidFavoriteColors.unsavedStroke} fill={saved?androidFavoriteColors.savedFill:androidFavoriteColors.unsavedFill}/></IconButton><IconButton label="Share flight" onPress={()=>void share()} iconStyle={s.heroShareIcon}><FlowIcon name="share" size={17} strokeWidth={androidFavoriteColors.strokeWidth} color={androidFavoriteColors.shareStroke}/></IconButton></View><ScrollView testID="flight-details-scroll-content" contentInsetAdjustmentBehavior="never" bounces={false} alwaysBounceVertical={false} overScrollMode="never" onScroll={({ nativeEvent })=>syncHeaderProtection(nativeEvent.contentOffset.y)} scrollEventThrottle={16} style={{backgroundColor:contentCanvasColor}} contentContainerStyle={[s.content,{width:windowWidth,maxWidth:windowWidth,paddingBottom:28+inset.bottom}]}>
    <ImageBackground testID="flight-details-hero" onLayout={({ nativeEvent })=>measureHeaderHero(nativeEvent.layout.height)} source={require("../../../assets/heroes/flight-details-hero.webp")} resizeMode="cover" style={[s.hero,{paddingTop:inset.top+64}]} imageStyle={s.heroImage}>
      <View style={s.heroOverlay}/>
      <Svg testID="flight-details-hero-text-fade" pointerEvents="none" accessible={false} style={s.heroTextFade}><Defs><LinearGradient id="flightHeroTextFade" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#050D1A" stopOpacity="0"/><Stop offset="0.45" stopColor="#050D1A" stopOpacity="0.18"/><Stop offset="1" stopColor="#050D1A" stopOpacity="0.42"/></LinearGradient></Defs><Rect width="100%" height="100%" fill="url(#flightHeroTextFade)"/></Svg>
      <View testID="flight-details-route-summary" style={s.heroCopy}><Text accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={s.route}>{flightDetailsRouteLabel(details.search.tripType,offer.legs??[],offer.originAirport,offer.destinationAirport)}</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={s.routeMetadata}>{tripMetadata}</Text></View>
      <HeroCurve testID="flight-details-hero-curve" color={contentCanvasColor}/>
    </ImageBackground>
    <View style={s.contentBody}>
    <View testID="flight-details-itinerary-overlap" onLayout={({ nativeEvent })=>measureHeaderForeground(nativeEvent.layout.y)} style={s.itineraryStack}>{(offer.legs?.length?offer.legs:[]).map((leg,index)=><Itinerary key={`${leg.departureTime}-${index}`} leg={leg} index={index} offerAirlineName={offer.airlineName} offerAirlineLogo={offer.airlineLogo} theme={theme} intlLocale={intlLocale}/>)}</View>
    {message?<View accessibilityRole="alert" style={s.notice}><Text style={s.noticeText}>{message}</Text></View>:null}
    <Text style={[s.fareSectionTitle,{color:fareHeadingTextColor}]}>Pick your fare</Text>
    {displayPricesReady?<ScrollView accessibilityRole="radiogroup" accessibilityLabel="Available fares" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.fares,details.fareChoices.length>1?s.faresMultiple:s.faresSingle]}>
      {details.fareChoices.map((choice)=>{
        const isSelected=choice.key===selected.key;
        const isKayak=choice.offer.provider==="KAYAK sandbox";
        const fareTerms=nativeFareBenefitRows(choice.distinguishingTerms,details.search.tripType,3,isKayak?{ensureStandardRows:true,conditions:choice.offer.providerDetails?.conditions}:undefined);
        return <View key={choice.key} style={[s.fareCard,{width:loadedFareCardWidth,backgroundColor:theme.surface,borderColor:isSelected?ui.blue:surfaceBorderColor},isSelected?s.fareCardSelected:s.fareCardUnselected,theme.dark?s.fareCardDark:s.fareCardLight]}>
          <Pressable accessibilityRole="radio" accessibilityState={{selected:isSelected}} accessibilityLabel={`${choice.label}, ${displayPrices[choice.key]?.accessibilityLabel??"price unavailable"}`} onPress={()=>{setSelectedKey(choice.key);setSelectedDealOfferId((nativeFlightDealSelection(null,choice)??choice.deals[0]??null)?.offerId??null);trackSelectedOffer(choice.offer.id);}} style={StyleSheet.absoluteFillObject}/>
          <View pointerEvents="box-none" style={s.fareContent}>
            <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={s.fareSelectionControl}>
              <View style={s.fareIdentity}><View style={[s.fareIconContainer,{backgroundColor:theme.dark?"#17365D":"#EAF3FF",borderColor:theme.dark?"#315A8F":"#CFE3FA"}]}><Luggage size={14} color={ui.blue}/></View><Text numberOfLines={2} ellipsizeMode="tail" style={[s.fareLabel,{color:theme.textPrimary}]}>{choice.label}</Text></View>
            </View>
            {fareTerms.length?<View pointerEvents="box-none" style={s.fareBenefits}>{fareTerms.map((row)=>{const benefitKey=`${choice.key}:${row.key}`;return <FareBenefitRow key={benefitKey} title={row.title} detail={row.detail} semantic={row.semantic} titleColor={theme.textPrimary} detailColor={theme.textSecondary} expanded={expandedFareBenefit===benefitKey} onToggle={()=>setExpandedFareBenefit((current)=>current===benefitKey?null:benefitKey)}/>})}</View>:null}
          </View>
          <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={s.farePriceBlock}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[s.farePrice,{color:farePriceTextColor}]}>{displayPrices[choice.key]?.formatted??"Price unavailable"}</Text></View>
        </View>;
      })}
    </ScrollView>:<ScrollView testID="flight-details-fare-price-loading" accessibilityRole="progressbar" accessibilityState={{busy:true}} accessibilityLabel="Loading fare prices" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.loadingFares,details.fareChoices.length>1?s.faresMultiple:s.faresSingle]}>
      {details.fareChoices.slice(0,2).map((choice)=><View key={choice.key} style={[s.loadingFareCard,theme.dark?s.fareCardDark:s.fareCardLight,{width:loadedFareCardWidth,backgroundColor:theme.surface,borderColor:surfaceBorderColor}]}>
        <View style={s.loadingFareContent}><View style={s.loadingFareIdentity}><View style={s.loadingFareNameRow}><View style={[s.loadingFareIcon,{backgroundColor:theme.border}]}/><View style={[s.loadingLine,s.loadingFareName,{backgroundColor:theme.border}]}/></View></View>
          {(["88%","72%","80%"] as const).map((width,index)=><View key={index} style={s.loadingBenefitRow}><View style={[s.loadingBenefitDot,{backgroundColor:theme.border}]}/><View style={[s.loadingLine,{width,backgroundColor:theme.border}]}/></View>)}
        </View>
        <View style={s.loadingFarePriceBlock}><View style={[s.loadingLine,s.loadingFarePrice,{backgroundColor:theme.border}]}/></View>
      </View>)}
    </ScrollView>}
    <View testID="fare-information-deck" style={s.fareInfoDeck}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.fareTabRail,{borderBottomColor:theme.dark?surfaceBorderColor:FLIGHT_DETAILS_LIGHT_TAB_BORDER}]} contentContainerStyle={s.fareTabRailContent}>
        <View accessibilityRole="tablist" accessibilityLabel="Fare information" style={s.fareTabList}>{([['deals','Compare deals'],['details','Fare details'],['conditions','Fare conditions'],['extras','Optional extras']] as const).map(([key,label])=><Pressable accessibilityRole="tab" accessibilityState={{selected:tab===key}} key={key} onPress={()=>setTab(key)} style={s.fareInfoTab}><Text numberOfLines={1} style={[s.fareInfoTabText,{color:fareTabTextColor}]}>{label}</Text>{tab===key?<View style={s.fareTabIndicator}/>:null}</Pressable>)}</View>
      </ScrollView>
      <View testID="fare-information-active-content" style={s.fareInfoBody}><FareSurface tab={tab} choice={selected} dealPrices={displayPrices} selectedDealOfferId={selectedDeal?.offerId??null} onSelectDeal={selectDeal} activeOffer={activeOffer} pricesReady={displayPricesReady} booking={booking} onViewDeal={(offerId)=>void handoff(offerId)} theme={theme}/></View>
    </View>
    </View>
  </ScrollView></SafeAreaView>;
}

function FlightDetailsLoadingSkeleton({theme,topInset,bottomInset,fareCardWidth,viewportWidth}:{theme:ReturnType<typeof useAppTheme>["theme"];topInset:number;bottomInset:number;fareCardWidth:number;viewportWidth:number}) {
  const [reduceMotion,setReduceMotion]=useState(true);
  const opacity=useRef(new Animated.Value(.55)).current;
  useEffect(()=>{let mounted=true;void AccessibilityInfo.isReduceMotionEnabled().then((enabled)=>{if(mounted)setReduceMotion(enabled);});const subscription=AccessibilityInfo.addEventListener("reduceMotionChanged",setReduceMotion);return()=>{mounted=false;subscription.remove();};},[]);
  useEffect(()=>{opacity.stopAnimation();if(reduceMotion){opacity.setValue(.7);return;}opacity.setValue(.55);const pulse=Animated.loop(Animated.sequence([Animated.timing(opacity,{toValue:1,duration:900,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),Animated.timing(opacity,{toValue:.55,duration:900,easing:Easing.inOut(Easing.sin),useNativeDriver:true})]));pulse.start();return()=>pulse.stop();},[opacity,reduceMotion]);
  const placeholder={backgroundColor:theme.border};
  const contentCanvasColor=theme.dark?theme.background:FLIGHT_DETAILS_LOADING_LIGHT_CANVAS;
  const surfaceBorderColor=theme.dark?FLIGHT_DETAILS_DARK_BORDER:FLIGHT_DETAILS_LIGHT_BORDER;
  const heroIconColor="#0F172A";
  const {headerProtected,protectedHeaderHeight,measureHeaderForeground,measureHeaderHero,syncHeaderProtection}=useFlightDetailsHeaderProtection(topInset);
  return <SafeAreaView edges={[]} style={[s.safe,{backgroundColor:contentCanvasColor}]}>
    {/* Keep the busy announcement separate so it does not group/hide the safe Back action. */}
    <View testID="flight-details-loading-skeleton" accessibilityRole="progressbar" accessibilityState={{busy:true}} accessibilityLabel="Loading flight details" accessible pointerEvents="none" style={StyleSheet.absoluteFillObject}/>
    <View testID="flight-details-loading-protected-header" pointerEvents="none" style={[s.protectedHeader,Platform.OS==="android"&&s.androidFlatControlLayer,{height:protectedHeaderHeight,backgroundColor:headerProtected?contentCanvasColor:"transparent"}]}/>
    <View testID="flight-details-loading-back-control" style={[s.heroBackControl,{top:topInset+8}]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to results" onPress={()=>router.back()} style={s.heroIconButton}><DetailGlassSurface dark={false} variant="hotelLight" style={s.heroIconGlass}/><ArrowLeft size={20} color={heroIconColor}/></Pressable>
    </View>
    <View testID="flight-details-loading-actions" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.heroActions,s.floatingControl,{top:topInset+8}]}>
      <DetailGlassSurface dark={false} variant="hotelLight" style={s.heroActionsGlass}/>
      <View style={s.heroAction}><View style={s.heroHeartIcon}><Heart size={17} color="#94A3B8"/></View></View>
      <View style={s.heroAction}><View style={s.heroShareIcon}><FlowIcon name="share" size={17} color="#94A3B8"/></View></View>
    </View>
    <ScrollView testID="flight-details-loading-scroll" contentInsetAdjustmentBehavior="never" bounces={false} alwaysBounceVertical={false} overScrollMode="never" onScroll={({ nativeEvent })=>syncHeaderProtection(nativeEvent.contentOffset.y)} scrollEventThrottle={16} style={{backgroundColor:contentCanvasColor}} contentContainerStyle={[s.content,{width:viewportWidth,maxWidth:viewportWidth,paddingBottom:120+bottomInset}]}>
      <View testID="flight-details-loading-hero" onLayout={({ nativeEvent })=>measureHeaderHero(nativeEvent.layout.height)} style={[s.hero,{paddingTop:topInset+64,backgroundColor:theme.dark?"#27272A":"#E2E8F0"}]}>
        <Animated.View testID="flight-details-loading-copy" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.heroCopy,{opacity}]}>
          <View testID="flight-details-loading-route" style={[s.loadingLine,s.loadingRouteLine,placeholder]}/>
          <View testID="flight-details-loading-metadata" style={[s.loadingLine,s.loadingMetadataLine,placeholder]}/>
        </Animated.View>
        <HeroCurve testID="flight-details-loading-hero-curve" color={contentCanvasColor}/>
      </View>
      <Animated.View testID="flight-details-loading-body" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.contentBody,s.loadingContentBody,{opacity}]}>
        <View testID="flight-details-loading-itinerary-overlap" onLayout={({ nativeEvent })=>measureHeaderForeground(nativeEvent.layout.y)} style={[s.itineraryStack,s.loadingItineraryStack]}>
          <View testID="flight-details-loading-itinerary" style={[s.itineraryCard,s.loadingItineraryCard,theme.dark?s.loadingItineraryCardDark:s.loadingItineraryCardLight,{backgroundColor:theme.dark?theme.surface:FLIGHT_DETAILS_LIGHT_ITINERARY_SURFACE,borderColor:theme.dark?surfaceBorderColor:FLIGHT_DETAILS_LIGHT_ITINERARY_BORDER}]}>
            <ItineraryGlossSurface dark={theme.dark} testID="flight-details-loading-itinerary-gloss"/>
            <View testID="flight-details-loading-direction-date" style={s.itineraryHeader}><View style={[s.loadingLine,s.loadingDirectionLine,placeholder]}/><View style={[s.loadingLine,s.loadingDateLine,placeholder]}/></View>
            <View testID="flight-details-loading-journey" style={s.loadingJourneyRow}><View style={[s.loadingLine,s.loadingTimeLine,placeholder]}/><View style={[s.loadingLine,s.loadingPathLine,placeholder]}/><View style={[s.loadingLine,s.loadingTimeLine,placeholder]}/></View>
            <View testID="flight-details-loading-airports" style={s.loadingAirportRow}><View style={[s.loadingLine,s.loadingAirportLine,placeholder]}/><View style={[s.loadingLine,s.loadingAirportLine,placeholder]}/></View>
            <View style={[s.loadingDivider,{backgroundColor:theme.border}]}/>
            <View testID="flight-details-loading-airline" style={[s.loadingLine,s.loadingAirlineLine,placeholder]}/>
          </View>
        </View>
        <View testID="flight-details-loading-fare-heading" style={[s.loadingLine,s.loadingFareHeading,placeholder]}/>
        <ScrollView testID="flight-details-loading-fares" horizontal showsHorizontalScrollIndicator={false} scrollEnabled={false} contentContainerStyle={s.loadingFares}>
          {[0,1].map(key=><View key={key} style={[s.loadingFareCard,theme.dark?s.loadingFareCardDark:s.loadingFareCardLight,{width:fareCardWidth,backgroundColor:theme.surface,borderColor:surfaceBorderColor}]}>
            <View style={s.loadingFareContent}><View style={s.loadingFareIdentity}><View style={s.loadingFareNameRow}><View style={[s.loadingFareIcon,placeholder]}/><View style={[s.loadingLine,s.loadingFareName,placeholder]}/></View></View>
              {(["88%","72%","80%"] as const).map((width,index)=><View key={index} style={s.loadingBenefitRow}><View style={[s.loadingBenefitDot,placeholder]}/><View style={[s.loadingLine,{width},placeholder]}/></View>)}
            </View>
            <View style={s.loadingFarePriceBlock}><View style={[s.loadingLine,s.loadingFarePrice,placeholder]}/></View>
          </View>)}
        </ScrollView>
        <View testID="flight-details-loading-info" style={s.loadingInfoDeck}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={false} style={s.loadingTabRail}>
            <View testID="flight-details-loading-tabs" style={[s.loadingTabs,{borderBottomColor:surfaceBorderColor}]}>{[110,90,120,110].map((width,index)=><View key={index} style={[s.loadingLine,{width},placeholder]}/>)}</View>
          </ScrollView>
          <View testID="flight-details-loading-info-content" style={s.loadingInfoBody}>{(["92%","68%","84%"] as const).map((width,index)=><View key={index} style={[s.loadingLine,{width},placeholder]}/>)}</View>
        </View>
      </Animated.View>
    </ScrollView>
    <View testID="flight-details-loading-checkout" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.sticky,theme.dark?s.stickyDark:s.stickyLight,{paddingBottom:Math.max(bottomInset,10),backgroundColor:theme.surface,borderTopColor:surfaceBorderColor}]}>
      <Animated.View style={[s.loadingCheckoutTotal,{opacity}]}><View style={[s.loadingLine,s.loadingCheckoutLabel,placeholder]}/><View style={[s.loadingLine,s.loadingCheckoutPrice,placeholder]}/></Animated.View>
      <Animated.View style={[s.loadingCheckoutButton,placeholder,{opacity}]}/>
    </View>
  </SafeAreaView>;
}

function HeroCurve({testID,color}:{testID:string;color:string}) { return <Svg testID={testID} pointerEvents="none" style={s.heroCurve} viewBox="0 0 100 64" preserveAspectRatio="none"><Path d="M0 12 Q50 64 100 12 L100 64 L0 64 Z" fill={color}/></Svg>; }

function ItineraryGlossSurface({dark,testID}:{dark:boolean;testID:string}) {
  if(dark)return null;
  return <Svg testID={testID} pointerEvents="none" accessible={false} style={s.itineraryGlossSurface} viewBox="0 0 100 100" preserveAspectRatio="none">
    <Defs>
      <LinearGradient id={`${testID}-sheen`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.78"/><Stop offset="0.46" stopColor="#FFFFFF" stopOpacity="0.18"/><Stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/></LinearGradient>
    </Defs>
    <Rect width="100" height="52" fill={`url(#${testID}-sheen)`}/>
  </Svg>;
}

function TopBar({backgroundColor,hasScrolled=false,children}:{backgroundColor:string;hasScrolled?:boolean;children?:React.ReactNode}){return <View testID="flight-details-top-bar" style={[s.topBar,{backgroundColor},hasScrolled&&s.topBarScrolled]}><Pressable accessibilityRole="button" accessibilityLabel="Back to results" onPress={()=>router.back()} style={s.back}><ArrowLeft size={18} color={ui.blue}/><Text numberOfLines={1} ellipsizeMode="tail" style={s.backText}>Back to results</Text></Pressable>{children}</View>}
function IconButton({label,onPress,iconStyle,children}:{label:string;onPress:()=>void;iconStyle?:React.ComponentProps<typeof View>["style"];children:React.ReactNode}){return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.heroAction}><View pointerEvents="none" style={iconStyle}>{children}</View></Pressable>}
function FareStatusIcon({semantic}:{semantic:"positive"|"negative"|"informational"}){return <View style={[s.fareStatus,semantic==="positive"?s.fareStatusPositive:s.fareStatusNeutral]}>{semantic==="positive"?<FlowIcon name="check" size={10} color={ui.green}/>:semantic==="negative"?<View style={s.fareStatusMinus}/>:<View style={s.fareStatusDot}/>}</View>}
function FareBenefitRow({title,detail,semantic,titleColor,detailColor,expanded,onToggle}:{title:string;detail:string;semantic:FlightFareTerm["semantic"];titleColor:string;detailColor:string;expanded:boolean;onToggle:()=>void}){const accessibilityTitle=title.replace("/"," and ");return <Pressable accessibilityRole="button" accessibilityLabel={`${accessibilityTitle}${expanded?`, ${detail}`:""}, ${expanded?"collapse details":"expand details"}`} accessibilityState={{expanded}} onPress={onToggle} style={s.fareBenefitRow}><View style={s.fareStatusColumn}><FareStatusIcon semantic={semantic}/></View><View style={s.fareBenefitCopy}><Text style={[s.fareBenefitTitle,{color:titleColor}]}>{title}</Text>{expanded?<Text style={[s.fareBenefitDetail,{color:detailColor}]}>{detail}</Text>:null}</View><View style={s.fareBenefitChevron}><ChevronDown size={13} color={detailColor} style={expanded?s.fareBenefitChevronExpanded:undefined}/></View></Pressable>}
function Itinerary({leg,index,offerAirlineName,offerAirlineLogo,theme,intlLocale}:{leg:FlightLeg;index:number;offerAirlineName:string;offerAirlineLogo?:string|null;theme:ReturnType<typeof useAppTheme>["theme"];intlLocale:string}) {
  const surfaceBorderColor=theme.dark?FLIGHT_DETAILS_DARK_BORDER:FLIGHT_DETAILS_LIGHT_BORDER;
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
  const primaryText=theme.dark?theme.textPrimary:FLIGHT_DETAILS_LIGHT_PRIMARY;
  const strongText=theme.dark?theme.textPrimary:FLIGHT_DETAILS_LIGHT_STRONG;
  const secondaryText=theme.dark?theme.textSecondary:FLIGHT_DETAILS_LIGHT_SECONDARY;
  const durationText=theme.dark?theme.textSecondary:FLIGHT_DETAILS_LIGHT_DURATION;
  const pathColor=theme.dark?theme.textSecondary:FLIGHT_DETAILS_LIGHT_PATH;
  const dividerColor=theme.dark?theme.border:"#E2E8F0";
  const connectionSurface=theme.dark?FLIGHT_DETAILS_DARK_CONNECTION_SURFACE:FLIGHT_DETAILS_LIGHT_CONNECTION_SURFACE;
  const connectionBorder=FLIGHT_DETAILS_LIGHT_CONNECTION_BORDER;
  const connectionAccent=theme.dark?FLIGHT_DETAILS_DARK_CONNECTION_ACCENT:FLIGHT_DETAILS_LIGHT_CONNECTION_ACCENT;
  return <View style={[s.itineraryCard,theme.dark?s.itineraryCardDark:s.itineraryCardLight,{backgroundColor:theme.dark?theme.surface:FLIGHT_DETAILS_LIGHT_ITINERARY_SURFACE,borderColor:theme.dark?surfaceBorderColor:FLIGHT_DETAILS_LIGHT_ITINERARY_BORDER}]}>
    <ItineraryGlossSurface dark={theme.dark} testID="flight-details-itinerary-gloss"/>
    <View style={s.itineraryHeader}>
      <Text style={s.direction}>{label}</Text>
      <Text style={[s.itineraryDate,{color:secondaryText}]}>{departureDate}</Text>
    </View>
    <View style={s.journeySummary}>
      <View style={s.journeyEndpoint}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[s.journeyTime,{color:strongText}]}>{clock(leg.departureTime)}</Text>
        <Text style={[s.airportCode,{color:primaryText}]}>{leg.originAirport}</Text>
        {departureShortDate?<Text numberOfLines={1} style={[s.airportDate,{color:secondaryText}]}>{departureShortDate}</Text>:null}
      </View>
      <View style={s.journeyCenter}>
        <Text style={[s.journeyDuration,{color:durationText}]}>{leg.duration}</Text>
        <View style={s.flightPath} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={s.pathDot}/><View style={[s.pathLine,{backgroundColor:pathColor}]}/><FlowIcon name="flight" size={16} color={ui.blue}/><View style={[s.pathLine,{backgroundColor:pathColor}]}/><View style={s.pathDot}/>
        </View>
        <Text style={[s.stopStatus,{color:secondaryText}]}>{stopStatus}</Text>
      </View>
      <View style={[s.journeyEndpoint,s.arrivalEndpoint]}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[s.journeyTime,{color:strongText}]}>{clock(leg.arrivalTime)}</Text>
        <Text style={[s.airportCode,{color:primaryText}]}>{leg.destinationAirport}</Text>
        {arrivalShortDate?<Text numberOfLines={1} style={[s.airportDate,s.arrivalText,{color:secondaryText}]}>{arrivalShortDate}</Text>:null}
      </View>
    </View>
    <View style={s.airportDetails}>
      <View style={s.airportColumn}>
        <Text style={[s.airportName,{color:primaryText}]}>{airportName(departurePoint,leg.originAirport)}</Text>
        {departurePoint?.terminal?<Text style={[s.terminal,{color:secondaryText}]}>Terminal {departurePoint.terminal}</Text>:null}
      </View>
      <View style={[s.airportColumn,s.arrivalAirportColumn]}>
        <Text style={[s.airportName,s.arrivalText,{color:primaryText}]}>{airportName(arrivalPoint,leg.destinationAirport)}</Text>
        {arrivalPoint?.terminal?<Text style={[s.terminal,s.arrivalText,{color:secondaryText}]}>Terminal {arrivalPoint.terminal}</Text>:null}
      </View>
    </View>
    <View style={[s.itineraryDivider,{backgroundColor:dividerColor}]}/>
    <View style={s.segmentList}>{leg.segments.map((segment,i)=>{
      const carrier=resolveSegmentCarrierName(segment,offerAirlineName);
      const flightNumber=segment.marketingFlightNumber??segment.flightNumber;
      const operatingDiffers=Boolean(segment.operatingCarrier&&(segment.operatingCarrier.name!==segment.marketingCarrier?.name||segment.operatingFlightNumber!==segment.marketingFlightNumber));
      const aircraftName=segment.aircraft?.name?.trim()||segment.aircraft?.iataCode?.trim();
      const aircraftSuffix=segment.aircraft?.name?.trim()&&segment.aircraft?.iataCode?.trim()?` (${segment.aircraft.iataCode.trim()})`:"";
      const layover=i>0?leg.layovers[i-1]:undefined;
      return <View key={`${segment.originAirport}-${segment.destinationAirport}-${segment.departureTime}-${i}`} style={s.segmentItem}>
        {layover?<View testID="flight-details-connection-row" style={[s.segmentConnection,{backgroundColor:connectionSurface,borderColor:connectionBorder},theme.dark&&{borderColor:theme.border}]}><FlowIcon name="clock" size={13} strokeWidth={1.8} color={connectionAccent}/><Text numberOfLines={1} ellipsizeMode="tail" style={[s.segmentConnectionText,{color:primaryText}]}>Connection at {layoverLabel(layover.airport)}<Text style={[s.segmentConnectionDuration,{color:secondaryText}]}> · {layover.duration}</Text></Text></View>:null}
        <View style={s.segmentRow}>
          {carrier?<AirlineLogo airlineName={carrier} logoUrl={segment.airlineLogo??(canUseOfferAirlineLogo(segment,offerAirlineName,offerAirlineLogo)?offerAirlineLogo:null)} variant="result-card"/>:null}
          <View style={s.segmentCopy}>
            <View style={s.segmentHeading}><Text style={[s.segmentRoute,{color:primaryText}]}>{segment.originAirport} → {segment.destinationAirport}</Text><Text style={[s.segmentTimes,{color:strongText}]}>{clock(segment.departureTime)} – {clock(segment.arrivalTime)}</Text></View>
            <Text style={[s.segmentMeta,{color:secondaryText}]}>{carrier||"Carrier not supplied"}{flightNumber?` · Flight ${flightNumber}`:""}</Text>
            {operatingDiffers?<Text style={[s.segmentDetail,{color:secondaryText}]}>Operated by {segment.operatingCarrier?.name}{segment.operatingFlightNumber?` · Flight ${segment.operatingFlightNumber}`:""}</Text>:null}
            {aircraftName?<Text style={[s.segmentDetail,{color:secondaryText}]}>Aircraft: {aircraftName}{aircraftSuffix}</Text>:null}
            {segment.distanceKm!==undefined?<Text style={[s.segmentDetail,{color:secondaryText}]}>Flight distance: {Math.round(segment.distanceKm).toLocaleString()} km</Text>:null}
          </View>
        </View>
      </View>;
    })}</View>
    {hasTechnicalInformation?<>
      <View style={[s.itineraryDivider,{backgroundColor:dividerColor}]}/>
      <View style={s.technicalInformation}>
        <Text style={[s.technicalHeading,{color:primaryText}]}>Flight info</Text>
        {departureTimeZone&&arrivalTimeZone&&departureTimeZone===arrivalTimeZone?<View style={s.technicalRow}><Text style={[s.technicalLabel,{color:primaryText}]}>Time zone</Text><Text style={[s.technicalValue,{color:secondaryText}]}>{departureTimeZone}</Text></View>:<>
          {departureTimeZone?<View style={s.technicalRow}><Text style={[s.technicalLabel,{color:primaryText}]}>Departure time zone</Text><Text style={[s.technicalValue,{color:secondaryText}]}>{departureTimeZone}</Text></View>:null}
          {arrivalTimeZone?<View style={s.technicalRow}><Text style={[s.technicalLabel,{color:primaryText}]}>Arrival time zone</Text><Text style={[s.technicalValue,{color:secondaryText}]}>{arrivalTimeZone}</Text></View>:null}
        </>}
      </View>
    </>:null}
  </View>;
}
function FareSurface({tab,choice,dealPrices,selectedDealOfferId,onSelectDeal,activeOffer,pricesReady,booking,onViewDeal,theme}:{tab:"deals"|"details"|"conditions"|"extras";choice:FlightDetailsFareChoice;dealPrices:Record<string,DisplayPrice>;selectedDealOfferId:string|null;onSelectDeal:(id:string)=>void;activeOffer:FlightDetailsOffer;pricesReady:boolean;booking:boolean;onViewDeal:(offerId:string)=>void;theme:ReturnType<typeof useAppTheme>["theme"]}) {
  const { width } = useWindowDimensions();
  const narrow=width<350;
  const surfaceBorderColor=theme.dark?FLIGHT_DETAILS_DARK_BORDER:FLIGHT_DETAILS_LIGHT_BORDER;
  const offer=activeOffer,p=offer.providerDetails;
  const categoryColor=theme.dark?"#AAB5CD":"#596984";
  const supportingColor=theme.dark?"#94A3B8":"#64748B";
  const cabins=flightFareDetailCabins(offer);
  const baggageTerms=flightBaggageTerms(offer);
  const policies=p?.airlineBaggagePolicies??[];
  const links=nativeCarrierConditionsLinks(offer);
  const conditionGroups=(p?.conditions??[]).reduce<Array<{category:string;conditions:FlightProviderCondition[]}>>((groups,condition)=>{const group=groups.find(({category})=>category===condition.category);if(group)group.conditions.push(condition);else groups.push({category:condition.category,conditions:[condition]});return groups;},[]);
  const detailRow=(label:string,value:unknown,strong=false)=>value===undefined||value===null||value===""?null:<View style={s.detailRow}><Text style={[s.detailLabel,strong&&s.detailTotal,{color:supportingColor}]}>{label}</Text><Text style={[s.detailValue,strong&&s.detailTotal,{color:theme.textPrimary}]}>{String(value)}</Text></View>;
  const groupLabel=(label:string)=><Text style={[s.fareGroupLabel,{color:categoryColor}]}>{label}</Text>;
  const divider=(key:string)=><View key={key} style={[s.fareGroupDivider,{backgroundColor:theme.border}]}/>;
  const freshness=(updatedAt:string)=><View style={s.providerFreshness}><Text style={[s.providerFreshnessLabel,{color:supportingColor}]}>Provider offer last updated</Text><Text style={[s.providerFreshnessValue,{color:supportingColor}]}>{providerTimestamp(updatedAt)}</Text></View>;
  const emptyState=(title:string,description:string)=><View style={s.emptyState}><Text style={[s.emptyTitle,{color:theme.textPrimary}]}>{title}</Text><Text style={[s.emptyDescription,{color:supportingColor}]}>{description}</Text></View>;
  const fallbackProviderName=choice.offer.bookingProviderName?.trim()||choice.offer.provider?.trim()||choice.offer.airlineName?.trim()||"";
  const fallbackDeal=!choice.deals.length&&fallbackProviderName&&Number.isFinite(choice.offer.price)&&choice.offer.price>0?{
    key:`native-source-${choice.key}`,
    offerId:choice.offer.id,
    providerName:fallbackProviderName,
    providerLogoUrl:choice.offer.bookingProviderLogoUrl,
    price:choice.offer.price,
    currency:choice.offer.currency,
    offer:choice.offer,
    priceKey:choice.key,
    canContinue:choice.handoff.available,
  }:null;
  const displayedDeals=choice.deals.length
    ? choice.deals.map((deal)=>({key:deal.key,offerId:deal.offerId,providerName:deal.providerName,providerLogoUrl:deal.providerLogoUrl,price:deal.price,currency:deal.currency,offer:deal.offer,priceKey:`deal:${deal.key}`,canContinue:true}))
    : fallbackDeal?[fallbackDeal]:[];

  if(tab==="deals") return <View accessibilityRole="radiogroup" accessibilityLabel="Flight deal options" style={s.dealList}>{displayedDeals.length?displayedDeals.map((deal)=>{const isSelected=deal.offerId===selectedDealOfferId;const price=dealPrices[deal.priceKey];const sourcePrice=sourceMoney(deal.price,deal.currency);const visiblePrice=!pricesReady?"Loading price…":price?.formatted??sourcePrice;const visiblePriceAccessibility=!pricesReady?"Price loading":price?.accessibilityLabel??`${sourcePrice} in provider currency`;const identityMark=resolveDealIdentityMark(deal);const canViewDeal=deal.canContinue&&pricesReady&&Number.isFinite(deal.price)&&deal.price>0;const actionDisabled=booking||!canViewDeal;return <View key={deal.key} style={[s.dealCard,narrow&&s.dealCardNarrow,{backgroundColor:theme.surface,borderColor:theme.dark?theme.border:FLIGHT_DETAILS_LIGHT_DEAL_BORDER}]}>
    <View style={s.dealMain}>
      <Pressable accessibilityRole="radio" accessibilityState={{selected:isSelected}} accessibilityLabel={`${deal.providerName}, ${visiblePriceAccessibility}, Trip total, ${choice.label}`} onPress={()=>onSelectDeal(deal.offerId)} style={({pressed})=>[s.dealProviderColumn,pressed&&s.dealCardPressed]}>
        {deal.providerLogoUrl?<View style={[s.dealProviderLogo,narrow&&s.dealProviderLogoNarrow]}><ProviderLogo provider={deal.providerName} logoUrl={deal.providerLogoUrl} variant={narrow?"deal-card-compact":"deal-card"}/></View>:identityMark.kind==="airline"&&identityMark.logoUrl?<View style={[s.dealProviderLogo,narrow&&s.dealProviderLogoNarrow]}><AirlineLogo airlineName={deal.providerName} logoUrl={identityMark.logoUrl} fallbackCharacters={1} variant={narrow?"provider-deal-compact":"provider-deal"}/></View>:<Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[s.dealProvider,narrow&&s.dealProviderNarrow,{color:theme.dark?theme.textPrimary:FLIGHT_DETAILS_LIGHT_DEAL_TEXT}]}>{deal.providerName}</Text>}
      </Pressable>
      <Pressable accessible={false} importantForAccessibility="no-hide-descendants" onPress={()=>onSelectDeal(deal.offerId)} style={({pressed})=>[s.dealPriceColumn,pressed&&s.dealCardPressed]}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68} style={[s.dealPrice,narrow&&s.dealPriceNarrow,{color:theme.dark?theme.textPrimary:FLIGHT_DETAILS_LIGHT_DEAL_TEXT}]}>{visiblePrice}</Text><Text numberOfLines={1} style={[s.dealPriceLabel,narrow&&s.dealPriceLabelNarrow,{color:theme.dark?theme.textSecondary:FLIGHT_DETAILS_LIGHT_DEAL_META}]}>Trip total</Text></Pressable>
      <View style={s.dealActionColumn}><Pressable accessibilityRole="button" accessibilityLabel={`View deal with ${deal.providerName}${canViewDeal?"":pricesReady?", checkout unavailable":", checking price"}`} accessibilityState={{disabled:actionDisabled,busy:booking||!pricesReady}} disabled={actionDisabled} onPress={()=>{onSelectDeal(deal.offerId);onViewDeal(deal.offerId);}} style={({pressed})=>[s.viewDealButton,narrow&&s.viewDealButtonNarrow,{backgroundColor:FLIGHT_DETAILS_DEAL_ACTION},actionDisabled&&s.viewDealDisabled,pressed&&s.viewDealPressed]}><Text style={[s.viewDealText,narrow&&s.viewDealTextNarrow]}>View deal</Text></Pressable></View>
    </View>
  </View>}):emptyState("No fare price available","The provider did not supply a usable price for this fare.")}</View>;

  if(tab==="details") return <View style={s.infoSections}>
    <View style={s.infoSection}>{cabins.length?cabins.map(({segment,cabin:c},i)=>{const seat=[c.amenities?.seat?.type&&titleCase(c.amenities.seat.type),c.amenities?.seat?.pitch&&`${c.amenities.seat.pitch} in pitch`,c.amenities?.seat?.legroom&&`${titleCase(c.amenities.seat.legroom)} legroom`].filter(Boolean).join(" · ");const hasCabin=Boolean(c.fareBrandName||c.cabinClass||c.cabinMarketingName||c.fareBasisCode||segment.aircraft);const hasOnBoard=Boolean(seat||c.amenities?.wifi||c.amenities?.power||c.onboardFeatures?.length);const wifi=c.amenities?.wifi;const wifiValue=wifi?`${amenityState(wifi.state)}${wifi.state==="included"&&wifi.cost?` (${titleCase(wifi.cost)})`:""}`:undefined;return <View key={i} style={[s.cabinGroup,i>0&&{borderTopColor:theme.border,borderTopWidth:StyleSheet.hairlineWidth}]}><Text style={[s.segmentContext,{color:theme.textPrimary}]}>{segment.originAirport} → {segment.destinationAirport}{segment.marketingFlightNumber??segment.flightNumber?` · ${segment.marketingFlightNumber??segment.flightNumber}`:""}</Text>{hasCabin?<View style={s.fareFactGroup}>{groupLabel("Cabin")}{detailRow("Fare brand",c.fareBrandName)}{detailRow("Cabin",c.cabinClass&&titleCase(c.cabinClass))}{detailRow("Cabin product",c.cabinMarketingName)}{detailRow("Fare basis",c.fareBasisCode)}{detailRow("Aircraft",segment.aircraft?.name||segment.aircraft?.iataCode)}</View>:null}{hasCabin&&hasOnBoard?divider(`cabin-${i}`):null}{hasOnBoard?<View style={s.fareFactGroup}>{groupLabel("On board")}{detailRow("Seat",seat)}{detailRow("Wi-Fi",wifiValue)}{c.amenities?.power?detailRow("Power",amenityState(c.amenities.power.state)):null}{c.onboardFeatures?.map((feature,featureIndex)=><View key={`${feature.kind}-${featureIndex}`}>{detailRow(flightOnboardFeatureLabel(feature.kind),feature.description)}</View>)}</View>:null}</View>}):<Text style={[s.quietText,{color:supportingColor}]}>Additional cabin details not supplied by the provider.</Text>}</View>
    <View style={[s.infoSection,s.sectionDivider,{borderTopColor:theme.border}]}>{groupLabel("Price breakdown")}{p?.price?<>{p.price.baseAmount!==undefined&&p.price.baseCurrency?detailRow("Base fare",sourceMoney(p.price.baseAmount,p.price.baseCurrency)):null}{p.price.taxAmount!==undefined&&p.price.taxCurrency?detailRow("Taxes",sourceMoney(p.price.taxAmount,p.price.taxCurrency)):null}{detailRow("Trip total",sourceMoney(p.price.totalAmount,p.price.totalCurrency),true)}</>:<Text style={[s.quietText,{color:supportingColor}]}>Price breakdown not supplied by the provider.</Text>}</View>
    {p?.totalEmissionsKg!==undefined?<View style={[s.emissionsCard,{backgroundColor:theme.dark?"#0F2F26":"#ECFDF5"}]}><View style={s.emissionsIdentity}><Leaf size={17} color={theme.dark?"#6EE7B7":"#047857"}/><Text style={[s.emissionsLabel,{color:theme.dark?"#6EE7B7":"#047857"}]}>Estimated CO₂ emissions</Text></View><View style={s.emissionsValueGroup}><Text style={[s.emissionsValue,{color:theme.textPrimary}]}>{p.totalEmissionsKg.toLocaleString()} kg</Text><Text style={[s.emissionsContext,{color:supportingColor}]}>for this offer</Text></View></View>:null}
    {p?.updatedAt?<View style={[s.secondaryFacts,{borderTopColor:theme.border}]}>{freshness(p.updatedAt)}</View>:null}
  </View>;

  if(tab==="conditions") return <View style={s.infoSections}>
    {baggageTerms.length?<View style={s.infoSection}>{groupLabel("Baggage allowance")}{baggageTerms.map((term,index)=><View key={index} style={s.conditionRow}><FareStatusIcon semantic={term.semantic}/><View style={s.conditionCopy}><Text style={[s.factDescription,{color:theme.textPrimary}]}>{term.text}</Text></View></View>)}</View>:null}
    {policies.length?<View style={[s.infoSection,s.sectionDivider,{borderTopColor:theme.border}]}>{groupLabel("Airline baggage policy")}{policies.map((policy,index)=><View key={`${policy.carrierCode}-${index}`} style={s.fareFactGroup}><Text style={[s.airlineIdentity,{color:theme.textPrimary}]}>{policy.carrierName}{policy.carrierCode&&policy.carrierName!==policy.carrierCode?` · ${policy.carrierCode}`:""}</Text>{policy.carryOn?.map((value,i)=><View key={`carry-${i}`}>{detailRow("Carry-on",value)}</View>)}{policy.checked?.map((value,i)=><View key={`checked-${i}`}>{detailRow("Checked bag",value)}</View>)}</View>)}</View>:null}
    <View>{conditionGroups.length?conditionGroups.map((group,groupIndex)=><View key={group.category} style={[s.conditionGroup,groupIndex>0&&s.sectionDivider,{borderTopColor:theme.border}]}>{groupLabel(conditionCategory(group.conditions[0]))}{group.conditions.map((condition,index)=>{const semantic=condition.state==="allowed"?"positive":condition.state==="not-allowed"?"negative":"informational";const penalty=condition.penaltyAmount!==undefined&&condition.penaltyCurrency?`${sourceMoney(condition.penaltyAmount,condition.penaltyCurrency)} penalty`:null;return <View key={`${condition.scope}-${condition.category}-${index}`} style={[s.conditionRow,index>0&&{borderTopColor:theme.border,borderTopWidth:StyleSheet.hairlineWidth}]}><FareStatusIcon semantic={semantic}/><View style={s.conditionCopy}><Text style={[s.conditionState,{color:theme.textPrimary}]}>{conditionState(condition)}</Text><Text style={[s.conditionScope,{color:supportingColor}]}>{conditionScope(condition)}</Text>{penalty?<Text style={[s.conditionPenalty,{color:supportingColor}]}>{penalty}</Text>:null}</View></View>;})}</View>):baggageTerms.length||policies.length?null:emptyState("Fare conditions unavailable","Conditions were not supplied by the provider.")}</View>
    {(p?.passengerIdentityDocumentsRequired||p?.supportedIdentityDocumentTypes?.length)?<View style={[s.infoSection,s.sectionDivider,{borderTopColor:theme.border}]}>{groupLabel("Travel documents")}{p.passengerIdentityDocumentsRequired?<Text style={[s.factDescription,{color:theme.textPrimary}]}>Passport or identity information is required to complete booking.</Text>:null}{p.supportedIdentityDocumentTypes?.length?detailRow("Supported documents",p.supportedIdentityDocumentTypes.map(titleCase).join(", ")):null}</View>:null}
    {(p?.offerOwner||links.length)?<View style={[s.infoSection,s.sectionDivider,{borderTopColor:theme.border}]}>{groupLabel("Airline")}{p?.offerOwner?<Text style={[s.airlineIdentity,{color:theme.textPrimary}]}>{p.offerOwner.name}{p.offerOwner.iataCode?` • ${p.offerOwner.iataCode}`:""}</Text>:null}{links.map(link=><Pressable key={link.url} accessibilityRole="link" accessibilityLabel={`${link.name} conditions of carriage`} onPress={()=>void Linking.openURL(link.url).catch(()=>Alert.alert("Unable to open link","Please try again."))} style={s.linkRow}><Text style={[s.linkText,{color:ui.blue}]}>{link.name} conditions of carriage</Text><FlowIcon name="external" size={17} color={ui.blue}/></Pressable>)}</View>:null}
    {p?.updatedAt?<View style={[s.secondaryFacts,{borderTopColor:theme.border}]}>{freshness(p.updatedAt)}</View>:null}
  </View>;

  if(tab==="extras") return <View style={s.infoSections}><View style={s.infoSection}>{groupLabel("Optional services")}{p?.optionalServices?.length?p.optionalServices.map((service,index)=><View key={`${service.type}-${service.description}-${service.journeyContext||"trip"}-${service.price}-${service.currency}-${service.maximumQuantity??"na"}-${service.travelerCount??"na"}-${index}`} style={[s.serviceRow,index>0&&{borderTopColor:theme.border,borderTopWidth:StyleSheet.hairlineWidth}]}><View style={s.serviceCopy}><View style={s.serviceHeading}><Text style={[s.serviceDescription,{color:theme.textPrimary}]}>{service.description}</Text><Text style={[s.servicePrice,{color:theme.textPrimary}]}>{service.pricing==="fee-unspecified"?"Available for a fee":`${sourceMoney(service.price,service.currency)}${service.pricedPerTraveler?" each":""}`}</Text></View>{service.travelerCount?<Text style={[s.serviceMeta,{color:supportingColor}]}>Available for {service.travelerCount} traveler{service.travelerCount===1?"":"s"}</Text>:null}{service.maximumQuantity!==undefined?<Text style={[s.serviceMeta,{color:supportingColor}]}>{service.pricedPerTraveler?"Maximum quantity per traveler":"Maximum quantity"}: {service.maximumQuantity}</Text>:null}{service.journeyContext?<Text style={[s.serviceMeta,{color:supportingColor}]}>{service.journeyContext}</Text>:null}</View></View>):<Text style={[s.quietText,s.optionalServicesEmpty,{color:supportingColor}]}>No optional services were supplied by this provider.</Text>}</View>{p?.supportedLoyaltyProgrammes?.length?<View style={[s.infoSection,s.sectionDivider,{borderTopColor:theme.border}]}>{groupLabel("Loyalty programmes")}<Text style={[s.loyaltyProgrammes,{color:theme.textPrimary}]}>{p.supportedLoyaltyProgrammes.join(", ")}</Text></View>:null}</View>;
}
const s=StyleSheet.create({safe:{flex:1},protectedHeader:{position:"absolute",left:0,right:0,top:0,zIndex:10,elevation:11},androidFlatControlLayer:{elevation:0},loadingLine:{height:10,borderRadius:5},loadingRouteLine:{width:"62%",height:32,borderRadius:8},loadingMetadataLine:{width:"58%",height:16},loadingItineraryCard:{height:226},loadingDateLine:{width:"34%",height:12},loadingDirectionLine:{width:"24%",height:9},loadingJourneyRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:18,marginTop:25},loadingTimeLine:{width:"22%",height:16},loadingPathLine:{flex:1,height:4},loadingAirportRow:{flexDirection:"row",justifyContent:"space-between",marginTop:11},loadingAirportLine:{width:"18%",height:12},loadingDivider:{height:StyleSheet.hairlineWidth,marginVertical:28},loadingAirlineLine:{width:"48%",height:12},loadingFareHeading:{width:136,height:23,marginTop:12},loadingFares:{gap:10,paddingTop:12,paddingBottom:18,paddingRight:38},loadingFareCard:{height:142,position:"relative",borderWidth:1.5,borderRadius:15,paddingHorizontal:12,paddingTop:6,paddingBottom:8,gap:4},loadingFareContent:{alignSelf:"stretch",gap:5,paddingBottom:31},loadingFareIdentity:{alignSelf:"stretch",alignItems:"center",gap:1},loadingFareNameRow:{maxWidth:"100%",flexDirection:"row",alignItems:"flex-start",gap:6},loadingFareIcon:{width:24,height:24,borderRadius:8,flexShrink:0},loadingFareName:{width:72,height:12,marginTop:6},loadingFarePriceBlock:{position:"absolute",bottom:6,left:12,right:12,alignItems:"center"},loadingFarePrice:{width:82,height:16},loadingBenefitRow:{flexDirection:"row",alignItems:"center",gap:7},loadingBenefitDot:{width:16,height:16,borderRadius:8},loadingCheckoutTotal:{gap:5,flex:1,minWidth:0,maxWidth:"46%"},loadingCheckoutLabel:{width:"78%",maxWidth:124,height:10},loadingCheckoutPrice:{width:"88%",maxWidth:142,height:27},loadingCheckoutButton:{flex:1,maxWidth:210,minWidth:132,height:45,borderRadius:8},loadingInfoDeck:{height:177,marginTop:12},loadingTabRail:{flexGrow:0,marginHorizontal:-10},loadingTabs:{height:48,borderBottomWidth:1,flexDirection:"row",alignItems:"center",gap:22},loadingInfoBody:{flex:1,paddingHorizontal:4,paddingVertical:18,gap:17},topBar:{minHeight:52,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:16,paddingVertical:4,zIndex:1},topBarScrolled:{borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:"rgba(15, 23, 42, 0.12)"},back:{minHeight:44,flexShrink:1,minWidth:0,flexDirection:"row",alignItems:"center",gap:7},backText:{color:ui.blue,fontWeight:"800",flexShrink:1},center:{flex:1,justifyContent:"center",padding:24,gap:16},content:{paddingTop:0},contentBody:{paddingHorizontal:12,gap:12},loadingContentBody:{paddingHorizontal:18,gap:14},hero:{minHeight:318,justifyContent:"flex-end",paddingHorizontal:18,paddingBottom:122},heroImage:{},heroOverlay:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(5, 13, 26, 0.30)"},heroCurve:{position:"absolute",left:0,right:0,bottom:-1,width:"100%",height:65},heroBackControl:{position:"absolute",left:16,width:44,height:44,zIndex:20},floatingControl:{position:"absolute",right:16,zIndex:20},heroActions:{width:88,height:44,flexDirection:"row",shadowColor:"#0F172A",shadowOffset:{width:0,height:2},shadowOpacity:.12,shadowRadius:6,elevation:6},heroActionsGlass:{position:"absolute",left:0,right:0,top:2,bottom:2,borderRadius:20},heroAction:{width:44,height:44,alignItems:"center",justifyContent:"center"},heroHeartIcon:{transform:[{translateX:4}]},heroShareIcon:{transform:[{translateX:-4}]},heroIconButton:{width:44,height:44,borderRadius:22,alignItems:"center",justifyContent:"center",shadowColor:"#0F172A",shadowOffset:{width:0,height:2},shadowOpacity:.12,shadowRadius:6,elevation:6},heroIconGlass:{position:"absolute",left:2,right:2,top:2,bottom:2,borderRadius:20},heroTextFade:{position:"absolute",left:0,right:0,bottom:66,height:150},heroCopy:{gap:3},title:{fontSize:23,fontWeight:"900"},route:{color:"#FFFFFF",fontSize:27,lineHeight:32,fontWeight:"800",textShadowColor:"rgba(0, 0, 0, 0.35)",textShadowOffset:{width:0,height:1},textShadowRadius:4},routeMetadata:{color:"#FFFFFF",fontSize:11,lineHeight:16,fontWeight:"700",letterSpacing:.55,textTransform:"uppercase",textShadowColor:"rgba(0, 0, 0, 0.4)",textShadowOffset:{width:0,height:1},textShadowRadius:3},bodyText:{fontSize:14,lineHeight:20},sectionTitle:{fontSize:20,fontWeight:"900",marginTop:8},fareSectionTitle:{fontSize:16,lineHeight:21,fontWeight:"500",letterSpacing:-.15,marginTop:12},card:{borderWidth:1,borderRadius:14,padding:14,gap:7},itineraryStack:{gap:12,marginHorizontal:-8,marginTop:-104,zIndex:1},loadingItineraryStack:{gap:14,marginHorizontal:-10},itineraryCard:{position:"relative",borderWidth:1,borderRadius:FLIGHT_DETAILS_ITINERARY_RADIUS,padding:15,gap:0},itineraryGlossSurface:{...StyleSheet.absoluteFillObject,borderRadius:FLIGHT_DETAILS_ITINERARY_RADIUS,overflow:"hidden"},itineraryCardLight:{shadowColor:"#0F172A",shadowOffset:{width:0,height:6},shadowOpacity:.12,shadowRadius:14,elevation:4},itineraryCardDark:{shadowColor:"#000000",shadowOffset:{width:0,height:6},shadowOpacity:.32,shadowRadius:14,elevation:4},loadingItineraryCardLight:{shadowColor:ui.navy,shadowOffset:{width:0,height:6},shadowOpacity:.14,shadowRadius:18,elevation:4},loadingItineraryCardDark:{shadowColor:"#000000",shadowOffset:{width:0,height:5},shadowOpacity:.32,shadowRadius:18,elevation:4},itineraryHeader:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:12},direction:{color:ui.blue,flexShrink:1,fontSize:11,lineHeight:15,fontWeight:"800",letterSpacing:.5,textTransform:"uppercase"},itineraryDate:{flexShrink:0,fontSize:11,lineHeight:15,fontWeight:"500",textAlign:"right"},journeySummary:{flexDirection:"row",alignItems:"center",gap:8,marginTop:14},journeyEndpoint:{flex:1.1,minWidth:0,gap:3},arrivalEndpoint:{alignItems:"flex-end"},journeyTime:{fontSize:19,lineHeight:24,fontWeight:"800",fontVariant:["tabular-nums"]},airportCode:{fontSize:13,lineHeight:17,fontWeight:"700"},airportDate:{marginTop:1,fontSize:9.5,lineHeight:12,fontWeight:"500"},journeyCenter:{flex:.8,minWidth:72,alignItems:"center",gap:5},journeyDuration:{fontSize:11,lineHeight:16,fontWeight:"600",textAlign:"center"},flightPath:{alignSelf:"stretch",flexDirection:"row",alignItems:"center"},pathDot:{width:6,height:6,borderRadius:3,backgroundColor:ui.blue,flexShrink:0},pathLine:{height:1,flex:1,minWidth:4,opacity:.42},stopStatus:{fontSize:10,lineHeight:13,fontWeight:"500",textAlign:"center"},airportDetails:{flexDirection:"row",alignItems:"flex-start",gap:20,marginTop:13},airportColumn:{flex:1,minWidth:0,gap:5},arrivalAirportColumn:{alignItems:"flex-end"},airportName:{fontSize:12,lineHeight:17,fontWeight:"500"},terminal:{fontSize:11,lineHeight:16,fontWeight:"400"},arrivalText:{textAlign:"right"},itineraryDivider:{height:StyleSheet.hairlineWidth,marginVertical:13,opacity:.72},segmentList:{gap:0},segmentItem:{gap:0},segmentConnection:{borderWidth:StyleSheet.hairlineWidth,borderRadius:9,paddingHorizontal:11,paddingVertical:8,marginBottom:2,flexDirection:"row",alignItems:"center",gap:7},segmentConnectionText:{flex:1,minWidth:0,fontSize:11,lineHeight:16,fontWeight:"600"},segmentConnectionDuration:{fontWeight:"500"},segmentRow:{flexDirection:"row",alignItems:"flex-start",gap:10,paddingVertical:9},segmentCopy:{flex:1,minWidth:0,gap:2},segmentHeading:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:10},segmentRoute:{flexShrink:1,fontSize:13,lineHeight:18,fontWeight:"700"},segmentTimes:{flexShrink:0,maxWidth:"48%",fontSize:11,lineHeight:16,fontWeight:"600",textAlign:"right",fontVariant:["tabular-nums"]},segmentMeta:{fontSize:11,lineHeight:16,fontWeight:"500"},segmentDetail:{fontSize:11,lineHeight:16,fontWeight:"400"},technicalInformation:{gap:7},technicalHeading:{fontSize:12,lineHeight:16,fontWeight:"700",letterSpacing:.65,textTransform:"uppercase",marginBottom:2},technicalRow:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:12},technicalLabel:{flex:1,minWidth:0,fontSize:11,lineHeight:16,fontWeight:"600"},technicalValue:{flexShrink:1,maxWidth:"52%",fontSize:11,lineHeight:16,fontWeight:"400",textAlign:"right"},small:{fontSize:12,lineHeight:17},fares:{alignItems:"flex-start",gap:12,paddingTop:12,paddingBottom:12},faresMultiple:{paddingRight:38},faresSingle:{paddingRight:0},fareCard:{borderWidth:1.5,borderRadius:15,minHeight:142,position:"relative",paddingHorizontal:12,paddingTop:6,paddingBottom:8,gap:4},fareCardSelected:{zIndex:1},fareCardUnselected:{zIndex:0},fareCardLight:{shadowColor:"#0F172A",shadowOffset:{width:0,height:6},shadowOpacity:.12,shadowRadius:14,elevation:4},fareCardDark:{shadowColor:"#000000",shadowOffset:{width:0,height:6},shadowOpacity:.32,shadowRadius:14,elevation:4},loadingFareCardLight:{shadowColor:ui.navy,shadowOffset:{width:0,height:2},shadowOpacity:.06,shadowRadius:6,elevation:1},loadingFareCardDark:{shadowColor:"#000000",shadowOffset:{width:0,height:2},shadowOpacity:.2,shadowRadius:6,elevation:1},fareContent:{alignSelf:"stretch",gap:5,paddingBottom:31},fareSelectionControl:{alignSelf:"stretch",alignItems:"flex-start"},fareIdentity:{alignSelf:"center",maxWidth:"100%",flexDirection:"row",alignItems:"center",gap:7,marginBottom:1},fareIconContainer:{width:24,height:24,borderRadius:8,borderWidth:1,alignItems:"center",justifyContent:"center",flexShrink:0},fareLabel:{flexShrink:1,minWidth:0,fontSize:13,lineHeight:17,fontWeight:"800",letterSpacing:.1},farePriceBlock:{position:"absolute",bottom:6,left:12,right:12,alignItems:"center",maxWidth:"100%"},farePrice:{maxWidth:"100%",fontSize:19,lineHeight:23,fontWeight:"600",fontFamily:appFonts.semibold,textAlign:"center",fontVariant:["tabular-nums"]},fareBenefits:{alignSelf:"stretch",alignItems:"flex-start",gap:5},fareBenefitRow:{alignSelf:"stretch",maxWidth:"100%",paddingRight:8,flexDirection:"row",alignItems:"flex-start",gap:7},fareStatusColumn:{width:15,alignItems:"center"},fareStatus:{width:14,height:14,borderRadius:7,borderWidth:1,alignItems:"center",justifyContent:"center"},fareStatusPositive:{borderColor:ui.green},fareStatusNeutral:{borderColor:"#94A3B8"},fareStatusMinus:{width:7,height:1.5,borderRadius:1,backgroundColor:"#64748B"},fareStatusDot:{width:3,height:3,borderRadius:2,backgroundColor:"#64748B"},fareBenefitCopy:{flex:1,minWidth:0,gap:1},fareBenefitTitle:{fontSize:12,lineHeight:16,fontWeight:"600"},fareBenefitChevron:{width:15,flexShrink:0,alignItems:"center",paddingTop:2},fareBenefitChevronExpanded:{transform:[{rotate:"180deg"}]},fareBenefitDetail:{fontSize:11,lineHeight:16,fontWeight:"400"},fareInfoDeck:{gap:0,marginTop:12},fareTabRail:{flexGrow:0,borderBottomWidth:1,marginHorizontal:-8},fareTabRailContent:{paddingHorizontal:0},fareTabList:{flexDirection:"row",gap:14},fareInfoTab:{minHeight:48,justifyContent:"center",position:"relative",paddingHorizontal:0},fareInfoTabText:{fontSize:14,lineHeight:20,fontWeight:"600"},fareTabIndicator:{position:"absolute",height:3,borderRadius:2,backgroundColor:ui.blue,left:2,right:2,bottom:-1},fareInfoBody:{paddingHorizontal:4,paddingTop:12,paddingBottom:4},infoSections:{gap:0},infoSection:{paddingVertical:12},sectionDivider:{borderTopWidth:StyleSheet.hairlineWidth},fareGroupLabel:{fontSize:11,lineHeight:15,fontWeight:"700",letterSpacing:.85,textTransform:"uppercase",marginBottom:9},segmentContext:{fontSize:14,lineHeight:19,fontWeight:"600",marginBottom:11},cabinGroup:{paddingVertical:10},fareFactGroup:{gap:8},fareGroupDivider:{height:StyleSheet.hairlineWidth,marginVertical:11},detailRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",gap:16},detailLabel:{flexShrink:0,fontSize:13,lineHeight:19,fontWeight:"400"},detailValue:{flex:1,fontSize:13,lineHeight:19,fontWeight:"500",textAlign:"right"},detailTotal:{fontWeight:"700"},quietText:{fontSize:13,lineHeight:19,fontWeight:"400"},emissionsCard:{marginVertical:12,borderRadius:8,paddingHorizontal:11,paddingVertical:9,flexDirection:"row",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:8},emissionsIdentity:{flexDirection:"row",alignItems:"center",flexGrow:1,flexShrink:1,minWidth:180,gap:7},emissionsLabel:{flexShrink:1,fontSize:13,lineHeight:18,fontWeight:"600"},emissionsValueGroup:{marginLeft:"auto",alignItems:"flex-end",flexShrink:1},emissionsValue:{fontSize:14,lineHeight:18,fontWeight:"600",textAlign:"right"},emissionsContext:{fontSize:11,lineHeight:15,fontWeight:"400",textAlign:"right"},secondaryFacts:{borderTopWidth:StyleSheet.hairlineWidth,paddingVertical:11},providerFreshness:{gap:1},providerFreshnessLabel:{fontSize:11,lineHeight:16,fontWeight:"500"},providerFreshnessValue:{fontSize:11,lineHeight:16,fontWeight:"400"},emptyState:{paddingVertical:18,paddingHorizontal:10,alignItems:"center",gap:5},emptyTitle:{fontSize:14,lineHeight:19,fontWeight:"600",textAlign:"center"},emptyDescription:{fontSize:13,lineHeight:19,fontWeight:"400",textAlign:"center"},dealList:{gap:8,paddingHorizontal:4,paddingTop:2,paddingBottom:6},dealCard:{minHeight:76,borderWidth:1,borderRadius:12,paddingHorizontal:12,paddingVertical:12,justifyContent:"center"},dealCardNarrow:{paddingHorizontal:8},dealMain:{flexDirection:"row",alignItems:"center",gap:4},dealCardPressed:{opacity:.88},dealProviderColumn:{flex:1,minWidth:0,paddingRight:8,justifyContent:"center",borderRadius:8},dealProviderLogo:{width:64,height:28,alignItems:"flex-start",justifyContent:"center",overflow:"hidden"},dealProviderLogoNarrow:{width:48},dealProvider:{fontSize:11,lineHeight:20,fontWeight:"600",fontFamily:appFonts.semibold},dealProviderNarrow:{fontSize:9,lineHeight:16},dealPriceColumn:{flexShrink:0,minWidth:0,flexDirection:"row",alignItems:"baseline",justifyContent:"center",gap:4,borderRadius:8},dealPrice:{flexShrink:1,minWidth:0,fontSize:13,lineHeight:20,fontWeight:"600",fontFamily:appFonts.semibold,fontVariant:["tabular-nums"]},dealPriceNarrow:{fontSize:10,lineHeight:16},dealPriceLabel:{flexShrink:0,fontSize:10,lineHeight:16,fontWeight:"400",fontFamily:appFonts.regular},dealPriceLabelNarrow:{fontSize:9,lineHeight:16},dealActionColumn:{flex:1,minWidth:0,alignItems:"flex-end",justifyContent:"center"},viewDealButton:{minHeight:32,minWidth:76,paddingHorizontal:6,borderRadius:8,alignItems:"center",justifyContent:"center",flexShrink:0},viewDealButtonNarrow:{minWidth:68,paddingHorizontal:4},viewDealText:{fontSize:12,lineHeight:20,fontWeight:"600",fontFamily:appFonts.semibold,color:"#FFFFFF"},viewDealTextNarrow:{fontSize:11,lineHeight:17},viewDealPressed:{opacity:.83},viewDealDisabled:{opacity:.45},conditionGroup:{paddingVertical:12},conditionRow:{paddingVertical:9,flexDirection:"row",alignItems:"flex-start",gap:11},conditionCopy:{flex:1,minWidth:0,gap:2},conditionState:{fontSize:13,lineHeight:18,fontWeight:"600"},conditionScope:{fontSize:11,lineHeight:16,fontWeight:"400"},conditionPenalty:{fontSize:11,lineHeight:16,fontWeight:"500"},factDescription:{fontSize:13,lineHeight:19,fontWeight:"400",marginBottom:7},airlineIdentity:{fontSize:13,lineHeight:19,fontWeight:"500",marginBottom:3},linkRow:{minHeight:44,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},linkText:{flex:1,fontSize:13,lineHeight:18,fontWeight:"600"},serviceRow:{paddingVertical:12},serviceCopy:{minWidth:0,gap:4},serviceHeading:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:12},serviceDescription:{flex:1,fontSize:13,lineHeight:19,fontWeight:"600"},servicePrice:{flexShrink:0,maxWidth:"42%",fontSize:13,lineHeight:19,fontWeight:"700",textAlign:"right",fontVariant:["tabular-nums"]},serviceMeta:{fontSize:12,lineHeight:17,fontWeight:"400"},optionalServicesEmpty:{paddingBottom:2},loyaltyProgrammes:{fontSize:13,lineHeight:19,fontWeight:"500",flexWrap:"wrap"},notice:{padding:12,borderRadius:10,borderWidth:1,borderColor:ui.blue},noticeText:{color:ui.blue,fontWeight:"700"},sticky:{position:"absolute",left:0,right:0,bottom:0,minHeight:88,borderTopWidth:StyleSheet.hairlineWidth,paddingHorizontal:18,paddingTop:11,flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:14,elevation:7},stickyLight:{shadowColor:ui.navy,shadowOffset:{width:0,height:-4},shadowOpacity:.1,shadowRadius:12},stickyDark:{shadowColor:"#000000",shadowOffset:{width:0,height:-4},shadowOpacity:.28,shadowRadius:12}});
