import { useEffect, useState, type ReactNode } from "react";
import { Image, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Award, BriefcaseBusiness, DoorOpen, MapPin, Share2, Users } from "lucide-react-native";
import type { CarResult } from "../../api/travelApi";
import { FlowIcon } from "../flow/FlowIcon";
import { money, ui } from "./SearchUi";
import { useSavedCar } from "./carSavedState";
import { useAppTheme } from "../../theme/AppTheme";
import { getPrimaryCarOffer } from "../../../../../src/lib/cars/carResults";

export function CarResultCard({ result, rank, imageUri, searchParams, onViewDeal }: {
  result: CarResult; rank: number; imageUri?: string;
  searchParams: Record<string, unknown>; onViewDeal: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [imageUri]);
  const savedState = useSavedCar(result, searchParams);
  const offer = getPrimaryCarOffer(result);
  const { theme } = useAppTheme();
  const share = () => void Share.share({ message: result.modelName, title: result.modelName });
  return <View style={[c.card,{backgroundColor:theme.surface,borderColor:theme.border}]}>
    <View style={c.main}>
      <View style={c.visual}>{imageUri && !imageFailed ? <Image source={{ uri: imageUri }} resizeMode="cover" style={c.image} accessibilityLabel={result.imageAlt} onError={() => setImageFailed(true)} /> : <View accessibilityLabel={`${result.modelName} vehicle image unavailable`} style={c.imageFallback}><FlowIcon name="car" size={48} color="#315A7D" /><Text style={c.fallbackText}>Vehicle image unavailable</Text></View>}</View>
      <View style={c.information}>
        <View style={c.utilityRow}><View style={c.utilityCopy}><Text numberOfLines={1} style={c.category}>{result.categoryLabel}</Text>{rank === 0 ? <View style={c.badge}><Award size={11} color="#15803D" /><Text style={c.badgeText}>Best value</Text></View> : null}</View><View style={c.actions}><Pressable accessibilityRole="button" accessibilityLabel={savedState.saved ? `Remove ${result.modelName} from saved` : `Save ${result.modelName}`} accessibilityState={{ selected: savedState.saved }} onPress={savedState.toggle} style={c.action}><FlowIcon name="heart" size={18} fill={savedState.saved ? ui.blue : "transparent"} color={savedState.saved ? ui.blue : "#334155"} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Share ${result.modelName}`} onPress={share} style={c.action}><Share2 size={18} color="#334155" /></Pressable></View></View>
        <View style={c.identity}><Text style={[c.name,{color:theme.textPrimary}]}>{result.modelName}</Text>{result.orSimilar ? <Text style={[c.similar,{color:theme.textSecondary}]}>or similar</Text> : null}</View>
        <View style={c.location}><MapPin size={13} color="#004BB8" /><Text numberOfLines={2} style={[c.meta,{color:theme.textSecondary}]}>{result.pickupLocation}</Text></View>
        <View style={c.specs}><Spec icon={<Users size={14} color="#64748B" />} label={`${result.passengers} passengers`} /><Spec icon={<FlowIcon name="settings" size={14} color="#64748B" />} label={capitalize(result.transmission)} /><Spec icon={<DoorOpen size={14} color="#64748B" />} label={`${result.doors} doors`} /><Spec icon={<BriefcaseBusiness size={14} color="#64748B" />} label={`${result.bags} bags`} /></View>
        {offer?.freeCancellation ? <View style={c.benefit}><FlowIcon name="check" size={12} color="#15803D" /><Text style={c.benefitText}>Free cancellation</Text></View> : null}
      </View>
    </View>
    <View style={[c.conversion,{backgroundColor:theme.surface,borderTopColor:theme.border}]}>{offer ? <View style={c.priceCopy}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[c.total,{color:theme.textPrimary}]}>{money(offer.currency, offer.totalPrice)}</Text><Text style={[c.priceBasis,{color:theme.textSecondary}]}>TOTAL  ·  {money(offer.currency, offer.pricePerDay)}/day</Text></View> : <Text style={[c.meta,{color:theme.textSecondary}]}>Live price unavailable</Text>}<Pressable accessibilityRole="button" accessibilityLabel={`View ${result.modelName}`} onPress={onViewDeal} style={c.viewButton}><Text style={c.viewButtonText}>View car</Text></Pressable></View>
  </View>;
}
function Spec({ icon, label }: { icon: ReactNode; label: string }) { const { theme } = useAppTheme(); return <View style={c.spec}>{icon}<Text numberOfLines={2} style={[c.specText,{color:theme.textSecondary}]}>{label}</Text></View>; }
const capitalize = (value: string) => `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
const c = StyleSheet.create({
  card:{borderWidth:1,borderColor:"#D8E1EC",borderRadius:13,overflow:"hidden",backgroundColor:"white",shadowColor:"#0F172A",shadowOpacity:0.08,shadowRadius:10,shadowOffset:{width:0,height:5},elevation:2},main:{minHeight:168,flexDirection:"row"},visual:{width:"40%",minHeight:168,backgroundColor:"#F8FAFC",overflow:"hidden"},image:{...StyleSheet.absoluteFillObject},imageFallback:{flex:1,alignItems:"center",justifyContent:"center",gap:7,padding:8},fallbackText:{fontSize:10,fontWeight:"600",color:"#315A7D",textAlign:"center"},
  information:{flex:1,minWidth:0,paddingHorizontal:10,paddingVertical:9},utilityRow:{minHeight:40,flexDirection:"row",alignItems:"center",gap:5},utilityCopy:{flex:1,minWidth:0,flexDirection:"row",alignItems:"center",gap:5,overflow:"hidden"},category:{minWidth:0,flexShrink:1,fontSize:10,fontWeight:"800",letterSpacing:1.1,textTransform:"uppercase",color:"#004BB8"},badge:{flexShrink:0,flexDirection:"row",alignItems:"center",gap:3,borderRadius:5,backgroundColor:"#ECFDF5",paddingHorizontal:5,paddingVertical:2},badgeText:{fontSize:9,fontWeight:"700",color:"#15803D"},actions:{flexDirection:"row",marginRight:-7},action:{width:36,height:44,alignItems:"center",justifyContent:"center",borderRadius:20},identity:{flexDirection:"row",flexWrap:"wrap",alignItems:"baseline",columnGap:5},name:{fontSize:18,fontWeight:"800",lineHeight:21,color:ui.navy},similar:{fontSize:11,fontWeight:"500",lineHeight:16,color:"#536B92"},location:{marginTop:4,flexDirection:"row",alignItems:"flex-start",gap:4},meta:{fontSize:11,fontWeight:"500",lineHeight:15,color:"#536B92",flexShrink:1},
  specs:{marginTop:8,flexDirection:"row",flexWrap:"wrap",rowGap:6},spec:{width:"50%",minWidth:0,flexDirection:"row",alignItems:"flex-start",gap:4,paddingRight:3},specText:{flex:1,minWidth:0,fontSize:11,fontWeight:"500",lineHeight:14,color:"#536B92"},benefit:{alignSelf:"flex-start",marginTop:8,minHeight:20,flexDirection:"row",alignItems:"center",gap:3,borderRadius:5,backgroundColor:"#ECFDF5",paddingHorizontal:6,paddingVertical:2},benefitText:{fontSize:11,fontWeight:"700",color:"#15803D"},conversion:{minHeight:64,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12,borderTopWidth:1,borderTopColor:"#E2E8F0",backgroundColor:"#FCFDFE",paddingHorizontal:12,paddingVertical:10},priceCopy:{flex:1,minWidth:0},total:{fontSize:23,fontWeight:"700",lineHeight:25,letterSpacing:-0.4,color:ui.navy},priceBasis:{marginTop:4,fontSize:10,fontWeight:"600",lineHeight:12,letterSpacing:0.5,color:"#64748B"},viewButton:{minHeight:44,minWidth:88,flexShrink:0,alignItems:"center",justifyContent:"center",borderRadius:6,backgroundColor:"#004BB8",paddingHorizontal:16},viewButtonText:{fontSize:14,fontWeight:"700",color:"white"},
});
