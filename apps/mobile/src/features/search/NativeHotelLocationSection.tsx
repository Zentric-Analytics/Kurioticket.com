import { NativeAppleHotelMap } from "./NativeAppleHotelMap";
import { NativeAppleCarLookAroundPreview, type NativeAppleCarLookAroundStatus } from "./NativeAppleCarLookAroundPreview";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { MapPin } from "lucide-react-native";
import { WebView } from "react-native-webview";
import type { PublicHotelPropertyDetails } from "../../../../../src/lib/types";
import { hasValidHotelCoordinates } from "../../../../../src/lib/hotels/hotelMap";
import { getApiBaseUrl } from "../../config/apiUrl";
import { colors } from "../../theme/tokens";
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
const STREET_VIEW_SETTLE_MS = 900;
function rememberedHotelLocationView(hotelId: string): NativeHotelLocationView {
  return rememberedHotelLocationViews.get(hotelId) ?? "map";
}

export function NativeHotelLocationSection({ hotelId, hotelName, propertyDetails, theme }: {
  hotelId: string;
  hotelName: string;
  propertyDetails: PublicHotelPropertyDetails | null;
  theme: Theme;
}) {
  const [view, setView] = useState<NativeHotelLocationView>(() => rememberedHotelLocationView(hotelId));
  const [mapPreviewFailed, setMapPreviewFailed] = useState(false);
  const [streetViewFailed, setStreetViewFailed] = useState(false);
  const [streetViewLoading, setStreetViewLoading] = useState(true);
  const [lookAroundStatus, setLookAroundStatus] = useState<NativeAppleCarLookAroundStatus>("loading");
  const [fullMapOpen, setFullMapOpen] = useState(false);
  const streetViewReadyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearStreetViewReadyTimer = () => {
    if (!streetViewReadyTimer.current) return;
    clearTimeout(streetViewReadyTimer.current);
    streetViewReadyTimer.current = null;
  };
  const failStreetView = () => {
    clearStreetViewReadyTimer();
    setStreetViewLoading(false);
    setStreetViewFailed(true);
  };
  useEffect(() => {
    clearStreetViewReadyTimer();
    setView(rememberedHotelLocationView(hotelId));
    setMapPreviewFailed(false);
    setStreetViewFailed(false);
    setStreetViewLoading(true);
    setLookAroundStatus("loading");
    setFullMapOpen(false);
  }, [hotelId]);
  useEffect(() => () => clearStreetViewReadyTimer(), []);
  if (!propertyDetails) return <View style={styles.locationSection}><Text accessibilityRole="header" style={[styles.heading, { color: theme.textPrimary }]}>Location</Text><Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Verified location details are not available for this property yet.</Text></View>;

  const streetAddress = propertyDetails.streetAddress.trim();
  const secondaryLocation = nativeHotelSecondaryLocation(propertyDetails);
  const facts = nativeHotelStayFitFacts(propertyDetails);
  const api = getApiBaseUrl(Platform.OS, __DEV__);
  const previewUrl = api.ok ? nativeHotelLocationPreviewUrl(api.baseUrl, hotelId) : null;
  const streetViewUrl = Platform.OS === "ios" ? null : api.ok ? nativeHotelLocationEmbedUrl(api.baseUrl, hotelId, "streetview") : null;
  const streetViewAvailable = hasValidHotelCoordinates(propertyDetails);
  const effectiveView = view;
  const accent = theme.dark ? "#8FB5FF" : colors.blue;
  const iconColor = theme.dark ? theme.icon : "#1A1A1A";
  const selectView = (next: NativeHotelLocationView) => {
    if (next === effectiveView) return;
    if (next === "streetview") {
      clearStreetViewReadyTimer();
      setStreetViewFailed(false);
      setStreetViewLoading(true);
      setLookAroundStatus("loading");
    }
    rememberedHotelLocationViews.set(hotelId, next);
    setView(next);
  };
  const settleStreetView = () => {
    clearStreetViewReadyTimer();
    streetViewReadyTimer.current = setTimeout(() => {
      setStreetViewLoading(false);
      streetViewReadyTimer.current = null;
    }, STREET_VIEW_SETTLE_MS);
  };

  return <View style={styles.locationSection}>
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.textPrimary }]}>Location</Text>
    {streetAddress || secondaryLocation ? <View style={styles.addressRow}><View accessible={false} style={[styles.pinCircle, { backgroundColor: theme.dark ? theme.surface : "#F5F5F5" }]}><MapPin accessible={false} size={18} strokeWidth={1.3} color={iconColor} /></View><View style={styles.addressCopy}>{streetAddress ? <Text style={[styles.primaryAddress, { color: theme.textPrimary }]}>{streetAddress}</Text> : null}{secondaryLocation ? <Text style={[styles.secondaryAddress, { color: theme.textSecondary }]}>{secondaryLocation}</Text> : null}</View></View> : null}
    <View style={styles.mapShell}>
      {streetViewAvailable ? <View accessibilityRole="tablist" style={styles.mapTabs}>{(["map", "streetview"] as const).map((option) => <Pressable key={option} accessibilityRole="tab" accessibilityState={{ selected: effectiveView === option }} onPress={() => selectView(option)} style={[styles.mapTab, effectiveView === option && { borderBottomColor: accent }]}><Text style={[styles.mapTabText, { color: effectiveView === option ? accent : theme.textSecondary }]}>{option === "map" ? "Map" : Platform.OS === "ios" ? "Look Around" : "Street View"}</Text></Pressable>)}</View> : null}
      <View style={styles.mapViewport}>{effectiveView === "map" ? <Pressable accessibilityRole="button" accessibilityLabel={`Open full map for ${hotelName}`} accessibilityHint="Opens an interactive map inside Kurioticket" onPress={() => setFullMapOpen(true)} style={styles.mapPreview}>
        {Platform.OS === "ios" && hasValidHotelCoordinates(propertyDetails) ? <View pointerEvents="none" style={styles.map}><NativeAppleHotelMap key={`${hotelId}:${propertyDetails.latitude}:${propertyDetails.longitude}`} latitude={propertyDetails.latitude} longitude={propertyDetails.longitude} hotelName={hotelName} /></View> : Platform.OS !== "ios" && previewUrl && !mapPreviewFailed ? <Image accessible={false} source={{ uri: previewUrl }} resizeMode="cover" onError={() => setMapPreviewFailed(true)} style={styles.map} /> : <View style={styles.mapFallback}><MapPin accessible={false} size={24} strokeWidth={1.3} color={iconColor} /><Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Map preview unavailable</Text></View>}
      </Pressable> : Platform.OS === "ios" && streetViewAvailable ? <View style={styles.streetViewFrame}><NativeAppleCarLookAroundPreview key={`${hotelId}:look-around:${propertyDetails.latitude}:${propertyDetails.longitude}`} latitude={propertyDetails.latitude} longitude={propertyDetails.longitude} locationLabel={hotelName} style={styles.map} onStatusChange={setLookAroundStatus} />{lookAroundStatus === "loading" ? <View pointerEvents="none" accessibilityRole="progressbar" accessibilityLabel="Loading Look Around" style={[styles.streetViewLoading, { backgroundColor: theme.surface }]}><ActivityIndicator size="small" color={accent} /></View> : null}{lookAroundStatus === "unavailable" ? <View style={[styles.mapFallback, styles.lookAroundOverlay, { backgroundColor: theme.surface }]}><MapPin accessible={false} size={24} strokeWidth={1.3} color={iconColor} /><Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Look Around unavailable</Text></View> : null}</View> : streetViewUrl && !streetViewFailed ? <View style={styles.streetViewFrame}><WebView key={`${hotelId}:streetview`} source={{ uri: streetViewUrl }} scrollEnabled={false} onLoadStart={() => { clearStreetViewReadyTimer(); setStreetViewLoading(true); }} onLoadEnd={settleStreetView} onError={failStreetView} onHttpError={failStreetView} style={styles.map} />{streetViewLoading ? <View accessibilityRole="progressbar" accessibilityLabel="Loading Street View" style={[styles.streetViewLoading, { backgroundColor: theme.surface }]}><ActivityIndicator size="small" color={accent} /></View> : null}</View> : <View style={styles.mapFallback}><MapPin accessible={false} size={24} strokeWidth={1.3} color={iconColor} /><Text style={[styles.fallbackText, { color: theme.textSecondary }]}>{Platform.OS === "ios" ? "Look Around unavailable" : "Street View unavailable"}</Text></View>}</View>
    </View>
    <NativeHotelFullMapModal visible={fullMapOpen} hotelId={hotelId} theme={theme} onClose={() => setFullMapOpen(false)} propertyDetails={propertyDetails} hotelName={hotelName} />
    <Text accessibilityRole="header" style={[styles.subheading, { color: theme.textPrimary }]}>Why this location works</Text>
    {facts.length ? <View style={styles.factList}>{facts.map((fact) => <View key={fact} style={styles.factRow}><Text accessible={false} style={[styles.factBullet, { color: iconColor }]}>•</Text><Text style={[styles.factText, { color: theme.textSecondary }]}>{fact}</Text></View>)}</View> : <Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Location fit details are limited to the verified address and map.</Text>}
  </View>;
}

