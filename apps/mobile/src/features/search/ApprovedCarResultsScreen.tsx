import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ArrowUp, SquarePen } from "lucide-react-native";
import { travelApi, type CarResult } from "../../api/travelApi";
import { getApiBaseUrl } from "../../config/apiUrl";
import { acceptCanonicalResults, canonicalResultsWereSilentlyLost } from "../flow/canonicalResultAcceptance";
import { buildSearchPlan, safeCanonicalCarResult } from "../flow/travelSearchModel";
import { FlowIcon } from "../flow/FlowIcon";
import { buildRecentSearch, recordRecentSearchBestEffort } from "../recent/recentSearch";
import { CarResultCard } from "./CarResultCard";
import { Empty, ui } from "./SearchUi";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { NativeBrandedSearchLoading } from "./NativeBrandedSearchLoading";
import { carQuickFilterGroupIds } from "../../../../../src/lib/cars/carFilterPresentation";
import { filterCarResults, sortCarResults, type CarSort, type SelectedCarFilters } from "../../../../../src/lib/cars/carResults";
import { CarFilterSheet, activeCarFilterCount, visibleCarFilterGroups } from "./CarFilterSheet";
import { CarResultsQuickFilterSheet } from "./CarResultsQuickFilterSheet";
import { carFilterCopy, carFilterGroupLabel } from "./carFilterCopy";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { CarEditSearchModal } from "./CarEditSearchModal";
import { NativeCarPriceAlert } from "./NativeCarPriceAlert";
import { useFeatureAvailability } from "../availability/FeatureAvailability";
import { getLocationFieldDisplay } from "../../../../../src/lib/search/locationFieldDisplay";
import { NATIVE_FILTER_RESULTS_TRANSITION_MS } from "./filterResultsTransition";
import { formatCarResultsScheduleSummary } from "../../../../../src/lib/cars/carResultsSummary";

type Status = "loading" | "ready" | "empty" | "error";
const CAR_BACK_TO_TOP_HIDE_NEAR_END = 120;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const carResultCountLabel = (count: number) => `${count} ${count === 1 ? "Result" : "Results"} found`;

