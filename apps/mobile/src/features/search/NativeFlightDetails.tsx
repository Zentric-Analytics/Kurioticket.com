import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, FilePenLine, Heart } from "lucide-react-native";
import type { FlightDetailsFareChoice, FlightDetailsSuccess } from "../../../../../src/lib/flights/flightDetailsContract";
import type { FlightLeg } from "../../../../../src/lib/types";
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

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const fareSelection = (current: string | null, fares: FlightDetailsFareChoice[]) =>
  (current && fares.some(({ key }) => key === current) ? current : fares.find(({ selectedOffer }) => selectedOffer)?.key ?? fares[0]?.key ?? null);

function searchParams(details: FlightDetailsSuccess) {
  const { search } = details;
  const result: Record<string, string> = { tripType: search.tripType, origin: search.legs[0]?.origin ?? details.flight.originAirport, destination: search.legs.at(-1)?.destination ?? details.flight.destinationAirport, departureDate: search.departureDate, adults: String(search.adults), children: String(search.children), infants: String(search.infants), travelers: String(search.travelers), cabin: search.cabinClass };
  if (search.returnDate) result.returnDate = search.returnDate;
  if (search.tripType === "multi-city") { result.legCount = String(search.legs.length); search.legs.forEach((leg, index) => { const n=index+1; result[`origin${n}`]=leg.origin; result[`destination${n}`]=leg.destination; result[`departureDate${n}`]=leg.departureDate; }); }
  return result;
}

