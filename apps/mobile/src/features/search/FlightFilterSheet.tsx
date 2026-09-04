import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { FlightResult } from "../../api/travelApi";
import { useAppTheme } from "../../theme/AppTheme";
import { formatCurrency } from "../currency/displayCurrency";
import { AirlineLogo } from "./AirlineLogo";
import { FlightRangeSlider } from "./FlightRangeSlider";
import { Button, ui } from "./SearchUi";
import {
  activeFlightFilterCount,
  emptyFlightFilters,
  flightFilterInsight,
  isPriceFilteringAvailable,
  journeyKey,
  matchingFlightCount,
  withAirlinePreview,
  withAirportPreview,
  withStopsPreview,
  withTimePreview,
  type FlightFilterInsight,
  type FlightFilterOptions,
  type FlightFilters,
  type NumericRange,
  type TimeBucket,
} from "./flightFilters";
import { clampNumericRange, priceRangeStep } from "./flightRange";
import { FlightResultsSheetShell, type FlightResultsCompactMenuFrame } from "./FlightResultsSheetShell";

export type FlightFilterSectionName = "all" | "stops" | "airlines" | "airports";
const windows: {value:TimeBucket;label:string}[]=[{value:"overnight",label:"12:00 AM – 5:59 AM"},{value:"morning",label:"6:00 AM – 11:59 AM"},{value:"afternoon",label:"12:00 PM – 5:59 PM"},{value:"evening",label:"6:00 PM – 11:59 PM"}];
export const formatFlightDuration=(v:number)=>{const n=Math.max(0,Math.round(v)),h=Math.floor(n/60),m=n%60;return h?(m?`${h}h ${m}m`:`${h}h`):`${m}m`};
export const formatFlightFilterInsight=(insight:FlightFilterInsight,currency:string)=>insight.count===0?"No matching flights":`${insight.lowestPrice==null?"":`From ${formatCurrency(insight.lowestPrice,currency)} · `}${insight.count} ${insight.count===1?"flight":"flights"}`;

export function FlightFilterSection({title,actions,children,compact=false}:{title:string;actions?:React.ReactNode;children:React.ReactNode;compact?:boolean}){
 const {theme}=useAppTheme();
 return <View style={[s.section,compact&&s.compactSection]}><View style={[s.sectionHead,compact&&s.compactSectionHead]}><Text style={[s.sectionTitle,compact&&s.compactSectionTitle,{color:theme.textPrimary}]}>{title}</Text>{actions}</View>{children}</View>;
}

type Props={visible:boolean;section:FlightFilterSectionName;filters:FlightFilters;options:FlightFilterOptions;results:readonly FlightResult[];priceValue?:(r:FlightResult)=>number|null;currency:string;priceFilteringReady:boolean;onChange:(f:FlightFilters)=>void;onClose:()=>void};

