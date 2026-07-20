import { StyleSheet, Text, View } from "react-native";
import { Logo } from "../../../components/Logo";
import { colors } from "../../../theme/tokens";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function HomeHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.brandBlock}>
        <Logo compact />
        <Text style={styles.greeting}>{greeting()}</Text>
      </View>
      <View style={styles.avatar} accessibilityLabel="Profile">
        <Text style={styles.avatarText}>KT</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  brandBlock: { gap: 10 },
  greeting: { color: colors.muted, fontSize: 15, fontWeight: "800" },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.surface, fontSize: 14, fontWeight: "900" },
});
