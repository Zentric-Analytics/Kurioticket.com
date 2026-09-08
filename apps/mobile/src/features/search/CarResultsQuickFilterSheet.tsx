import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import type { CarResult } from "../../api/travelApi";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import type { CarSort, SelectedCarFilters } from "../../../../../src/lib/cars/carResults";
import { FLIGHT_FILTER_LIGHT_CANVAS, FLIGHT_FILTER_LIGHT_OUTLINE, FlightResultsSheetShell } from "./FlightResultsSheetShell";
import { visibleCarFilterGroups } from "./CarFilterSheet";
import { carFilterCopy, carFilterGroupLabel, carFilterOptionLabel } from "./carFilterCopy";
import { NATIVE_FILTER_SELECTION_FEEDBACK_MS } from "./filterResultsTransition";
import { ui } from "./SearchUi";

type Kind = "sort" | string;
type Props = { kind: Kind; results: CarResult[]; filters: SelectedCarFilters; sort: CarSort; onApplyFilters: (filters: SelectedCarFilters) => void; onApplySort: (sort: CarSort) => void; onClose: () => void };
const sortOptions: Array<{value:CarSort;label:string;description:string}> = [{value:"recommended",label:"Recommended",description:"Best overall value first"},{value:"lowestTotal",label:"Total price",description:"Lowest rental total first"},{value:"topRated",label:"Top rated",description:"Highest supplier rating first"}];

export function CarResultsQuickFilterSheet({kind,results,filters,sort,onApplyFilters,onApplySort,onClose}:Props){
 const {theme}=useAppTheme(); const {locale,direction}=useMobileLocalization(); const copy=useMemo(()=>carFilterCopy(locale),[locale]);
 const group=useMemo(()=>visibleCarFilterGroups(results).find(item=>item.id===kind),[results,kind]);
 const [draft,setDraft]=useState<string[]>(kind==="sort"?[]:[...(filters[kind]??[])]); const [draftSort,setDraftSort]=useState<CarSort>(sort);
 const [updating,setUpdating]=useState(false); const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]); const mark=()=>{if(timer.current)clearTimeout(timer.current);setUpdating(true);timer.current=setTimeout(()=>setUpdating(false),NATIVE_FILTER_SELECTION_FEEDBACK_MS);};
 const title=kind==="sort"?"Sort":group?carFilterGroupLabel(copy,group):copy.filters; const reset=()=>{mark();if(kind==="sort")setDraftSort("recommended");else setDraft([]);};
 const apply=()=>{if(kind==="sort")onApplySort(draftSort);else onApplyFilters({...filters,[kind]:draft});onClose();};
 const outline=theme.dark?theme.border:FLIGHT_FILTER_LIGHT_OUTLINE,canvas=theme.dark?theme.background:FLIGHT_FILTER_LIGHT_CANVAS;
 const footer=<View style={styles.footer}><Pressable accessibilityRole="button" onPress={reset} style={[styles.reset,{borderColor:outline}]}><Text style={[styles.buttonText,{color:theme.textPrimary}]}>Reset</Text></Pressable><Pressable accessibilityRole="button" disabled={updating} onPress={apply} style={styles.apply}>{updating?<View style={styles.updating}><ActivityIndicator size="small" color="white"/><Text style={[styles.buttonText,{color:"white"}]}>{copy.updatingFilters}</Text></View>:<Text style={[styles.buttonText,{color:"white"}]}>Apply</Text>}</Pressable></View>;
 return <FlightResultsSheetShell visible title={title} closeLabel={copy.close} onClose={onClose} insetFlightQuickSheet flightFilterAppearance quickBackdropVariant="flight" footer={footer}><ScrollView style={[styles.body,{backgroundColor:canvas}]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{kind==="sort"?<View accessibilityRole="radiogroup">{sortOptions.map(option=>{const selected=draftSort===option.value;return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{selected}} onPress={()=>{mark();setDraftSort(option.value);}} style={styles.sortRow}><View style={styles.copy}><Text style={[styles.label,{color:theme.textPrimary}]}>{option.label}</Text><Text style={[styles.description,{color:theme.textSecondary}]}>{option.description}</Text></View>{selected?<Check size={17} color={ui.blue}/>:null}</Pressable>})}</View>:group?.options.map(option=>{const selected=draft.includes(option.id);return <Pressable key={option.id} accessibilityRole="checkbox" accessibilityState={{checked:selected}} accessibilityLabel={`${carFilterOptionLabel(copy,option)}, ${option.count}`} onPress={()=>{mark();setDraft(current=>current.includes(option.id)?current.filter(value=>value!==option.id):[...current,option.id]);}} style={[styles.row,direction==="rtl"&&styles.rtl]}><View style={[styles.box,{borderColor:selected?ui.blue:outline,backgroundColor:selected?ui.blue:"transparent"}]}>{selected?<Check size={14} strokeWidth={3} color="white"/>:null}</View><Text style={[styles.label,{color:theme.textPrimary,textAlign:direction==="rtl"?"right":"left",writingDirection:direction}]}>{carFilterOptionLabel(copy,option)}</Text><Text style={[styles.count,{color:theme.textSecondary}]}>{option.count}</Text></Pressable>} )}</ScrollView></FlightResultsSheetShell>;
}
const styles=StyleSheet.create({body:{flexShrink:1},content:{padding:16},footer:{flexDirection:"row",gap:10},reset:{minWidth:116,height:49,borderWidth:1,borderRadius:12,alignItems:"center",justifyContent:"center"},apply:{flex:1,height:49,borderRadius:12,backgroundColor:ui.blue,alignItems:"center",justifyContent:"center"},buttonText:{fontSize:15,fontWeight:"700",fontFamily:appFonts.bold},updating:{flexDirection:"row",alignItems:"center",gap:8},row:{minHeight:52,paddingHorizontal:10,flexDirection:"row",alignItems:"center",gap:10},rtl:{flexDirection:"row-reverse"},box:{width:20,height:20,borderRadius:4,borderWidth:1.5,alignItems:"center",justifyContent:"center"},label:{flex:1,fontSize:14,lineHeight:20,fontWeight:"600",fontFamily:appFonts.semibold},count:{fontSize:13,fontFamily:appFonts.medium},sortRow:{minHeight:52,flexDirection:"row",alignItems:"center",paddingHorizontal:10,paddingVertical:7},copy:{flex:1,minWidth:0},description:{fontSize:10.5,lineHeight:14,fontFamily:appFonts.medium}});
