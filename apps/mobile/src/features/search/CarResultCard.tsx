import { useEffect, useState, type ReactNode } from "react";
import { Image, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Award, BriefcaseBusiness, ChevronRight, DoorOpen, MapPin, Share2, Users } from "lucide-react-native";
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
        <View style={c.headerRow}>
          <View style={c.identityColumn}>
            <Text style={[c.name,{color:theme.textPrimary}]}>{result.modelName}</Text>
            <View style={c.identityMeta}>
              {result.orSimilar ? <><Text style={[c.similar,{color:theme.textSecondary}]}>or similar</Text><Text style={[c.separator,{color:theme.textSecondary}]}>•</Text></> : null}
              <Text style={c.category}>{result.categoryLabel}</Text>
            </View>
          </View>
          <View style={c.utilityColumn}>
            {rank === 0 ? <View style={c.badge}><Award size={11} color="#15803D" /><Text style={c.badgeText}>Best value</Text></View> : null}
            <View style={c.actions}><Pressable accessibilityRole="button" accessibilityLabel={savedState.saved ? `Remove ${result.modelName} from saved` : `Save ${result.modelName}`} accessibilityState={{ selected: savedState.saved }} onPress={savedState.toggle} style={[c.action,c.saveAction]}><FlowIcon name="heart" size={18} fill="transparent" color={savedState.saved ? "#E92D55" : theme.icon} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Share ${result.modelName}`} onPress={share} style={[c.action,c.shareAction]}><Share2 size={18} color={theme.icon} /></Pressable></View>
          </View>
        </View>
        <View style={c.detailCommerceRow}>
          <View style={c.detailColumn}>
            <View style={c.location}><MapPin size={13} color={theme.textPrimary} /><Text style={[c.meta,{color:theme.textSecondary}]}>{result.pickupLocation}</Text></View>
            <View style={c.specs}><Spec icon={<Users size={14} color="#64748B" />} label={`${result.passengers} passengers`} /><Spec icon={<DoorOpen size={14} color="#64748B" />} label={`${result.doors} doors`} /><Spec icon={<FlowIcon name="settings" size={14} color="#64748B" />} label={capitalize(result.transmission)} /><Spec icon={<BriefcaseBusiness size={14} color="#64748B" />} label={`${result.bags} bags`} /></View>
          </View>
          <View style={c.priceColumn}>
            {offer ? <><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[c.total,{color:theme.textPrimary}]}>{money(offer.currency, offer.totalPrice)}</Text><Text numberOfLines={2} style={[c.taxDisclosure,{color:theme.textSecondary}]}>{offer.taxesAndFeesIncluded ? "includes taxes & fees" : "taxes & fees shown where known"}</Text><Text numberOfLines={1} style={[c.perDay,{color:theme.textPrimary}]}>{money(offer.currency, offer.pricePerDay)} per day</Text></> : <Text style={[c.unavailablePrice,{color:theme.textSecondary}]}>Live price unavailable</Text>}
            <Pressable accessibilityRole="button" accessibilityLabel={`View deal for ${result.modelName}`} onPress={onViewDeal} hitSlop={{top:4,bottom:4,left:4,right:4}} style={c.viewDeal}><Text style={[c.viewDealText,{color:theme.dark ? "#8FB5FF" : ui.blue}]}>View deal</Text><ChevronRight accessible={false} size={16} strokeWidth={2.2} color={theme.dark ? "#8FB5FF" : ui.blue} /></Pressable>
          </View>
        </View>
      </View>
    </View>
    {offer?.freeCancellation ? <View style={[c.conversion,{backgroundColor:theme.surface,borderTopColor:theme.border}]}><View style={c.benefit}><FlowIcon name="check" size={12} color="#15803D" /><Text style={c.benefitText}>Free cancellation</Text></View></View> : null}
  </View>;
}
function Spec({ icon, label }: { icon: ReactNode; label: string }) { const { theme } = useAppTheme(); return <View style={c.spec}>{icon}<Text numberOfLines={2} style={[c.specText,{color:theme.textSecondary}]}>{label}</Text></View>; }
const capitalize = (value: string) => `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
const c = StyleSheet.create({
  card:{borderWidth:1,borderColor:"#D8E1EC",borderRadius:13,overflow:"hidden",backgroundColor:"white",shadowColor:"#0F172A",shadowOpacity:0.08,shadowRadius:10,shadowOffset:{width:0,height:5},elevation:2},main:{minHeight:168,flexDirection:"row"},visual:{width:"40%",minHeight:168,backgroundColor:"#F8FAFC",overflow:"hidden"},image:{...StyleSheet.absoluteFillObject},imageFallback:{flex:1,alignItems:"center",justifyContent:"center",gap:7,padding:8},fallbackText:{fontSize:10,fontWeight:"600",color:"#315A7D",textAlign:"center"},
  information:{flex:1,minWidth:0,paddingHorizontal:10,paddingVertical:9},headerRow:{flexDirection:"row",alignItems:"flex-start",gap:6},identityColumn:{flex:1,minWidth:0},name:{fontSize:15,fontWeight:"800",lineHeight:18,color:ui.navy},identityMeta:{minWidth:0,flexDirection:"row",flexWrap:"wrap",alignItems:"baseline",columnGap:4},similar:{fontSize:11,fontWeight:"500",lineHeight:16,color:"#536B92"},separator:{fontSize:11,fontWeight:"500",lineHeight:16},category:{minWidth:0,flexShrink:1,fontSize:10,fontWeight:"800",letterSpacing:1.1,lineHeight:16,textTransform:"uppercase",color:"#004BB8"},utilityColumn:{flexShrink:0,alignItems:"flex-end"},badge:{flexShrink:0,flexDirection:"row",alignItems:"center",gap:3,borderRadius:5,backgroundColor:"#ECFDF5",paddingHorizontal:5,paddingVertical:2},badgeText:{fontSize:9,fontWeight:"700",color:"#15803D"},actions:{flexDirection:"row",alignItems:"center"},action:{width:28,height:44,justifyContent:"center"},saveAction:{alignItems:"flex-end",paddingRight:2},shareAction:{alignItems:"flex-start",paddingLeft:2},detailCommerceRow:{marginTop:7,flexDirection:"row",alignItems:"flex-start",gap:6},detailColumn:{flex:1,minWidth:0},location:{flexDirection:"row",alignItems:"flex-start",gap:4},meta:{flex:1,minWidth:0,fontSize:11,fontWeight:"500",lineHeight:15,color:"#536B92"},
  specs:{marginTop:7,flexDirection:"column",gap:5},spec:{minWidth:0,flexDirection:"row",alignItems:"flex-start",gap:4},specText:{flex:1,minWidth:0,fontSize:11,fontWeight:"500",lineHeight:14,color:"#536B92"},priceColumn:{flexBasis:"44%",flexShrink:0,minWidth:0,alignItems:"flex-end",paddingTop:2},unavailablePrice:{maxWidth:"100%",textAlign:"right",fontSize:11,fontWeight:"500",lineHeight:15},total:{maxWidth:"100%",fontSize:21,fontWeight:"700",lineHeight:24,letterSpacing:-0.4,color:ui.navy},taxDisclosure:{maxWidth:"100%",marginTop:1,fontSize:10,fontWeight:"500",lineHeight:13,textAlign:"right"},perDay:{maxWidth:"100%",marginTop:2,fontSize:11,fontWeight:"700",lineHeight:14,textAlign:"right"},viewDeal:{minHeight:36,flexDirection:"row",alignItems:"center",justifyContent:"flex-end",gap:4,marginTop:2},viewDealText:{fontSize:13,lineHeight:15,fontWeight:"600"},benefit:{alignSelf:"flex-start",minHeight:20,flexDirection:"row",alignItems:"center",gap:3,borderRadius:5,backgroundColor:"#ECFDF5",paddingHorizontal:6,paddingVertical:2},benefitText:{flexShrink:1,fontSize:11,fontWeight:"700",color:"#15803D"},conversion:{minHeight:36,alignItems:"flex-start",justifyContent:"center",borderTopWidth:1,borderTopColor:"#E2E8F0",backgroundColor:"#FCFDFE",paddingHorizontal:12,paddingVertical:7},
});
