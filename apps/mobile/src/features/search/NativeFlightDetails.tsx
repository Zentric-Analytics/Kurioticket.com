import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, FilePenLine, Heart } from "lucide-react-native";
import { flightDetailsRouteLabel } from "../../../../../src/lib/flights/flightDetailsContract";
import type { FlightDetailsFareChoice, FlightDetailsOffer, FlightDetailsSuccess } from "../../../../../src/lib/flights/flightDetailsContract";
import { canUseOfferAirlineLogo, compactFareTerms, resolveSegmentCarrierName } from "../../../../../src/lib/flights/flightDetailsPresentation";
import type { FlightLeg, FlightProviderCondition } from "../../../../../src/lib/types";
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
import { androidFavoriteColors } from "../home/AndroidFavoriteButton";
import { AirlineLogo } from "./AirlineLogo";

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const fareSelection = (current: string | null, fares: FlightDetailsFareChoice[]) =>
  (current && fares.some(({ key }) => key === current) ? current : fares.find(({ selectedOffer }) => selectedOffer)?.key ?? fares[0]?.key ?? null);

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
function conditionText(condition:FlightProviderCondition){const scope=condition.scope==="trip"?"Whole trip":condition.legIndex!==undefined?`Flight ${condition.legIndex+1}`:condition.scope==="outbound"?"Outbound only":condition.scope==="return"?"Return only":"Leg";const category=condition.category==="change"?"Changes":titleCase(condition.category);const permission=condition.category==="change"||condition.category==="refund";const state=condition.state==="allowed"?(permission?"Allowed":"Included"):condition.state==="not-allowed"?(permission?"Not allowed":"Not included"):"Not supplied by provider";return `${scope} • ${category}: ${state}`}

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
  const [details, setDetails] = useState<FlightDetailsSuccess | null>(null);
  const [state, setState] = useState<"loading"|"error"|"unavailable"|"available">("loading");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string|null>(null);
  const [tab, setTab] = useState<"deals"|"details"|"conditions"|"extras">("deals");
  const [booking, setBooking] = useState(false);
  const [displayPrices, setDisplayPrices] = useState<Record<string,DisplayPrice>>({});
  const rates = useRef<ExchangeRates|null>(null);
  const sharePending = useRef(false);
  const preserveMessageOnReload = useRef(false);
  const savedFlights = useSavedFlights();

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
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

  if (state !== "available" || !details || !selected) return <SafeAreaView edges={["top"]} style={[s.safe,{backgroundColor:theme.background}]}><Back/><View style={s.center}><Text accessibilityRole="header" style={[s.title,{color:theme.textPrimary}]}>{state === "loading" ? "Checking current flight details…" : state === "unavailable" ? "This flight is no longer available" : "We couldn’t load this flight"}</Text>{state!=="loading"?<><Text style={[s.bodyText,{color:theme.textSecondary}]}>{message}</Text><Button label="Retry" onPress={reload}/><Button label="Back to results" onPress={()=>router.back()}/></>:null}</View></SafeAreaView>;

  const offer=selected.offer; const provider=selected.handoff.available ? selected.handoff.providerName : "provider";
  const savedOffer=savedFlightOffer(details, selected);
  const saved=savedFlights.savedFlights.has(flightSavedSignature(savedOffer));
  const handoff=async(offerId:string) => { if(booking||!fareReady)return; setBooking(true); setMessage(""); try { const response=await travelApi.flightRedirect(offerId); await Linking.openURL(response.url); } catch(error) { if(error instanceof TravelApiError && error.status===409 && error.details?.code==="offer_changed") { preserveMessageOnReload.current=true; setMessage("The provider updated this offer. Review the refreshed price and terms before continuing."); reload(); } else setMessage(error instanceof Error?error.message:"Booking is currently unavailable."); } finally { setBooking(false); } };
  const share=async()=>{if(sharePending.current)return;sharePending.current=true;try{const outcome=await shareFlightForAuthenticatedSession({readSession,share:(message)=>Share.share({message}),message:flightShareMessage(offer,fare?.formatted??"price unavailable")});if(outcome==="sign-in-required")Alert.alert("Sign in required","Sign in to share this flight.",[{text:"Sign in",onPress:()=>router.push("/email-auth")},{text:"Cancel",style:"cancel"}]);}finally{sharePending.current=false;}};
  return <SafeAreaView edges={["top"]} style={[s.safe,{backgroundColor:theme.background}]}><Back/><ScrollView contentContainerStyle={[s.content,{paddingBottom:120+inset.bottom}]}>
    {message?<View accessibilityRole="alert" style={s.notice}><Text style={s.noticeText}>{message}</Text></View>:null}
    <Text accessibilityRole="header" style={[s.route,{color:theme.textPrimary}]}>{flightDetailsRouteLabel(details.search.tripType,offer.legs??[],offer.originAirport,offer.destinationAirport)}</Text><Text style={[s.bodyText,{color:theme.textSecondary}]}>{details.search.tripType} · {details.search.travelers} traveler{details.search.travelers===1?"":"s"}</Text>
    <View style={s.actions}><IconButton label={saved?"Remove saved flight":"Save flight"} onPress={()=>savedFlights.toggle(savedOffer,nativeFlightEditSearchParams(details,one(params.currency)))}><Heart size={20} color={saved?androidFavoriteColors.active:theme.icon} fill={saved?androidFavoriteColors.active:"transparent"}/></IconButton><IconButton label="Share flight" onPress={()=>void share()}><FlowIcon name="share" size={20} color={theme.icon}/></IconButton><Pressable accessibilityRole="button" accessibilityLabel="Edit search" onPress={()=>router.push({pathname:"/edit-flight-search",params:nativeFlightEditSearchParams(details,one(params.currency))})} style={s.edit}><FilePenLine size={17} color={ui.blue}/><Text style={s.editText}>Edit search</Text></Pressable></View>
    <Text style={[s.sectionTitle,{color:theme.textPrimary}]}>Full itinerary</Text>{(offer.legs?.length?offer.legs:[]).map((leg,index)=><Itinerary key={`${leg.departureTime}-${index}`} leg={leg} index={index} offerAirlineName={offer.airlineName} offerAirlineLogo={offer.airlineLogo} theme={theme}/>) }
    <Text style={[s.sectionTitle,{color:theme.textPrimary}]}>Pick your fare</Text><ScrollView accessibilityRole="radiogroup" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fares}>{details.fareChoices.map((choice)=><Pressable accessibilityRole="radio" accessibilityState={{selected:choice.key===selected.key}} key={choice.key} onPress={()=>setSelectedKey(choice.key)} style={[s.fareCard,{backgroundColor:theme.surface,borderColor:choice.key===selected.key?ui.blue:theme.border}]}><Text style={[s.fareLabel,{color:theme.textPrimary}]}>{choice.label}</Text><Text style={s.farePrice}>{displayPrices[choice.key]?.formatted??"—"}</Text>{compactFareTerms(choice.distinguishingTerms,details.search.tripType).map((row,i)=><Text key={i} style={[s.small,{color:theme.textSecondary}]}>• {row.text}</Text>)}</Pressable>)}</ScrollView>
    <View accessibilityRole="tablist" style={s.tabs}>{([['deals','Compare deals'],['details','Fare details'],['conditions','Fare conditions'],['extras','Optional extras']] as const).map(([key,label])=><Pressable accessibilityRole="tab" accessibilityState={{selected:tab===key}} key={key} onPress={()=>setTab(key)} style={[s.tab,tab===key&&s.activeTab]}><Text style={[s.tabText,{color:tab===key?ui.blue:theme.textSecondary}]}>{label}</Text></Pressable>)}</View>
    <FareSurface tab={tab} choice={selected} dealPrices={displayPrices} onDeal={handoff} booking={booking} fareReady={fareReady} theme={theme}/>
  </ScrollView><View style={[s.sticky,{paddingBottom:Math.max(inset.bottom,10),backgroundColor:theme.surface,borderTopColor:theme.border}]}><View><Text style={[s.small,{color:theme.textSecondary}]}>Total for {details.search.travelers} traveler{details.search.travelers===1?"":"s"}</Text><Text style={[s.total,{color:theme.textPrimary}]}>{fare?.formatted??"—"}</Text></View><Button label={booking?"Checking offer…":`Continue to ${provider}`} disabled={booking||!fareReady||!selected.handoff.available} onPress={()=>void handoff(offer.id)}/></View></SafeAreaView>;
}

