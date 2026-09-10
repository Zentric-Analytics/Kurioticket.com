import { useEffect, useState, type ReactNode } from "react";
import { Image, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Award, BriefcaseBusiness, ChevronRight, DoorOpen, MapPin, Share2, ShieldCheck, Users } from "lucide-react-native";
import type { CarResult } from "../../api/travelApi";
import { FlowIcon } from "../flow/FlowIcon";
import { money, ui } from "./SearchUi";
import { useSavedCar } from "./carSavedState";
import { useAppTheme } from "../../theme/AppTheme";
import { getPrimaryCarOffer } from "../../../../../src/lib/cars/carResults";
import { androidFavoriteColors } from "../home/AndroidFavoriteButton";
import { nativeCarResultIdentity } from "./nativeCarResultIdentity";

export function CarResultCard({ result, rank, imageUri, searchParams, onViewDeal }: {
  result: CarResult; rank: number; imageUri?: string;
  searchParams: Record<string, unknown>; onViewDeal: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [imageUri]);
  const savedState = useSavedCar(result, searchParams);
  const offer = getPrimaryCarOffer(result);
  const { theme } = useAppTheme();
  const freeCancellationColor = theme.dark ? theme.textPrimary : "#000000";
  const identity = nativeCarResultIdentity(result.modelName);
  const share = () => void Share.share({ message: result.modelName, title: result.modelName });
  return <View style={[c.card,{backgroundColor:theme.surface,borderColor:theme.dark?theme.border:"#D8E1EC",shadowColor:theme.dark?"#000000":"#18305B"}]}>
    <View style={c.main}>
      <View style={c.visual}>{imageUri && !imageFailed ? <Image source={{ uri: imageUri }} resizeMode="cover" style={c.image} accessibilityLabel={result.imageAlt} onError={() => setImageFailed(true)} /> : <View accessibilityLabel={`${result.modelName} vehicle image unavailable`} style={c.imageFallback}><FlowIcon name="car" size={48} color="#315A7D" /><Text style={c.fallbackText}>Vehicle image unavailable</Text></View>}</View>
      <View style={c.contentColumn}>
        <View style={c.information}>
        {offer?.freeCancellation || rank === 0 ? <View style={c.topMetaRow}>
          {offer?.freeCancellation ? <View style={c.freeCancellation}><ShieldCheck accessible={false} size={13} strokeWidth={2} color={freeCancellationColor} /><Text style={[c.freeCancellationText,{color:freeCancellationColor}]}>Free cancellation</Text></View> : null}
          {rank === 0 ? <View style={c.badge}><Award size={11} color="#15803D" /><Text style={c.badgeText}>Best value</Text></View> : null}
        </View> : null}
        <View style={c.headerRow}>
          <View style={c.identityColumn}>
            <Text numberOfLines={1} style={[c.name,{color:theme.textPrimary}]}>{identity.primaryName}</Text>
            <Text numberOfLines={1} style={c.identityLine}>
              {identity.secondaryModel ? <Text style={[c.secondaryModel,{color:theme.textPrimary}]}>{identity.secondaryModel}</Text> : null}
              {identity.secondaryModel ? " " : null}
              {result.orSimilar ? <><Text style={[c.similar,{color:theme.textSecondary}]}>or similar</Text><Text style={[c.separator,{color:theme.textSecondary}]}> {"•"} </Text></> : null}
              <Text style={c.category}>{result.categoryLabel}</Text>
            </Text>
          </View>
          <View style={c.utilityColumn}>
            <View style={c.actions}><Pressable accessibilityRole="button" accessibilityLabel={savedState.saved ? `Remove ${result.modelName} from saved` : `Save ${result.modelName}`} accessibilityState={{ selected: savedState.saved }} onPress={savedState.toggle} style={[c.action,c.saveAction]}><FlowIcon name="heart" size={20} color={savedState.saved ? androidFavoriteColors.savedStroke : androidFavoriteColors.unsavedStroke} fill={savedState.saved ? androidFavoriteColors.savedFill : androidFavoriteColors.unsavedFill} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Share ${result.modelName}`} onPress={share} style={[c.action,c.shareAction]}><Share2 size={18} color={theme.icon} /></Pressable></View>
          </View>
        </View>
        <View style={c.detailColumn}>
          <View style={c.location}><MapPin size={13} color={theme.textPrimary} /><Text style={[c.meta,{color:theme.textSecondary}]}>{result.pickupLocation}</Text></View>
          <View style={c.specs}><Spec icon={<Users size={14} color="#64748B" />} label={`${result.passengers} passengers`} /><Spec icon={<DoorOpen size={14} color="#64748B" />} label={`${result.doors} doors`} /><Spec icon={<FlowIcon name="settings" size={14} color="#64748B" />} label={capitalize(result.transmission)} /><Spec icon={<BriefcaseBusiness size={14} color="#64748B" />} label={`${result.bags} bags`} /></View>
        </View>
        </View>
        <View style={[c.conversion,{backgroundColor:theme.surface}]}>
          <View style={c.priceColumn}>
            {offer ? <><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[c.total,{color:theme.textPrimary}]}>{money(offer.currency, offer.totalPrice)}</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9} style={[c.taxDisclosure,{color:theme.textSecondary}]}>{offer.taxesAndFeesIncluded ? "includes taxes & fees" : "taxes & fees shown where known"}</Text><Text numberOfLines={1} style={[c.perDay,{color:theme.textPrimary}]}>{money(offer.currency, offer.pricePerDay)} per day</Text></> : <Text style={[c.unavailablePrice,{color:theme.textSecondary}]}>Live price unavailable</Text>}
            <Pressable accessibilityRole="button" accessibilityLabel={`View deal for ${result.modelName}`} onPress={onViewDeal} hitSlop={{top:4,bottom:4,left:4,right:4}} style={c.viewDeal}><Text style={[c.viewDealText,{color:theme.dark ? "#8FB5FF" : ui.blue}]}>View deal</Text><ChevronRight accessible={false} size={16} strokeWidth={2.2} color={theme.dark ? "#8FB5FF" : ui.blue} /></Pressable>
          </View>
        </View>
      </View>
    </View>
  </View>;
}
function Spec({ icon, label }: { icon: ReactNode; label: string }) { const { theme } = useAppTheme(); return <View style={c.spec}>{icon}<Text numberOfLines={2} style={[c.specText,{color:theme.textSecondary}]}>{label}</Text></View>; }
const capitalize = (value: string) => `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
const c = StyleSheet.create({
  card:{borderWidth:1,borderRadius:13,overflow:"hidden",shadowOpacity:0.08,shadowRadius:10,shadowOffset:{width:0,height:2},elevation:2},main:{minHeight:168,flexDirection:"row",alignItems:"stretch"},visual:{width:"40%",minHeight:168,backgroundColor:"#F8FAFC",overflow:"hidden"},image:{...StyleSheet.absoluteFillObject},imageFallback:{flex:1,alignItems:"center",justifyContent:"center",gap:7,padding:8},fallbackText:{fontSize:10,fontWeight:"600",color:"#315A7D",textAlign:"center"},
  contentColumn:{flex:1,minWidth:0},
  information:{flex:1,minWidth:0,paddingHorizontal:10,paddingVertical:9},topMetaRow:{minWidth:0,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:6,marginBottom:4},freeCancellation:{minWidth:0,flexShrink:1,flexDirection:"row",alignItems:"center",gap:3},freeCancellationText:{fontSize:11,lineHeight:15,fontWeight:"700"},headerRow:{flexDirection:"row",alignItems:"flex-start",gap:6},identityColumn:{flex:1,minWidth:0},name:{fontSize:15,fontWeight:"800",lineHeight:18,color:ui.navy},identityLine:{minWidth:0,lineHeight:18},secondaryModel:{fontSize:15,fontWeight:"800",lineHeight:18},similar:{fontSize:11,fontWeight:"500",lineHeight:16,color:"#536B92"},separator:{fontSize:11,fontWeight:"500",lineHeight:16},category:{fontSize:10,fontWeight:"800",letterSpacing:1.1,lineHeight:16,textTransform:"uppercase",color:"#004BB8"},utilityColumn:{flexShrink:0,alignItems:"flex-end"},badge:{flexShrink:0,flexDirection:"row",alignItems:"center",gap:3,borderRadius:5,backgroundColor:"#ECFDF5",paddingHorizontal:5,paddingVertical:2},badgeText:{fontSize:9,fontWeight:"700",color:"#15803D"},actions:{flexDirection:"row",alignItems:"center"},action:{width:28,height:44,justifyContent:"flex-start"},saveAction:{alignItems:"flex-end",paddingRight:2},shareAction:{alignItems:"flex-start",paddingLeft:2},detailColumn:{minWidth:0,marginTop:7},location:{flexDirection:"row",alignItems:"flex-start",gap:4},meta:{flex:1,minWidth:0,fontSize:11,fontWeight:"500",lineHeight:15,color:"#536B92"},
  specs:{marginTop:7,flexDirection:"column",gap:5},spec:{minWidth:0,flexDirection:"row",alignItems:"flex-start",gap:4},specText:{flex:1,minWidth:0,fontSize:11,fontWeight:"500",lineHeight:14,color:"#536B92"},priceColumn:{flexShrink:0,minWidth:108,maxWidth:"100%",alignItems:"flex-end",justifyContent:"flex-end"},unavailablePrice:{maxWidth:"100%",textAlign:"right",fontSize:11,fontWeight:"500",lineHeight:15},total:{maxWidth:"100%",fontSize:21,fontWeight:"700",lineHeight:24,letterSpacing:-0.4,color:ui.navy},taxDisclosure:{maxWidth:"100%",marginTop:1,fontSize:10,fontWeight:"500",lineHeight:13,textAlign:"right"},perDay:{maxWidth:"100%",marginTop:2,fontSize:11,fontWeight:"700",lineHeight:14,textAlign:"right"},viewDeal:{minHeight:36,flexDirection:"row",alignItems:"center",justifyContent:"flex-end",gap:4,marginTop:2},viewDealText:{fontSize:13,lineHeight:15,fontWeight:"600"},conversion:{flexDirection:"row",alignItems:"flex-end",justifyContent:"flex-end",paddingLeft:10,paddingRight:10,paddingTop:7,paddingBottom:8},
});
