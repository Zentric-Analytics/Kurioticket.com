import { useState, type Dispatch, type SetStateAction } from "react";
import { BlurView } from "expo-blur";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Check, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { convertAmount, formatCurrency, type ExchangeRates } from "../currency/displayCurrency";
import { FlightRangeSlider } from "./FlightRangeSlider";
import { ui } from "./SearchUi";
import type { HotelFilterOptions, HotelFilters, HotelStarRating } from "./hotelFilters";

export type HotelResultsQuickFilterKind = "price" | "stars" | "amenities";
type Props={kind:HotelResultsQuickFilterKind;filters:HotelFilters;options:HotelFilterOptions;displayCurrency:string;rates:ExchangeRates;stayNights:number;onChange:Dispatch<SetStateAction<HotelFilters>>;onClose:()=>void};

export function HotelResultsQuickFilterSheet({kind,filters,options,displayCurrency,rates,stayNights,onChange,onClose}:Props){
 const {theme}=useAppTheme(),inset=useSafeAreaInsets(),{height}=useWindowDimensions(),price=options.price;
 const visibleCurrency=displayCurrency==="USD"||convertAmount(1,"USD",displayCurrency,rates)!==null?displayCurrency:"USD";
 const toDisplay=(usd:number)=>convertAmount(usd,"USD",visibleCurrency,rates)??usd;
 const fromDisplay=(value:number)=>convertAmount(value,visibleCurrency,"USD",rates);
 const initialMin=filters.minimumPrice??price?.minimum??0,initialMax=filters.maximumPrice??price?.maximum??0;
 const [range,setRange]=useState({min:initialMin,max:initialMax});
 const [minimumText,setMinimumText]=useState(String(Math.round(toDisplay(initialMin))));
 const [maximumText,setMaximumText]=useState(String(Math.round(toDisplay(initialMax))));
 const [stars,setStars]=useState<HotelStarRating[]>([...filters.starRatings]);
 const [facilities,setFacilities]=useState<string[]>([...filters.facilities]);
 const title=kind==="price"?"Total price":kind==="stars"?"Hotel class":"Amenities";
 const subtitle=kind==="price"?`Estimated total for ${stayNights} ${stayNights===1?"night":"nights"}`:"Choose one or more options";
 const syncText=(next:{min:number;max:number})=>{setRange(next);setMinimumText(String(Math.round(toDisplay(next.min))));setMaximumText(String(Math.round(toDisplay(next.max))));};
 const commitText=(edge:"min"|"max",text:string)=>{if(!price||!text.trim())return syncText(range);const parsed=Number(text);if(!Number.isFinite(parsed))return syncText(range);const usd=fromDisplay(parsed);if(usd===null||!Number.isFinite(usd))return syncText(range);syncText(edge==="min"?{min:Math.min(Math.max(price.minimum,usd),range.max),max:range.max}:{min:range.min,max:Math.max(Math.min(price.maximum,usd),range.min)});};
 const reset=()=>{if(kind==="price"&&price)syncText({min:price.minimum,max:price.maximum});else if(kind==="stars")setStars([]);else setFacilities([]);};
 const apply=()=>{onChange(current=>kind==="price"&&price?{...current,minimumPrice:range.min<=price.minimum?null:range.min,maximumPrice:range.max>=price.maximum?null:range.max}:kind==="stars"?{...current,starRatings:stars}:{...current,facilities});onClose();};
 const toggleStar=(star:HotelStarRating)=>setStars(current=>(current.includes(star)?current.filter(value=>value!==star):[...current,star]).sort((a,b)=>b-a) as HotelStarRating[]);
 const toggleFacility=(value:string)=>setFacilities(current=>current.includes(value)?current.filter(item=>item!==value):[...current,value]);
 return <Modal visible transparent animationType="slide" presentationStyle="overFullScreen" onRequestClose={onClose} accessibilityViewIsModal>
  <View style={styles.overlay} onAccessibilityEscape={onClose}>
   <BlurView pointerEvents="none" intensity={10} tint="default" experimentalBlurMethod={Platform.OS==="android"?"dimezisBlurView":undefined} style={StyleSheet.absoluteFill}/>
   <Pressable accessible={false} onPress={onClose} style={[StyleSheet.absoluteFill,styles.backdropScrim]}/>
   <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":"height"} style={styles.bottom} pointerEvents="box-none">
    <View style={[styles.sheet,{maxHeight:Math.min(height*.76,620),backgroundColor:theme.background}]}>
     <View style={[styles.header,{backgroundColor:theme.surface,borderBottomColor:theme.border}]}><View style={styles.copy}><Text accessibilityRole="header" style={[styles.title,{color:theme.textPrimary}]}>{title}</Text><Text style={[styles.subtitle,{color:theme.textSecondary}]}>{subtitle}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose} style={styles.close}><X size={22} color={theme.icon}/></Pressable></View>
     <ScrollView style={styles.body} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={kind==="amenities"}>
      {kind==="price"&&price?<View style={[styles.priceCard,{backgroundColor:theme.surface,borderColor:theme.border}]}><Text style={[styles.help,{color:theme.textSecondary}]}>Estimated total for {stayNights} {stayNights===1?"night":"nights"}.</Text><View style={styles.inputs}><PriceInput label="Minimum" value={minimumText} onChange={setMinimumText} onEnd={()=>commitText("min",minimumText)}/><PriceInput label="Maximum" value={maximumText} onChange={setMaximumText} onEnd={()=>commitText("max",maximumText)}/></View><FlightRangeSlider available={{min:price.minimum,max:price.maximum}} selected={range} step={25} accessibilityLabel="Estimated stay total range" formatValue={value=>formatCurrency(toDisplay(value),visibleCurrency)} onChange={syncText}/><View style={styles.endpoints}><Text style={{color:theme.textSecondary}}>{formatCurrency(toDisplay(range.min),visibleCurrency)}</Text><Text style={{color:theme.textSecondary}}>{formatCurrency(toDisplay(range.max),visibleCurrency)}</Text></View></View>:null}
      {kind==="stars"?([5,4,3,2,1] as HotelStarRating[]).filter(star=>options.starCounts[star]>0).map(star=><Choice key={star} label={`${star}-star hotel`} count={options.starCounts[star]} selected={stars.includes(star)} onPress={()=>toggleStar(star)}/>):null}
      {kind==="amenities"?(options.facilities.length?options.facilities.map(option=><Choice key={option.value} label={option.label} count={option.count} selected={facilities.includes(option.value)} onPress={()=>toggleFacility(option.value)}/>):<Text style={[styles.empty,{color:theme.textSecondary}]}>No amenities available for this search.</Text>):null}
     </ScrollView>
     <View style={[styles.footer,{backgroundColor:theme.surface,borderTopColor:theme.border,paddingBottom:Math.max(inset.bottom,12)}]}><Pressable accessibilityRole="button" onPress={reset} style={[styles.reset,{borderColor:theme.border}]}><Text style={[styles.buttonText,{color:theme.textPrimary}]}>Reset</Text></Pressable><Pressable accessibilityRole="button" onPress={apply} style={styles.apply}><Text style={[styles.buttonText,{color:"white"}]}>Apply</Text></Pressable></View>
    </View>
   </KeyboardAvoidingView>
  </View>
 </Modal>;
}
function PriceInput({label,value,onChange,onEnd}:{label:string;value:string;onChange:(v:string)=>void;onEnd:()=>void}){const {theme}=useAppTheme();return <View style={styles.inputColumn}><Text style={[styles.inputLabel,{color:theme.textSecondary}]}>{label}</Text><TextInput accessibilityLabel={`${label} estimated stay total`} keyboardType="decimal-pad" value={value} onChangeText={onChange} onBlur={onEnd} onSubmitEditing={onEnd} style={[styles.input,{color:theme.textPrimary,borderColor:theme.border,backgroundColor:theme.background}]}/></View>}
function Choice({label,count,selected,onPress}:{label:string;count:number;selected:boolean;onPress:()=>void}){const {theme}=useAppTheme();return <Pressable accessibilityRole="checkbox" accessibilityState={{checked:selected}} onPress={onPress} style={[styles.choice,{backgroundColor:selected?"rgba(37, 99, 235, 0.06)":theme.surface,borderColor:selected?ui.blue:theme.border}]}><Text style={[styles.choiceLabel,{color:selected?ui.blue:theme.textPrimary}]}>{label}</Text><Text style={[styles.count,{color:theme.textSecondary}]}>{count}</Text>{selected?<Check size={18} color={ui.blue}/>:null}</Pressable>}
const styles=StyleSheet.create({overlay:{flex:1,justifyContent:"flex-end"},backdropScrim:{backgroundColor:"rgba(15, 23, 42, 0.35)"},bottom:{justifyContent:"flex-end"},sheet:{width:"100%",borderTopLeftRadius:24,borderTopRightRadius:24,overflow:"hidden",shadowColor:"#0F172A",shadowOpacity:.2,shadowRadius:18,elevation:16},header:{minHeight:76,paddingLeft:20,paddingRight:10,flexDirection:"row",alignItems:"center",borderBottomWidth:StyleSheet.hairlineWidth},copy:{flex:1},title:{fontSize:18,fontFamily:appFonts.bold,fontWeight:"700"},subtitle:{fontSize:12,lineHeight:18,fontFamily:appFonts.medium},close:{width:44,height:44,alignItems:"center",justifyContent:"center"},body:{flexShrink:1},content:{padding:16,gap:10},priceCard:{borderWidth:StyleSheet.hairlineWidth,borderRadius:14,padding:16},help:{fontSize:13,marginBottom:14,fontFamily:appFonts.medium},inputs:{flexDirection:"row",gap:10,marginBottom:12},inputColumn:{flex:1},inputLabel:{fontSize:12,fontFamily:appFonts.semibold,marginBottom:5},input:{height:44,borderWidth:1,borderRadius:8,paddingHorizontal:10,fontFamily:appFonts.medium},endpoints:{flexDirection:"row",justifyContent:"space-between"},choice:{minHeight:52,borderWidth:1,borderRadius:12,paddingHorizontal:14,flexDirection:"row",alignItems:"center",gap:10},choiceLabel:{flex:1,fontSize:14,fontFamily:appFonts.semibold},count:{fontSize:13,fontFamily:appFonts.medium},empty:{paddingVertical:20,textAlign:"center",fontFamily:appFonts.medium},footer:{flexDirection:"row",gap:10,paddingHorizontal:16,paddingTop:12,borderTopWidth:StyleSheet.hairlineWidth},reset:{minWidth:116,height:49,borderWidth:1,borderRadius:12,alignItems:"center",justifyContent:"center"},apply:{flex:1,height:49,borderRadius:12,backgroundColor:ui.blue,alignItems:"center",justifyContent:"center"},buttonText:{fontSize:15,fontFamily:appFonts.bold,fontWeight:"700"}});
