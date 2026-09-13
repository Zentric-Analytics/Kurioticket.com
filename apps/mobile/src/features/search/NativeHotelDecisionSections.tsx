import { NativeAppleHotelMap } from "./NativeAppleHotelMap";
import { useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ImageOff, MapPin } from "lucide-react-native";
import type { PublicHotelPropertyDetails } from "../../../../../src/lib/types";
import { buildHotelAddress, hasValidHotelCoordinates } from "../../../../../src/lib/hotels/hotelMap";
import { getApiBaseUrl } from "../../config/apiUrl";
import { colors } from "../../theme/tokens";
import { appFonts } from "../../theme/typography";
import { HOTEL_LIMITS } from "../flow/hotelSearchModel";
import { NativeHotelFullMapModal } from "./NativeHotelFullMapModal";
import { nativeHotelLocationPreviewUrl } from "./nativeHotelLocationModel";
import type { NativeRelatedHotel } from "./nativeHotelRelatedHotelsModel";

type Theme = { dark: boolean; surface: string; border: string; textPrimary: string; textSecondary: string; icon: string };
const RELATED_HOTEL_CARD_WIDTH = 241;

const one = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;
const normalizedCount = (value: string | string[] | undefined, fallback: number, maximum: number) => {
  const raw = one(value);
  if (!raw || !/^\d+$/.test(raw)) return fallback;
  const parsed = Number(raw);
  return parsed >= 1 && parsed <= maximum ? parsed : fallback;
};

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
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={`View hotel ${item.hotel.name}`}
    onPress={() => onView(item)}
    style={({ pressed }) => [
      styles.relatedCard,
      { backgroundColor: theme.surface, borderColor: theme.border },
      pressed && styles.relatedCardPressed,
    ]}
  >
    <View style={styles.imageFrame}>
      {item.hotel.imageUrl && !imageFailed
        ? <Image source={{ uri: item.hotel.imageUrl }} resizeMode="cover" onError={() => setImageFailed(true)} style={styles.image} />
        : <View style={styles.imageFallback}><ImageOff accessible={false} size={20} color={theme.icon} /><Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Image unavailable</Text></View>}
    </View>
    <View style={styles.cardBody}>
      {item.classificationStars ? <Text accessible accessibilityLabel={`${item.classificationStars} star hotel`} style={styles.stars}>{"★".repeat(item.classificationStars)}</Text> : null}
      <Text numberOfLines={2} style={[styles.hotelName, { color: theme.textPrimary }]}>{item.hotel.name}</Text>
      {item.location ? <Text numberOfLines={1} style={[styles.location, { color: theme.textSecondary }]}>{item.location}</Text> : null}
      <View style={styles.priceBlock}>
        {item.displayPrices?.nightly ? (
          <Text accessibilityLabel={`${item.displayPrices.nightly.accessibilityLabel} per night`} style={[styles.nightly, { color: theme.textPrimary }]}>{item.displayPrices.nightly.formatted} per night</Text>
        ) : <Text style={[styles.priceUnavailable, { color: theme.textSecondary }]}>Price unavailable</Text>}
      </View>
    </View>
  </Pressable>;
}

export function NativeRelatedHotelsSection({ city, hotels, theme, onViewHotel }: {
  city?: string | null;
  hotels: NativeRelatedHotel[];
  theme: Theme;
  onViewHotel: (item: NativeRelatedHotel) => void;
}) {
  const routeParams = useLocalSearchParams<Record<string, string | string[]>>();
  if (!hotels.length) return null;
  const params: Record<string, string | string[]> = {
    ...routeParams,
    guests: String(normalizedCount(routeParams.guests, 2, HOTEL_LIMITS.guests.max)),
    rooms: String(normalizedCount(routeParams.rooms, 1, HOTEL_LIMITS.rooms.max)),
  };
  const cityName = city?.trim();
  const seeAllHotels = () => {
    router.push({
      pathname: "/hotel-results",
      params: {
        destination: cityName || one(params.destination) || "",
        checkIn: one(params.checkIn) || "",
        checkOut: one(params.checkOut) || "",
        guests: one(params.guests) || "2",
        rooms: one(params.rooms) || "1",
      },
    });
  };
  return <View style={styles.relatedSection}>
    <View style={styles.relatedHeader}>
      <Text accessibilityRole="header" numberOfLines={1} style={[styles.heading, { color: theme.textPrimary }]}>{cityName ? `More hotels in ${cityName}` : "More hotels nearby"}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cityName ? `See all hotels in ${cityName}` : "See all nearby hotels"}
        hitSlop={8}
        onPress={seeAllHotels}
        style={({ pressed }) => [styles.seeAllButton, pressed && styles.seeAllPressed]}
      >
        <Text style={[styles.seeAllText, { color: theme.dark ? "#8FB5FF" : colors.blue }]}>See all</Text>
      </Pressable>
    </View>
    <ScrollView horizontal style={styles.carouselViewport} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel} directionalLockEnabled>
      {hotels.map((item) => <View key={item.hotel.id} style={styles.relatedCardSlot}><RelatedHotelCard item={item} theme={theme} onView={onViewHotel} /></View>)}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  heading: { flex: 1, minWidth: 0, fontSize: 18, lineHeight: 24, fontWeight: "700", fontFamily: appFonts.bold },
  locationCard: { marginTop: 24 },
  locationHeader: { paddingBottom: 12 },
  locationHeading: { fontSize: 17, lineHeight: 22, fontWeight: "700", fontFamily: appFonts.bold },
  address: { marginTop: 4, fontSize: 13, lineHeight: 19, fontWeight: "400", fontFamily: appFonts.regular },
  mapFrame: { position: "relative", height: 216, width: "100%", borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, overflow: "hidden" },
  map: { flex: 1 },
  mapFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  relatedSection: { marginTop: 4 },
  relatedHeader: { minHeight: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  seeAllButton: { minHeight: 32, justifyContent: "center", flexShrink: 0 },
  seeAllText: { fontSize: 14, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  seeAllPressed: { opacity: 0.58 },
  carouselViewport: { marginHorizontal: -16, marginTop: 8 },
  carousel: { gap: 12, paddingHorizontal: 16, paddingBottom: 2 },
  relatedCardSlot: { width: RELATED_HOTEL_CARD_WIDTH },
  relatedCard: { overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderRadius: 10 },
  relatedCardPressed: { opacity: 0.82 },
  imageFrame: { height: 160, width: "100%", backgroundColor: "#E7EBF2" },
  image: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  fallbackText: { fontSize: 12, lineHeight: 16, fontWeight: "500", fontFamily: appFonts.medium },
  cardBody: { minHeight: 143, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
  stars: { color: "#F59E0B", fontSize: 12, lineHeight: 16, letterSpacing: 0.96, fontWeight: "400", fontFamily: appFonts.regular },
  hotelName: { marginTop: 3, fontSize: 15, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  location: { marginTop: 3, fontSize: 12, lineHeight: 18, fontWeight: "400", fontFamily: appFonts.regular },
  priceBlock: { marginTop: "auto", paddingTop: 10 },
  nightly: { fontSize: 14, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  priceUnavailable: { fontSize: 14, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
});