function savedFlightOffer(details: FlightDetailsSuccess, choice: FlightDetailsFareChoice): FlightResult {
  const offer = choice.offer;
  return {
    ...offer,
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
  const [fare, setFare] = useState<DisplayPrice|null>(null);
  const rates = useRef<ExchangeRates|null>(null);
  const sharePending = useRef(false);
  const savedFlights = useSavedFlights();

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController(); setState("loading"); setMessage("");
    travelApi.flightDetails(id, { signal: controller.signal }).then((response) => {
      if (response.status !== "available") { setDetails(null); setMessage(response.error); setState("unavailable"); return; }
      setDetails(response); setSelectedKey((current) => fareSelection(current, response.fareChoices)); setState("available");
    }).catch((error) => { if (controller.signal.aborted) return; setDetails(null); setMessage(error instanceof Error ? error.message : "Flight details could not be loaded."); setState(error instanceof TravelApiError && [404,409].includes(error.status) ? "unavailable" : "error"); });
    return () => controller.abort();
  }, [id, revision]);
  const selected = details?.fareChoices.find(({ key }) => key === selectedKey) ?? null;
  useEffect(() => {
    if (!selected) { setFare(null); return; } let active=true;
    Promise.all([readCurrencyPreference().catch(()=>null), rates.current ? Promise.resolve(rates.current) : travelApi.currencyRates().then(({ rates })=>rates).catch(()=>({}))]).then(([preferred, exchange]) => {
      if (!active) return; if (Object.keys(exchange).length) rates.current=exchange;
      const currency=resolveDisplayCurrencyContext({ preferredCurrency: preferred, locale: Intl.DateTimeFormat().resolvedOptions().locale }).resolvedCurrency;
      setFare(createFlightDetailFare(selected.offer.price, selected.offer.currency, currency, exchange));
    }); return()=>{active=false;};
  }, [selected?.key, selected?.offer.price, selected?.offer.currency, revision]);

  if (state !== "available" || !details || !selected) return <SafeAreaView edges={["top"]} style={[s.safe,{backgroundColor:theme.background}]}><Back/><View style={s.center}><Text accessibilityRole="header" style={[s.title,{color:theme.textPrimary}]}>{state === "loading" ? "Checking current flight details…" : state === "unavailable" ? "This flight is no longer available" : "We couldn’t load this flight"}</Text>{state!=="loading"?<><Text style={[s.bodyText,{color:theme.textSecondary}]}>{message}</Text><Button label="Retry" onPress={reload}/><Button label="Back to results" onPress={()=>router.back()}/></>:null}</View></SafeAreaView>;

  const offer=selected.offer; const provider=selected.handoff.available ? selected.handoff.providerName : "provider";
  const savedOffer=savedFlightOffer(details, selected);
  const saved=savedFlights.savedFlights.has(flightSavedSignature(savedOffer));
  const handoff=async(offerId:string) => { if(booking)return; setBooking(true); setMessage(""); try { const response=await travelApi.flightRedirect(offerId); await Linking.openURL(response.url); } catch(error) { if(error instanceof TravelApiError && error.status===409 && error.details?.code==="offer_changed") { setMessage("The provider updated this offer. Review the refreshed price and terms before continuing."); reload(); } else setMessage(error instanceof Error?error.message:"Booking is currently unavailable."); } finally { setBooking(false); } };
  const share=async()=>{if(sharePending.current)return;sharePending.current=true;try{const outcome=await shareFlightForAuthenticatedSession({readSession,share:(message)=>Share.share({message}),message:flightShareMessage(offer,fare?.formatted??"price unavailable")});if(outcome==="sign-in-required")Alert.alert("Sign in required","Sign in to share this flight.",[{text:"Sign in",onPress:()=>router.push("/email-auth")},{text:"Cancel",style:"cancel"}]);}finally{sharePending.current=false;}};
  return <SafeAreaView edges={["top"]} style={[s.safe,{backgroundColor:theme.background}]}><Back/><ScrollView contentContainerStyle={[s.content,{paddingBottom:120+inset.bottom}]}>
    {message?<View accessibilityRole="alert" style={s.notice}><Text style={s.noticeText}>{message}</Text></View>:null}
    <Text accessibilityRole="header" style={[s.route,{color:theme.textPrimary}]}>{offer.originAirport} → {offer.destinationAirport}</Text><Text style={[s.bodyText,{color:theme.textSecondary}]}>{details.search.tripType} · {details.search.travelers} traveler{details.search.travelers===1?"":"s"}</Text>
    <View style={s.actions}><IconButton label={saved?"Remove saved flight":"Save flight"} onPress={()=>savedFlights.toggle(savedOffer,searchParams(details))}><Heart size={20} color={saved?androidFavoriteColors.active:theme.icon} fill={saved?androidFavoriteColors.active:"transparent"}/></IconButton><IconButton label="Share flight" onPress={()=>void share()}><FlowIcon name="share" size={20} color={theme.icon}/></IconButton><Pressable accessibilityRole="button" accessibilityLabel="Edit search" onPress={()=>router.push({pathname:"/edit-flight-search",params:searchParams(details)})} style={s.edit}><FilePenLine size={17} color={ui.blue}/><Text style={s.editText}>Edit search</Text></Pressable></View>
    <Text style={[s.sectionTitle,{color:theme.textPrimary}]}>Full itinerary</Text>{(offer.legs?.length?offer.legs:[]).map((leg,index)=><Itinerary key={`${leg.departureTime}-${index}`} leg={leg} index={index} theme={theme}/>) }
    <Text style={[s.sectionTitle,{color:theme.textPrimary}]}>Pick your fare</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fares}>{details.fareChoices.map((choice)=><Pressable accessibilityRole="radio" accessibilityState={{selected:choice.key===selected.key}} key={choice.key} onPress={()=>setSelectedKey(choice.key)} style={[s.fareCard,{backgroundColor:theme.surface,borderColor:choice.key===selected.key?ui.blue:theme.border}]}><Text style={[s.fareLabel,{color:theme.textPrimary}]}>{choice.label}</Text><Text style={s.farePrice}>{choice.key===selected.key?(fare?.formatted??"—"):`${choice.offer.currency} ${choice.offer.price.toFixed(2)}`}</Text>{choice.distinguishingTerms.slice(0,3).map((term,i)=><Text key={i} style={[s.small,{color:theme.textSecondary}]}>• {term.text}</Text>)}</Pressable>)}</ScrollView>
    <View accessibilityRole="tablist" style={s.tabs}>{([['deals','Compare deals'],['details','Fare details'],['conditions','Fare conditions'],['extras','Optional extras']] as const).map(([key,label])=><Pressable accessibilityRole="tab" accessibilityState={{selected:tab===key}} key={key} onPress={()=>setTab(key)} style={[s.tab,tab===key&&s.activeTab]}><Text style={[s.tabText,{color:tab===key?ui.blue:theme.textSecondary}]}>{label}</Text></Pressable>)}</View>
    <FareSurface tab={tab} choice={selected} displayFare={fare} onDeal={handoff} booking={booking} theme={theme}/>
  </ScrollView><View style={[s.sticky,{paddingBottom:Math.max(inset.bottom,10),backgroundColor:theme.surface,borderTopColor:theme.border}]}><View><Text style={[s.small,{color:theme.textSecondary}]}>Total for {details.search.travelers} traveler{details.search.travelers===1?"":"s"}</Text><Text style={[s.total,{color:theme.textPrimary}]}>{fare?.formatted??"—"}</Text></View><Button label={booking?"Checking offer…":`Continue to ${provider}`} disabled={booking||!selected.handoff.available} onPress={()=>void handoff(offer.id)}/></View></SafeAreaView>;
}

