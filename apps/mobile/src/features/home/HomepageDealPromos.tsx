import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FlowIcon, type FlowIconName } from "../flow/FlowIcon";
import { flowColors, flowStyles } from "../flow/flowStyles";

type DealPromo = {
  title: string;
  description: string;
  buttonLabel: string;
  icon: FlowIconName;
  backgroundColor: string;
  route: "/flights" | "/hotels";
};

const homepageDealPromos: readonly DealPromo[] = [
  {
    title: "Flight deals from top airlines",
    description: "Discover limited-time fares and compare options instantly.",
    buttonLabel: "Explore flight deals",
    icon: "flight",
    backgroundColor: "#EAF2FF",
    route: "/flights",
  },
  {
    title: "Hotel savings worldwide",
    description:
      "Browse stays from boutique hotels to global chains with price transparency.",
    buttonLabel: "Explore hotel deals",
    icon: "hotel",
    backgroundColor: "#E5F7F5",
    route: "/hotels",
  },
] as const;

export function HomepageDealPromos() {
  return (
    <View testID="homepage-deal-promos" style={styles.section}>
      {homepageDealPromos.map((promo) => (
        <View
          key={promo.title}
          style={[
            styles.card,
            flowStyles.shadow,
            { backgroundColor: promo.backgroundColor },
          ]}
        >
          <View style={styles.copy}>
            <Text accessibilityRole="header" style={styles.heading}>
              {promo.title}
            </Text>
            <Text style={styles.description}>{promo.description}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={promo.buttonLabel}
              onPress={() => router.push(promo.route)}
              style={({ pressed }) => [
                styles.button,
                pressed && flowStyles.pressed,
              ]}
            >
              <Text style={styles.buttonText}>{promo.buttonLabel}</Text>
            </Pressable>
          </View>
          <View pointerEvents="none" style={styles.icon}>
            <FlowIcon name={promo.icon} color={flowColors.blue} size={38} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 14, marginTop: 4 },
  card: {
    minHeight: 210,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(6,76,247,0.08)",
    padding: 18,
    flexDirection: "row",
    overflow: "hidden",
  },
  copy: { flex: 1, alignItems: "flex-start", gap: 10, paddingRight: 12 },
  heading: {
    color: flowColors.navy,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "800",
  },
  description: {
    color: flowColors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  button: {
    minHeight: 48,
    marginTop: "auto",
    borderRadius: 9,
    backgroundColor: flowColors.blue,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: { color: flowColors.white, fontSize: 14, fontWeight: "800" },
  icon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    flexShrink: 0,
  },
});
