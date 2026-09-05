import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { ExternalLink, MapPin } from "lucide-react-native";
import { WebView } from "react-native-webview";

import type { PublicHotelPropertyDetails } from "../../../../../src/lib/types";
import {
  buildHotelDirectionsUrl,
  buildOpenStreetMapHotelMapEmbedUrl,
} from "../../../../../src/lib/hotels/hotelMap";
import { colors } from "../../theme/tokens";
import { appFonts } from "../../theme/typography";
import {
  nativeHotelSecondaryLocation,
  nativeHotelStayFitFacts,
} from "./nativeHotelLocationModel";

type Theme = {
  dark: boolean;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  icon: string;
};

export function NativeHotelLocationSection({
  hotelName,
  propertyDetails,
  theme,
}: {
  hotelName: string;
  propertyDetails: PublicHotelPropertyDetails | null;
  theme: Theme;
}) {
  const [mapFailed, setMapFailed] = useState(false);
  const accent = theme.dark ? "#8FB5FF" : colors.blue;

  if (!propertyDetails) {
    return (
      <View style={styles.locationSection}>
        <Text accessibilityRole="header" style={[styles.locationHeading, { color: theme.textPrimary }]}>
          Location &amp; stay fit
        </Text>
        <Text style={[styles.fallbackText, { color: theme.textSecondary }]}>
          Verified location details are not available for this property yet.
        </Text>
      </View>
    );
  }

  const streetAddress = propertyDetails.streetAddress.trim();
  const secondaryLocation = nativeHotelSecondaryLocation(propertyDetails);
  const facts = nativeHotelStayFitFacts(propertyDetails);
  const accessibilityDetails = propertyDetails.accessibility ?? [];
  const mapUrl = buildOpenStreetMapHotelMapEmbedUrl(propertyDetails);
  const directionsUrl = buildHotelDirectionsUrl({ hotelName, propertyDetails });
  const openMaps = async () => {
    if (!directionsUrl) return;
    try {
      await Linking.openURL(directionsUrl);
    } catch {
      // The verified address and map fallback remain usable if handoff fails.
    }
  };

  return (
    <View style={styles.locationSection}>
      <Text accessibilityRole="header" style={[styles.locationHeading, { color: theme.textPrimary }]}>
        Location &amp; stay fit
      </Text>

      {streetAddress || secondaryLocation ? (
        <View style={styles.locationAddressRow}>
          <View style={[styles.locationPinCircle, { backgroundColor: theme.dark ? theme.surface : "#EFF6FF" }]}>
            <MapPin accessible={false} size={18} color={accent} />
          </View>
          <View style={styles.locationAddressCopy}>
            {streetAddress ? <Text style={[styles.locationStreetAddress, { color: theme.textPrimary }]}>{streetAddress}</Text> : null}
            {secondaryLocation ? <Text style={[styles.locationSecondaryAddress, { color: theme.textSecondary }]}>{secondaryLocation}</Text> : null}
          </View>
        </View>
      ) : null}

      <View style={[styles.locationMapCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View pointerEvents="none" style={styles.locationMapViewport}>
          {mapUrl && !mapFailed ? (
            <WebView
              source={{ uri: mapUrl }}
              scrollEnabled={false}
              onError={() => setMapFailed(true)}
              onHttpError={() => setMapFailed(true)}
              style={styles.locationMap}
            />
          ) : (
            <View style={styles.locationMapFallback}>
              <MapPin accessible={false} size={25} color={theme.icon} />
              <Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Map preview unavailable</Text>
            </View>
          )}
        </View>
        {directionsUrl ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Open ${hotelName} in Maps`}
            onPress={() => void openMaps()}
            style={[styles.locationMapsOverlay, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[styles.locationMapsOverlayText, { color: accent }]}>Open in Maps</Text>
            <ExternalLink accessible={false} size={16} color={accent} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.locationFactsSection}>
        <Text accessibilityRole="header" style={[styles.locationSubheading, { color: theme.textPrimary }]}>Why this location works</Text>
        {facts.length ? (
          <View style={styles.locationFacts}>
            {facts.map((fact) => (
              <View key={fact} style={[styles.locationFactChip, { backgroundColor: theme.dark ? theme.surface : "#F1F5F9" }]}>
                <Text style={[styles.locationFactText, { color: theme.dark ? theme.textPrimary : "#334155" }]}>{fact}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Location fit details are limited to the verified address and map.</Text>
        )}

        <Text accessibilityRole="header" style={[styles.locationAccessibilityHeading, { color: theme.textPrimary }]}>Accessibility and location details</Text>
        {accessibilityDetails.length ? (
          <View style={styles.locationAccessibilityList}>
            {accessibilityDetails.map((detail, index) => (
              <View key={`${detail}:${index}`} style={styles.locationAccessibilityRow}>
                <Text accessible={false} style={[styles.locationAccessibilityBullet, { color: theme.textSecondary }]}>•</Text>
                <Text style={[styles.locationAccessibilityText, { color: theme.textSecondary }]}>{detail}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.accessibilityFallback, { color: theme.textSecondary }]}>Confirm specific accessibility requirements with the property before travel.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  locationSection: { paddingHorizontal: 16, paddingVertical: 24 },
  locationHeading: { fontSize: 20, lineHeight: 28, fontWeight: "800", fontFamily: appFonts.extraBold, letterSpacing: -0.2 },
  locationAddressRow: { marginTop: 12, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  locationPinCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  locationAddressCopy: { minWidth: 0, flex: 1, paddingTop: 2 },
  locationStreetAddress: { fontSize: 13, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  locationSecondaryAddress: { marginTop: 2, fontSize: 12, lineHeight: 20, fontWeight: "400", fontFamily: appFonts.regular },
  locationMapCard: { position: "relative", marginTop: 16, height: 202, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  locationMapViewport: { height: 200, width: "100%" },
  locationMap: { flex: 1 },
  locationMapFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  locationMapsOverlay: { position: "absolute", top: 12, left: 12, minHeight: 40, paddingHorizontal: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 7, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  locationMapsOverlayText: { fontSize: 13, lineHeight: 18, fontWeight: "700", fontFamily: appFonts.bold },
  locationFactsSection: { marginTop: 28 },
  locationSubheading: { fontSize: 16, lineHeight: 24, fontWeight: "700", fontFamily: appFonts.bold },
  locationFacts: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  locationFactChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  locationFactText: { fontSize: 12, lineHeight: 16, fontWeight: "600", fontFamily: appFonts.semibold },
  fallbackText: { marginTop: 12, fontSize: 14, lineHeight: 20, fontWeight: "400", fontFamily: appFonts.regular },
  locationAccessibilityHeading: { marginTop: 28, fontSize: 16, lineHeight: 24, fontWeight: "700", fontFamily: appFonts.bold },
  locationAccessibilityList: { marginTop: 12, gap: 8 },
  locationAccessibilityRow: { flexDirection: "row", alignItems: "flex-start" },
  locationAccessibilityBullet: { width: 20, fontSize: 14, lineHeight: 24, fontFamily: appFonts.regular },
  locationAccessibilityText: { flex: 1, fontSize: 14, lineHeight: 24, fontWeight: "400", fontFamily: appFonts.regular },
  accessibilityFallback: { marginTop: 12, fontSize: 14, lineHeight: 24, fontWeight: "400", fontFamily: appFonts.regular },
});