export function ApprovedCarResultsScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { locale } = useMobileLocalization();
  const { availability } = useFeatureAvailability();
  const params = useLocalSearchParams<Record<string,string|string[]>>();
  const plan = useMemo(() => buildSearchPlan("car",params),[JSON.stringify(params)]);
  const [results,setResults] = useState<CarResult[]>([]);
  const [status,setStatus] = useState<Status>("loading");
  const [message,setMessage] = useState("");
  const [retry,setRetry] = useState(0);
  const [sort,setSort] = useState<CarSort>("recommended");
  const [filters,setFilters] = useState<SelectedCarFilters>({});
  const [filterSheetVisible,setFilterSheetVisible] = useState(false);
  const [quickSheetKind,setQuickSheetKind] = useState<string|null>(null);
  const [carResultsApplying,setCarResultsApplying] = useState(false);
  const carResultsApplyingTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const carFilterSessionDirtyRef=useRef(false);
  const [carEditSearchOpen,setCarEditSearchOpen] = useState(false);
  const [carBackToTop,setCarBackToTop] = useState(false);
  const carBackToTopVisibleRef=useRef(false);
  const carScrollRef=useRef<ScrollView>(null);
  const searchSequence=useRef(0);
  const activeSearch=useRef<AbortController|null>(null);
  const activeExecutionKey=useRef<string|undefined>(undefined);
  const searchAbortTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const load = useCallback(async()=>{
    if(!plan.plan){setStatus("error");setMessage(plan.error||"Invalid car search");return;}
    activeSearch.current?.abort("superseded");
    const controller=new AbortController();
    activeSearch.current=controller;
    const sequence=++searchSequence.current;
    const requestId=`mobile-car-${Date.now()}-${sequence}`;
    setStatus("loading");setMessage("");
    try{const response=await travelApi.searchCars(plan.plan.payload,{signal:controller.signal,requestId});if(controller.signal.aborted||sequence!==searchSequence.current)return;const acceptance=acceptCanonicalResults(response.results,safeCanonicalCarResult);if(acceptance.rejectedIds.length)console.warn("[travel-search] canonical car results failed client safety checks",{requestId:response.requestId,canonicalCount:acceptance.canonicalCount,acceptedCount:acceptance.accepted.length,rejectedIds:acceptance.rejectedIds});setResults(acceptance.accepted);if(canonicalResultsWereSilentlyLost(acceptance)){setStatus("error");setMessage("The canonical search returned inventory that this app could not render safely.");}else{setStatus(acceptance.accepted.length?"ready":"empty");setMessage(response.warnings?.[0]||"");void recordRecentSearchBestEffort(buildRecentSearch("car",plan.plan.payload));}}
    catch(error){if(controller.signal.aborted||sequence!==searchSequence.current)return;setStatus("error");setMessage(error instanceof Error?error.message:"Car search failed");}
  },[plan.plan?.key,retry]);
  useEffect(()=>{const executionKey=`${plan.plan?.key??"invalid"}:${retry}`;if(searchAbortTimer.current)clearTimeout(searchAbortTimer.current);searchAbortTimer.current=undefined;if(activeExecutionKey.current!==executionKey){activeExecutionKey.current=executionKey;void load();}return()=>{searchAbortTimer.current=setTimeout(()=>{if(activeExecutionKey.current!==executionKey)return;searchSequence.current+=1;activeSearch.current?.abort("screen-cleanup");activeExecutionKey.current=undefined;},0);};},[load,plan.plan?.key,retry]);
  useEffect(()=>{if(carResultsApplyingTimer.current)clearTimeout(carResultsApplyingTimer.current);carResultsApplyingTimer.current=undefined;setCarResultsApplying(false);return()=>{if(carResultsApplyingTimer.current)clearTimeout(carResultsApplyingTimer.current);};},[plan.plan?.key]);
  const filterGroups=useMemo(()=>visibleCarFilterGroups(results),[results]);
  const quickGroups=useMemo(()=>carQuickFilterGroupIds.flatMap(id=>{const group=filterGroups.find(candidate=>candidate.id===id);return group?[group]:[];}),[filterGroups]);
  const copy=useMemo(()=>carFilterCopy(locale),[locale]);
  const filtered=useMemo(()=>sortCarResults(filterCarResults(results,filters),sort),[results,filters,sort]);
  const payload=plan.plan?.payload||{};
  const canonicalPickupLocation=String(payload.pickupLocation||"");
  const carSummaryDestination=getLocationFieldDisplay(canonicalPickupLocation).primary;
  const carSummarySecondary=formatCarResultsScheduleSummary({pickupDate:String(payload.pickupDate||""),pickupTime:String(payload.pickupTime||""),dropoffDate:String(payload.dropoffDate||""),dropoffTime:String(payload.dropoffTime||""),locale});
  const edit=()=>setCarEditSearchOpen(true);
  const startCarResultsTransition=()=>{if(carResultsApplyingTimer.current)clearTimeout(carResultsApplyingTimer.current);setCarResultsApplying(true);carScrollRef.current?.scrollTo({y:0,animated:true});carResultsApplyingTimer.current=setTimeout(()=>setCarResultsApplying(false),NATIVE_FILTER_RESULTS_TRANSITION_MS);};
  const changeCarFilters=(next:SelectedCarFilters)=>{carFilterSessionDirtyRef.current=true;setFilters(next);};
  const openAllFilters=()=>{carFilterSessionDirtyRef.current=false;setFilterSheetVisible(true);};
  const openQuickFilter=(groupId:string)=>{carFilterSessionDirtyRef.current=false;setQuickSheetKind(groupId);};
  const closeFilterSheet=()=>setFilterSheetVisible(false);
  const completeCarFilterSession=()=>{closeFilterSheet();if(carFilterSessionDirtyRef.current){carFilterSessionDirtyRef.current=false;startCarResultsTransition();}};
  const openDeal=(result:CarResult)=>router.push({pathname:"/car-details",params:{result:JSON.stringify(result),resultId:result.id,...Object.fromEntries(Object.entries(payload).map(([key,value])=>[key,String(value)]))}});
  const image=(value?:string)=>{if(!value)return undefined;if(/^https:\/\//i.test(value))return value;const base=getApiBaseUrl();return base.ok&&/^\/(?!\/)/.test(value)?new URL(value,`${base.baseUrl}/`).toString():undefined;};
  const clearFilters=()=>{setFilters({});startCarResultsTransition();};
  const handleCarScroll=useCallback((event:NativeSyntheticEvent<NativeScrollEvent>)=>{
    const scrollY=Math.max(0,event.nativeEvent.contentOffset.y);
    const distanceFromEnd=Math.max(0,event.nativeEvent.contentSize.height-event.nativeEvent.layoutMeasurement.height-scrollY);
    const visible=scrollY > 600 && distanceFromEnd > CAR_BACK_TO_TOP_HIDE_NEAR_END;
    if(visible===carBackToTopVisibleRef.current)return;
    carBackToTopVisibleRef.current=visible;
    setCarBackToTop(visible);
  },[]);
  if(status==="loading") return <NativeBrandedSearchLoading product="car"/>;
  return <SafeAreaView style={[r.safe,{backgroundColor:theme.background}]} edges={["top"]}>
    <CarResultsHeader destination={carSummaryDestination} secondaryLine={carSummarySecondary} onEdit={edit}/>
    <View style={r.carFilterSectionHeader}><ScrollView horizontal style={[r.filterRail,{backgroundColor:theme.dark?theme.surface:"#FFFFFF"}]} showsHorizontalScrollIndicator={false} alwaysBounceHorizontal={false} contentContainerStyle={r.filters}>
      <CarResultsShortcut label="Filter" accessibilityLabel="Filters" count={activeCarFilterCount(filters)||undefined} icon showChevron={false} expanded={filterSheetVisible} onPress={openAllFilters}/>
      <CarResultsShortcut label={sort === "recommended" ? "Sort" : sort === "lowestTotal" ? "Total price" : "Top rated"} accessibilityLabel={`Sort, ${sort === "recommended" ? "Recommended" : sort === "lowestTotal" ? "Total price" : "Top rated"}`} expanded={quickSheetKind === "sort"} onPress={()=>openQuickFilter("sort")}/>
      {quickGroups.map(group=><CarResultsShortcut key={group.id} label={carFilterGroupLabel(copy,group)} count={filters[group.id]?.length||undefined} expanded={quickSheetKind===group.id} onPress={()=>openQuickFilter(group.id)}/>)}
    </ScrollView></View>
    <ScrollView ref={carScrollRef} alwaysBounceVertical={false} bounces={false} overScrollMode="never" scrollEventThrottle={16} onScroll={handleCarScroll} contentContainerStyle={[r.body,{paddingBottom:Math.max(insets.bottom + 16,16)}]}>
      {message?<Text accessibilityRole="alert" style={r.notice}>{message}</Text>:null}
      {status==="empty"?<Empty title="No rental cars found" body="Try changing your dates, pickup location, or filters." retry={clearFilters} retryLabel="Clear filters" edit={edit}/>:null}
      {status==="error"?<Empty title="Car search could not be completed" body={message||"Check your connection and try again."} retry={()=>setRetry((value)=>value+1)} edit={edit}/>:null}
      {status==="ready"?<><NativeCarPriceAlert plan={plan.plan} results={results} available={availability.priceAlerts}/>{carResultsApplying?<CarSkeletons/>:<><View accessibilityLabel="Car results summary" style={r.carResultsSummaryRow}><View style={r.carResultsCountColumn}><Text accessibilityRole="header" style={[r.carResultCount,{color:theme.textPrimary}]}>{carResultCountLabel(filtered.length)}</Text></View></View>{filtered.length?<>{filtered.map((result,index)=><CarResultCard key={result.id} result={result} rank={index} imageUri={image(result.imageUrl)} searchParams={payload} onViewDeal={()=>openDeal(result)}/>)}</>:<Empty title="No cars match these filters" body="Clear filters to see the available rental cars." retry={clearFilters} retryLabel="Clear filters" edit={edit}/>}</>}</>:null}
    </ScrollView>
    {carBackToTop?<Pressable accessibilityRole="button" accessibilityLabel="Back to top" onPress={()=>carScrollRef.current?.scrollTo({y:0,animated:true})} style={[r.carBackToTop,{bottom:Math.max(insets.bottom + 16,16),backgroundColor:theme.surface,borderColor:theme.border}]}><ArrowUp size={21} color={theme.icon}/></Pressable>:null}
    <CarFilterSheet visible={filterSheetVisible} results={results} filters={filters} onChange={changeCarFilters} onClose={completeCarFilterSession}/>
    {quickSheetKind ? <CarResultsQuickFilterSheet key={quickSheetKind} kind={quickSheetKind} results={results} filters={filters} sort={sort} onApplyFilters={(next)=>{changeCarFilters(next);}} onApplySort={(next)=>{if(next!==sort){setSort(next);carScrollRef.current?.scrollTo({y:0,animated:true});}}} onClose={()=>{setQuickSheetKind(null);if(carFilterSessionDirtyRef.current){carFilterSessionDirtyRef.current=false;startCarResultsTransition();}}}/> : null}
    <CarEditSearchModal visible={carEditSearchOpen} params={params} onClose={()=>setCarEditSearchOpen(false)}/>
  </SafeAreaView>;
}

function CarResultsShortcut({label,accessibilityLabel,count,icon=false,showChevron=true,expanded,onPress}:{label:string;accessibilityLabel?:string;count?:number;icon?:boolean;showChevron?:boolean;expanded:boolean;onPress:()=>void}) {
  const {theme}=useAppTheme(); const active=Boolean(count);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel??label} accessibilityState={{expanded}} onPress={onPress} style={r.shortcutTouchTarget}><View style={[r.shortcut,{backgroundColor:active?(theme.dark?"#15315C":"#EDF4FF"):theme.surface,borderColor:active?ui.blue:theme.border}]}>{icon?<FlowIcon name="sliders" size={14} color={active?ui.blue:theme.icon}/>:null}<Text numberOfLines={1} style={[r.shortcutLabel,{color:active?ui.blue:theme.textPrimary}]}>{label}</Text>{count?<View style={r.shortcutCount}><Text style={r.shortcutCountText}>{count}</Text></View>:null}{showChevron?<FlowIcon name="chevronDown" size={13} color={theme.icon}/>:null}</View></Pressable>;
}

