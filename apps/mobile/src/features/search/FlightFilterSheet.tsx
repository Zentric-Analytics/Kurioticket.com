import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { FlightResult } from "../../api/travelApi";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { formatCurrency } from "../currency/displayCurrency";
import { FlightRangeSlider } from "./FlightRangeSlider";
import { ui } from "./SearchUi";
import {
  activeFlightFilterCount,
  emptyFlightFilters,
  flightFilterInsight,
  flightTimeMinutes,
  isPriceFilteringAvailable,
  journeyKey,
  matchingFlightCount,
  withAirlinePreview,
  withAirportPreview,
  withStopsPreview,
  type FlightFilterInsight,
  type FlightFilterOptions,
  type FlightFilters,
  type NumericRange,
  type StopBucket,
} from "./flightFilters";
import { clampNumericRange, priceRangeStep } from "./flightRange";
import { FlightResultsSheetShell } from "./FlightResultsSheetShell";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { flightResultsUiCopy } from "./flightResultsSummary";

export type FlightFilterSectionName = "all" | "stops" | "airlines" | "airports";
export const formatFlightTime=(minutes:number)=>{const value=Math.max(0,Math.min(1439,Math.round(minutes))),hours=Math.floor(value/60),mins=value%60,suffix=hours>=12?"PM":"AM",clock=hours%12||12;return `${clock}:${String(mins).padStart(2,"0")} ${suffix}`};
export const formatFlightDuration=(v:number)=>{const n=Math.max(0,Math.round(v)),h=Math.floor(n/60),m=n%60;return h?(m?`${h}h ${m}m`:`${h}h`):`${m}m`};
export function FlightFilterSection({title,actions,children,compact=false}:{title:string;actions?:React.ReactNode;children:React.ReactNode;compact?:boolean}){
 const {theme}=useAppTheme();
 return <View style={[s.section,compact&&s.compactSection]}><View style={[s.sectionHead,compact&&s.compactSectionHead]}><Text style={[s.sectionTitle,compact&&s.compactSectionTitle,{color:theme.textPrimary}]}>{title}</Text>{actions}</View>{children}</View>;
}

type Props={visible:boolean;section:FlightFilterSectionName;filters:FlightFilters;options:FlightFilterOptions;results:readonly FlightResult[];priceValue?:(r:FlightResult)=>number|null;currency:string;priceFilteringReady:boolean;onChange:(f:FlightFilters)=>void;onClose:()=>void;onComplete:()=>void};

