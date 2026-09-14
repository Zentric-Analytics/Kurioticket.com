import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft, MapPin } from "lucide-react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { hasValidHotelCoordinates } from "../../../../../src/lib/hotels/hotelMap";
import type { PublicHotelPropertyDetails } from "../../../../../src/lib/types";
import { colors } from "../../theme/tokens";
import { appFonts } from "../../theme/typography";
import { NativeAppleCarLookAroundPreview, type NativeAppleCarLookAroundStatus } from "./NativeAppleCarLookAroundPreview";
import type { NativeHotelMapTheme } from "./NativeHotelFullMapModal";

type NativeHotelFullLookAroundModalProps = {
  visible: boolean;
  hotelId: string;
  hotelName: string;
  propertyDetails: PublicHotelPropertyDetails;
  theme: NativeHotelMapTheme;
  onClose: () => void;
};

export function NativeHotelFullLookAroundModal({
  visible,
  hotelId,
  hotelName,
  propertyDetails,
  theme,
  onClose,
}: NativeHotelFullLookAroundModalProps) {
  const [status, setStatus] = useState<NativeAppleCarLookAroundStatus>("loading");
  const coordinatesAvailable = hasValidHotelCoordinates(propertyDetails);

  useEffect(() => {
    if (visible) setStatus("loading");
  }, [visible, hotelId]);

  const closeLookAround = () => {
    setStatus("loading");
    onClose();
  };

  return <Modal visible={visible} transparent={false} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={false} onRequestClose={closeLookAround}>
    <SafeAreaProvider>
      <SafeAreaView edges={["top", "bottom", "left", "right"]} accessibilityViewIsModal style={[styles.screen, { backgroundColor: theme.surface }]}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View style={styles.headerSide}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to hotel details" onPress={closeLookAround} style={styles.back}>
              <ChevronLeft accessible={false} size={20} color={theme.icon} />
              <Text style={[styles.backText, { color: theme.textPrimary }]}>Back</Text>
            </Pressable>
          </View>
          <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, { color: theme.textPrimary }]}>Look Around</Text>
          <View accessible={false} style={styles.headerSide} />
        </View>
        <View style={styles.body}>
          {Platform.OS === "ios" && coordinatesAvailable && visible ? <View style={styles.lookAroundBody}>
            <NativeAppleCarLookAroundPreview
              key={`${hotelId}:full-lookaround:${propertyDetails.latitude}:${propertyDetails.longitude}`}
              latitude={propertyDetails.latitude}
              longitude={propertyDetails.longitude}
              locationLabel={hotelName}
              presentationMode="viewController"
              style={styles.lookAround}
              onStatusChange={setStatus}
            />
            {status === "loading" ? <View pointerEvents="none" style={[styles.overlay, { backgroundColor: theme.surface }]}>
              <ActivityIndicator color={colors.blue} />
              <Text style={[styles.helperText, { color: theme.textPrimary }]}>Loading Look Around…</Text>
            </View> : null}
            {status === "unavailable" ? <View style={[styles.overlay, { backgroundColor: theme.surface }]}>
              <MapPin accessible={false} size={28} color={theme.icon} />
              <Text style={[styles.unavailable, { color: theme.textPrimary }]}>Look Around isn&apos;t available for this location.</Text>
            </View> : null}
          </View> : <View style={[styles.overlay, { backgroundColor: theme.surface }]}>
            <MapPin accessible={false} size={28} color={theme.icon} />
            <Text style={[styles.unavailable, { color: theme.textPrimary }]}>Look Around unavailable</Text>
          </View>}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 62, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth },
  headerSide: { width: 76, minHeight: 44, justifyContent: "center" },
  back: { minWidth: 44, minHeight: 44, paddingHorizontal: 10, flexDirection: "row", alignItems: "center" },
  backText: { fontSize: 14, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  title: { flex: 1, minWidth: 0, textAlign: "center", fontSize: 18, lineHeight: 24, fontWeight: "700", fontFamily: appFonts.bold },
  body: { flex: 1, minHeight: 0 },
  lookAroundBody: { flex: 1 },
  lookAround: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  unavailable: { textAlign: "center", fontSize: 16, lineHeight: 22, fontWeight: "600", fontFamily: appFonts.semibold },
  helperText: { fontSize: 14, lineHeight: 20, fontWeight: "500", fontFamily: appFonts.medium },
});