export function FlightFilterSheet({visible,section,filters,options,results,priceValue,currency,priceFilteringReady,onChange,onClose}:Props){
 const {theme}=useAppTheme();const [dragging,setDragging]=useState(false),[tab,setTab]=useState(0);
 useEffect(()=>{if(visible){setDragging(false);setTab(0)}},[visible]);
 const count=useMemo(()=>matchingFlightCount(results,filters,priceValue),[results,filters,priceValue]);
 const logos=useMemo(()=>results.reduce((m,r)=>{if(r.airlineLogo&&!m.has(r.airlineName))m.set(r.airlineName,r.airlineLogo);return m},new Map<string,string>()),[results]);
 const legs=useMemo(()=>{const sample=results.find(r=>r.legs?.length),structured=sample?.legs?.filter(l=>["outbound","return","leg"].includes(l.direction))??[],first=results[0];return structured.length?structured:(first?[{direction:"outbound" as const,originAirport:first.originAirport,destinationAirport:first.destinationAirport,departureTime:first.departureTime,arrivalTime:first.arrivalTime,duration:first.duration,durationMinutes:first.durationMinutes,stops:first.stops,layovers:first.layovers,segments:[]}]:[])},[results]);
 const leg=legs[tab],key=leg?journeyKey(leg,tab):"outbound",selection=filters.journeyTimes[key]??{departure:[],arrival:[]};
 const full=section==="all";
 const compactFrame:FlightResultsCompactMenuFrame|undefined=full?undefined:section==="airlines"?{width:244}:section==="stops"?{width:220}:{width:268};
 const toggle=(field:"airlines"|"fromAirports"|"toAirports",value:string)=>onChange({...filters,[field]:filters[field].includes(value)?filters[field].filter(v=>v!==value):[...filters[field],value]});
 const toggleTime=(field:"departure"|"arrival",value:TimeBucket)=>{const group=filters.journeyTimes[key]??{departure:[],arrival:[]},selected=group[field];onChange({...filters,journeyTimes:{...filters.journeyTimes,[key]:{...group,[field]:selected.includes(value)?selected.filter(v=>v!==value):[...selected,value]}}})};
 const slider=(field:"maximumPrice"|"maximumDuration",range:NumericRange,label:string,format:(v:number)=>string,step:number)=>{const selected=clampNumericRange({min:range.min,max:filters[field]??range.max},range);return <><Text style={[s.value,{color:theme.textPrimary}]}>{field==="maximumPrice"?`Up to ${format(selected.max)}`:format(selected.max)}</Text><FlightRangeSlider available={range} selected={selected} step={step} singleMaximum accessibilityLabel={label} formatValue={format} onDragStateChange={setDragging} onChange={v=>onChange({...filters,[field]:v.max})}/></>};
 const insightPriceValue=priceFilteringReady?priceValue:undefined,insightCurrency=options.priceCurrency??currency;
 const insights=useMemo(()=>{const get=(candidate:FlightFilters)=>formatFlightFilterInsight(flightFilterInsight(results,candidate,insightPriceValue),insightCurrency);return {
  stops:new Map<FlightFilters["maxStops"],string>(([null,0,1,2] as const).map(value=>[value,get(withStopsPreview(filters,value))])),
  airlines:new Map(options.airlines.map(name=>[name,get(withAirlinePreview(filters,name))])),
  fromAirports:new Map(options.fromAirports.map(airport=>[airport,get(withAirportPreview(filters,"fromAirports",airport))])),
  toAirports:new Map(options.toAirports.map(airport=>[airport,get(withAirportPreview(filters,"toAirports",airport))])),
  time:Object.fromEntries(legs.flatMap((candidateLeg,index)=>{const candidateKey=journeyKey(candidateLeg,index);return (["departure","arrival"] as const).flatMap(field=>windows.map(window=>[`${candidateKey}:${field}:${window.value}`,get(withTimePreview(filters,candidateKey,field,window.value))]))})),
  baggage:get({...filters,baggageIncluded:true}),refundable:get({...filters,refundable:true})
 }},[results,filters,insightPriceValue,insightCurrency,options.airlines,options.fromAirports,options.toAirports,legs]);
 const close=()=>{setDragging(false);onClose()};
 const row=(field:"fromAirports"|"toAirports",v:string)=><Check key={field+v} label={v} detail={insights[field].get(v)} selected={filters[field].includes(v)} compact={!full} onPress={()=>toggle(field,v)}/>;
 const title=section==="airlines"?"Airlines":section==="stops"?"Stops":section==="airports"?"Airports":"Filter flights";
 const activeCount=activeFlightFilterCount(filters,options);

 return <FlightResultsSheetShell
  visible={visible}
  title={full?"Filters":title}
  subtitle={full?(activeCount?`${activeCount} applied`:"All flights shown"):undefined}
  fullScreen={full}
  compactMenu={compactFrame}
  closeLabel="Close flight filters"
  onClose={close}
  headerAction={full&&activeCount>0?<Pressable accessibilityRole="button" accessibilityLabel="Clear all flight filters" onPress={()=>onChange(emptyFlightFilters())} style={s.reset}><Text style={s.action}>Clear all</Text></Pressable>:undefined}
  footer={full?<View style={s.footerActions}><Pressable accessibilityRole="button" accessibilityState={{disabled:activeCount===0}} disabled={activeCount===0} onPress={()=>onChange(emptyFlightFilters())} style={s.footerClear}><Text style={[s.footerClearText,activeCount===0&&s.disabled]}>Clear all</Text></Pressable><View style={s.footerPrimary}><Button label="Done" flightResults onPress={()=>{setDragging(false);onClose()}}/></View></View>:undefined}
 >
 <ScrollView style={s.scroll} scrollEnabled={!dragging} contentContainerStyle={full?s.content:s.compactContent} showsVerticalScrollIndicator={false}>
 {full&&isPriceFilteringAvailable(options,priceFilteringReady)&&<FlightFilterSection title="Price">{slider("maximumPrice",options.price!,"Maximum price",v=>formatCurrency(v,options.priceCurrency??currency),priceRangeStep(options.price!.min,options.price!.max))}</FlightFilterSection>}
 {full&&legs.length>0&&<FlightFilterSection title="Flight times">{legs.length>1&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{legs.map((l,i)=><Text accessibilityRole="tab" key={journeyKey(l,i)} onPress={()=>setTab(i)} style={[s.tab,{color:tab===i?ui.blue:theme.textSecondary,borderBottomColor:tab===i?ui.blue:"transparent"}]}>{l.direction==="outbound"?"Departing flight":l.direction==="return"?"Return flight":`Flight ${(l.legIndex??i)+1}`}</Text>)}</ScrollView>}<Text style={[s.subhead,{color:theme.textPrimary}]}>Departs from {leg.originAirport}</Text>{windows.map(w=><Check key={'d'+w.value} label={w.label} detail={insights.time[`${key}:departure:${w.value}`]} selected={selection.departure.includes(w.value)} onPress={()=>toggleTime("departure",w.value)}/>)}<Text style={[s.subhead,{color:theme.textPrimary}]}>Arrives to {leg.destinationAirport}</Text>{windows.map(w=><Check key={'a'+w.value} label={w.label} detail={insights.time[`${key}:arrival:${w.value}`]} selected={selection.arrival.includes(w.value)} onPress={()=>toggleTime("arrival",w.value)}/>)}</FlightFilterSection>}
 {full&&options.duration&&<FlightFilterSection title="Duration"><View><Text style={[s.control,{color:theme.textPrimary}]}>Maximum travel time</Text>{slider("maximumDuration",options.duration,"Maximum travel time",formatFlightDuration,5)}</View></FlightFilterSection>}
 {(full||section==="stops")&&<FlightFilterSection title="Stops" compact={!full}>{([{v:null,l:"Any"},{v:0,l:"Direct only"},{v:1,l:"Max 1 stop per flight"},{v:2,l:"Max 2 stops per flight"}] as const).map(x=><Radio key={String(x.v)} label={x.l} detail={insights.stops.get(x.v)} selected={filters.maxStops===x.v} compact={!full} onPress={()=>onChange({...filters,maxStops:x.v,stops:undefined})}/>)}</FlightFilterSection>}
 {(full||section==="airlines")&&<FlightFilterSection title="Airlines" compact={!full} actions={full?<View style={s.actions}><Text onPress={()=>onChange({...filters,airlines:[]})} style={s.action}>Select all</Text><Text onPress={()=>onChange({...filters,airlines:[]})} style={s.action}>Reset</Text></View>:undefined}>{options.airlines.map(name=><Check key={name} label={name} detail={insights.airlines.get(name)} logo={<AirlineLogo airlineName={name} logoUrl={logos.get(name)}/>} selected={full?(!filters.airlines.length||filters.airlines.includes(name)):filters.airlines.includes(name)} compact={!full} onPress={()=>{if(!full){toggle("airlines",name);return;}const chosen=filters.airlines.length?filters.airlines:options.airlines;onChange({...filters,airlines:chosen.includes(name)?chosen.filter(v=>v!==name):[...chosen,name]})}}/>)}</FlightFilterSection>}
 {(full||section==="airports")&&(options.fromAirports.length>0||options.toAirports.length>0)&&<FlightFilterSection title="Airports" compact={!full}>{options.fromAirports.length>0&&<><Text style={[s.subhead,compactFrame&&s.compactSubhead,{color:theme.textPrimary}]}>From</Text>{options.fromAirports.map(v=>row("fromAirports",v))}</>}{options.toAirports.length>0&&<><Text style={[s.subhead,compactFrame&&s.compactSubhead,{color:theme.textPrimary}]}>To</Text>{options.toAirports.map(v=>row("toAirports",v))}</>}</FlightFilterSection>}
 {full&&(options.baggage||options.refundable)&&<FlightFilterSection title="Amenities">{options.baggage&&<Check label="Baggage included" detail={insights.baggage} selected={filters.baggageIncluded} onPress={()=>onChange({...filters,baggageIncluded:!filters.baggageIncluded})}/>} {options.refundable&&<Check label="Flexible / refundable" detail={insights.refundable} selected={filters.refundable} onPress={()=>onChange({...filters,refundable:!filters.refundable})}/>}</FlightFilterSection>}
 </ScrollView>
 </FlightResultsSheetShell>;
}

