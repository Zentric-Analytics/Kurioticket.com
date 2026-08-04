import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getRuntimeEnvironment } from "../config/environment";

export function PreviewBanner() {
  if (!getRuntimeEnvironment().isPreview) return null;
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View accessibilityRole="alert" style={styles.banner}>
        <Text style={styles.text}>KURIOTICKET PREVIEW</Text>
        <Text style={styles.otaTest}>OTA TEST — AOTA-01</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#8A3FFC" },
  banner: { alignItems: "center", backgroundColor: "#8A3FFC", paddingHorizontal: 12, paddingVertical: 5 },
  text: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  otaTest: { color: "#FFFFFF", fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginTop: 2 },
});
