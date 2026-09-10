import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft, MapPin } from "lucide-react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { getApiBaseUrl } from "../../config/apiUrl";
import { colors } from "../../theme/tokens";
import { appFonts } from "../../theme/typography";
import { nativeHotelLocationEmbedUrl } from "./nativeHotelLocationModel";

export type NativeHotelMapTheme = {
  surface: string;
  border: string;
  textPrimary: string;
  icon: string;
};

type NativeHotelFullMapModalProps = {
  visible: boolean;
  hotelId: string;
  theme: NativeHotelMapTheme;
  onClose: () => void;
};

export function NativeHotelFullMapModal({ visible, hotelId, theme, onClose }: NativeHotelFullMapModalProps) {
  const [fullMapFailed, setFullMapFailed] = useState(false);
  const [fullMapAttempt, setFullMapAttempt] = useState(0);
  const api = getApiBaseUrl(Platform.OS, __DEV__);
  const fullMapUrl = api.ok ? nativeHotelLocationEmbedUrl(api.baseUrl, hotelId, "map") : null;
  const retryFullMap = () => {
    setFullMapFailed(false);
    setFullMapAttempt((attempt) => attempt + 1);
  };
  const closeFullMap = () => {
    setFullMapFailed(false);
    onClose();
  };

  return <Modal visible={visible} transparent={false} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={false} onRequestClose={closeFullMap}>
    <SafeAreaProvider>
      <SafeAreaView edges={["top", "bottom", "left", "right"]} accessibilityViewIsModal style={[styles.fullMapScreen, { backgroundColor: theme.surface }]}>
        <View style={[styles.fullMapHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View style={styles.fullMapHeaderSide}><Pressable accessibilityRole="button" accessibilityLabel="Back to hotel details" onPress={closeFullMap} style={styles.fullMapBack}><ChevronLeft accessible={false} size={20} color={theme.icon} /><Text style={[styles.fullMapBackText, { color: theme.textPrimary }]}>Back</Text></Pressable></View>
          <Text accessibilityRole="header" numberOfLines={1} style={[styles.fullMapTitle, { color: theme.textPrimary }]}>Map</Text>
          <View accessible={false} style={styles.fullMapHeaderSide} />
        </View>
        <View style={styles.fullMapBody}>
          {fullMapUrl && !fullMapFailed
            ? <WebView key={`${hotelId}:full-map:${fullMapAttempt}`} source={{ uri: fullMapUrl }} onError={() => setFullMapFailed(true)} onHttpError={() => setFullMapFailed(true)} style={styles.fullMapWebView} />
            : <View style={[styles.fullMapFallback, { backgroundColor: theme.surface }]}>
              <MapPin accessible={false} size={28} color={theme.icon} />
              <Text style={[styles.fullMapUnavailable, { color: theme.textPrimary }]}>Map unavailable</Text>
              {fullMapUrl ? <Pressable accessibilityRole="button" accessibilityLabel="Try loading map again" onPress={retryFullMap} style={styles.fullMapRetry}><Text style={styles.fullMapRetryText}>Try again</Text></Pressable> : null}
            </View>}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  </Modal>;
}

const styles = StyleSheet.create({
  fullMapScreen: { flex: 1 },
  fullMapHeader: { minHeight: 62, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth },
  fullMapHeaderSide: { width: 76, minHeight: 44, justifyContent: "center" },
  fullMapBack: { minWidth: 44, minHeight: 44, paddingHorizontal: 10, flexDirection: "row", alignItems: "center" },
  fullMapBackText: { fontSize: 14, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  fullMapTitle: { flex: 1, minWidth: 0, textAlign: "center", fontSize: 18, lineHeight: 24, fontWeight: "700", fontFamily: appFonts.bold },
  fullMapBody: { flex: 1, minHeight: 0 },
  fullMapWebView: { flex: 1 },
  fullMapFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  fullMapUnavailable: { fontSize: 16, lineHeight: 22, fontWeight: "600", fontFamily: appFonts.semibold },
  fullMapRetry: { minWidth: 112, minHeight: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.blue, paddingHorizontal: 18 },
  fullMapRetryText: { color: "#FFFFFF", fontSize: 14, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
});
