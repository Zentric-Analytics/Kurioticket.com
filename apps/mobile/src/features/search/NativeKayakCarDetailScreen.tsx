import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { ArrowLeft, BriefcaseBusiness, CarFront, DoorOpen, ExternalLink, MapPin, Users } from "lucide-react-native";
import { travelApi, type CarResult } from "../../api/travelApi";
import { getApiBaseUrl } from "../../config/apiUrl";
import { appFonts } from "../../theme/typography";
import { colors } from "../../theme/tokens";
import { useAppTheme } from "../../theme/AppTheme";
import { formatMarketCurrency } from "../currency/displayCurrency";
import { buildSearchPlan, safeCanonicalCarResult } from "../flow/travelSearchModel";
import { carResultsDismissCount } from "./carDetailReturnNavigation";
import { primaryValidCarOffer } from "./carDetailState";
import { isKayakSandboxCar, nativeCarPrimarySpecLabels } from "./nativeCarProviderPresentation";
import { sandboxBookingUrl } from "../../../../../src/services/travel/kayakSandboxPublic";

type Params = Record<string, string | string[]>;
type Status = "loading" | "ready" | "unavailable";
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]:value;
const parseResult=(value?:string)=>{try{return value?JSON.parse(value) as CarResult:undefined;}catch{return undefined;}};
const resolveImage=(value?:string)=>{if(!value)return undefined;if(/^https:\/\//i.test(value))return value;const base=getApiBaseUrl();return base.ok&&/^\/(?!\/)/.test(value)?new URL(value,`${base.baseUrl}/`).toString():undefined;};

export function NativeKayakCarDetailScreen(){
  const params=useLocalSearchParams<Params>();
  const plan=useMemo(()=>buildSearchPlan("car",params),[JSON.stringify(params)]);
  const supplied=parseResult(one(params.result));
  const initial=supplied&&isKayakSandboxCar(supplied)&&safeCanonicalCarResult(supplied)?supplied:undefined;
  const[result,setResult]=useState<CarResult|undefined>(initial);
  const[status,setStatus]=useState<Status>(initial?"ready":"loading");
  useEffect(()=>{if(initial){setResult(initial);setStatus("ready");return;}const resultId=one(params.resultId);if(!plan.plan||!resultId){setStatus("unavailable");return;}let active=true;void travelApi.searchCars(plan.plan.payload).then(response=>{if(!active)return;const found=response.results.find(item=>item.id===resultId&&isKayakSandboxCar(item)&&safeCanonicalCarResult(item));setResult(found);setStatus(found?"ready":"unavailable");}).catch(()=>active&&setStatus("unavailable"));return()=>{active=false;};},[initial?.id,plan.plan?.key,one(params.resultId)]);
  if(status==="loading")return <KayakCarDetailLoading/>;
  if(!result)return <KayakCarUnavailable/>;
  return <KayakCarDetailContent result={result} params={params}/>;
}

function KayakCarDetailContent({result,params}:{result:CarResult;params:Params}){
  const{theme}=useAppTheme();
  const insets=useSafeAreaInsets();
  const navigation=useNavigation();
  const offer=useMemo(()=>primaryValidCarOffer(result.offers),[result.offers]);
  const specs=nativeCarPrimarySpecLabels(result);
  const image=resolveImage(result.imageUrl);
  const sandboxHref=sandboxBookingUrl(offer?.bookingUrl);
  const carResultsStack=one(params.carResultsStack)==="1";
  const search={pickupLocation:String(one(params.pickupLocation)||result.pickupLocation),dropoffLocation:String(one(params.dropoffLocation)||result.returnLocation),pickupDate:String(one(params.pickupDate)||""),pickupTime:String(one(params.pickupTime)||""),dropoffDate:String(one(params.dropoffDate)||""),dropoffTime:String(one(params.dropoffTime)||""),driverAge:String(one(params.driverAge)||"")};
  const returnToResults=()=>{if(carResultsStack){const dismissCount=carResultsDismissCount(navigation.getState());if(dismissCount){router.dismiss(dismissCount);return;}}router.replace({pathname:"/car-results",params:search});};
  const canvas=theme.dark?theme.background:"#F5F7FB";
  const accent=theme.dark?"#8FB5FF":colors.blue;
  const informationSurface=theme.dark?theme.surface:"#CBD5E1";
  const providerName=offer?.bookingProviderName||result.rentalCompanyName||"KAYAK sandbox";
  return <SafeAreaView style={[s.safe,{backgroundColor:canvas}]} edges={["top"]}>
    <View style={[s.backHeader,{backgroundColor:canvas}]}><Pressable accessibilityRole="button" accessibilityLabel="Back to Cars results" onPress={returnToResults} style={s.backLink}><ArrowLeft size={18} color={accent}/><Text style={[s.backText,{color:accent}]}>Back to Cars results</Text></Pressable></View>
    <ScrollView style={{backgroundColor:canvas}} contentContainerStyle={{paddingBottom:Math.max(insets.bottom+24,24)}}>
      <View style={[s.card,{borderColor:theme.border,backgroundColor:informationSurface}]}>
        <View style={[s.imagePanel,{backgroundColor:theme.surface}]}>{image?<Image source={{uri:image}} resizeMode="cover" style={s.image} accessibilityLabel={result.imageAlt||result.modelName}/>:<View style={s.imageUnavailable}><CarFront size={48} color={theme.textSecondary}/><Text style={{color:theme.textSecondary}}>Vehicle image unavailable</Text></View>}</View>
        <View style={s.information}>
          <Text style={s.sandboxLabel}>KAYAK sandbox · Simulated · Not bookable</Text>
          <Text accessibilityRole="header" style={[s.title,{color:theme.textPrimary}]}>{result.modelName}</Text>
          <Text style={s.category}>{result.categoryLabel}</Text>
          <View style={s.location}><MapPin size={15} color={theme.dark?theme.icon:"#475569"}/><Text style={[s.locationText,{color:theme.textSecondary}]}>{result.pickupLocation}</Text></View>
          <View style={s.specGrid}><Spec icon={<Users size={15} color="#64748B"/>} label={specs.passengers} theme={theme}/><Spec icon={<DoorOpen size={15} color="#64748B"/>} label={specs.doors} theme={theme}/><Spec icon={<CarFront size={15} color="#64748B"/>} label={specs.transmission} theme={theme}/><Spec icon={<BriefcaseBusiness size={15} color="#64748B"/>} label={specs.bags} theme={theme}/></View>
        </View>
      </View>
      <View style={[s.dealCard,{backgroundColor:theme.surface,borderColor:theme.border}]}>
        <Text style={[s.dealHeading,{color:theme.textPrimary}]}>KAYAK sandbox deal</Text>
        <Text style={[s.disclosure,{color:theme.textSecondary}]}>Simulated provider inventory for staging. No real booking or payment is enabled.</Text>
        <Text style={[s.provider,{color:theme.textPrimary}]}>{providerName}</Text>
        {offer?<View style={s.priceRow}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[s.price,{color:theme.textPrimary}]}>{formatMarketCurrency(offer.pricePerDay,offer.currency)}</Text><Text style={[s.perDay,{color:theme.textSecondary}]}>per day</Text></View>:<Text style={[s.disclosure,{color:theme.textSecondary}]}>Live price unavailable</Text>}
        {sandboxHref?<Pressable accessibilityRole="link" accessibilityLabel={`Open KAYAK test page for ${result.modelName}`} onPress={()=>void Linking.openURL(sandboxHref)} style={({pressed})=>[s.testAction,pressed&&s.pressed]}><Text style={s.testActionText}>Open KAYAK test page</Text><ExternalLink size={16} color="white"/></Pressable>:<View accessibilityRole="button" accessibilityState={{disabled:true}} style={[s.testAction,s.disabledAction]}><Text style={s.testActionText}>Test page unavailable</Text></View>}
      </View>
    </ScrollView>
  </SafeAreaView>;
}

function Spec({icon,label,theme}:{icon:ReactNode;label:string;theme:any}){return <View style={s.spec}>{icon}<Text style={[s.specText,{color:theme.textSecondary}]}>{label}</Text></View>;}
function KayakCarDetailLoading(){const{theme}=useAppTheme();return <SafeAreaView style={[s.safe,{backgroundColor:theme.background}]}><View style={s.loading}><View style={[s.loadingLine,{backgroundColor:theme.border}]}/><View style={[s.loadingHero,{backgroundColor:theme.border}]}/></View></SafeAreaView>;}
function KayakCarUnavailable(){const{theme}=useAppTheme();return <SafeAreaView style={[s.safe,{backgroundColor:theme.background}]}><View style={s.unavailable}><CarFront size={44} color={colors.blue}/><Text style={[s.dealHeading,{color:theme.textPrimary}]}>This KAYAK sandbox car is no longer available</Text><Text style={[s.disclosure,{color:theme.textSecondary}]}>Return to Cars results and refresh your search.</Text><Pressable accessibilityRole="button" onPress={()=>router.back()} style={s.testAction}><Text style={s.testActionText}>Back to Cars results</Text></Pressable></View></SafeAreaView>;}

const s=StyleSheet.create({safe:{flex:1},backHeader:{minHeight:48,paddingHorizontal:16,justifyContent:"center"},backLink:{minHeight:44,alignSelf:"flex-start",flexDirection:"row",alignItems:"center",gap:7},backText:{fontSize:14,lineHeight:19,fontWeight:"700",fontFamily:appFonts.bold},card:{marginHorizontal:14,borderWidth:1,borderRadius:13,overflow:"hidden"},imagePanel:{width:"100%",aspectRatio:16/9},image:{width:"100%",height:"100%"},imageUnavailable:{flex:1,alignItems:"center",justifyContent:"center",gap:8},information:{paddingHorizontal:16,paddingVertical:14},sandboxLabel:{fontSize:10,lineHeight:14,fontWeight:"800",fontFamily:appFonts.bold,letterSpacing:.7,textTransform:"uppercase",color:"#004BB8"},title:{marginTop:5,fontSize:20,lineHeight:25,fontWeight:"800",fontFamily:appFonts.extraBold,letterSpacing:-.4},category:{marginTop:2,fontSize:10,lineHeight:15,fontWeight:"800",fontFamily:appFonts.bold,letterSpacing:1.2,textTransform:"uppercase",color:"#004BB8"},location:{marginTop:10,flexDirection:"row",alignItems:"flex-start",gap:6},locationText:{flex:1,fontSize:12,lineHeight:17,fontWeight:"500",fontFamily:appFonts.medium},specGrid:{marginTop:14,flexDirection:"row",flexWrap:"wrap",rowGap:10,columnGap:8},spec:{width:"48%",minWidth:0,flexDirection:"row",alignItems:"flex-start",gap:6},specText:{flex:1,minWidth:0,fontSize:12,lineHeight:16,fontWeight:"500",fontFamily:appFonts.medium},dealCard:{marginHorizontal:14,marginTop:14,borderWidth:1,borderRadius:13,padding:16},dealHeading:{fontSize:18,lineHeight:24,fontWeight:"700",fontFamily:appFonts.bold},disclosure:{marginTop:5,fontSize:12,lineHeight:18,fontWeight:"400",fontFamily:appFonts.regular},provider:{marginTop:14,fontSize:13,lineHeight:18,fontWeight:"600",fontFamily:appFonts.semibold},priceRow:{marginTop:8,alignItems:"flex-start"},price:{maxWidth:"100%",fontSize:20,lineHeight:24,fontWeight:"600",fontFamily:appFonts.semibold,fontVariant:["tabular-nums"]},perDay:{fontSize:11,lineHeight:15,fontWeight:"400",fontFamily:appFonts.regular},testAction:{marginTop:16,minHeight:48,borderRadius:8,backgroundColor:colors.blue,paddingHorizontal:14,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},testActionText:{fontSize:13,lineHeight:18,fontWeight:"700",fontFamily:appFonts.bold,color:"white",textAlign:"center"},disabledAction:{opacity:.55},pressed:{opacity:.82},loading:{padding:16,gap:12},loadingLine:{height:36,borderRadius:8},loadingHero:{height:360,borderRadius:11},unavailable:{flex:1,alignItems:"center",justifyContent:"center",gap:12,padding:24}});