export function FlightFilterSheet({visible,section,filters,options,results,priceValue,currency,priceFilteringReady,onChange,onClose,onComplete}:Props){
 const {theme}=useAppTheme();const {locale}=useMobileLocalization();const copy=flightResultsUiCopy(locale);const full=section==="all";const [draft,setDraft]=useState(filters),[dragging,setDragging]=useState(false),[tab,setTab]=useState(0),[timeMode,setTimeMode]=useState<"departure"|"arrival">("departure"),[airlineSearch,setAirlineSearch]=useState(""),[showAllAirlines,setShowAllAirlines]=useState(false);
 useEffect(()=>{if(visible){setDraft(filters);setDragging(false);setTab(0);setTimeMode("departure");setAirlineSearch("");setShowAllAirlines(false)}},[visible]);
 const working=full?filters:draft;
 const update=(next:FlightFilters)=>full?onChange(next):setDraft(next);
 const count=useMemo(()=>matchingFlightCount(results,working,priceValue),[results,working,priceValue]);
 const legs=useMemo(()=>{const sample=results.find(r=>r.legs?.length),structured=sample?.legs?.filter(l=>["outbound","return","leg"].includes(l.direction))??[],first=results[0];return structured.length?structured:(first?[{direction:"outbound" as const,originAirport:first.originAirport,destinationAirport:first.destinationAirport,departureTime:first.departureTime,arrivalTime:first.arrivalTime,duration:first.duration,durationMinutes:first.durationMinutes,stops:first.stops,layovers:first.layovers,segments:[]}]:[])},[results]);
 const leg=legs[tab],key=leg?journeyKey(leg,tab):"outbound";
 const timeBounds=useMemo(()=>{const values:{departure:number[];arrival:number[]}={departure:[],arrival:[]};for(const result of results){const candidates=result.legs?.filter(l=>["outbound","return","leg"].includes(l.direction))??[];const candidate=candidates.find((l,i)=>journeyKey(l,i)===key)??(key==="outbound"?result:undefined);if(!candidate)continue;const departure=flightTimeMinutes(candidate.departureTime),arrival=flightTimeMinutes(candidate.arrivalTime);if(departure!=null)values.departure.push(departure);if(arrival!=null)values.arrival.push(arrival)}const range=(v:number[])=>v.length?{min:Math.min(...v),max:Math.max(...v)}:null;return {departure:range(values.departure),arrival:range(values.arrival)}},[results,key]);
 const selectedTime=working.journeyTimeMaximums?.[key]?.[timeMode]??timeBounds[timeMode]?.max??null;
 const toggle=(field:"airlines"|"fromAirports"|"toAirports",value:string)=>update({...working,[field]:working[field].includes(value)?working[field].filter(v=>v!==value):[...working[field],value]});
 const toggleStop=(value:StopBucket)=>{const selected=working.stops??[];update({...working,maxStops:null,stops:selected.includes(value)?selected.filter(v=>v!==value):[...selected,value]})};
 const slider=(field:"maximumPrice"|"maximumDuration",range:NumericRange,label:string,format:(v:number)=>string,step:number)=>{const selected=clampNumericRange({min:range.min,max:working[field]??range.max},range);return <><View style={s.endpoints}><Text style={{color:theme.textSecondary}}>{format(range.min)}</Text><Text style={{color:theme.textSecondary}}>{format(range.max)}</Text></View><FlightRangeSlider available={range} selected={selected} step={step} singleMaximum accessibilityLabel={label} formatValue={format} onDragStateChange={setDragging} onChange={v=>update({...working,[field]:v.max})}/><Text style={[s.value,{color:theme.textPrimary}]}>{field==="maximumPrice"?`${copy.upTo} ${format(selected.max)}`:format(selected.max)}</Text></>};
 const insightPriceValue=priceFilteringReady?priceValue:undefined,insightCurrency=options.priceCurrency??currency;
 const insights=useMemo(()=>{const get=(candidate:FlightFilters)=>flightFilterInsight(results,candidate,insightPriceValue);return {
  stops:new Map<StopBucket,FlightFilterInsight>((["nonstop","one","twoPlus"] as const).map(value=>[value,get(withStopsPreview(working,value))])), airlines:new Map(options.airlines.map(name=>[name,get(withAirlinePreview(working,name))])), fromAirports:new Map(options.fromAirports.map(airport=>[airport,get(withAirportPreview(working,"fromAirports",airport))])), toAirports:new Map(options.toAirports.map(airport=>[airport,get(withAirportPreview(working,"toAirports",airport))]))
 }},[results,working,insightPriceValue,insightCurrency,options.airlines,options.fromAirports,options.toAirports]);
 const close=()=>{setDragging(false);onClose()};
 const countLabel=copy.flightCount;
 const row=(field:"fromAirports"|"toAirports",v:string)=>{const insight=insights[field].get(v);return <Check key={field+v} label={v} trailing={insight?String(insight.count):undefined} accessibilityDetail={insight?countLabel(insight.count):undefined} selected={working[field].includes(v)} compact={!full} onPress={()=>toggle(field,v)}/>};
 const title=section==="airlines"?copy.airlines:section==="stops"?copy.stops:section==="airports"?copy.airports:copy.filterFlights;
 const activeCount=activeFlightFilterCount(working,options);
 const searchedAirlines=options.airlines.filter(name=>!airlineSearch.trim()||name.toLowerCase().includes(airlineSearch.trim().toLowerCase())||working.airlines.includes(name));
 const visibleAirlines=airlineSearch.trim()||showAllAirlines?searchedAirlines:searchedAirlines.slice(0,5);
 const quickSubtitle=section==="airlines"?copy.chooseAirlines:section==="stops"?copy.chooseStops:copy.chooseAirports;
 const resetQuick=()=>setDraft(section==="airlines"?{...working,airlines:[]}:section==="stops"?{...working,maxStops:null,stops:[]}:{...working,fromAirports:[],toAirports:[]});
 const footerLabel=count===0?copy.noFilterTitle:copy.viewFlights(count);

 return <FlightResultsSheetShell
  visible={visible}
  title={full?copy.filters:title}
  subtitle={full?(activeCount?copy.appliedCount(activeCount):copy.allFlightsShown):quickSubtitle}
  fullScreen={full}
  closeLabel={copy.closeFilters}
  onClose={close}
  headerAction={full&&activeCount?<Pressable accessibilityRole="button" accessibilityLabel={copy.clearAll} onPress={()=>onChange(emptyFlightFilters())} style={s.headerClear}><Text style={s.footerClearText}>{copy.clearAll}</Text></Pressable>:undefined}
  footer={full?<Pressable accessibilityRole="button" accessibilityState={{disabled:count===0}} disabled={count===0} onPress={()=>{setDragging(false);onComplete()}} style={[s.viewButton,count===0&&s.viewButtonDisabled]}><Text style={s.viewText}>{footerLabel}</Text></Pressable>:<View style={s.footerActions}><Pressable accessibilityRole="button" onPress={resetQuick} style={[s.reset,{borderColor:theme.border}]}><Text style={[s.buttonText,{color:theme.textPrimary}]}>{copy.reset}</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>{onChange(draft);onClose()}} style={s.apply}><Text style={[s.buttonText,{color:"white"}]}>{copy.apply}</Text></Pressable></View>}
 >
 <ScrollView style={full?s.fullScroll:s.quickScroll} scrollEnabled={!dragging} contentContainerStyle={full?s.content:s.compactContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
 {full&&isPriceFilteringAvailable(options,priceFilteringReady)&&<FlightFilterSection title={copy.price}>{slider("maximumPrice",options.price!,copy.maximumPrice,v=>formatCurrency(v,options.priceCurrency??currency),priceRangeStep(options.price!.min,options.price!.max))}</FlightFilterSection>}
 {full&&legs.length>0&&<FlightFilterSection title={copy.flightTimes}>{legs.length>1&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{legs.map((l,i)=><Text accessibilityRole="tab" key={journeyKey(l,i)} onPress={()=>setTab(i)} style={[s.tab,{color:tab===i?ui.blue:theme.textSecondary,borderBottomColor:tab===i?ui.blue:"transparent"}]}>{l.direction==="outbound"?copy.departingFlight:l.direction==="return"?copy.returnFlight:copy.flightNumber((l.legIndex??i)+1)}</Text>)}</ScrollView>}<View style={[s.timeSwitch,{backgroundColor:theme.dark?theme.background:"#F1F5F9"}]}>{(["departure","arrival"] as const).map(mode=><Pressable key={mode} onPress={()=>setTimeMode(mode)} style={[s.timeSwitchButton,timeMode===mode&&{backgroundColor:theme.surface}]}><Text style={[s.timeSwitchText,{color:timeMode===mode?ui.blue:theme.textSecondary}]}>{mode==="departure"?copy.takeoff:copy.landing}</Text></Pressable>)}</View>{timeBounds[timeMode]?<View><View style={s.timeLabel}><Text style={[s.control,{color:theme.textSecondary}]}>{timeMode==="departure"?copy.takeoffFrom(leg.originAirport):copy.landingAt(leg.destinationAirport)}</Text><Text style={[s.value,{color:theme.textPrimary}]}>{formatFlightTime(selectedTime ?? timeBounds[timeMode]!.max)}</Text></View><FlightRangeSlider available={timeBounds[timeMode]!} selected={{min:timeBounds[timeMode]!.min,max:selectedTime!}} step={15} singleMaximum accessibilityLabel={timeMode==="departure"?copy.takeoff:copy.landing} formatValue={formatFlightTime} onDragStateChange={setDragging} onChange={value=>{const current=working.journeyTimeMaximums?.[key]??{departure:null,arrival:null};update({...working,journeyTimeMaximums:{...(working.journeyTimeMaximums??{}),[key]:{...current,[timeMode]:value.max===timeBounds[timeMode]!.max?null:value.max}}})}}/></View>:null}</FlightFilterSection>}
 {full&&options.duration&&<FlightFilterSection title={copy.duration}><View><Text style={[s.control,{color:theme.textPrimary}]}>{copy.maximumTravelTime}</Text>{slider("maximumDuration",options.duration,copy.maximumTravelTime,formatFlightDuration,5)}</View></FlightFilterSection>}
 {(full||section==="stops")&&<FlightFilterSection title={copy.stops} compact={!full}>{([{v:"nonstop",l:copy.nonstop},{v:"one",l:copy.oneStop},{v:"twoPlus",l:copy.twoStops}] as const).map(x=>{const insight=insights.stops.get(x.v);return <Check key={x.v} label={x.l} secondary={insight?countLabel(insight.count):undefined} trailing={insight?.lowestPrice==null?undefined:copy.fromPrice(formatCurrency(insight.lowestPrice,insightCurrency))} selected={working.stops?.includes(x.v)??false} compact={!full} onPress={()=>toggleStop(x.v)}/>})}</FlightFilterSection>}
 {(full||section==="airlines")&&<FlightFilterSection title={copy.airlines} compact={!full}><TextInput accessibilityLabel={copy.searchAirlines} placeholder={copy.searchAirlines} placeholderTextColor={theme.textSecondary} value={airlineSearch} onChangeText={setAirlineSearch} style={[s.search,{color:theme.textPrimary,backgroundColor:theme.surface,borderColor:theme.border}]}/>{visibleAirlines.map(name=>{const insight=insights.airlines.get(name);return <Check key={name} label={name} trailing={insight?String(insight.count):undefined} accessibilityDetail={insight?countLabel(insight.count):undefined} selected={working.airlines.includes(name)} compact={!full} onPress={()=>toggle("airlines",name)}/>})}{!airlineSearch.trim()&&options.airlines.length>5?<Pressable accessibilityRole="button" onPress={()=>setShowAllAirlines(x=>!x)} style={s.showMore}><Text style={s.footerClearText}>{showAllAirlines?copy.showLess:copy.showMore}</Text></Pressable>:null}</FlightFilterSection>}
 {(full||section==="airports")&&(options.fromAirports.length>0||options.toAirports.length>0)&&<FlightFilterSection title={copy.airports} compact={!full}>{options.fromAirports.length>0&&<><Text style={[s.subhead,{color:theme.textPrimary}]}>{copy.from}</Text>{options.fromAirports.map(v=>row("fromAirports",v))}</>}{options.toAirports.length>0&&<><Text style={[s.subhead,{color:theme.textPrimary}]}>{copy.to}</Text>{options.toAirports.map(v=>row("toAirports",v))}</>}</FlightFilterSection>}
 {full&&(options.baggage||options.refundable)&&<FlightFilterSection title={copy.farePreferences}>{options.baggage&&<Check label={copy.baggageIncluded} selected={working.baggageIncluded} onPress={()=>update({...working,baggageIncluded:!working.baggageIncluded})}/>} {options.refundable&&<Check label={copy.flexibleRefundable} selected={working.refundable} onPress={()=>update({...working,refundable:!working.refundable})}/>}</FlightFilterSection>}
 </ScrollView>
 </FlightResultsSheetShell>;
}

