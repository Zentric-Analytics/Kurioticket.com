import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { MapPin } from "lucide-react-native";
import { WebView } from "react-native-webview";
import type { PublicHotelPropertyDetails } from "../../../../../src/lib/types";
import { hasValidHotelCoordinates } from "../../../../../src/lib/hotels/hotelMap";
import { getApiBaseUrl } from "../../config/apiUrl";
import { colors } from "../../theme/tokens";
import { appFonts } from "../../theme/typography";
import {
  nativeHotelLocationEmbedUrl,
  nativeHotelSecondaryLocation,
  nativeHotelStayFitFacts,
  type NativeHotelLocationView,
} from "./nativeHotelLocationModel";

type Theme = { dark: boolean; surface: string; border: string; textPrimary: string; textSecondary: string; icon: string };

export function NativeHotelLocationSection({ hotelId, propertyDetails, theme }: {
  hotelId: string;
  hotelName: string;
  propertyDetails: PublicHotelPropertyDetails | null;
  theme: Theme;
}) {
  const [view, setView] = useState<NativeHotelLocationView>("map");
  const [failedView, setFailedView] = useState<NativeHotelLocationView | null>(null);
  if (!propertyDetails) return <View style={styles.locationSection}><Text accessibilityRole="header" style={[styles.heading, { color: theme.textPrimary }]}>Location &amp; stay fit</Text><Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Verified location details are not available for this property yet.</Text></View>;

  const streetAddress = propertyDetails.streetAddress.trim();
  const secondaryLocation = nativeHotelSecondaryLocation(propertyDetails);
  const facts = nativeHotelStayFitFacts(propertyDetails);
  const accessibility = propertyDetails.accessibility?.map((detail) => detail.trim()).filter(Boolean) ?? [];
  const api = getApiBaseUrl(Platform.OS, __DEV__);
  const embedUrl = api.ok ? nativeHotelLocationEmbedUrl(api.baseUrl, hotelId, view) : null;
  const streetViewAvailable = hasValidHotelCoordinates(propertyDetails);
  const accent = theme.dark ? "#8FB5FF" : colors.blue;
  const selectView = (next: NativeHotelLocationView) => { setFailedView(null); setView(next); };

  return <View style={styles.locationSection}>
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.textPrimary }]}>Location &amp; stay fit</Text>
    {streetAddress || secondaryLocation ? <View style={styles.addressRow}><View accessible={false} style={[styles.pinCircle, { backgroundColor: theme.dark ? theme.surface : "#EFF6FF" }]}><MapPin accessible={false} size={18} color={accent} /></View><View style={styles.addressCopy}>{streetAddress ? <Text style={[styles.primaryAddress, { color: theme.dark ? theme.textPrimary : "#1E293B" }]}>{streetAddress}</Text> : null}{secondaryLocation ? <Text style={[styles.secondaryAddress, { color: theme.dark ? theme.textSecondary : "#64748B" }]}>{secondaryLocation}</Text> : null}</View></View> : null}
    <View style={[styles.mapCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {streetViewAvailable ? <View accessibilityRole="tablist" style={[styles.mapTabs, { borderBottomColor: theme.border }]}>{(["map", "streetview"] as const).map((option) => <Pressable key={option} accessibilityRole="tab" accessibilityState={{ selected: view === option }} onPress={() => selectView(option)} style={[styles.mapTab, view === option && { borderBottomColor: accent }]}><Text style={[styles.mapTabText, { color: view === option ? accent : (theme.dark ? theme.textSecondary : "#475569") }]}>{option === "map" ? "Map" : "Street View"}</Text></Pressable>)}</View> : null}
      <View style={styles.mapViewport}>{embedUrl && failedView !== view ? <WebView key={`${hotelId}:${view}`} source={{ uri: embedUrl }} scrollEnabled={false} onError={() => setFailedView(view)} onHttpError={() => setFailedView(view)} style={styles.map} /> : <View style={styles.mapFallback}><MapPin accessible={false} size={24} color={theme.icon} /><Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Map preview unavailable</Text></View>}</View>
    </View>
    <Text accessibilityRole="header" style={[styles.subheading, { color: theme.textPrimary }]}>Why this location works</Text>
    {facts.length ? <View style={styles.factList}>{facts.map((fact) => <View key={fact} style={[styles.factChip, { backgroundColor: theme.dark ? "#1E2B42" : "#F1F5F9" }]}><Text style={[styles.factText, { color: theme.dark ? theme.textSecondary : "#334155" }]}>{fact}</Text></View>)}</View> : <Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Location fit details are limited to the verified address and map.</Text>}
    <Text accessibilityRole="header" style={[styles.accessibilityHeading, { color: theme.textPrimary }]}>Accessibility and location details</Text>
    {accessibility.length ? <View style={styles.accessibilityList}>{accessibility.map((detail) => <View key={detail} style={styles.accessibilityRow}><Text accessible={false} style={[styles.accessibilityBullet, { color: accent }]}>•</Text><Text style={[styles.accessibilityText, { color: theme.dark ? theme.textSecondary : "#334155" }]}>{detail}</Text></View>)}</View> : <Text style={[styles.accessibilityText, styles.accessibilityFallback, { color: theme.textSecondary }]}>Confirm specific accessibility requirements with the property before travel.</Text>}
  </View>;
}

const styles = StyleSheet.create({
  locationSection: { paddingVertical: 12 },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: "800", fontFamily: appFonts.extraBold, letterSpacing: -0.3 },
  addressRow: { marginTop: 12, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  pinCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  addressCopy: { flex: 1, minWidth: 0, paddingTop: 2 },
  primaryAddress: { fontSize: 13, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  secondaryAddress: { marginTop: 2, fontSize: 12, lineHeight: 20, fontWeight: "400", fontFamily: appFonts.regular },
  mapCard: { marginTop: 16, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  mapTabs: { flexDirection: "row", minHeight: 44, borderBottomWidth: 1, paddingHorizontal: 4 },
  mapTab: { minHeight: 44, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: "transparent", alignItems: "center", justifyContent: "center" },
  mapTabText: { fontSize: 14, lineHeight: 20, fontWeight: "700", fontFamily: appFonts.bold },
  mapViewport: { height: 200, width: "100%" },
  map: { flex: 1 },
  mapFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  subheading: { marginTop: 28, fontSize: 16, lineHeight: 24, fontWeight: "700", fontFamily: appFonts.bold },
  factList: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  factChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  factText: { fontSize: 12, lineHeight: 16, fontWeight: "600", fontFamily: appFonts.semibold },
  accessibilityHeading: { marginTop: 28, fontSize: 16, lineHeight: 24, fontWeight: "700", fontFamily: appFonts.bold },
  accessibilityList: { marginTop: 12, gap: 8 },
  accessibilityRow: { flexDirection: "row", alignItems: "flex-start" },
  accessibilityBullet: { width: 20, fontSize: 14, lineHeight: 24 },
  accessibilityText: { flex: 1, fontSize: 14, lineHeight: 24, fontWeight: "400", fontFamily: appFonts.regular },
  accessibilityFallback: { marginTop: 12 },
  fallbackText: { marginTop: 12, fontSize: 14, lineHeight: 24, fontWeight: "400", fontFamily: appFonts.regular },
});
