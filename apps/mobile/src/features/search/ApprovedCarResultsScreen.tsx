import { createSearchPresentationDiagnostics } from "../../../../../src/shared/search/presentationDiagnostics";
import { randomUUID } from "expo-crypto";
import { prefetchCarImagesInBackground } from "./carImagePrefetch";
import { presentSearchResults, searchUnavailableMessage } from "./searchFailurePresentation";
import { useSandboxResultState } from "./useSandboxResults";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, FlatList, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ChevronDown, SlidersHorizontal, SquarePen } from "lucide-react-native";
import { travelApi, TravelApiError, type CarResult } from "../../api/travelApi";
import { carUnsupportedSearchMessage } from "../../../../../src/shared/cars/carSearchFeedback";
import { journeyEvents } from "../privacy/journeyEvents";
import { nativeChangedJourneySearchFields } from "../privacy/journeyEventCoordinator";
import { useNativeResultsPage } from "../privacy/useNativePageViews";
import { normalizeJourneySortMode, normalizeJourneySortChoice } from "../../../../../src/lib/search-journey";
import { carJourneyFilterSelections } from "../../../../../src/lib/cars/carFilterPresentation";
import { journeyResponseContext } from "../privacy/journeyResponseContext";
import { getApiBaseUrl } from "../../config/apiUrl";
import { acceptCanonicalResults, canonicalResultsWereSilentlyLost } from "../flow/canonicalResultAcceptance";
import { buildSearchPlan, safeCanonicalCarResult } from "../flow/travelSearchModel";
import { buildRecentSearch, recordRecentSearchBestEffort } from "../recent/recentSearch";
import { CarResultCard } from "./CarResultCard";
import { Empty, ui } from "./SearchUi";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { NativeBrandedSearchLoading } from "./NativeBrandedSearchLoading";
import { carQuickFilterGroupIds } from "../../../../../src/lib/cars/carFilterPresentation";
import { assignCarBadges, ensureCarProviderCoverage, filterCarResults, sortCarResults, type CarPricePerDayResolver, type CarSort, type SelectedCarFilters } from "../../../../../src/lib/cars/carResults";
import { CarFilterSheet, activeCarFilterCount, visibleCarFilterGroups } from "./CarFilterSheet";
import { CarResultsQuickFilterSheet } from "./CarResultsQuickFilterSheet";
import { carFilterCopy, carFilterGroupLabel } from "./carFilterCopy";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { CarEditSearchModal } from "./CarEditSearchModal";
import { carResultsRouteUpdate } from "./carResultsRouteUpdate";
import { DetailGlassSurface } from "./DetailGlassSurface";
import { useFeatureAvailability } from "../availability/FeatureAvailability";
import { getLocationFieldDisplay } from "../../../../../src/lib/search/locationFieldDisplay";
import { NATIVE_FILTER_RESULTS_TRANSITION_MS } from "./filterResultsTransition";
import { formatCarResultsScheduleSummary, formatCompactCarResultsScheduleSummary } from "../../../../../src/lib/cars/carResultsSummary";
import { resolveCarResultImageSource } from "../../../../../src/lib/cars/carResultImage";
import { useCarDisplayCurrency } from "./useCarDisplayCurrency";
import { carDisplayPricePerDay } from "./carDisplayCurrency";