function CarResultsHeader({destination,secondaryLine,onEdit}:{destination:string;secondaryLine:string;onEdit:()=>void}) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  return <View accessibilityLabel="Car search summary" style={[r.carHeader,{backgroundColor:theme.background,paddingLeft:Math.max(insets.left+6,6),paddingRight:Math.max(insets.right+10,10)}]}>
    <View style={r.carHeaderMainRow}>
      <View style={r.carHeaderSide}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={()=>router.back()} style={({pressed})=>[r.carHeaderBack,pressed&&r.carHeaderControlPressed]}>
          <ArrowLeft size={25} strokeWidth={2} color={theme.icon}/>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Edit car search. ${destination}. ${secondaryLine}`} onPress={onEdit} style={({pressed})=>[r.carSummaryCard,{backgroundColor:theme.surface,borderColor:theme.dark?theme.border:"#D8E1EC"},pressed&&r.carSummaryCardPressed]}>
        <View style={r.carSummaryText}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={[r.carSummaryDestination,{color:theme.textPrimary}]}>{destination}</Text>
          <Text numberOfLines={1} ellipsizeMode="tail" style={[r.carSummarySecondary,{color:theme.textSecondary}]}>{secondaryLine}</Text>
        </View>
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={r.carSummaryEditSlot}>
          <SquarePen size={16} strokeWidth={2.2} color={theme.icon}/>
        </View>
      </Pressable>
    </View>
  </View>;
}

function CarSkeletons(){return <View accessibilityRole="progressbar" accessibilityState={{busy:true}} accessibilityLabel="Updating car results" style={r.skeletonGroup}><View style={r.foundSkeleton}/>{[0,1,2].map((key)=><View key={key} style={r.skeleton}><View style={r.skeletonImage}/><View style={r.skeletonLines}><View style={r.skeletonLine}/><View style={[r.skeletonLine,{width:"65%"}]}/><View style={[r.skeletonLine,{width:"82%"}]}/></View></View>)}</View>;}
const r=StyleSheet.create({safe:{flex:1,backgroundColor:"white"},carHeader:{paddingTop:12,paddingBottom:8},carHeaderMainRow:{width:"100%",flexDirection:"row",alignItems:"center",gap:6},carHeaderSide:{width:44,flexShrink:0},carHeaderBack:{width:44,height:44,alignItems:"center",justifyContent:"center"},carHeaderControlPressed:{opacity:0.55},carSummaryCard:{flex:1,minWidth:0,minHeight:62,borderWidth:1,borderRadius:13,flexDirection:"row",alignItems:"center",overflow:"hidden"},carSummaryCardPressed:{opacity:0.76},carSummaryText:{flex:1,minWidth:0,justifyContent:"center",paddingLeft:14,paddingVertical:9},carSummaryDestination:{fontSize:14,lineHeight:18,fontWeight:"700",fontFamily:appFonts.bold},carSummarySecondary:{marginTop:3,fontSize:10.5,lineHeight:14,fontWeight:"500",fontFamily:appFonts.medium},carSummaryEditSlot:{width:44,height:44,flexShrink:0,alignItems:"center",justifyContent:"center"},carFilterSectionHeader:{paddingBottom:12},filterRail:{height:44,flexGrow:0,flexShrink:0},filters:{paddingLeft:8,paddingRight:16,gap:4,alignItems:"center",flexWrap:"nowrap"},shortcutTouchTarget:{minWidth:44,minHeight:44,justifyContent:"center"},shortcut:{height:36,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:4,borderWidth:1,borderRadius:9,paddingHorizontal:8},shortcutLabel:{fontSize:13,lineHeight:16,fontWeight:"600",fontFamily:appFonts.semibold},shortcutCount:{minWidth:20,height:20,borderRadius:10,paddingHorizontal:6,alignItems:"center",justifyContent:"center",backgroundColor:ui.blue},shortcutCountText:{fontSize:11,lineHeight:14,fontWeight:"600",fontFamily:appFonts.semibold,color:"white"},body:{paddingHorizontal:10,gap:14},notice:{color:ui.navy,backgroundColor:"#F2F6FF",borderRadius:10,padding:12},carResultsSummaryRow:{gap:8},carResultsCountColumn:{minWidth:0,flexDirection:"row",alignItems:"baseline",justifyContent:"space-between",gap:8},carResultCount:{fontSize:13,lineHeight:17,fontWeight:"700",fontFamily:appFonts.bold},sort:{minHeight:44,flexDirection:"row",alignItems:"center",gap:5,paddingHorizontal:2},sortPrefix:{fontSize:11,color:ui.muted},sortValue:{fontSize:14,color:ui.navy},carPriceAlert:{width:"100%",minHeight:52,borderRadius:12,borderWidth:1,paddingHorizontal:12,paddingVertical:4,flexDirection:"row",alignItems:"center",gap:8},carPriceAlertCopy:{flex:1,minWidth:0},carPriceAlertTitle:{fontSize:12.5,lineHeight:16,fontWeight:"700",fontFamily:appFonts.bold},carPriceAlertSwitchSlot:{minWidth:51,minHeight:44,flexShrink:0,flexDirection:"row",alignItems:"center",justifyContent:"flex-end",gap:4},carPriceAlertSwitchIos:{transform:[{translateY:8}]},carBackToTop:{position:"absolute",right:16,width:44,height:44,borderRadius:22,borderWidth:1,alignItems:"center",justifyContent:"center",zIndex:19,elevation:4},skeletonGroup:{gap:14},foundSkeleton:{height:44,borderRadius:12,backgroundColor:"#EEF1F6"},skeleton:{height:232,borderRadius:13,borderWidth:1,borderColor:ui.border,overflow:"hidden",flexDirection:"row"},skeletonImage:{width:"40%",backgroundColor:"#EEF1F6"},skeletonLines:{flex:1,padding:16,gap:15},skeletonLine:{height:13,borderRadius:6,backgroundColor:"#EEF1F6",width:"90%"}});
