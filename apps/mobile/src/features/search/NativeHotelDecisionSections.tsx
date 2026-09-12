import { NativeAppleHotelMap } from "./NativeAppleHotelMap";
import { useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ArrowRight, ImageOff, MapPin } from "lucide-react-native";
import type { PublicHotelPropertyDetails } from "../../../../../src/lib/types";
import { buildHotelAddress, hasValidHotelCoordinates } from "../../../../../src/lib/hotels/hotelMap";
import { getApiBaseUrl } from "../../config/apiUrl";
import { colors } from "../../theme/tokens";
import { appFonts } from "../../theme/typography";
import { NativeHotelFullMapModal } from "./NativeHotelFullMapModal";
import { nativeHotelLocationPreviewUrl } from "./nativeHotelLocationModel";
import type { NativeRelatedHotel } from "./nativeHotelRelatedHotelsModel";

type Theme = { dark: boolean; surface: string; border: string; textPrimary: string; textSecondary: string; icon: string };

export function NativeHotelPropertyLocationSection({ hotelId, hotelName, propertyDetails, theme }: {
  hotelId: string;
  hotelName: string;
  propertyDetails: PublicHotelPropertyDetails | null;
  theme: Theme;
}) {
  const [mapFailed, setMapFailed] = useState(false);
  const [fullMapOpen, setFullMapOpen] = useState(false);
  if (!propertyDetails) return null;
  const address = buildHotelAddress(propertyDetails);
  const api = getApiBaseUrl(Platform.OS, __DEV__);
  const mapUrl = api.ok ? nativeHotelLocationPreviewUrl(api.baseUrl, hotelId) : null;
  const openFullMap = () => { setFullMapOpen(true); };
  return <View style={styles.locationCard}>
    <View style={styles.locationHeader}>
      <Text accessibilityRole="header" style={[styles.locationHeading, { color: theme.dark ? theme.textPrimary : "#020617" }]}>Property location</Text>
      {address ? <Text style={[styles.address, { color: theme.dark ? theme.textSecondary : "#475569" }]}>{address}</Text> : null}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Open full map for ${hotelName}`} accessibilityHint="Opens an interactive map inside Kurioticket" onPress={openFullMap} style={[styles.mapFrame, { backgroundColor: theme.dark ? theme.surface : "#F1F5F9", borderColor: theme.border }]}>
      {Platform.OS === "ios" && hasValidHotelCoordinates(propertyDetails) ? <View pointerEvents="none" style={styles.map}><NativeAppleHotelMap key={`${hotelId}:${propertyDetails.latitude}:${propertyDetails.longitude}`} latitude={propertyDetails.latitude} longitude={propertyDetails.longitude} hotelName={hotelName} /></View> : Platform.OS !== "ios" && mapUrl && !mapFailed ? <Image accessible={false} source={{ uri: mapUrl }} resizeMode="cover" onError={() => setMapFailed(true)} style={styles.map} /> : <View style={styles.mapFallback}>
        <MapPin accessible={false} size={25} color={theme.icon} />
        <Text style={[styles.address, { color: theme.dark ? theme.textSecondary : "#475569" }]}>Map preview unavailable</Text>
      </View>}
    </Pressable>
    <NativeHotelFullMapModal visible={fullMapOpen} hotelId={hotelId} theme={theme} onClose={() => setFullMapOpen(false)} propertyDetails={propertyDetails} hotelName={hotelName} />
  </View>;
}

function RelatedHotelCard({ item, theme, onView }: { item: NativeRelatedHotel; theme: Theme; onView: (item: NativeRelatedHotel) => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const relatedActionColor = theme.dark ? "#8FB5FF" : colors.blue;
  return <Pressable accessibilityRole="button" accessibilityLabel={`View hotel ${item.hotel.name}`} onPress={() => onView(item)} style={[styles.relatedCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <View style={styles.imageFrame}>
      {item.hotel.imageUrl && !imageFailed
        ? <Image source={{ uri: item.hotel.imageUrl }} resizeMode="cover" onError={() => setImageFailed(true)} style={styles.image} />
        : <View style={styles.imageFallback}><ImageOff accessible={false} size={20} color={theme.icon} /><Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Image unavailable</Text></View>}
    </View>
    <View style={styles.cardBody}>
      {item.classificationStars ? <Text accessible accessibilityLabel={`${item.classificationStars} star hotel`} style={styles.stars}>{"★".repeat(item.classificationStars)}</Text> : null}
      <Text numberOfLines={2} style={[styles.hotelName, { color: theme.textPrimary }]}>{item.hotel.name}</Text>
      {item.location ? <Text numberOfLines={2} style={[styles.location, { color: theme.textSecondary }]}>{item.location}</Text> : null}
      <View style={styles.priceBlock}>
        {item.displayPrices?.nightly && item.displayPrices.total ? <>
          <Text accessibilityLabel={`${item.displayPrices.nightly.accessibilityLabel} per night`} style={[styles.nightly, { color: theme.textPrimary }]}>{item.displayPrices.nightly.formatted} per night</Text>
          <Text accessibilityLabel={`${item.displayPrices.total.accessibilityLabel} estimated stay total`} style={[styles.total, { color: theme.textSecondary }]}>{item.displayPrices.total.formatted} estimated stay total</Text>
        </> : <Text style={[styles.priceUnavailable, { color: theme.textSecondary }]}>Price unavailable</Text>}
      </View>
      <View style={[styles.viewRow, { borderTopColor: theme.border }]}><Text style={[styles.viewText, { color: relatedActionColor }]}>View hotel</Text><ArrowRight accessible={false} size={16} color={relatedActionColor} /></View>
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
  heading: { fontSize: 18, lineHeight: 24, fontWeight: "700", fontFamily: appFonts.bold },
  locationCard: { marginTop: 24 },
  locationHeader: { paddingBottom: 12 },
  locationHeading: { fontSize: 17, lineHeight: 22, fontWeight: "700", fontFamily: appFonts.bold },
  address: { marginTop: 4, fontSize: 13, lineHeight: 19, fontWeight: "400", fontFamily: appFonts.regular },
  mapFrame: { position: "relative", height: 216, width: "100%", borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, overflow: "hidden" },
  map: { flex: 1 },
  mapFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  relatedSection: { marginTop: 10, gap: 12 },
  carouselViewport: { marginHorizontal: -16 },
  carousel: { gap: 10, paddingHorizontal: 16, paddingBottom: 4 },
  relatedCard: { overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderRadius: 15 },
  imageFrame: { aspectRatio: 1.95, backgroundColor: "#E7EBF2" },
  image: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  fallbackText: { fontSize: 12, lineHeight: 16, fontWeight: "500", fontFamily: appFonts.medium },
  cardBody: { minHeight: 158, padding: 10 },
  stars: { color: "#F59E0B", fontSize: 12, lineHeight: 16, letterSpacing: 0.96, fontWeight: "400", fontFamily: appFonts.regular },
  hotelName: { marginTop: 3, fontSize: 15, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  location: { marginTop: 3, fontSize: 12, lineHeight: 18, fontWeight: "400", fontFamily: appFonts.regular },
  priceBlock: { marginTop: "auto", paddingTop: 10, gap: 3 },
  nightly: { fontSize: 14, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  total: { fontSize: 12, lineHeight: 16, fontWeight: "400", fontFamily: appFonts.regular },
  priceUnavailable: { fontSize: 14, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  viewRow: { minHeight: 44, marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  viewText: { fontSize: 14, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
});