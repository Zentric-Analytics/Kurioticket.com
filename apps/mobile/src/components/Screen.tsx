import { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../theme/tokens";
export function Screen({ children, centered = false }: { children: ReactNode; centered?: boolean }) {
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={[styles.content, centered && styles.centered]}><View style={styles.inner}>{children}</View></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, padding: spacing.screen }, centered: { justifyContent: "center" }, inner: { width: "100%", maxWidth: 520, alignSelf: "center", gap: 20 } });