function Check({label,detail,selected,logo,compact=false,onPress}:{label:string;detail?:string;selected:boolean;logo?:React.ReactNode;compact?:boolean;onPress:()=>void}){
 const {theme}=useAppTheme();
 return <Pressable accessibilityLabel={detail?`${label}, ${detail}`:label} accessibilityRole="checkbox" accessibilityState={{checked:selected}} onPress={onPress} style={({pressed})=>[s.row,compact&&s.compactRow,compact&&selected&&{backgroundColor:theme.dark?"#142B55":"#F7FAFF"},pressed&&s.pressed]}>{logo}<View style={s.rowCopy}><Text style={[s.rowText,compact&&s.compactRowText,{color:compact&&selected?(theme.dark?"#8FB5FF":"#004BB8"):theme.textPrimary}]}>{label}</Text>{detail&&<Text numberOfLines={1} style={[s.rowInsight,{color:theme.textSecondary}]}>{detail}</Text>}</View><View style={[s.box,{borderColor:selected?ui.blue:theme.border,backgroundColor:selected?ui.blue:"transparent"}]}>{selected&&<Text style={s.check}>✓</Text>}</View></Pressable>;
}

function Radio({label,detail,selected,compact=false,onPress}:{label:string;detail?:string;selected:boolean;compact?:boolean;onPress:()=>void}){
 const {theme}=useAppTheme();
 return <Pressable accessibilityLabel={detail?`${label}, ${detail}`:label} accessibilityRole="radio" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.row,compact&&s.compactRow,compact&&selected&&{backgroundColor:theme.dark?"#142B55":"#F7FAFF"},pressed&&s.pressed]}><View style={s.rowCopy}><Text style={[s.rowText,compact&&s.compactRowText,{color:compact&&selected?(theme.dark?"#8FB5FF":"#004BB8"):theme.textPrimary}]}>{label}</Text>{detail&&<Text numberOfLines={1} style={[s.rowInsight,{color:theme.textSecondary}]}>{detail}</Text>}</View><View style={[s.radio,{borderColor:selected?ui.blue:theme.border}]}>{selected&&<View style={s.dot}/>}</View></Pressable>;
}

const s=StyleSheet.create({
 reset:{minWidth:44,minHeight:44,alignItems:"center",justifyContent:"center",paddingHorizontal:8},
 pressed:{opacity:.7},
 action:{color:ui.blue,fontSize:12,fontWeight:"700"},
 actions:{flexDirection:"row",gap:4},
 scroll:{flexShrink:1},
 content:{paddingHorizontal:20,paddingVertical:16,gap:24},
 compactContent:{padding:0,gap:0},
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
 box:{width:20,height:20,borderWidth:1.5,borderRadius:4,alignItems:"center",justifyContent:"center"},
 check:{color:"white",fontWeight:"900"},
 radio:{width:21,height:21,borderWidth:2,borderRadius:11,alignItems:"center",justifyContent:"center"},
 dot:{width:11,height:11,borderRadius:6,backgroundColor:ui.blue},
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
 footerPrimary:{flex:1},
});