type Status = "loading" | "ready" | "empty" | "error";
const CAR_RESULTS_LIGHT_CANVAS = "#F5F7FB";
const CAR_RESULT_INITIAL_IMAGE_COUNT = 3;
const CAR_RESULT_RENDER_BATCH_SIZE = 10;
const CAR_RESULT_WINDOW_SIZE = 21;
const CAR_RESULT_BATCHING_PERIOD_MS = 16;
const CAR_RESULT_IMAGE_PREFETCH_TIMEOUT_MS = 1_800;
const KURIOTICKET_COMPARE_LOGO_URI = Image.resolveAssetSource(require("../../../assets/kurioticket-logo-primary-light-bg.png")).uri;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const carResultCountLabel = (count: number) => `${count} ${count === 1 ? "result" : "results"} found`;
const resolveNativeCarImageUri=(value?:string)=>{const resolved=resolveCarResultImageSource(value);if(!resolved)return undefined;if(/^https:\/\//i.test(resolved))return resolved;const base=getApiBaseUrl();return base.ok&&/^\/(?!\/)/.test(resolved)?new URL(resolved,`${base.baseUrl}/`).toString():undefined;};
async function prefetchInitialCarImages(results: readonly CarResult[]){const carUris=[...new Set(results.map(result=>resolveNativeCarImageUri(result.imageUrl)).filter((value):value is string=>Boolean(value)))].slice(0,CAR_RESULT_INITIAL_IMAGE_COUNT);const uris=[KURIOTICKET_COMPARE_LOGO_URI,...carUris].filter(Boolean);if(!uris.length)return;let timeout:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([Promise.allSettled(uris.map(uri=>Image.prefetch(uri))).then(()=>undefined),new Promise<void>(resolve=>{timeout=setTimeout(resolve,CAR_RESULT_IMAGE_PREFETCH_TIMEOUT_MS);})]);}finally{if(timeout)clearTimeout(timeout);}}

export function ApprovedCarResultsScreen() {
  const recordNativeResultsPage = useNativeResultsPage();
  const { theme } = useAppTheme();
  const carCanvasColor = theme.dark ? theme.background : CAR_RESULTS_LIGHT_CANVAS;
  const headerSurfaceColor = theme.dark ? theme.background : "#FFFFFF";
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const carResultsScrollIndicatorInsets = Platform.OS === "ios"
    ? { top: 4, right: 3, bottom: Math.max(insets.bottom, 8), left: 0 }
    : undefined;
  const { locale } = useMobileLocalization();
  const { displayCurrency, rates } = useCarDisplayCurrency();
  const pricePerDay: CarPricePerDayResolver = useCallback((car) => carDisplayPricePerDay(car, displayCurrency, rates), [displayCurrency, rates]);
  const { availability } = useFeatureAvailability();
  const params = useLocalSearchParams<Record<string,string|string[]>>();
  const plan = useMemo(() => buildSearchPlan("car",params),[JSON.stringify(params)]);
  const [rawSandboxResults, setResults] = useState<CarResult[]>([]);
  const {results,pending:displayPending,unavailable:displayUnavailable} = useSandboxResultState(rawSandboxResults);
  const [resultsRequestId,setResultsRequestId] = useState<string>();
  const presentationDiagnostics=useMemo(()=>createSearchPresentationDiagnostics("car",Platform.OS),[]);
  const [transportStatus,setStatus] = useState<Status>("loading");
  const status:Status=transportStatus === "ready" ? displayPending ? "loading" : displayUnavailable ? "error" : transportStatus : transportStatus;
  const [message,setMessage] = useState("");
  const [retry,setRetry] = useState(0);
  const [sort,setSort] = useState<CarSort>("recommended");
  const [filters,setFilters] = useState<SelectedCarFilters>({});
  const currentFiltersRef = useRef<SelectedCarFilters>({});
  const [filterSheetVisible,setFilterSheetVisible] = useState(false);
  const [quickSheetKind,setQuickSheetKind] = useState<string|null>(null);
  const [carResultsApplying,setCarResultsApplying] = useState(false);
  const carResultsApplyingTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const carFilterSessionDirtyRef=useRef(false);
  const [carEditSearchOpen,setCarEditSearchOpen] = useState(false);
  const carScrollRef=useRef<FlatList<CarResult>>(null);
  // Filter changes still reset the list position, without rendering a floating Back-to-top control.
  const scrollCarResultsToTop=useCallback(()=>{
    carScrollRef.current?.scrollToOffset({offset:0,animated:true});
  },[]);
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
    const requestId=randomUUID();
    presentationDiagnostics.begin(requestId);
    setResultsRequestId(undefined);
    setStatus("loading");setMessage("");
    try{const response=await travelApi.searchCars(plan.plan.payload,{signal:controller.signal,requestId,sandboxDisplay:true});if(controller.signal.aborted||sequence!==searchSequence.current)return;const validationStarted=performance.now();const acceptance=acceptCanonicalResults(response.results,safeCanonicalCarResult);presentationDiagnostics.accepted(response.requestId,response.results.length,acceptance.accepted.length,performance.now()-validationStarted,acceptance.accepted);setResults(acceptance.accepted);if(canonicalResultsWereSilentlyLost(acceptance)){setStatus("error");setMessage(searchUnavailableMessage("car"));}else{journeyEvents.rememberSearch(response.requestId,journeyResponseContext(response));setResultsRequestId(response.requestId);if(acceptance.accepted.length)prefetchCarImagesInBackground(()=>prefetchInitialCarImages(acceptance.accepted));if(controller.signal.aborted||sequence!==searchSequence.current)return;const presentation=presentSearchResults("car",acceptance.accepted.length,response);setStatus(presentation.status);presentationDiagnostics.published(acceptance.accepted.length,true);setMessage(presentation.message);void recordRecentSearchBestEffort(buildRecentSearch("car",plan.plan.payload));}}
    catch(error){if(controller.signal.aborted||sequence!==searchSequence.current)return;setStatus("error");setMessage(error instanceof TravelApiError && error.status === 422 ? carUnsupportedSearchMessage(error.details?.warningCategory) : searchUnavailableMessage("car"));}
  },[plan.plan?.key,retry,presentationDiagnostics]);
  useEffect(()=>{const executionKey=`${plan.plan?.key??"invalid"}:${retry}`;if(searchAbortTimer.current)clearTimeout(searchAbortTimer.current);searchAbortTimer.current=undefined;if(activeExecutionKey.current!==executionKey){activeExecutionKey.current=executionKey;void load();}return()=>{searchAbortTimer.current=setTimeout(()=>{if(activeExecutionKey.current!==executionKey)return;searchSequence.current+=1;activeSearch.current?.abort("screen-cleanup");activeExecutionKey.current=undefined;},0);};},[load,plan.plan?.key,retry]);
  useEffect(()=>{if(carResultsApplyingTimer.current)clearTimeout(carResultsApplyingTimer.current);carResultsApplyingTimer.current=undefined;setCarResultsApplying(false);return()=>{if(carResultsApplyingTimer.current)clearTimeout(carResultsApplyingTimer.current);};},[plan.plan?.key]);
  const filterGroups=useMemo(()=>visibleCarFilterGroups(results,pricePerDay),[pricePerDay,results]);
  const quickGroups=useMemo(()=>carQuickFilterGroupIds.flatMap(id=>{const group=filterGroups.find(candidate=>candidate.id===id);return group?[group]:[];}),[filterGroups]);
  const copy=useMemo(()=>carFilterCopy(locale),[locale]);
  const filtered=useMemo(()=>{const ranked=sortCarResults(filterCarResults(results,filters,pricePerDay),sort);return sort==="recommended"?ensureCarProviderCoverage(ranked):ranked;},[results,filters,pricePerDay,sort]);
  const carBadges=useMemo(()=>assignCarBadges(results,pricePerDay),[results,pricePerDay]);
  const payload=plan.plan?.payload||{};
  const canonicalPickupLocation=String(payload.pickupLocation||"");
  const carSummaryDestination=getLocationFieldDisplay(canonicalPickupLocation).primary;
  const carSummarySecondary=formatCarResultsScheduleSummary({pickupDate:String(payload.pickupDate||""),pickupTime:String(payload.pickupTime||""),dropoffDate:String(payload.dropoffDate||""),dropoffTime:String(payload.dropoffTime||""),locale});
  const carSummaryCompact=formatCompactCarResultsScheduleSummary({pickupDate:String(payload.pickupDate||""),pickupTime:String(payload.pickupTime||""),dropoffDate:String(payload.dropoffDate||""),dropoffTime:String(payload.dropoffTime||""),locale})||carSummarySecondary;
  const edit=()=>setCarEditSearchOpen(true);
  const applyEditedSearch=useCallback((next:Record<string,string>)=>{
    const update=carResultsRouteUpdate(next);
    const nextPlan = buildSearchPlan("car", update).plan;
    if (nextPlan && nextPlan.key !== plan.plan?.key) {
      journeyEvents.workflowDecision("SEARCH_EDIT_APPLIED", resultsRequestId, "/car-results", {
        editFields: nativeChangedJourneySearchFields("CAR", params, update),
      });
    }
    setFilters({}); currentFiltersRef.current={}; setSort("recommended"); setQuickSheetKind(null); setFilterSheetVisible(false);
    setStatus("loading"); setMessage(""); scrollCarResultsToTop();
    if(nextPlan?.key===plan.plan?.key) setRetry(value=>value+1);
    else router.setParams(update);
  },[params,plan.plan?.key,resultsRequestId,scrollCarResultsToTop]);
  const startCarResultsTransition=()=>{if(carResultsApplyingTimer.current)clearTimeout(carResultsApplyingTimer.current);setCarResultsApplying(true);scrollCarResultsToTop();carResultsApplyingTimer.current=setTimeout(()=>setCarResultsApplying(false),NATIVE_FILTER_RESULTS_TRANSITION_MS);};
  const changeCarFilters=(next:SelectedCarFilters)=>{carFilterSessionDirtyRef.current=true;currentFiltersRef.current=next;setFilters(next);};
  const openAllFilters=()=>{carFilterSessionDirtyRef.current=false;setFilterSheetVisible(true);};
  const openQuickFilter=(groupId:string)=>{carFilterSessionDirtyRef.current=false;setQuickSheetKind(groupId);};
  const closeFilterSheet=()=>setFilterSheetVisible(false);
  const completeCarFilterSession=()=>{closeFilterSheet();if(carFilterSessionDirtyRef.current){carFilterSessionDirtyRef.current=false;journeyEvents.workflowDecision("SEARCH_FILTER_APPLIED",resultsRequestId,"/car-results",{filterGroup:"all",filterSelections:carJourneyFilterSelections(currentFiltersRef.current)});startCarResultsTransition();}};
  const clearFilters=()=>{setFilters({});startCarResultsTransition();};
  const listData=status==="ready"&&!carResultsApplying?filtered:[];
  useFocusEffect(useCallback(() => {
    const recordDisplayedResults = () => {
      if (AppState.currentState !== "active" || displayPending || displayUnavailable) return;
      if (status !== "ready" && status !== "empty") return;
      recordNativeResultsPage("car", resultsRequestId);
      if (status === "ready") journeyEvents.resultsViewed(resultsRequestId, "/car-results", listData.length);
    };
    recordDisplayedResults();
    const subscription = AppState.addEventListener("change", state => { if (state === "active") recordDisplayedResults(); });
    return () => subscription.remove();
  }, [displayPending, displayUnavailable, listData.length, recordNativeResultsPage, resultsRequestId, status]));
  const listHeader=<>{message?<Text accessibilityRole="alert" style={[r.notice,{backgroundColor:theme.surface,color:theme.textPrimary,borderColor:theme.dark?theme.border:"#D8E1EC"}]}>{message}</Text>:null}{status==="ready"?<View accessibilityLabel="Car results summary" style={[r.carResultsSummaryRow, viewportWidth < 360 && r.carResultsSummaryRowNarrow]}>
    {!carResultsApplying?<Text accessibilityRole="header" numberOfLines={1} style={[r.carResultCount,{color:theme.textPrimary}]}>{carResultCountLabel(filtered.length)}</Text>:null}
  </View>:null}</>;
  const listEmpty=status==="empty"?<Empty title="No rental cars found" body="Try changing your dates, pickup location, or filters." retry={clearFilters} retryLabel="Clear filters" edit={edit}/>:status==="error"?<Empty title="Car search could not be completed" body={message||"Check your connection and try again."} retry={()=>setRetry((value)=>value+1)} edit={edit}/>:status==="ready"&&carResultsApplying?<CarSkeletons/>:status==="ready"&&!filtered.length?<Empty title="No cars match these filters" body="Clear filters to see the available rental cars." retry={clearFilters} retryLabel="Clear filters" edit={edit}/>:null;
  return <SafeAreaView style={[r.safe,{backgroundColor:headerSurfaceColor}]} edges={[]}>
    <View style={{flex:1}} pointerEvents={status==="loading"?"none":"auto"} importantForAccessibility={status==="loading"?"no-hide-descendants":"auto"}>
    <View style={[r.carHeaderBackdrop,{backgroundColor:carCanvasColor}]}>
      <View style={[r.carHeaderSurface,{backgroundColor:headerSurfaceColor,borderBottomColor:theme.dark?theme.border:"#D8E1EC"}]}>
        <CarResultsHeader destination={carSummaryDestination} secondaryLine={carSummaryCompact} onEdit={edit} backgroundColor={headerSurfaceColor}/>
        <View style={[r.carFilterSectionHeader,{backgroundColor:headerSurfaceColor}]}><ScrollView horizontal style={r.filterRail} showsHorizontalScrollIndicator={false} alwaysBounceHorizontal={false} bounces={false} overScrollMode="never" contentContainerStyle={r.filters}>
      <CarResultsShortcut label="Filter" accessibilityLabel="Filters" count={activeCarFilterCount(filters)||undefined} icon showChevron={false} expanded={filterSheetVisible} onPress={openAllFilters}/>
      <CarResultsShortcut label={sort === "recommended" ? "Sort" : sort === "lowestTotal" ? "Total price" : "Top rated"} accessibilityLabel={`Sort, ${sort === "recommended" ? "Recommended" : sort === "lowestTotal" ? "Total price" : "Top rated"}`} expanded={quickSheetKind === "sort"} onPress={()=>openQuickFilter("sort")}/>
      {quickGroups.map(group=><CarResultsShortcut key={group.id} label={carFilterGroupLabel(copy,group)} count={filters[group.id]?.length||undefined} expanded={quickSheetKind===group.id} onPress={()=>openQuickFilter(group.id)}/>)}
        </ScrollView></View>
      </View>
    </View>
    {/* Render the complete bounded result set in the first virtualized batch.
        UIKit then receives the final contentSize before scrolling begins, while
        image prefetching stays independently limited to the first few assets. */}
    <FlatList ref={carScrollRef} style={{backgroundColor:carCanvasColor}} onViewableItemsChanged={presentationDiagnostics.onViewableItemsChanged} data={listData} keyExtractor={result=>result.id} renderItem={({item,index})=><View style={r.carResultCardSlot}><CarResultCard result={item} rank={index} badge={carBadges.get(item.id)} imageUri={resolveNativeCarImageUri(item.imageUrl)} searchParams={payload} resultBackgroundColor={carCanvasColor} plan={plan.plan} priceAlertsAvailable={availability.priceAlerts} journeyRequestId={resultsRequestId}/></View>} ItemSeparatorComponent={CarResultItemSeparator} ListHeaderComponent={listHeader} ListEmptyComponent={listEmpty} initialNumToRender={CAR_RESULT_RENDER_BATCH_SIZE} maxToRenderPerBatch={CAR_RESULT_RENDER_BATCH_SIZE} windowSize={CAR_RESULT_WINDOW_SIZE} updateCellsBatchingPeriod={CAR_RESULT_BATCHING_PERIOD_MS} removeClippedSubviews={Platform.OS === "android"} showsVerticalScrollIndicator={true} automaticallyAdjustsScrollIndicatorInsets={false} scrollIndicatorInsets={carResultsScrollIndicatorInsets} alwaysBounceVertical={false} bounces={false} overScrollMode="never" keyboardShouldPersistTaps="handled" contentContainerStyle={[r.body,{paddingBottom:Math.max(insets.bottom + 64,64)}]}/>
    </View>
    {status==="loading"?<View style={StyleSheet.absoluteFill}><NativeBrandedSearchLoading product="car" includeTopInset={false}/></View>:null}
    <CarFilterSheet visible={filterSheetVisible} results={results} filters={filters} pricePerDay={pricePerDay} onChange={changeCarFilters} onClose={completeCarFilterSession}/>
    {quickSheetKind ? <CarResultsQuickFilterSheet key={quickSheetKind} kind={quickSheetKind} results={results} filters={filters} pricePerDay={pricePerDay} sort={sort} onApplyFilters={(next)=>{changeCarFilters(next);}} onApplySort={(next)=>{if(next!==sort){journeyEvents.workflowDecision("SEARCH_SORT_CHANGED",resultsRequestId,"/car-results",{sortMode: normalizeJourneySortMode(next), sortChoice: normalizeJourneySortChoice(next)});setSort(next);startCarResultsTransition();}}} onClose={()=>{setQuickSheetKind(null);if(carFilterSessionDirtyRef.current){carFilterSessionDirtyRef.current=false;journeyEvents.workflowDecision("SEARCH_FILTER_APPLIED",resultsRequestId,"/car-results",{filterGroup:"all",filterSelections:carJourneyFilterSelections(currentFiltersRef.current)});startCarResultsTransition();}}}/> : null}
    <CarEditSearchModal visible={carEditSearchOpen} params={params} onClose={()=>setCarEditSearchOpen(false)} onSubmitSearch={applyEditedSearch}/>
  </SafeAreaView>;
}

