import { NativeAppleHotelMap } from "./NativeAppleHotelMap";
import { useEffect, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { MapPin } from "lucide-react-native";
import { WebView } from "react-native-webview";
import type { PublicHotelPropertyDetails } from "../../../../../src/lib/types";
import { hasValidHotelCoordinates } from "../../../../../src/lib/hotels/hotelMap";
import { getApiBaseUrl } from "../../config/apiUrl";
import { colors } from "../../theme/tokens";
import { appFonts } from "../../theme/typography";
import { NativeHotelFullMapModal } from "./NativeHotelFullMapModal";
import {
  nativeHotelLocationEmbedUrl,
  nativeHotelLocationPreviewUrl,
  nativeHotelSecondaryLocation,
  nativeHotelStayFitFacts,
  type NativeHotelLocationView,
} from "./nativeHotelLocationModel";

type Theme = { dark: boolean; surface: string; border: string; textPrimary: string; textSecondary: string; icon: string };
const rememberedHotelLocationViews = new Map<string, NativeHotelLocationView>();

export function NativeHotelLocationSection({ hotelId, hotelName, propertyDetails, theme }: {
  hotelId: string;
  hotelName: string;
  propertyDetails: PublicHotelPropertyDetails | null;
  theme: Theme;
}) {
  const [view, setView] = useState<NativeHotelLocationView>(() => rememberedHotelLocationViews.get(hotelId) ?? "map");
  const [mapPreviewFailed, setMapPreviewFailed] = useState(false);
  const [streetViewFailed, setStreetViewFailed] = useState(false);
  const [fullMapOpen, setFullMapOpen] = useState(false);
  useEffect(() => {
    setView(rememberedHotelLocationViews.get(hotelId) ?? "map");
    setMapPreviewFailed(false);
    setStreetViewFailed(false);
    setFullMapOpen(false);
  }, [hotelId]);
  if (!propertyDetails) return <View style={styles.locationSection}><Text accessibilityRole="header" style={[styles.heading, { color: theme.textPrimary }]}>Location &amp; stay fit</Text><Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Verified location details are not available for this property yet.</Text></View>;

  const streetAddress = propertyDetails.streetAddress.trim();
  const secondaryLocation = nativeHotelSecondaryLocation(propertyDetails);
  const facts = nativeHotelStayFitFacts(propertyDetails);
  const accessibility = propertyDetails.accessibility?.map((detail) => detail.trim()).filter(Boolean) ?? [];
  const api = getApiBaseUrl(Platform.OS, __DEV__);
  const previewUrl = api.ok ? nativeHotelLocationPreviewUrl(api.baseUrl, hotelId) : null;
  const streetViewUrl = api.ok ? nativeHotelLocationEmbedUrl(api.baseUrl, hotelId, "streetview") : null;
  const streetViewAvailable = hasValidHotelCoordinates(propertyDetails);
  const accent = theme.dark ? "#8FB5FF" : colors.blue;
  const selectView = (next: NativeHotelLocationView) => {
    if (next === "streetview") setStreetViewFailed(false);
    rememberedHotelLocationViews.set(hotelId, next);
    setView(next);
  };

  return <View style={styles.locationSection}>
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.textPrimary }]}>Location &amp; stay fit</Text>
    {streetAddress || secondaryLocation ? <View style={styles.addressRow}><View accessible={false} style={[styles.pinCircle, { backgroundColor: theme.dark ? theme.surface : "#EFF6FF" }]}><MapPin accessible={false} size={18} color={accent} /></View><View style={styles.addressCopy}>{streetAddress ? <Text style={[styles.primaryAddress, { color: theme.textPrimary }]}>{streetAddress}</Text> : null}{secondaryLocation ? <Text style={[styles.secondaryAddress, { color: theme.textSecondary }]}>{secondaryLocation}</Text> : null}</View></View> : null}
    <View style={[styles.mapCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {streetViewAvailable ? <View accessibilityRole="tablist" style={[styles.mapTabs, { borderBottomColor: theme.border }]}>{(["map", "streetview"] as const).map((option) => <Pressable key={option} accessibilityRole="tab" accessibilityState={{ selected: view === option }} onPress={() => selectView(option)} style={[styles.mapTab, view === option && { borderBottomColor: accent }]}><Text style={[styles.mapTabText, { color: view === option ? accent : theme.textSecondary }]}>{option === "map" ? "Map" : "Street View"}</Text></Pressable>)}</View> : null}
      <View style={styles.mapViewport}>{view === "map" ? <Pressable accessibilityRole="button" accessibilityLabel={`Open full map for ${hotelName}`} accessibilityHint="Opens an interactive map inside Kurioticket" onPress={() => setFullMapOpen(true)} style={styles.mapPreview}>
        {Platform.OS === "ios" && hasValidHotelCoordinates(propertyDetails) ? <View pointerEvents="none" style={styles.map}><NativeAppleHotelMap key={`${hotelId}:${propertyDetails.latitude}:${propertyDetails.longitude}`} latitude={propertyDetails.latitude} longitude={propertyDetails.longitude} hotelName={hotelName} /></View> : Platform.OS !== "ios" && previewUrl && !mapPreviewFailed ? <Image accessible={false} source={{ uri: previewUrl }} resizeMode="cover" onError={() => setMapPreviewFailed(true)} style={styles.map} /> : <View style={styles.mapFallback}><MapPin accessible={false} size={24} color={theme.icon} /><Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Map preview unavailable</Text></View>}
      </Pressable> : streetViewUrl && !streetViewFailed ? <WebView key={`${hotelId}:streetview`} source={{ uri: streetViewUrl }} scrollEnabled={false} onError={() => setStreetViewFailed(true)} onHttpError={() => setStreetViewFailed(true)} style={styles.map} /> : <View style={styles.mapFallback}><MapPin accessible={false} size={24} color={theme.icon} /><Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Map preview unavailable</Text></View>}</View>
    </View>
    <NativeHotelFullMapModal visible={fullMapOpen} hotelId={hotelId} theme={theme} onClose={() => setFullMapOpen(false)} propertyDetails={propertyDetails} hotelName={hotelName} />
    <Text accessibilityRole="header" style={[styles.subheading, { color: theme.textPrimary }]}>Why this location works</Text>
    {facts.length ? <View style={styles.factList}>{facts.map((fact) => <View key={fact} style={[styles.factChip, { backgroundColor: theme.dark ? "#1E2B42" : "#F1F5F9" }]}><Text style={[styles.factText, { color: theme.textSecondary }]}>{fact}</Text></View>)}</View> : <Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Location fit details are limited to the verified address and map.</Text>}
    <Text accessibilityRole="header" style={[styles.accessibilityHeading, { color: theme.textPrimary }]}>Accessibility and location details</Text>
    {accessibility.length ? <View style={styles.accessibilityList}>{accessibility.map((detail) => <View key={detail} style={styles.accessibilityRow}><Text accessible={false} style={[styles.accessibilityBullet, { color: accent }]}>•</Text><Text style={[styles.accessibilityText, { color: theme.textSecondary }]}>{detail}</Text></View>)}</View> : <Text style={[styles.accessibilityText, styles.accessibilityFallback, { color: theme.textSecondary }]}>Confirm specific accessibility requirements with the property before travel.</Text>}
  </View>;
}

const styles = StyleSheet.create({
  locationSection: { paddingVertical: 8 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: "700", fontFamily: appFonts.bold, letterSpacing: -0.25 },
  addressRow: { marginTop: 10, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  pinCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  addressCopy: { flex: 1, minWidth: 0, paddingTop: 2 },
  primaryAddress: { fontSize: 13, lineHeight: 19, fontWeight: "500", fontFamily: appFonts.medium },
  secondaryAddress: { marginTop: 2, fontSize: 12, lineHeight: 18, fontWeight: "400", fontFamily: appFonts.regular },
  mapCard: { marginTop: 12, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  mapTabs: { flexDirection: "row", minHeight: 44, borderBottomWidth: 1, paddingHorizontal: 4 },
  mapTab: { minHeight: 44, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: "transparent", alignItems: "center", justifyContent: "center" },
  mapTabText: { fontSize: 14, lineHeight: 20, fontWeight: "700", fontFamily: appFonts.bold },
  mapViewport: { height: 216, width: "100%" },
  mapPreview: { flex: 1 },
  map: { flex: 1 },
  mapFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  subheading: { marginTop: 22, fontSize: 15, lineHeight: 22, fontWeight: "600", fontFamily: appFonts.semibold },
  factList: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  factChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  factText: { fontSize: 12, lineHeight: 16, fontWeight: "500", fontFamily: appFonts.medium },
  accessibilityHeading: { marginTop: 22, fontSize: 15, lineHeight: 22, fontWeight: "600", fontFamily: appFonts.semibold },
  accessibilityList: { marginTop: 8, gap: 6 },
  accessibilityRow: { flexDirection: "row", alignItems: "flex-start" },
  accessibilityBullet: { width: 20, fontSize: 14, lineHeight: 24 },
  accessibilityText: { flex: 1, fontSize: 13, lineHeight: 22, fontWeight: "400", fontFamily: appFonts.regular },
  accessibilityFallback: { marginTop: 8 },
  fallbackText: { marginTop: 8, fontSize: 13, lineHeight: 22, fontWeight: "400", fontFamily: appFonts.regular },
});