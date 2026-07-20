import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/tokens";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.wrap, compact && styles.compactWrap]} accessibilityLabel="Kurioticket">
      <View style={[styles.mark, compact && styles.compactMark]}>
        <Text style={[styles.markText, compact && styles.compactMarkText]}>K</Text>
      </View>
      {!compact ? <Text style={styles.wordmark}>Kurioticket</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({ wrap: { alignItems: "center", gap: 14 }, compactWrap: { alignItems: "flex-start" }, mark: { width: 74, height: 74, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.blue }, compactMark: { width: 48, height: 48, borderRadius: 16 }, markText: { color: "white", fontSize: 34, fontWeight: "900" }, compactMarkText: { fontSize: 22 }, wordmark: { color: colors.navy, fontSize: 32, fontWeight: "900", letterSpacing: -0.5 } });