function CarResultsShortcut({label,accessibilityLabel,count,icon=false,showChevron=true,expanded,onPress}:{label:string;accessibilityLabel?:string;count?:number;icon?:boolean;showChevron?:boolean;expanded:boolean;onPress:()=>void}) {
  const {theme}=useAppTheme(); const active=Boolean(count);
  const foreground=theme.dark?theme.textPrimary:"#142033"; const chevron=theme.dark?theme.textSecondary:"#64748B"; const border=theme.dark?theme.border:"#D8E1EC"; const surface=theme.dark?theme.surface:"#FFFFFF"; const countBackground=theme.dark?theme.background:"#F1F5F9";
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel??label} accessibilityState={{expanded,selected:active}} onPress={onPress} style={r.shortcutTouchTarget}>{({pressed})=><View style={[r.shortcut,{backgroundColor:pressed&&!theme.dark?"#F8FAFC":surface,borderColor:border}]}>{icon?<SlidersHorizontal accessible={false} size={16} strokeWidth={2.2} color={foreground}/>:null}<Text numberOfLines={1} style={[r.shortcutLabel,{color:foreground}]}>{label}</Text>{count?<View style={[r.shortcutCount,{backgroundColor:countBackground}]}><Text style={[r.shortcutCountText,{color:foreground}]}>{count}</Text></View>:null}{showChevron?<ChevronDown accessible={false} size={13} strokeWidth={1.9} color={chevron} style={expanded?r.shortcutChevronExpanded:undefined}/>:null}</View>}</Pressable>;
}

