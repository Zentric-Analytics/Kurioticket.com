import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { ui } from "./SearchUi";
import { FlightResultsSheetShell } from "./FlightResultsSheetShell";
import type { FlightSort } from "./flightFilters";

const options:{value:FlightSort;label:string;description:string}[]=[{value:"best",label:"Best",description:"Best balance of price and journey time"},{value:"price",label:"Cheapest",description:"Lowest total price"},{value:"duration",label:"Fastest",description:"Shortest total journey"}];
export function FlightSortSheet({visible,sort,onApply,onClose}:{visible:boolean;sort:FlightSort;onApply:(sort:FlightSort)=>void;onClose:()=>void}){
 const {theme}=useAppTheme(),[draft,setDraft]=useState<FlightSort>(sort);
 useEffect(()=>{if(visible)setDraft(sort)},[visible,sort]);
 return <FlightResultsSheetShell visible={visible} title="Sort flights" subtitle="Choose how results are ordered" closeLabel="Close sort options" onClose={onClose} footer={<View style={s.actions}><Pressable accessibilityRole="button" onPress={()=>setDraft("best")} style={[s.reset,{borderColor:theme.border}]}><Text style={[s.buttonText,{color:theme.textPrimary}]}>Reset</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>onApply(draft)} style={s.apply}><Text style={[s.buttonText,{color:"white"}]}>Apply</Text></Pressable></View>}>
  <ScrollView contentContainerStyle={s.options}>{options.map(option=>{const selected=draft===option.value;return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{selected}} onPress={()=>setDraft(option.value)} style={s.option}><View style={[s.radio,{borderColor:selected?ui.blue:theme.border}]}>{selected?<View style={s.dot}/>:null}</View><View style={s.copy}><Text style={[s.label,{color:theme.textPrimary}]}>{option.label}</Text><Text style={[s.description,{color:theme.textSecondary}]}>{option.description}</Text></View></Pressable>})}</ScrollView>
 </FlightResultsSheetShell>;
}
const s=StyleSheet.create({options:{padding:16,gap:4},option:{minHeight:56,flexDirection:"row",alignItems:"center",gap:12,paddingHorizontal:4},radio:{width:22,height:22,borderRadius:11,borderWidth:2,alignItems:"center",justifyContent:"center"},dot:{width:10,height:10,borderRadius:5,backgroundColor:ui.blue},copy:{flex:1},label:{fontSize:15,fontFamily:appFonts.semibold,fontWeight:"600"},description:{fontSize:12,lineHeight:18,fontFamily:appFonts.medium},actions:{flex:1,flexDirection:"row",gap:10},reset:{minWidth:116,height:49,borderWidth:1,borderRadius:12,alignItems:"center",justifyContent:"center"},apply:{flex:1,height:49,borderRadius:12,backgroundColor:ui.blue,alignItems:"center",justifyContent:"center"},buttonText:{fontSize:15,fontFamily:appFonts.bold,fontWeight:"700"}});
