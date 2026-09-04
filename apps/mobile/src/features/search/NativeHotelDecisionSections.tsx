import { useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ArrowRight, ImageOff, MapPin } from "lucide-react-native";
import { WebView } from "react-native-webview";
import type { PublicHotelPropertyDetails } from "../../../../../src/lib/types";
import { buildHotelAddress, buildHotelDirectionsUrl, buildOpenStreetMapHotelMapEmbedUrl } from "../../../../../src/lib/hotels/hotelMap";
import { colors } from "../../theme/tokens";
import type { NativeRelatedHotel } from "./nativeHotelRelatedHotelsModel";

type Theme = { surface: string; border: string; textPrimary: string; textSecondary: string; icon: string };

export function NativeHotelPropertyLocationSection({ hotelName, propertyDetails, theme }: {
  hotelName: string;
  propertyDetails: PublicHotelPropertyDetails | null;
  theme: Theme;
}) {
  const [mapFailed, setMapFailed] = useState(false);
  if (!propertyDetails) return null;
  const address = buildHotelAddress(propertyDetails);
  const mapUrl = buildOpenStreetMapHotelMapEmbedUrl(propertyDetails);
  const directionsUrl = buildHotelDirectionsUrl({ hotelName, propertyDetails });
  if (!address && !mapUrl) return null;
  const openMaps = async () => {
    if (!directionsUrl) return;
    try { await Linking.openURL(directionsUrl); } catch { /* Fail softly; the location remains visible. */ }
  };
  return <View style={[styles.locationCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.textPrimary }]}>Property location</Text>
    {address ? <Text style={[styles.address, { color: theme.textSecondary }]}>{address}</Text> : null}
    {directionsUrl ? <Pressable accessibilityRole="link" accessibilityLabel={`Open ${hotelName} in Maps`} onPress={() => void openMaps()} style={styles.mapsButton}>
      <MapPin accessible={false} size={17} color="white" />
      <Text style={styles.mapsButtonText}>Open in Maps</Text>
    </Pressable> : null}
    {mapUrl && !mapFailed ? <View pointerEvents="none" style={styles.mapClip}>
      <WebView source={{ uri: mapUrl }} scrollEnabled={false} onError={() => setMapFailed(true)} style={styles.map} />
    </View> : mapUrl ? <View style={[styles.mapFallback, { borderColor: theme.border }]}>
      <MapPin accessible={false} size={25} color={theme.icon} />
      <Text style={[styles.address, { color: theme.textSecondary }]}>Map preview unavailable</Text>
    </View> : null}
  </View>;
}

function RelatedHotelCard({ item, theme, onView }: { item: NativeRelatedHotel; theme: Theme; onView: (item: NativeRelatedHotel) => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={`View hotel ${item.hotel.name}`} onPress={() => onView(item)} style={[styles.relatedCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <View style={styles.imageFrame}>
      {item.hotel.imageUrl && !imageFailed
        ? <Image source={{ uri: item.hotel.imageUrl }} resizeMode="cover" onError={() => setImageFailed(true)} style={styles.image} />
        : <View style={styles.imageFallback}><ImageOff accessible={false} size={22} color={theme.icon} /><Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Image unavailable</Text></View>}
    </View>
    <View style={styles.cardBody}>
      {item.classificationStars ? <Text accessible accessibilityLabel={`${item.classificationStars} star hotel`} style={styles.stars}>{"★".repeat(item.classificationStars)}</Text> : null}
      <Text numberOfLines={2} style={[styles.hotelName, { color: theme.textPrimary }]}>{item.hotel.name}</Text>
      {item.location ? <Text numberOfLines={2} style={[styles.location, { color: theme.textSecondary }]}>{item.location}</Text> : null}
      <View style={styles.priceBlock}>
        {item.displayPrices?.nightly && item.displayPrices.total ? <>
          <Text accessibilityLabel={`${item.displayPrices.nightly.accessibilityLabel} per night`} style={[styles.nightly, { color: theme.textPrimary }]}>{item.displayPrices.nightly.formatted} per night</Text>
          <Text accessibilityLabel={`${item.displayPrices.total.accessibilityLabel} estimated stay total`} style={[styles.total, { color: theme.textSecondary }]}>{item.displayPrices.total.formatted} estimated stay total</Text>
        </> : <Text style={[styles.nightly, { color: theme.textSecondary }]}>Price unavailable</Text>}
      </View>
      <View style={[styles.viewRow, { borderTopColor: theme.border }]}><Text style={[styles.viewText, { color: theme.textPrimary }]}>View hotel</Text><ArrowRight accessible={false} size={17} color={theme.icon} /></View>
    </View>
  </Pressable>;
}

export function NativeRelatedHotelsSection({ city, hotels, theme, onViewHotel }: { city?: string | null; hotels: NativeRelatedHotel[]; theme: Theme; onViewHotel: (item: NativeRelatedHotel) => void }) {
  const width = useWindowDimensions().width;
  if (!hotels.length) return null;
  const cardWidth = Math.min(300, Math.max(240, width * 0.82));
  return <View style={styles.relatedSection}>
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.textPrimary }]}>{city?.trim() ? `More hotels in ${city.trim()}` : "More hotels nearby"}</Text>
    <ScrollView horizontal style={styles.carouselViewport} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel} directionalLockEnabled>
      {hotels.map((item) => <View key={item.hotel.id} style={{ width: cardWidth }}><RelatedHotelCard item={item} theme={theme} onView={onViewHotel} /></View>)}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  heading: { fontSize: 20, lineHeight: 26, fontWeight: "900" },
  locationCard: { marginTop: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 16, gap: 11, overflow: "hidden" },
  address: { fontSize: 13, lineHeight: 19 },
  mapsButton: { minHeight: 44, alignSelf: "flex-start", paddingHorizontal: 15, borderRadius: 8, backgroundColor: colors.blue, flexDirection: "row", alignItems: "center", gap: 8 },
  mapsButtonText: { color: "white", fontSize: 13, fontWeight: "800" },
  mapClip: { height: 250, width: "100%", borderRadius: 11, overflow: "hidden" },
  map: { flex: 1 },
  mapFallback: { height: 250, borderWidth: StyleSheet.hairlineWidth, borderRadius: 11, alignItems: "center", justifyContent: "center", gap: 8 },
  relatedSection: { marginTop: 10, gap: 14 },
  carouselViewport: { marginHorizontal: -16 },
  carousel: { gap: 14, paddingHorizontal: 16, paddingBottom: 6 },
  relatedCard: { overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderRadius: 15 },
  imageFrame: { aspectRatio: 16 / 9, backgroundColor: "#E7EBF2" },
  image: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  fallbackText: { fontSize: 12, fontWeight: "600" },
  cardBody: { minHeight: 190, padding: 13 },
  stars: { color: "#F5A623", fontSize: 13, lineHeight: 18, letterSpacing: 1 },
  hotelName: { marginTop: 3, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  location: { marginTop: 3, fontSize: 12, lineHeight: 18 },
  priceBlock: { marginTop: "auto", paddingTop: 12, gap: 3 },
  nightly: { fontSize: 14, lineHeight: 19, fontWeight: "800" },
  total: { fontSize: 12, lineHeight: 17 },
  viewRow: { minHeight: 44, marginTop: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  viewText: { fontSize: 14, fontWeight: "800" },
});