const styles = StyleSheet.create({
  locationSection: { paddingVertical: 0 },
  heading: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
  addressRow: { marginTop: 4, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  pinCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  addressCopy: { flex: 1, minWidth: 0 },
  primaryAddress: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  secondaryAddress: { marginTop: 1, fontSize: 13, lineHeight: 18, fontWeight: "400" },
  mapShell: { marginTop: 4, overflow: "hidden" },
  mapTabs: { flexDirection: "row", minHeight: 38, paddingHorizontal: 2 },
  mapTab: { minHeight: 38, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: "transparent", alignItems: "center", justifyContent: "center" },
  mapTabText: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
  mapViewport: { height: 216, width: "100%" },
  mapPreview: { flex: 1 },
  map: { flex: 1 },
  streetViewFrame: { flex: 1, overflow: "hidden" },
  streetViewLoading: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 2, alignItems: "center", justifyContent: "center", gap: 8 },
  lookAroundOverlay: { ...StyleSheet.absoluteFillObject },
  mapFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  subheading: { marginTop: 7, fontSize: 15, lineHeight: 20, fontWeight: "700" },
  factList: { marginTop: 3, gap: 2 },
  factRow: { flexDirection: "row", alignItems: "flex-start" },
  factBullet: { width: 20, fontSize: 14, lineHeight: 20 },
  factText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "400" },
  fallbackText: { marginTop: 3, fontSize: 14, lineHeight: 20, fontWeight: "400" },
});