function Back(){return <View style={s.backBar}><Pressable accessibilityRole="button" accessibilityLabel="Back to results" onPress={()=>router.back()} style={s.back}><ArrowLeft size={18} color={ui.blue}/><Text style={s.backText}>Back to results</Text></Pressable></View>}
function IconButton({label,onPress,children}:{label:string;onPress:()=>void;children:React.ReactNode}){return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.iconButton}>{children}</Pressable>}
function Itinerary({leg,index,offerAirlineName,offerAirlineLogo,theme}:{leg:FlightLeg;index:number;offerAirlineName:string;offerAirlineLogo?:string|null;theme:ReturnType<typeof useAppTheme>["theme"]}){const label=leg.direction==="outbound"?"Outbound":leg.direction==="return"?"Return":`Flight ${leg.legIndex??index+1}`;const technical=leg.segments.reduce((count,segment)=>count+(segment.technicalStops?.length??0),0);const endpoints=[leg.segments[0]?.originDetails,leg.segments.at(-1)?.destinationDetails];return <View style={[s.card,{backgroundColor:theme.surface,borderColor:theme.border}]}><Text style={s.direction}>{label} · {new Date(leg.departureTime).toLocaleDateString()}</Text><Text style={[s.leg,{color:theme.textPrimary}]}>{clock(leg.departureTime)} {leg.originAirport} → {clock(leg.arrivalTime)} {leg.destinationAirport}</Text>{endpoints.map((point,i)=>point?<Text key={i} style={[s.small,{color:theme.textSecondary}]}>{i?"Arrival":"Departure"}: {[point.name,point.cityName,point.terminal&&`Terminal ${point.terminal}`,point.timeZone&&`Time zone ${point.timeZone}`].filter(Boolean).join(" · ")}</Text>:null)}<Text style={[s.bodyText,{color:theme.textSecondary}]}>{leg.duration} · {leg.stops?`${leg.stops} passenger stop${leg.stops===1?'':'s'}`:'Nonstop'}{technical?` · ${technical} technical stop${technical===1?'':'s'}`:""}</Text>{leg.layovers.map((x,i)=><Text key={i} style={[s.small,{color:theme.textSecondary}]}>Connection: {x.duration} in {x.airport}</Text>)}{leg.segments.map((segment,i)=>{const carrier=resolveSegmentCarrierName(segment,offerAirlineName);return <View key={i} style={[s.segment,{borderTopColor:theme.border}]}><View style={s.segmentRow}>{carrier?<AirlineLogo airlineName={carrier} logoUrl={canUseOfferAirlineLogo(segment,offerAirlineName,offerAirlineLogo)?offerAirlineLogo:null}/>:null}<View style={{flex:1}}><Text style={[s.bodyText,{color:theme.textPrimary}]}>{segment.originAirport} → {segment.destinationAirport} · {clock(segment.departureTime)} – {clock(segment.arrivalTime)}</Text><Text style={[s.small,{color:theme.textSecondary}]}>{carrier||"Carrier not supplied"}{segment.marketingFlightNumber??segment.flightNumber?` • Flight ${segment.marketingFlightNumber??segment.flightNumber}`:""}</Text></View></View>{segment.operatingCarrier&&(segment.operatingCarrier.name!==segment.marketingCarrier?.name||segment.operatingFlightNumber!==segment.marketingFlightNumber)?<Text style={[s.small,{color:theme.textSecondary}]}>Operated by {segment.operatingCarrier.name}{segment.operatingFlightNumber?` • Flight ${segment.operatingFlightNumber}`:""}</Text>:null}{segment.aircraft?.name||segment.aircraft?.iataCode?<Text style={[s.small,{color:theme.textSecondary}]}>Aircraft: {segment.aircraft.name??segment.aircraft.iataCode}{segment.aircraft.name&&segment.aircraft.iataCode?` (${segment.aircraft.iataCode})`:""}</Text>:null}{segment.distanceKm!==undefined?<Text style={[s.small,{color:theme.textSecondary}]}>Flight distance: {segment.distanceKm.toLocaleString()} km</Text>:null}{segment.cabinDetails?.map((c,j)=><Text key={j} style={[s.small,{color:theme.textSecondary}]}>{[c.fareBrandName,c.cabinMarketingName??c.cabinClass,c.fareBasisCode].filter(Boolean).join(" · ")}</Text>)}{segment.technicalStops?.map((stop,j)=><View key={j} style={[s.techStop,{backgroundColor:theme.background}]}><Text style={[s.small,{color:theme.textPrimary}]}>Technical stop at {stop.airport.iataCode}{stop.airport.name?` — ${stop.airport.name}`:""}{stop.duration?` · ${stop.duration}`:""}</Text>{stop.arrivalTime||stop.departureTime?<Text style={[s.small,{color:theme.textSecondary}]}>{stop.arrivalTime?`Arrives ${clock(stop.arrivalTime)}`:""}{stop.arrivalTime&&stop.departureTime?" · ":""}{stop.departureTime?`Departs ${clock(stop.departureTime)}`:""}</Text>:null}</View>)}</View>})}</View>}
function FareSurface({tab,choice,dealPrices,onDeal,booking,fareReady,theme}:{tab:"deals"|"details"|"conditions"|"extras";choice:FlightDetailsFareChoice;dealPrices:Record<string,DisplayPrice>;onDeal:(id:string)=>Promise<void>;booking:boolean;fareReady:boolean;theme:ReturnType<typeof useAppTheme>["theme"]}){const offer=choice.offer,p=offer.providerDetails;const line=(label:string,value:unknown)=>value===undefined||value===null||value===""?null:<Text style={[s.bodyText,{color:theme.textSecondary}]}><Text style={{fontWeight:"800",color:theme.textPrimary}}>{label}: </Text>{String(value)}</Text>;const cabins=(offer.legs??[]).flatMap(l=>l.segments.flatMap(segment=>(segment.cabinDetails??[]).map(cabin=>({segment,cabin}))));const links=nativeCarrierConditionsLinks(offer);return <View style={[s.card,{backgroundColor:theme.surface,borderColor:theme.border}]}>{tab==="deals"?<>{choice.deals.length?choice.deals.map(deal=><View key={deal.key} style={s.deal}><View>{line("Provider",deal.providerName)}{line("Price",dealPrices[`deal:${deal.key}`]?.formatted??"—")}</View><Button label={booking?"Checking…":"View deal"} disabled={booking||!fareReady} onPress={()=>void onDeal(deal.offerId)}/></View>):<Text style={[s.bodyText,{color:theme.textSecondary}]}>No additional live provider deals were supplied.</Text>}</>:null}{tab==="details"?<>{cabins.length?cabins.map(({segment,cabin:c},i)=><View key={i} style={s.extra}>{line("Flight",`${segment.originAirport} → ${segment.destinationAirport}${segment.marketingFlightNumber??segment.flightNumber?` • Flight ${segment.marketingFlightNumber??segment.flightNumber}`:""}`)}{line("Fare brand",c.fareBrandName)}{line("Cabin class",c.cabinClass&&titleCase(c.cabinClass))}{line("Cabin product",c.cabinMarketingName)}{line("Fare basis",c.fareBasisCode)}{c.amenities?.wifi?line("Wi-Fi",amenityState(c.amenities.wifi.state)):null}{c.amenities?.power?line("Power",amenityState(c.amenities.power.state)):null}{line("Seat",[c.amenities?.seat?.type&&titleCase(c.amenities.seat.type),c.amenities?.seat?.pitch&&`${c.amenities.seat.pitch} in pitch`,c.amenities?.seat?.legroom&&`${titleCase(c.amenities.seat.legroom)} legroom`].filter(Boolean).join(" · "))}</View>):<Text style={[s.bodyText,{color:theme.textSecondary}]}>Additional cabin details not supplied by the provider.</Text>}{p?.price?<>{p.price.baseAmount!==undefined&&p.price.baseCurrency?line("Base fare",sourceMoney(p.price.baseAmount,p.price.baseCurrency)):null}{p.price.taxAmount!==undefined&&p.price.taxCurrency?line("Taxes",sourceMoney(p.price.taxAmount,p.price.taxCurrency)):null}{line("Trip total",sourceMoney(p.price.totalAmount,p.price.totalCurrency))}</>:<Text style={[s.bodyText,{color:theme.textSecondary}]}>Price breakdown not supplied by the provider.</Text>}{line("Estimated CO₂",p?.totalEmissionsKg!==undefined?`${p.totalEmissionsKg.toLocaleString()} kg for this offer`:undefined)}{line("Provider offer last updated",p?.updatedAt&&providerTimestamp(p.updatedAt))}</>:null}{tab==="conditions"?<>{p?.conditions?.length?p.conditions.map((c,i)=><View key={i}>{line("Condition",conditionText(c))}{c.penaltyAmount!==undefined&&c.penaltyCurrency?line("Penalty",sourceMoney(c.penaltyAmount,c.penaltyCurrency)):null}</View>):<Text style={[s.bodyText,{color:theme.textSecondary}]}>Conditions not supplied by the provider.</Text>}{p?.passengerIdentityDocumentsRequired?<Text style={[s.bodyText,{color:theme.textSecondary}]}>Passport or identity information is required to complete booking.</Text>:null}{line("Supported identity documents",p?.supportedIdentityDocumentTypes?.map(titleCase).join(", "))}{line("Offer airline",p?.offerOwner?`${p.offerOwner.name}${p.offerOwner.iataCode?` (${p.offerOwner.iataCode})`:""}`:undefined)}{links.map(link=><Pressable key={link.url} accessibilityRole="link" accessibilityLabel={`${link.name} conditions of carriage`} onPress={()=>void Linking.openURL(link.url).catch(()=>Alert.alert("Unable to open link","Please try again."))} style={s.link}><Text style={s.editText}>{link.name} conditions of carriage</Text></Pressable>)}{line("Provider offer last updated",p?.updatedAt&&providerTimestamp(p.updatedAt))}</>:null}{tab==="extras"?<>{p?.optionalServices?.length?p.optionalServices.map((x,i)=><View key={i} style={s.extra}>{line(x.description,`${sourceMoney(x.price,x.currency)}${x.pricedPerTraveler?" each":""}`)}{line("Available for",x.travelerCount?`${x.travelerCount} traveler${x.travelerCount===1?"":"s"}`:undefined)}{line(x.pricedPerTraveler?"Maximum quantity per traveler":"Maximum quantity",x.maximumQuantity)}{line("Journey",x.journeyContext)}</View>):<Text style={[s.bodyText,{color:theme.textSecondary}]}>No optional services were supplied.</Text>}{line("Supported loyalty airline codes",p?.supportedLoyaltyProgrammes?.join(", "))}</>:null}</View>}
const s=StyleSheet.create({safe:{flex:1},backBar:{minHeight:52,justifyContent:"center",paddingHorizontal:16,borderBottomWidth:StyleSheet.hairlineWidth},back:{minHeight:44,flexDirection:"row",alignItems:"center",gap:7},backText:{color:ui.blue,fontWeight:"800"},center:{flex:1,justifyContent:"center",padding:24,gap:16},content:{padding:18,gap:14},title:{fontSize:23,fontWeight:"900"},route:{fontSize:27,fontWeight:"900"},bodyText:{fontSize:14,lineHeight:20},actions:{flexDirection:"row",alignItems:"center",gap:8},iconButton:{width:44,height:44,alignItems:"center",justifyContent:"center"},edit:{minHeight:44,flexDirection:"row",alignItems:"center",gap:6,paddingHorizontal:10,borderWidth:1,borderColor:ui.blue,borderRadius:10},editText:{color:ui.blue,fontWeight:"800"},sectionTitle:{fontSize:20,fontWeight:"900",marginTop:8},card:{borderWidth:1,borderRadius:14,padding:14,gap:7},direction:{color:ui.blue,fontWeight:"900",textTransform:"uppercase"},leg:{fontSize:18,fontWeight:"900"},segment:{borderTopWidth:StyleSheet.hairlineWidth,paddingTop:8,marginTop:5},segmentRow:{flexDirection:"row",alignItems:"center",gap:9},techStop:{padding:8,borderRadius:8,marginTop:5},small:{fontSize:12,lineHeight:17},fares:{gap:10},fareCard:{width:230,minHeight:145,borderWidth:2,borderRadius:14,padding:14,gap:6},fareLabel:{fontSize:17,fontWeight:"900"},farePrice:{color:ui.blue,fontSize:18,fontWeight:"900"},tabs:{flexDirection:"row",flexWrap:"wrap",gap:4},tab:{minHeight:44,justifyContent:"center",paddingHorizontal:9,borderBottomWidth:2,borderBottomColor:"transparent"},activeTab:{borderBottomColor:ui.blue},tabText:{fontSize:12,fontWeight:"800"},deal:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:8},extra:{paddingBottom:8},link:{minHeight:44,justifyContent:"center"},notice:{padding:12,borderRadius:10,borderWidth:1,borderColor:ui.blue},noticeText:{color:ui.blue,fontWeight:"700"},sticky:{position:"absolute",left:0,right:0,bottom:0,minHeight:88,borderTopWidth:1,paddingHorizontal:18,paddingTop:10,flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:12},total:{fontSize:22,fontWeight:"900"}});
