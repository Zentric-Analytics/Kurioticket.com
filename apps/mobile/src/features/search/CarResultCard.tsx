import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { CarResult } from "../../api/travelApi";
import { FlowIcon, type FlowIconName } from "../flow/FlowIcon";
import { Badge, Button, money, ui } from "./SearchUi";
import { useSavedCar } from "./carSavedState";

export function CarResultCard({ result, rank, imageUri, days, onViewDeal }: {
  result: CarResult;
  rank: number;
  imageUri?: string;
  days: number;
  onViewDeal: () => void;
}) {
  const compact = useWindowDimensions().width < 430;
  const savedState = useSavedCar(result.id);
  const offer = result.offers[0];
  const benefits = [
    result.mileagePolicy === "unlimited" ? "Unlimited mileage" : result.limitedMileageKm ? `${result.limitedMileageKm} km included` : undefined,
    offer?.freeCancellation ? "Free cancellation" : undefined,
    offer?.payAtPickup ? "Pay at pickup" : undefined,
  ].filter((value): value is string => Boolean(value));
  const pickup = result.shuttleRequired ? "Shuttle required" : result.pickupType === "airport-counter" ? "Airport counter" : result.pickupType === "meet-and-greet" ? "Meet & greet" : result.pickupType === "city-location" ? "City location" : undefined;
  const ratingLabel = result.supplierRating == null ? "" : result.supplierRating >= 9 ? "Exceptional" : result.supplierRating >= 8 ? "Excellent" : result.supplierRating >= 7 ? "Good" : "Rated";
  return (
    <View style={[c.card, compact && c.cardCompact]}>
      <View style={[c.visual, compact && c.visualCompact]}>
        {imageUri ? <Image source={{ uri: imageUri }} resizeMode="contain" style={[c.image, compact && c.imageCompact]} accessibilityLabel={result.imageAlt} /> : <View style={c.imageFallback}><FlowIcon name="car" size={48} color="#8792A7" /><Text style={c.fallbackText}>Vehicle image unavailable</Text></View>}
        <View style={c.badge}><Badge green={rank === 1}>{rank === 0 ? "Best overall" : rank === 1 ? "Great price" : rank === 2 ? "Most spacious" : result.categoryLabel}</Badge></View>
      </View>
      <View style={[c.copy, compact && c.copyCompact]}>
        <Pressable accessibilityRole="button" accessibilityLabel={savedState.saved ? `Remove ${result.modelName} from saved` : `Save ${result.modelName}`} accessibilityState={{ selected: savedState.saved }} onPress={savedState.toggle} style={c.heart}>
          <FlowIcon name="heart" fill={savedState.saved ? ui.blue : "white"} color={savedState.saved ? ui.blue : ui.navy} />
        </Pressable>
        <Text style={c.name}>{result.modelName}{result.orSimilar ? " or similar" : ""}</Text>
        <Text style={c.meta}>{result.categoryLabel}</Text>
        {result.supplierRating != null ? <View style={c.rating}><Text style={c.score}>{result.supplierRating.toFixed(1)}</Text><Text style={c.ratingText}>{ratingLabel}{result.supplierReviewCount != null ? `  ·  ${result.supplierReviewCount.toLocaleString()} reviews` : ""}</Text></View> : null}
        <View style={c.specs}>
          <Spec icon="person" label={`${result.passengers} seats`} />
          <Spec icon="trip" label={`${result.bags} bags`} />
          <Spec icon="settings" label={capitalize(result.transmission)} />
          {result.airConditioning ? <Spec icon="moon" label="A/C" /> : null}
        </View>
        {benefits.length ? <View style={c.benefits}>{benefits.map((benefit) => <View key={benefit} style={c.benefit}><FlowIcon name="check" size={11} color={ui.green} /><Text style={c.benefitText}>{benefit}</Text></View>)}</View> : null}
        <View style={c.footer}>
          <View style={c.supplier}>
            <View style={c.supplierTile}><Text style={c.supplierInitial}>{result.rentalCompanyName.slice(0, 1).toUpperCase()}</Text></View>
            <View style={c.supplierCopy}><Text style={c.supplierName}>{offer?.rentalCompanyName || result.rentalCompanyName}</Text><Text numberOfLines={2} style={c.meta}>{result.pickupLocation}</Text>{pickup ? <Text style={c.pickup}>{pickup}</Text> : null}</View>
          </View>
          {offer ? <View style={c.priceColumn}><Text style={c.price}>{money(offer.currency, offer.pricePerDay)}<Text style={c.per}> /day</Text></Text><Text style={c.meta}>{money(offer.currency, offer.totalPrice)} total</Text><Text style={c.meta}>{days} day{days === 1 ? "" : "s"}</Text><Button label="View deal" onPress={onViewDeal} /></View> : <Text style={c.meta}>Live price unavailable</Text>}
        </View>
      </View>
    </View>
  );
}

