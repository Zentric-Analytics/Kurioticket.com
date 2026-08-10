import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { travelApi, type CarResult } from "../../api/travelApi";
import { getApiBaseUrl } from "../../config/apiUrl";
import { buildSearchPlan, validBookableCar } from "../flow/travelSearchModel";
import { FlowIcon } from "../flow/FlowIcon";
import { BottomNav } from "./ApprovedResultsScreen";
import { CarResultCard } from "./CarResultCard";
import { Button, DateStrip, Empty, Pill, TopBar, money, shortDate, ui } from "./SearchUi";

type Status = "loading" | "ready" | "empty" | "error";
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const dayCount = (start?: string, end?: string) => start && end ? Math.max(1, Math.ceil((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86400000)) : 1;
const shiftDate = (iso: string, offset: number) => { const value = new Date(`${iso}T12:00:00`); value.setDate(value.getDate() + offset); return value.toISOString().slice(0,10); };
const formatClock = (value: unknown) => { const [hour, minute] = String(value || "10:00").split(":").map(Number); return new Date(2000,0,1,hour,minute).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}); };

export function ApprovedCarResultsScreen() {
  const params = useLocalSearchParams<Record<string,string|string[]>>();
  const plan = useMemo(() => buildSearchPlan("car",params),[JSON.stringify(params)]);
  const [results,setResults] = useState<CarResult[]>([]);
  const [status,setStatus] = useState<Status>("loading");
  const [message,setMessage] = useState("");
  const [retry,setRetry] = useState(0);
  const [sort,setSort] = useState<"recommended"|"price">("recommended");
  const [category,setCategory] = useState("");
  const [company,setCompany] = useState("");
  const [priceFilter,setPriceFilter] = useState(false);
  const load = useCallback(async()=>{
    if(!plan.plan){setStatus("error");setMessage(plan.error||"Invalid car search");return;}
    setStatus("loading");setMessage("");
    try{const response=await travelApi.searchCars(plan.plan.payload);const valid=response.results.filter(validBookableCar);setResults(valid);setStatus(valid.length?"ready":"empty");setMessage(response.warnings?.[0]||"");}
    catch(error){setStatus("error");setMessage(error instanceof Error?error.message:"Car search failed");}
  },[plan.plan?.key,retry]);
  useEffect(()=>{void load();},[load]);
  const categories=useMemo(()=>[...new Set(results.map((result)=>result.categoryLabel))],[results]);
  const companies=useMemo(()=>[...new Set(results.map((result)=>result.rentalCompanyName))],[results]);
  const cheapest=results.length?Math.min(...results.map((result)=>result.offers[0]?.pricePerDay??Infinity)):0;
  const filtered=useMemo(()=>results.filter((result)=>(!category||result.categoryLabel===category)&&(!company||result.rentalCompanyName===company)&&(!priceFilter||(result.offers[0]?.pricePerDay??Infinity)<=cheapest*1.5)).sort((a,b)=>sort==="price"?(a.offers[0]?.totalPrice??Infinity)-(b.offers[0]?.totalPrice??Infinity):b.recommendationScore-a.recommendationScore),[results,category,company,priceFilter,sort,cheapest]);
  const payload=plan.plan?.payload||{}; const pickup=String(payload.pickupDate||""); const dropoff=String(payload.dropoffDate||""); const days=dayCount(pickup,dropoff);
  const edit=()=>router.canGoBack()?router.back():router.replace({pathname:"/cars",params:Object.fromEntries(Object.entries(payload).map(([key,value])=>[key,String(value)]))});
  const cycle=(values:string[],current:string,set:(value:string)=>void)=>{if(!values.length)return;const index=current?values.indexOf(current):-1;set(index>=values.length-1?"":values[index+1]);};
  const openDeal=(result:CarResult)=>router.push({pathname:"/car-details",params:{result:JSON.stringify(result),resultId:result.id,...Object.fromEntries(Object.entries(payload).map(([key,value])=>[key,String(value)]))}});
  const image=(value?:string)=>{if(!value)return undefined;if(/^https:\/\//i.test(value))return value;const base=getApiBaseUrl();return base.ok&&/^\/(?!\/)/.test(value)?new URL(value,`${base.baseUrl}/`).toString():undefined;};
  const selectDate=(next:string)=>{const offset=Math.round((new Date(`${next}T12:00:00`).getTime()-new Date(`${pickup}T12:00:00`).getTime())/86400000);router.setParams({pickupDate:next,dropoffDate:shiftDate(dropoff,offset)});};
  const clearFilters=()=>{setCategory("");setCompany("");setPriceFilter(false);};
  return <SafeAreaView style={r.safe} edges={["top"]}>
    <TopBar />
    <View style={r.summary}><View style={r.summaryCopy}><Text style={r.route}>{String(payload.pickupLocation||"")}</Text><Text style={r.sub}>{shortDate(pickup)}, {formatClock(payload.pickupTime)}  →  {shortDate(dropoff)}, {formatClock(payload.dropoffTime)}</Text><Text style={r.sub}>{days} day{days===1?"":"s"}  ·  Driver age {String(payload.driverAge||"")}+</Text></View><Pill label="Edit search" icon="document" onPress={edit}/></View>
    <DateStrip date={pickup} prices={[undefined,undefined,cheapest||undefined,undefined,undefined]} currency={results[0]?.offers[0]?.currency} onSelect={selectDate}/>
    <ScrollView horizontal style={r.filterRail} showsHorizontalScrollIndicator={false} contentContainerStyle={r.filters}>
      <Pill label="Filters" icon="sliders" active={Boolean(category||company||priceFilter)} onPress={clearFilters}/>
      <Pill label={category||"Car type"} active={Boolean(category)} onPress={()=>cycle(categories,category,setCategory)}/>
      <Pill label={priceFilter?"Lower price":"Price"} active={priceFilter} onPress={()=>setPriceFilter((value)=>!value)}/>
      <Pill label={company||"Rental company"} active={Boolean(company)} onPress={()=>cycle(companies,company,setCompany)}/>
      <Pill label={`Sort: ${sort==="price"?"Price":"Recommended"}`} active onPress={()=>setSort((value)=>value==="price"?"recommended":"price")}/>
    </ScrollView>
    <ScrollView contentContainerStyle={r.body}>
      {message?<Text accessibilityRole="alert" style={r.notice}>{message}</Text>:null}
      {status==="loading"?<CarSkeletons/>:null}
      {status==="empty"?<Empty title="No rental cars found" body="Try changing your dates, pickup location, or filters." retry={clearFilters} retryLabel="Clear filters" edit={edit}/>:null}
      {status==="error"?<Empty title="Car search could not be completed" body={message||"Check your connection and try again."} retry={()=>setRetry((value)=>value+1)} edit={edit}/>:null}
      {status==="ready"?<><View style={r.found}><View style={r.foundCopy}><Text style={r.foundTitle}>{filtered.length} cars found</Text><Text style={r.sub}>Prices include taxes & fees when reported</Text></View></View>{filtered.length?filtered.map((result,index)=><CarResultCard key={result.id} result={result} rank={index} imageUri={image(result.imageUrl)} days={days} onViewDeal={()=>openDeal(result)}/>):<Empty title="No cars match these filters" body="Clear filters to see the available rental cars." retry={clearFilters} retryLabel="Clear filters" edit={edit}/>}<CarPriceAlert/></>:null}
    </ScrollView>
    <BottomNav />
  </SafeAreaView>;
}

function CarSkeletons(){return <View style={r.skeletonGroup}><View style={r.foundSkeleton}/>{[0,1,2].map((key)=><View key={key} style={r.skeleton}><View style={r.skeletonImage}/><View style={r.skeletonLines}><View style={r.skeletonLine}/><View style={[r.skeletonLine,{width:"65%"}]}/><View style={[r.skeletonLine,{width:"82%"}]}/></View></View>)}</View>;}
function CarPriceAlert(){return <View style={r.alert}><View style={r.alertIcon}><FlowIcon name="bell" color="white"/></View><View style={r.alertCopy}><Text style={r.foundTitle}>Rental car price alerts</Text><Text style={r.sub}>Track this search and get notified when rental prices drop.</Text></View><Button label="Track prices" outline disabled/></View>;}
const r=StyleSheet.create({safe:{flex:1,backgroundColor:"white"},summary:{paddingHorizontal:26,paddingBottom:14,flexDirection:"row",alignItems:"center",gap:10},summaryCopy:{flex:1,minWidth:0},route:{fontSize:21,fontWeight:"900",color:ui.navy,flexShrink:1},sub:{fontSize:11,color:ui.muted,lineHeight:16},filterRail:{height:70,flexGrow:0,flexShrink:0},filters:{paddingHorizontal:18,paddingVertical:16,gap:9},body:{paddingHorizontal:18,paddingBottom:92,gap:14},notice:{color:ui.navy,backgroundColor:"#F2F6FF",borderRadius:10,padding:12},found:{minHeight:74,borderWidth:1,borderColor:ui.border,borderRadius:12,padding:14,justifyContent:"center",backgroundColor:"#FAFCFF"},foundCopy:{flex:1,minWidth:0},foundTitle:{fontSize:16,fontWeight:"800",color:ui.navy},alert:{minHeight:82,borderWidth:1,borderColor:ui.border,borderRadius:12,padding:13,flexDirection:"row",alignItems:"center",gap:12,backgroundColor:"#F8FAFF"},alertIcon:{width:46,height:46,borderRadius:23,backgroundColor:ui.blue,alignItems:"center",justifyContent:"center"},alertCopy:{flex:1,minWidth:0},skeletonGroup:{gap:14},foundSkeleton:{height:74,borderRadius:12,backgroundColor:"#EEF1F6"},skeleton:{height:250,borderRadius:13,borderWidth:1,borderColor:ui.border,overflow:"hidden",flexDirection:"row"},skeletonImage:{width:"38%",backgroundColor:"#EEF1F6"},skeletonLines:{flex:1,padding:16,gap:15},skeletonLine:{height:13,borderRadius:6,backgroundColor:"#EEF1F6",width:"90%"}});