function CarResultsHeader({destination,secondaryLine,onEdit,backgroundColor}:{destination:string;secondaryLine:string;onEdit:()=>void;backgroundColor:string}) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  return <View accessibilityLabel="Car search summary" style={[r.carHeader,{backgroundColor,paddingLeft:Math.max(insets.left+6,6),paddingRight:Math.max(insets.right+10,10)}]}>
    <View style={r.carHeaderMainRow}>
      <View style={r.carHeaderSide}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={()=>router.back()} style={({pressed})=>[r.carHeaderBack,pressed&&r.carHeaderControlPressed]}>
          <DetailGlassSurface dark={false} variant="hotelLight" style={r.carHeaderBackGlass}/>
          <ArrowLeft size={25} strokeWidth={2} color="#0F172A"/>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Edit car search. ${destination}. ${secondaryLine}`} onPress={onEdit} style={({pressed})=>[r.carSummaryCard,{backgroundColor:theme.surface,borderColor:theme.dark?theme.border:"#D8E1EC"},pressed&&r.carSummaryCardPressed]}>
        <View style={r.carSummaryText}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={[r.carSummaryDestination,{color:theme.textPrimary}]}>{destination}</Text>
          <Text numberOfLines={1} ellipsizeMode="tail" style={[r.carSummarySecondary,{color:theme.textSecondary}]}>{secondaryLine}</Text>
        </View>
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={r.carSummaryEditSlot}>
          <DetailGlassSurface dark={false} variant="hotelLight" style={r.carSummaryEditGlass}/>
          <SquarePen size={16} strokeWidth={2.2} color="#0F172A"/>
        </View>
      </Pressable>
    </View>
  </View>;
}

function CarResultItemSeparator(){return <View style={r.carResultItemSeparator}/>;}
function CarSkeletons(){const {theme}=useAppTheme();return <View accessibilityRole="progressbar" accessibilityState={{busy:true}} accessibilityLabel="Updating car results" style={r.skeletonGroup}><View style={r.foundSkeleton}/>{[0,1,2].map((key)=><View key={key} style={[r.skeleton,r.carResultCardSlot,{backgroundColor:theme.surface,borderColor:theme.dark?theme.border:"#D8E1EC"}]}><View style={r.skeletonImage}/><View style={r.skeletonLines}><View style={r.skeletonLine}/><View style={[r.skeletonLine,{width:"65%"}]}/><View style={[r.skeletonLine,{width:"82%"}]}/></View></View>)}</View>;}
const r=StyleSheet.create({safe:{flex:1},carHeader:{paddingTop:12,paddingBottom:8},carHeaderBackdrop:{width:"100%"},carHeaderSurface:{borderBottomLeftRadius:28,borderBottomRightRadius:0,borderBottomWidth:StyleSheet.hairlineWidth,overflow:"hidden"},carHeaderMainRow:{width:"100%",flexDirection:"row",alignItems:"center",gap:6},carHeaderSide:{width:44,flexShrink:0},carHeaderBack:{width:44,height:44,alignItems:"center",justifyContent:"center",shadowColor:"#0F172A",shadowOffset:{width:0,height:2},shadowOpacity:0.12,shadowRadius:6,elevation:6},carHeaderBackGlass:{position:"absolute",left:2,right:2,top:2,bottom:2,borderRadius:20},carHeaderControlPressed:{opacity:0.55},carSummaryCard:{flex:1,minWidth:0,minHeight:62,borderWidth:1,borderRadius:13,flexDirection:"row",alignItems:"center",overflow:"hidden"},carSummaryCardPressed:{opacity:0.76},carSummaryText:{flex:1,minWidth:0,justifyContent:"center",paddingLeft:14,paddingVertical:9},carSummaryDestination:{fontSize:14,lineHeight:18,fontWeight:"700",fontFamily:appFonts.bold},carSummarySecondary:{marginTop:3,fontSize:10.5,lineHeight:14,fontWeight:"500",fontFamily:appFonts.medium},carSummaryEditSlot:{width:44,height:44,flexShrink:0,alignItems:"center",justifyContent:"center"},carSummaryEditGlass:{position:"absolute",left:4,right:4,top:4,bottom:4,borderRadius:18},carFilterSectionHeader:{paddingTop:8,paddingBottom:8},filterRail:{height:44,flexGrow:0,flexShrink:0},filters:{paddingLeft:12,paddingRight:16,gap:6,alignItems:"center",flexWrap:"nowrap"},shortcutTouchTarget:{minWidth:44,minHeight:44,justifyContent:"center"},shortcut:{height:36,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:4,borderWidth:1,borderRadius:9,paddingHorizontal:10},shortcutLabel:{fontSize:13,lineHeight:16,fontWeight:"600",fontFamily:appFonts.semibold},shortcutCount:{minWidth:20,height:20,borderRadius:10,paddingHorizontal:6,alignItems:"center",justifyContent:"center"},shortcutCountText:{fontSize:11,lineHeight:14,fontWeight:"600",fontFamily:appFonts.semibold},shortcutChevronExpanded:{transform:[{rotate:"180deg"}]},body:{paddingHorizontal:14},carResultCardSlot:{marginHorizontal:0},carResultItemSeparator:{height:14},notice:{borderWidth:1,borderRadius:10,padding:12},carResultsSummaryRow:{marginTop:8,marginBottom:2,minHeight:32,paddingHorizontal:8,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},carResultsSummaryRowNarrow:{paddingHorizontal:4},carResultCount:{fontSize:12,lineHeight:16,fontWeight:"600",fontFamily:appFonts.semibold},sort:{minHeight:44,flexDirection:"row",alignItems:"center",gap:5,paddingHorizontal:2},sortPrefix:{fontSize:11,color:ui.muted},sortValue:{fontSize:14,color:ui.navy},skeletonGroup:{gap:14},foundSkeleton:{height:44,borderRadius:12,backgroundColor:"#EEF1F6"},skeleton:{height:216,borderRadius:13,borderWidth:1,overflow:"hidden",flexDirection:"row"},skeletonImage:{width:"40%",backgroundColor:"#EEF1F6"},skeletonLines:{flex:1,padding:16,gap:15},skeletonLine:{height:13,borderRadius:6,backgroundColor:"#EEF1F6",width:"90%"}});
