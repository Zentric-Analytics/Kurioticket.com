import { useEffect, useState, type ReactNode } from "react";
import { Image, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Award, BriefcaseBusiness, ChevronRight, DoorOpen, MapPin, Share2, ShieldCheck, Users } from "lucide-react-native";
import type { CarResult } from "../../api/travelApi";
import { FlowIcon } from "../flow/FlowIcon";
import { money, ui } from "./SearchUi";
import { useSavedCar } from "./carSavedState";
import { useAppTheme } from "../../theme/AppTheme";
import { getPrimaryCarOffer } from "../../../../../src/lib/cars/carResults";
import { isCuratedCarResultImage } from "../../../../../src/lib/cars/carResultImage";
import { androidFavoriteColors } from "../home/AndroidFavoriteButton";
import { nativeCarResultIdentity } from "./nativeCarResultIdentity";
import { presentCarOfferCurrency } from "./carDisplayCurrency";
import { useCarDisplayCurrency } from "./useCarDisplayCurrency";

export function CarResultCard({ result, rank, imageUri, searchParams, resultBackgroundColor, onViewDeal }: {
  result: CarResult; rank: number; imageUri?: string;
  searchParams: Record<string, unknown>; resultBackgroundColor: string; onViewDeal: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [imageUri]);
  const savedState = useSavedCar(result, searchParams);
  const { displayCurrency, rates } = useCarDisplayCurrency();
  const primaryOffer = getPrimaryCarOffer(result);
  const offer = primaryOffer ? presentCarOfferCurrency(primaryOffer, displayCurrency, rates) : undefined;
  const { theme } = useAppTheme();
  const freeCancellationColor = theme.dark ? theme.textPrimary : "#000000";
  const identity = nativeCarResultIdentity(result.modelName);
  const curatedImage = isCuratedCarResultImage(imageUri);
  const imageResizeMode = curatedImage ? "contain" : "cover";
  const transmissionIcon = result.transmission === "automatic" ? "transmissionAutomatic" : "transmissionManual";
  const share = () => void Share.share({ message: result.modelName, title: result.modelName });
  return <View style={[c.card,{backgroundColor:resultBackgroundColor,borderColor:theme.dark?theme.border:"#D8E1EC",shadowColor:theme.dark?"#000000":"#18305B"}]}>
    <View style={c.topSection}>
      <View style={[c.visualColumn,{backgroundColor:theme.surface}]}><View style={c.visual}>{imageUri && !imageFailed ? <Image source={{ uri: imageUri }} resizeMode={imageResizeMode} style={[c.image,curatedImage&&c.curatedImage]} accessibilityLabel={result.imageAlt} onError={() => setImageFailed(true)} /> : <View accessibilityLabel={`${result.modelName} vehicle image unavailable`} style={c.imageFallback}><FlowIcon name="car" size={48} color="#315A7D" /><Text style={c.fallbackText}>Vehicle image unavailable</Text></View>}</View></View>
      <View style={c.identityZone}>
        {rank === 0 ? <View style={c.bestValueRow}><View style={c.badge}><Award size={11} color="#15803D" /><Text style={c.badgeText}>Best value</Text></View></View> : null}
        <View style={c.headerRow}>
          <View style={c.identityColumn}>
            <Text numberOfLines={1} style={[c.name,{color:theme.textPrimary}]}>{identity.primaryName}</Text>
            {identity.secondaryModel || result.orSimilar ? <Text numberOfLines={1} style={c.identityLine}>
              {identity.secondaryModel ? <Text style={[c.secondaryModel,{color:theme.textPrimary}]}>{identity.secondaryModel}</Text> : null}
              {identity.secondaryModel && result.orSimilar ? " " : null}
              {result.orSimilar ? <Text style={[c.similar,{color:theme.textSecondary}]}>or similar</Text> : null}
            </Text> : null}
            <Text numberOfLines={1} style={c.category}>{result.categoryLabel}</Text>
            {result.searchPolicy.source === "kayak-sandbox" ? <Text style={c.category}>KAYAK sandbox · Simulated · Not bookable</Text> : null}
          </View>
          <View style={c.utilityColumn}>
            <View style={c.actions}><Pressable accessibilityRole="button" accessibilityLabel={savedState.saved ? `Remove ${result.modelName} from saved` : `Save ${result.modelName}`} accessibilityState={{ selected: savedState.saved }} onPress={savedState.toggle} style={({pressed}) => [c.action,c.saveAction,pressed&&c.pressed]}><FlowIcon name="heart" size={20} color={savedState.saved ? androidFavoriteColors.savedStroke : androidFavoriteColors.unsavedStroke} fill={savedState.saved ? androidFavoriteColors.savedFill : androidFavoriteColors.unsavedFill} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Share ${result.modelName}`} onPress={share} style={({pressed}) => [c.action,c.shareAction,pressed&&c.pressed]}><Share2 size={18} color={theme.icon} /></Pressable></View>
          </View>
        </View>
        <View style={c.identityDetails}>
          <View style={c.location}><MapPin size={13} color={theme.textPrimary} /><Text style={[c.meta,{color:theme.textSecondary}]}>{result.pickupLocation}</Text></View>
          {offer?.freeCancellation ? <View style={c.freeCancellation}><ShieldCheck accessible={false} size={13} strokeWidth={2} color={freeCancellationColor} /><Text style={[c.freeCancellationText,{color:freeCancellationColor}]}>Free cancellation</Text></View> : null}
        </View>
      </View>
    </View>
    <View style={[c.lowerBand,{borderTopColor:theme.border}]}>
      <View style={c.specColumn}>
        <Spec icon={<Users size={14} color="#64748B" />} label={`${result.passengers} passengers`} />
        <Spec icon={<FlowIcon name={transmissionIcon} size={14} color="#64748B" />} label={capitalize(result.transmission)} />
      </View>
      <View style={[c.specColumn,c.middleSpecColumn,{borderLeftColor:theme.border}]}>
        <Spec icon={<DoorOpen size={14} color="#64748B" />} label={`${result.doors} doors`} />
        <Spec icon={<BriefcaseBusiness size={14} color="#64748B" />} label={`${result.bags} bags`} />
      </View>
      <View style={[c.commerceColumn,{borderLeftColor:theme.border}]}>
          <View style={c.priceColumn}>
            {offer ? <><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[c.dailyPrice,{color:theme.textPrimary}]}>{money(offer.currency, offer.pricePerDay)}</Text><Text style={[c.perDayLabel,{color:theme.textSecondary}]}>per day</Text></> : <Text style={[c.unavailablePrice,{color:theme.textSecondary}]}>Live price unavailable</Text>}
          </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`View deal for ${result.modelName}`} onPress={onViewDeal} hitSlop={{top:4,bottom:4,left:4,right:4}} style={({pressed}) => [c.viewDeal,pressed&&c.pressed]}><Text style={[c.viewDealText,{color:theme.dark ? "#8FB5FF" : ui.blue}]}>View deal</Text><ChevronRight accessible={false} size={16} strokeWidth={2.2} color={theme.dark ? "#8FB5FF" : ui.blue} /></Pressable>
      </View>
    </View>
  </View>;
}
function Spec({ icon, label }: { icon: ReactNode; label: string }) { const { theme } = useAppTheme(); return <View style={c.spec}>{icon}<Text numberOfLines={2} style={[c.specText,{color:theme.textSecondary}]}>{label}</Text></View>; }
const capitalize = (value: string) => `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
const c = StyleSheet.create({
  card:{borderWidth:1,borderRadius:13,overflow:"hidden",shadowOpacity:0.08,shadowRadius:10,shadowOffset:{width:0,height:2},elevation:2},topSection:{minHeight:156,flexDirection:"row",alignItems:"stretch"},visualColumn:{width:"40%",minHeight:156,padding:6},visual:{flex:1,overflow:"hidden",borderRadius:10},image:{...StyleSheet.absoluteFillObject},curatedImage:{transform:[{scale:1.08}]},imageFallback:{flex:1,alignItems:"center",justifyContent:"center",gap:7,padding:8},fallbackText:{fontSize:10,fontWeight:"600",color:"#315A7D",textAlign:"center"},
  identityZone:{flex:1,minWidth:0,paddingHorizontal:10,paddingTop:7,paddingBottom:8},bestValueRow:{minWidth:0,alignItems:"flex-end",marginBottom:4},freeCancellation:{minWidth:0,flexShrink:1,flexDirection:"row",alignItems:"center",gap:3},freeCancellationText:{fontSize:11,lineHeight:15,fontWeight:"600"},headerRow:{flexDirection:"row",alignItems:"flex-start",gap:6},identityColumn:{flex:1,minWidth:0},name:{fontSize:15,fontWeight:"800",lineHeight:18,color:ui.navy},identityLine:{minWidth:0,lineHeight:18},secondaryModel:{fontSize:15,fontWeight:"800",lineHeight:18},similar:{fontSize:11,fontWeight:"500",lineHeight:16,color:"#536B92"},category:{fontSize:10,fontWeight:"800",letterSpacing:1.1,lineHeight:16,textTransform:"uppercase",color:"#004BB8"},utilityColumn:{flexShrink:0,alignItems:"flex-end"},badge:{flexShrink:0,flexDirection:"row",alignItems:"center",gap:3,borderRadius:5,backgroundColor:"#ECFDF5",paddingHorizontal:5,paddingVertical:2},badgeText:{fontSize:9,fontWeight:"700",color:"#15803D"},actions:{flexDirection:"row",alignItems:"center"},action:{width:28,height:44,justifyContent:"flex-start"},saveAction:{alignItems:"flex-end",paddingRight:2},shareAction:{alignItems:"flex-start",paddingLeft:2},pressed:{opacity:0.7},identityDetails:{minWidth:0,marginTop:5,gap:6},location:{flexDirection:"row",alignItems:"flex-start",gap:4},meta:{flex:1,minWidth:0,fontSize:11,fontWeight:"500",lineHeight:15,color:"#536B92"},
  lowerBand:{flexDirection:"row",alignItems:"stretch",borderTopWidth:StyleSheet.hairlineWidth},specColumn:{flex:1,minWidth:0,gap:8,paddingHorizontal:8,paddingVertical:10},middleSpecColumn:{borderLeftWidth:StyleSheet.hairlineWidth},spec:{minWidth:0,flexDirection:"row",alignItems:"flex-start",gap:4},specText:{flex:1,minWidth:0,fontSize:11,fontWeight:"500",lineHeight:14,color:"#536B92"},commerceColumn:{flex:1.35,minWidth:0,borderLeftWidth:StyleSheet.hairlineWidth,paddingLeft:8,paddingRight:9,paddingTop:8,paddingBottom:5},priceColumn:{minWidth:0,maxWidth:"100%",alignItems:"flex-end"},unavailablePrice:{maxWidth:"100%",textAlign:"right",fontSize:11,fontWeight:"500",lineHeight:15},dailyPrice:{maxWidth:"100%",fontSize:22,fontWeight:"700",lineHeight:25,letterSpacing:-0.4,color:ui.navy},perDayLabel:{maxWidth:"100%",marginTop:1,fontSize:11,fontWeight:"500",lineHeight:14,textAlign:"right"},viewDeal:{minHeight:36,flexDirection:"row",alignItems:"center",justifyContent:"flex-end",gap:4},viewDealText:{fontSize:14,lineHeight:18,fontWeight:"600"},
});
