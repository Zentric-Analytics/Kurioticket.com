import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../../theme/tokens";

export function HeroSection() {
  return (
    <View style={styles.hero}>
      <Text style={styles.title}>Where would you like to travel today?</Text>
      <Text style={styles.subtitle}>Search flights to destinations around the world.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 10, paddingTop: 4 },
  title: { color: colors.navy, fontSize: 34, lineHeight: 40, fontWeight: "900", letterSpacing: -0.8 },
  subtitle: { color: colors.slate, fontSize: 17, lineHeight: 25, fontWeight: "600" },
});