function Spec({ icon, label }: { icon: FlowIconName; label: string }) {
  return <View style={c.spec}><FlowIcon name={icon} size={14} /><Text numberOfLines={1} style={c.specText}>{label}</Text></View>;
}
const capitalize = (value: string) => `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
const c = StyleSheet.create({
  card:{minHeight:250,borderWidth:1,borderColor:ui.border,borderRadius:13,overflow:"hidden",flexDirection:"row",backgroundColor:"white"},
  cardCompact:{minHeight:294}, visual:{width:"38%",backgroundColor:"#F4F6F9"},visualCompact:{width:"36%"},image:{width:"100%",height:"100%"},imageCompact:{height:"68%",marginTop:28},imageFallback:{flex:1,alignItems:"center",justifyContent:"center",gap:8,padding:10},fallbackText:{fontSize:10,color:ui.muted,textAlign:"center"},badge:{position:"absolute",top:10,left:9},
  copy:{flex:1,minWidth:0,padding:12,gap:5},copyCompact:{padding:9},heart:{position:"absolute",right:8,top:7,zIndex:2,width:36,height:36,borderRadius:18,borderWidth:1,borderColor:ui.border,alignItems:"center",justifyContent:"center",backgroundColor:"white"},name:{fontSize:16,fontWeight:"900",color:ui.navy,paddingRight:39},meta:{fontSize:10,color:ui.muted,lineHeight:14},rating:{flexDirection:"row",alignItems:"center",gap:6},score:{backgroundColor:ui.blue,color:"white",fontSize:11,fontWeight:"900",paddingHorizontal:4,paddingVertical:2,borderRadius:3},ratingText:{fontSize:10,color:ui.navy},
  specs:{flexDirection:"row",flexWrap:"wrap",gap:7},spec:{flexDirection:"row",alignItems:"center",gap:3,minWidth:62},specText:{fontSize:9,color:ui.navy},benefits:{flexDirection:"row",flexWrap:"wrap",gap:5},benefit:{flexDirection:"row",alignItems:"center",gap:2,backgroundColor:"#EAF8ED",borderRadius:5,paddingHorizontal:5,paddingVertical:3},benefitText:{fontSize:9,color:ui.green,fontWeight:"700"},
  footer:{marginTop:"auto",borderTopWidth:1,borderTopColor:"#EDF0F5",paddingTop:8,flexDirection:"row",alignItems:"flex-end",justifyContent:"space-between",gap:7},supplier:{flex:1,minWidth:0,flexDirection:"row",gap:6,alignItems:"flex-start"},supplierTile:{width:31,height:27,borderRadius:5,backgroundColor:"#EEF3FF",alignItems:"center",justifyContent:"center"},supplierInitial:{color:ui.blue,fontWeight:"900"},supplierCopy:{flex:1,minWidth:0},supplierName:{fontSize:11,color:ui.navy,fontWeight:"800"},pickup:{fontSize:9,color:ui.green,fontWeight:"700",marginTop:2},priceColumn:{alignItems:"flex-end",gap:2,maxWidth:112},price:{fontSize:20,fontWeight:"900",color:ui.navy},per:{fontSize:10,fontWeight:"700"},
});
