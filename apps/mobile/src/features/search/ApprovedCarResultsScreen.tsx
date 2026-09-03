import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { travelApi, type CarResult } from "../../api/travelApi";
import { getApiBaseUrl } from "../../config/apiUrl";
import { acceptCanonicalResults, canonicalResultsWereSilentlyLost } from "../flow/canonicalResultAcceptance";
import { buildSearchPlan, safeCanonicalCarResult } from "../flow/travelSearchModel";
import { FlowIcon } from "../flow/FlowIcon";
import { buildRecentSearch, recordRecentSearchBestEffort } from "../recent/recentSearch";
import { BottomNav } from "./ApprovedResultsScreen";
import { CarResultCard } from "./CarResultCard";
import { Button, Empty, Pill, TopBar, shortDate, ui } from "./SearchUi";
import { useAppTheme } from "../../theme/AppTheme";

type Status = "loading" | "ready" | "empty" | "error";
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export function ApprovedCarResultsScreen() {
  const { theme } = useAppTheme();
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
  const [page,setPage] = useState(1);
  const load = useCallback(async()=>{
    if(!plan.plan){setStatus("error");setMessage(plan.error||"Invalid car search");return;}
    setStatus("loading");setMessage("");
    try{const response=await travelApi.searchCars(plan.plan.payload);const acceptance=acceptCanonicalResults(response.results,safeCanonicalCarResult);if(acceptance.rejectedIds.length)console.warn("[travel-search] canonical car results failed client safety checks",{requestId:response.requestId,canonicalCount:acceptance.canonicalCount,acceptedCount:acceptance.accepted.length,rejectedIds:acceptance.rejectedIds});setResults(acceptance.accepted);if(canonicalResultsWereSilentlyLost(acceptance)){setStatus("error");setMessage("The canonical search returned inventory that this app could not render safely.");}else{setStatus(acceptance.accepted.length?"ready":"empty");setMessage(response.warnings?.[0]||"");void recordRecentSearchBestEffort(buildRecentSearch("car",plan.plan.payload));}}
    catch(error){setStatus("error");setMessage(error instanceof Error?error.message:"Car search failed");}
  },[plan.plan?.key,retry]);
  useEffect(()=>{void load();},[load]);
  const categories=useMemo(()=>[...new Set(results.map((result)=>result.categoryLabel))],[results]);
  const companies=useMemo(()=>[...new Set(results.map((result)=>result.rentalCompanyName))],[results]);
  const cheapest=results.length?Math.min(...results.map((result)=>result.offers[0]?.pricePerDay??Infinity)):0;
  const filtered=useMemo(()=>results.filter((result)=>(!category||result.categoryLabel===category)&&(!company||result.rentalCompanyName===company)&&(!priceFilter||(result.offers[0]?.pricePerDay??Infinity)<=cheapest*1.5)).sort((a,b)=>sort==="price"?(a.offers[0]?.totalPrice??Infinity)-(b.offers[0]?.totalPrice??Infinity):b.recommendationScore-a.recommendationScore),[results,category,company,priceFilter,sort,cheapest]);
  const pageSize=20; const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize)); const visible=filtered.slice((page-1)*pageSize,page*pageSize);
  useEffect(()=>setPage(1),[category,company,priceFilter,sort]);
  const payload=plan.plan?.payload||{}; const pickup=String(payload.pickupDate||""); const dropoff=String(payload.dropoffDate||"");
  const edit=()=>router.canGoBack()?router.back():router.replace({pathname:"/cars",params:Object.fromEntries(Object.entries(payload).map(([key,value])=>[key,String(value)]))});
  const cycle=(values:string[],current:string,set:(value:string)=>void)=>{if(!values.length)return;const index=current?values.indexOf(current):-1;set(index>=values.length-1?"":values[index+1]);};
  const openDeal=(result:CarResult)=>router.push({pathname:"/car-details",params:{result:JSON.stringify(result),resultId:result.id,...Object.fromEntries(Object.entries(payload).map(([key,value])=>[key,String(value)]))}});
  const image=(value?:string)=>{if(!value)return undefined;if(/^https:\/\//i.test(value))return value;const base=getApiBaseUrl();return base.ok&&/^\/(?!\/)/.test(value)?new URL(value,`${base.baseUrl}/`).toString():undefined;};
  const clearFilters=()=>{setCategory("");setCompany("");setPriceFilter(false);};
  return <SafeAreaView style={[r.safe,{backgroundColor:theme.background}]} edges={["top"]}>
    <TopBar />
    <Pressable accessibilityRole="button" accessibilityLabel="Edit car search" onPress={edit} style={[r.summary,{backgroundColor:theme.surface}]}><View style={r.summaryCopy}><Text style={[r.route,{color:theme.textPrimary}]}>{String(payload.pickupLocation||"")}</Text><Text numberOfLines={1} style={[r.sub,{color:theme.textSecondary}]}>{shortDate(pickup)} — {shortDate(dropoff)} · {payload.driverAge === "18-70" ? "Any age" : `${String(payload.driverAge||"")} years old`}</Text></View><FlowIcon name="document" size={18} color={theme.icon} /></Pressable>
    <ScrollView horizontal style={r.filterRail} showsHorizontalScrollIndicator={false} contentContainerStyle={r.filters}>
      <Pill label="Filters" icon="sliders" active={Boolean(category||company||priceFilter)} onPress={clearFilters}/>
      <Pill label={priceFilter?"Lower total":"Total price"} active={priceFilter} onPress={()=>setPriceFilter((value)=>!value)}/>
      <Pill label={category||"Vehicle type"} active={Boolean(category)} onPress={()=>cycle(categories,category,setCategory)}/>
      <Pill label={company||"Rental company"} active={Boolean(company)} onPress={()=>cycle(companies,company,setCompany)}/>
    </ScrollView>
    <ScrollView contentContainerStyle={r.body}>
      {message?<Text accessibilityRole="alert" style={r.notice}>{message}</Text>:null}
      {status==="loading"?<CarSkeletons/>:null}
      {status==="empty"?<Empty title="No rental cars found" body="Try changing your dates, pickup location, or filters." retry={clearFilters} retryLabel="Clear filters" edit={edit}/>:null}
      {status==="error"?<Empty title="Car search could not be completed" body={message||"Check your connection and try again."} retry={()=>setRetry((value)=>value+1)} edit={edit}/>:null}
      {status==="ready"?<><View style={r.found}><View><Text style={[r.foundTitle,{color:theme.textPrimary}]}>{filtered.length} results found</Text><Text style={[r.range,{color:theme.textSecondary}]}>{filtered.length ? `${(page-1)*pageSize+1}–${Math.min(page*pageSize,filtered.length)}` : "0"}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Sort by ${sort === "price" ? "Total price" : "Recommended"}`} onPress={()=>setSort((value)=>value==="price"?"recommended":"price")} style={r.sort}><Text style={[r.sortPrefix,{color:theme.textSecondary}]}>Sort by:</Text><Text style={[r.sortValue,{color:theme.textPrimary}]}>{sort==="price"?"Total price":"Recommended"}</Text><FlowIcon name="chevronDown" size={14} color={theme.icon}/></Pressable></View>{filtered.length?<>{visible.map((result,index)=><CarResultCard key={result.id} result={result} rank={(page-1)*pageSize+index} imageUri={image(result.imageUrl)} searchParams={payload} onViewDeal={()=>openDeal(result)}/>)}{totalPages>1?<View style={r.pagination}><Button label="Previous" outline disabled={page===1} onPress={()=>setPage((value)=>Math.max(1,value-1))}/><Text style={[r.pageLabel,{color:theme.textPrimary}]}>Page {page} of {totalPages}</Text><Button label="Next" outline disabled={page===totalPages} onPress={()=>setPage((value)=>Math.min(totalPages,value+1))}/></View>:null}</>:<Empty title="No cars match these filters" body="Clear filters to see the available rental cars." retry={clearFilters} retryLabel="Clear filters" edit={edit}/>}<CarPriceAlert/></>:null}
    </ScrollView>
    <BottomNav />
  </SafeAreaView>;
}

function CarSkeletons(){return <View style={r.skeletonGroup}><View style={r.foundSkeleton}/>{[0,1,2].map((key)=><View key={key} style={r.skeleton}><View style={r.skeletonImage}/><View style={r.skeletonLines}><View style={r.skeletonLine}/><View style={[r.skeletonLine,{width:"65%"}]}/><View style={[r.skeletonLine,{width:"82%"}]}/></View></View>)}</View>;}
function CarPriceAlert(){return <View style={r.alert}><View style={r.alertIcon}><FlowIcon name="bell" color="white"/></View><View style={r.alertCopy}><Text style={r.foundTitle}>Rental car price alerts</Text><Text style={r.sub}>Track this search and get notified when rental prices drop.</Text></View><Button label="Track prices" outline disabled/></View>;}
const r=StyleSheet.create({safe:{flex:1,backgroundColor:"white"},summary:{marginHorizontal:16,marginBottom:4,minHeight:64,paddingHorizontal:16,paddingVertical:12,borderRadius:12,backgroundColor:"white",shadowColor:"#0F172A",shadowOpacity:0.08,shadowRadius:12,shadowOffset:{width:0,height:5},elevation:2,flexDirection:"row",alignItems:"center",gap:10},summaryCopy:{flex:1,minWidth:0},route:{fontSize:16,fontWeight:"800",color:ui.navy,flexShrink:1},sub:{marginTop:4,fontSize:11,color:ui.muted,lineHeight:16},filterRail:{height:64,flexGrow:0,flexShrink:0},filters:{paddingHorizontal:16,paddingVertical:10,gap:8},body:{paddingHorizontal:10,paddingBottom:92,gap:14},notice:{color:ui.navy,backgroundColor:"#F2F6FF",borderRadius:10,padding:12},found:{minHeight:44,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8,paddingHorizontal:6},foundTitle:{fontSize:16,fontWeight:"800",color:ui.navy},range:{marginTop:2,fontSize:11,color:ui.muted},sort:{minHeight:44,flexDirection:"row",alignItems:"center",gap:5,paddingHorizontal:2},sortPrefix:{fontSize:11,color:ui.muted},sortValue:{fontSize:14,color:ui.navy},pagination:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:12,paddingVertical:8},pageLabel:{fontSize:13,fontWeight:"700",color:ui.navy},alert:{minHeight:82,borderWidth:1,borderColor:ui.border,borderRadius:12,padding:13,flexDirection:"row",alignItems:"center",gap:12,backgroundColor:"#F8FAFF"},alertIcon:{width:46,height:46,borderRadius:23,backgroundColor:ui.blue,alignItems:"center",justifyContent:"center"},alertCopy:{flex:1,minWidth:0},skeletonGroup:{gap:14},foundSkeleton:{height:44,borderRadius:12,backgroundColor:"#EEF1F6"},skeleton:{height:232,borderRadius:13,borderWidth:1,borderColor:ui.border,overflow:"hidden",flexDirection:"row"},skeletonImage:{width:"40%",backgroundColor:"#EEF1F6"},skeletonLines:{flex:1,padding:16,gap:15},skeletonLine:{height:13,borderRadius:6,backgroundColor:"#EEF1F6",width:"90%"}});