function Back(){return <View style={s.backBar}><Pressable accessibilityRole="button" accessibilityLabel="Back to results" onPress={()=>router.back()} style={s.back}><ArrowLeft size={18} color={ui.blue}/><Text style={s.backText}>Back to results</Text></Pressable></View>}
function IconButton({label,onPress,children}:{label:string;onPress:()=>void;children:React.ReactNode}){return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.iconButton}>{children}</Pressable>}
function Itinerary({leg,index,theme}:{leg:FlightLeg;index:number;theme:ReturnType<typeof useAppTheme>["theme"]}){const label=leg.direction==="outbound"?"Outbound":leg.direction==="return"?"Return":`Flight ${leg.legIndex??index+1}`;return <View style={[s.card,{backgroundColor:theme.surface,borderColor:theme.border}]}><Text style={s.direction}>{label} · {new Date(leg.departureTime).toLocaleDateString()}</Text><Text style={[s.leg,{color:theme.textPrimary}]}>{clock(leg.departureTime)} {leg.originAirport} → {clock(leg.arrivalTime)} {leg.destinationAirport}</Text><Text style={[s.bodyText,{color:theme.textSecondary}]}>{leg.duration} · {leg.stops?`${leg.stops} stop${leg.stops===1?'':'s'}`:'Nonstop'}</Text>{leg.layovers.map((x,i)=><Text key={i} style={[s.small,{color:theme.textSecondary}]}>Connection: {x.duration} in {x.airport}</Text>)}{leg.segments.map((segment,i)=><View key={i} style={s.segment}><Text style={[s.bodyText,{color:theme.textPrimary}]}>{segment.originAirport} → {segment.destinationAirport} · {segment.marketingCarrier?.name??segment.airlineName??"Carrier not supplied"} {segment.marketingFlightNumber??segment.flightNumber??""}</Text>{segment.operatingCarrier&&segment.operatingCarrier.name!==segment.marketingCarrier?.name?<Text style={[s.small,{color:theme.textSecondary}]}>Operated by {segment.operatingCarrier.name}</Text>:null}<Text style={[s.small,{color:theme.textSecondary}]}>{[segment.aircraft?.name,segment.cabinDetails?.map(c=>[c.fareBrandName,c.cabinMarketingName??c.cabinClass,c.fareBasisCode].filter(Boolean).join(" · ")).join(", ")].filter(Boolean).join(" · ")}</Text>{segment.technicalStops?.map((stop,j)=><Text key={j} style={[s.small,{color:theme.textSecondary}]}>Technical stop: {stop.airport.name??stop.airport.iataCode}{stop.duration?` · ${stop.duration}`:""}</Text>)}</View>)}</View>}
function FareSurface({tab,choice,displayFare,onDeal,booking,theme}:{tab:"deals"|"details"|"conditions"|"extras";choice:FlightDetailsFareChoice;displayFare:DisplayPrice|null;onDeal:(id:string)=>Promise<void>;booking:boolean;theme:ReturnType<typeof useAppTheme>["theme"]}){const offer=choice.offer,p=offer.providerDetails;const line=(label:string,value:unknown)=>value===undefined||value===null||value===""?null:<Text style={[s.bodyText,{color:theme.textSecondary}]}><Text style={{fontWeight:"800",color:theme.textPrimary}}>{label}: </Text>{String(value)}</Text>;return <View style={[s.card,{backgroundColor:theme.surface,borderColor:theme.border}]}>{tab==="deals"?<>{choice.deals.length?choice.deals.map(deal=><View key={deal.key} style={s.deal}><View>{line("Provider",deal.providerName)}{line("Price",deal.offerId===offer.id?(displayFare?.formatted??`${deal.currency} ${deal.price}`):`${deal.currency} ${deal.price.toFixed(2)}`)}</View><Button label={booking?"Checking…":"View deal"} disabled={booking} onPress={()=>void onDeal(deal.offerId)}/></View>):<Text style={[s.bodyText,{color:theme.textSecondary}]}>No additional live provider deals were supplied.</Text>}</>:null}{tab==="details"?<>{offer.legs?.flatMap((l)=>l.segments).flatMap((x)=>x.cabinDetails??[]).map((c,i)=><View key={i}>{line("Fare brand",c.fareBrandName)}{line("Cabin",c.cabinMarketingName??c.cabinClass)}{line("Fare basis",c.fareBasisCode)}{line("Wi-Fi",c.amenities?.wifi?.state)}{line("Power",c.amenities?.power?.state)}{line("Seat",[c.amenities?.seat?.type,c.amenities?.seat?.pitch,c.amenities?.seat?.legroom].filter(Boolean).join(" · "))}</View>)}{line("Base fare",p?.price?.baseAmount!==undefined?`${p.price.baseCurrency} ${p.price.baseAmount}`:undefined)}{line("Taxes",p?.price?.taxAmount!==undefined?`${p.price.taxCurrency} ${p.price.taxAmount}`:undefined)}{line("Trip total",p?.price?`${p.price.totalCurrency} ${p.price.totalAmount}`:`${offer.currency} ${offer.price}`)}{line("Estimated CO₂",p?.totalEmissionsKg!==undefined?`${p.totalEmissionsKg} kg`:undefined)}</>:null}{tab==="conditions"?<>{p?.conditions?.map((c,i)=><View key={i}>{line(c.category,`${c.state}${c.penaltyAmount!==undefined?` · penalty ${c.penaltyCurrency} ${c.penaltyAmount}`:""}`)}</View>)}{line("Identity documents required",p?.passengerIdentityDocumentsRequired===undefined?undefined:p.passengerIdentityDocumentsRequired?"Yes":"No")}{line("Supported documents",p?.supportedIdentityDocumentTypes?.join(", "))}{line("Offer airline",p?.offerOwner?.name)}{line("Provider updated",p?.updatedAt)}{p?.offerOwner?.conditionsOfCarriageUrl&&/^https:\/\//.test(p.offerOwner.conditionsOfCarriageUrl)?<Pressable accessibilityRole="link" onPress={()=>Linking.openURL(p.offerOwner!.conditionsOfCarriageUrl!)} style={s.link}><Text style={s.editText}>Conditions of carriage</Text></Pressable>:null}</>:null}{tab==="extras"?<>{p?.optionalServices?.length?p.optionalServices.map((x,i)=><View key={i} style={s.extra}>{line(x.description,`${x.currency} ${x.price}`)}{line("Priced per traveler",x.pricedPerTraveler?"Yes":"No")}{line("Travelers",x.travelerCount)}{line("Maximum quantity",x.maximumQuantity)}{line("Journey",x.journeyContext)}</View>):<Text style={[s.bodyText,{color:theme.textSecondary}]}>No optional services were supplied.</Text>}{line("Supported loyalty programmes",p?.supportedLoyaltyProgrammes?.join(", "))}</>:null}</View>}
const s=StyleSheet.create({safe:{flex:1},backBar:{minHeight:52,justifyContent:"center",paddingHorizontal:16,borderBottomWidth:1,borderBottomColor:"#D7DFEA"},back:{minHeight:44,flexDirection:"row",alignItems:"center",gap:7},backText:{color:ui.blue,fontWeight:"800"},center:{flex:1,justifyContent:"center",padding:24,gap:16},content:{padding:18,gap:14},title:{fontSize:23,fontWeight:"900"},route:{fontSize:27,fontWeight:"900"},bodyText:{fontSize:14,lineHeight:20},actions:{flexDirection:"row",alignItems:"center",gap:8},iconButton:{width:44,height:44,alignItems:"center",justifyContent:"center"},edit:{minHeight:44,flexDirection:"row",alignItems:"center",gap:6,paddingHorizontal:10,borderWidth:1,borderColor:ui.blue,borderRadius:10},editText:{color:ui.blue,fontWeight:"800"},sectionTitle:{fontSize:20,fontWeight:"900",marginTop:8},card:{borderWidth:1,borderRadius:14,padding:14,gap:7},direction:{color:ui.blue,fontWeight:"900",textTransform:"uppercase"},leg:{fontSize:18,fontWeight:"900"},segment:{borderTopWidth:1,borderTopColor:"#D7DFEA",paddingTop:8,marginTop:5},small:{fontSize:12,lineHeight:17},fares:{gap:10},fareCard:{width:230,minHeight:145,borderWidth:2,borderRadius:14,padding:14,gap:6},fareLabel:{fontSize:17,fontWeight:"900"},farePrice:{color:ui.blue,fontSize:18,fontWeight:"900"},tabs:{flexDirection:"row",flexWrap:"wrap",gap:4},tab:{minHeight:44,justifyContent:"center",paddingHorizontal:9,borderBottomWidth:2,borderBottomColor:"transparent"},activeTab:{borderBottomColor:ui.blue},tabText:{fontSize:12,fontWeight:"800"},deal:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:8},extra:{paddingBottom:8},link:{minHeight:44,justifyContent:"center"},notice:{backgroundColor:"#FFF4D6",padding:12,borderRadius:10},noticeText:{color:"#694D00",fontWeight:"700"},sticky:{position:"absolute",left:0,right:0,bottom:0,minHeight:88,borderTopWidth:1,paddingHorizontal:18,paddingTop:10,flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:12},total:{fontSize:22,fontWeight:"900"}});