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
  if (!propertyDetails) return <View style={styles.locationSection}><Text accessibilityRole="header" style={[styles.heading, { color: theme.textPrimary }]}>Location</Text><Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Verified location details are not available for this property yet.</Text></View>;

  const streetAddress = propertyDetails.streetAddress.trim();
  const secondaryLocation = nativeHotelSecondaryLocation(propertyDetails);
  const facts = nativeHotelStayFitFacts(propertyDetails);
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
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.textPrimary }]}>Location</Text>
    {streetAddress || secondaryLocation ? <View style={styles.addressRow}><View accessible={false} style={[styles.pinCircle, { backgroundColor: theme.dark ? theme.surface : "#EFF6FF" }]}><MapPin accessible={false} size={18} color={accent} /></View><View style={styles.addressCopy}>{streetAddress ? <Text style={[styles.primaryAddress, { color: theme.textPrimary }]}>{streetAddress}</Text> : null}{secondaryLocation ? <Text style={[styles.secondaryAddress, { color: theme.textSecondary }]}>{secondaryLocation}</Text> : null}</View></View> : null}
    <View style={styles.mapShell}>
      {streetViewAvailable ? <View accessibilityRole="tablist" style={styles.mapTabs}>{(["map", "streetview"] as const).map((option) => <Pressable key={option} accessibilityRole="tab" accessibilityState={{ selected: view === option }} onPress={() => selectView(option)} style={[styles.mapTab, view === option && { borderBottomColor: accent }]}><Text style={[styles.mapTabText, { color: view === option ? accent : theme.textSecondary }]}>{option === "map" ? "Map" : "Street View"}</Text></Pressable>)}</View> : null}
      <View style={styles.mapViewport}>{view === "map" ? <Pressable accessibilityRole="button" accessibilityLabel={`Open full map for ${hotelName}`} accessibilityHint="Opens an interactive map inside Kurioticket" onPress={() => setFullMapOpen(true)} style={styles.mapPreview}>
        {Platform.OS === "ios" && hasValidHotelCoordinates(propertyDetails) ? <View pointerEvents="none" style={styles.map}><NativeAppleHotelMap key={`${hotelId}:${propertyDetails.latitude}:${propertyDetails.longitude}`} latitude={propertyDetails.latitude} longitude={propertyDetails.longitude} hotelName={hotelName} /></View> : Platform.OS !== "ios" && previewUrl && !mapPreviewFailed ? <Image accessible={false} source={{ uri: previewUrl }} resizeMode="cover" onError={() => setMapPreviewFailed(true)} style={styles.map} /> : <View style={styles.mapFallback}><MapPin accessible={false} size={24} color={theme.icon} /><Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Map preview unavailable</Text></View>}
      </Pressable> : streetViewUrl && !streetViewFailed ? <WebView key={`${hotelId}:streetview`} source={{ uri: streetViewUrl }} scrollEnabled={false} onError={() => setStreetViewFailed(true)} onHttpError={() => setStreetViewFailed(true)} style={styles.map} /> : <View style={styles.mapFallback}><MapPin accessible={false} size={24} color={theme.icon} /><Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Map preview unavailable</Text></View>}</View>
    </View>
    <NativeHotelFullMapModal visible={fullMapOpen} hotelId={hotelId} theme={theme} onClose={() => setFullMapOpen(false)} propertyDetails={propertyDetails} hotelName={hotelName} />
    <Text accessibilityRole="header" style={[styles.subheading, { color: theme.textPrimary }]}>Why this location works</Text>
    {facts.length ? <View style={styles.factList}>{facts.map((fact) => <View key={fact} style={styles.factRow}><Text accessible={false} style={[styles.factBullet, { color: accent }]}>•</Text><Text style={[styles.factText, { color: theme.textSecondary }]}>{fact}</Text></View>)}</View> : <Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Location fit details are limited to the verified address and map.</Text>}
  </View>;
}

const styles = StyleSheet.create({
  locationSection: { paddingVertical: 0 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: "700", fontFamily: appFonts.bold, letterSpacing: -0.25 },
  addressRow: { marginTop: 6, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  pinCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  addressCopy: { flex: 1, minWidth: 0 },
  primaryAddress: { fontSize: 13, lineHeight: 19, fontWeight: "500", fontFamily: appFonts.medium },
  secondaryAddress: { marginTop: 1, fontSize: 12, lineHeight: 18, fontWeight: "400", fontFamily: appFonts.regular },
  mapShell: { marginTop: 6, overflow: "hidden" },
  mapTabs: { flexDirection: "row", minHeight: 38, paddingHorizontal: 2 },
  mapTab: { minHeight: 38, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: "transparent", alignItems: "center", justifyContent: "center" },
  mapTabText: { fontSize: 14, lineHeight: 20, fontWeight: "700", fontFamily: appFonts.bold },
  mapViewport: { height: 190, width: "100%" },
  mapPreview: { flex: 1 },
  map: { flex: 1 },
  mapFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  subheading: { marginTop: 10, fontSize: 15, lineHeight: 22, fontWeight: "600", fontFamily: appFonts.semibold },
  factList: { marginTop: 4, gap: 3 },
  factRow: { flexDirection: "row", alignItems: "flex-start" },
  factBullet: { width: 20, fontSize: 14, lineHeight: 20 },
  factText: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: "400", fontFamily: appFonts.regular },
  fallbackText: { marginTop: 4, fontSize: 13, lineHeight: 20, fontWeight: "400", fontFamily: appFonts.regular },
});
