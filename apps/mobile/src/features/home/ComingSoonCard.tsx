import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../../theme/tokens";

export function ComingSoonCard({ title }: { title: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>
        We are preparing this Kurioticket travel option for a future update.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.radius,
    padding: spacing.card,
    gap: 8,
  },
  title: {
    color: colors.navy,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900",
  },
  body: { color: colors.slate, fontSize: 15, lineHeight: 22 },
});