function Check({label,secondary,trailing,accessibilityDetail,selected,logo,compact=false,onPress}:{label:string;secondary?:string;trailing?:string;accessibilityDetail?:string;selected:boolean;logo?:React.ReactNode;compact?:boolean;onPress:()=>void}){
 const {theme}=useAppTheme();
 const detail=accessibilityDetail??[secondary,trailing].filter(Boolean).join(", ");
 return <Pressable accessibilityLabel={detail?`${label}, ${detail}`:label} accessibilityRole="checkbox" accessibilityState={{checked:selected}} onPress={onPress} style={({pressed})=>[s.row,compact&&s.compactRow,compact&&selected&&{backgroundColor:theme.dark?"#142B55":"#F7FAFF"},pressed&&s.pressed]}><View style={[s.box,{borderColor:selected?ui.blue:theme.border,backgroundColor:selected?ui.blue:"transparent"}]}>{selected&&<Text style={s.check}>✓</Text>}</View>{logo}<View style={s.rowCopy}><Text style={[s.rowText,compact&&s.compactRowText,{color:compact&&selected?(theme.dark?"#8FB5FF":"#004BB8"):theme.textPrimary}]}>{label}</Text>{secondary&&<Text style={[s.rowInsight,{color:theme.textSecondary}]}>{secondary}</Text>}</View>{trailing&&<Text numberOfLines={1} style={[s.rowTrailing,{color:theme.textSecondary}]}>{trailing}</Text>}</Pressable>;
}

const s=StyleSheet.create({
 pressed:{opacity:.7},
 fullScroll:{flex:1},
 quickScroll:{flexShrink:1},
 content:{paddingHorizontal:24,paddingTop:16,paddingBottom:32,gap:24},
 compactContent:{padding:16,gap:10},
 section:{gap:5},
 compactSection:{gap:2},
 sectionHead:{minHeight:28,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
 compactSectionHead:{minHeight:34,paddingHorizontal:10},
 sectionTitle:{fontSize:15,fontWeight:"800"},
 compactSectionTitle:{fontSize:13,fontWeight:"700"},
 row:{minHeight:46,flexDirection:"row",alignItems:"center",gap:10},
 compactRow:{minHeight:44,borderRadius:9,paddingHorizontal:10,gap:8},
 rowCopy:{flex:1,minWidth:0},
 rowText:{fontSize:13,fontWeight:"500"},
 compactRowText:{fontSize:14,fontWeight:"600"},
 rowInsight:{fontSize:11,lineHeight:14,marginTop:1},
 rowTrailing:{flexShrink:0,maxWidth:"42%",marginLeft:2,textAlign:"right",fontSize:12,lineHeight:16,fontVariant:["tabular-nums"]},
 box:{width:20,height:20,flexShrink:0,borderWidth:1.5,borderRadius:4,alignItems:"center",justifyContent:"center"},
 check:{color:"white",fontWeight:"900"},
 timeSwitch:{flexDirection:"row",padding:4,borderRadius:999,marginTop:3},
 timeSwitchButton:{flex:1,minHeight:34,borderRadius:999,alignItems:"center",justifyContent:"center"},
 timeSwitchText:{fontSize:12,fontWeight:"800"},
 timeLabel:{marginTop:9,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},
 tabs:{gap:16},
 tab:{paddingVertical:9,borderBottomWidth:2,fontSize:12,fontWeight:"700"},
 subhead:{fontSize:13,fontWeight:"700",marginTop:7},
 compactSubhead:{paddingHorizontal:10,marginTop:4,marginBottom:2,fontSize:11},
 control:{fontSize:12,fontWeight:"600",marginTop:3},
 value:{fontSize:14,fontWeight:"800",marginTop:3},
 footerActions:{flexDirection:"row",alignItems:"center",gap:14},
 footerClear:{minWidth:88,minHeight:50,alignItems:"center",justifyContent:"center"},
 footerClearText:{color:ui.blue,fontSize:14,fontWeight:"700"},
 disabled:{opacity:.4},
 viewButton:{width:"100%",minHeight:50,borderRadius:10,backgroundColor:ui.blue,alignItems:"center",justifyContent:"center"},
 viewButtonDisabled:{opacity:.45},
 viewText:{color:"white",fontSize:16,lineHeight:22,fontWeight:"700",fontFamily:appFonts.bold},
 endpoints:{flexDirection:"row",justifyContent:"space-between"}, search:{height:44,borderWidth:1,borderRadius:10,paddingHorizontal:12,marginVertical:6}, showMore:{minHeight:44,justifyContent:"center",alignSelf:"flex-start"}, headerClear:{minHeight:44,justifyContent:"center",paddingHorizontal:8}, reset:{minWidth:116,height:49,borderWidth:1,borderRadius:12,alignItems:"center",justifyContent:"center"}, apply:{flex:1,height:49,borderRadius:12,backgroundColor:ui.blue,alignItems:"center",justifyContent:"center"}, buttonText:{fontSize:15,fontWeight:"700"},
});