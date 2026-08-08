import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { flowColors, flowStyles, useFlowTheme } from "../flow/flowStyles";
import {
  buildHomepageHotelPromoRoute,
  HOMEPAGE_FLIGHT_PROMO_ROUTE,
} from "./homepagePromoNavigation";

type DealPromo = {
  title: string;
  description: string;
  buttonLabel: string;
  illustration: "flight" | "hotel";
  lightBackgroundColor: string;
  darkBackgroundColor: string;
  lightBorderColor: string;
  darkBorderColor: string;
  darkIconBackgroundColor: string;
  onPress: () => void;
};

const homepageDealPromos: readonly DealPromo[] = [
  {
    title: "Flight deals from top airlines",
    description: "Discover limited-time fares and compare options instantly.",
    buttonLabel: "Explore flight deals",
    illustration: "flight",
    lightBackgroundColor: "#EAF2FF",
    darkBackgroundColor: "#102A56",
    lightBorderColor: "rgba(6,76,247,0.08)",
    darkBorderColor: "rgba(91,141,255,0.38)",
    darkIconBackgroundColor: "#193B74",
    onPress: () => router.push(HOMEPAGE_FLIGHT_PROMO_ROUTE),
  },
  {
    title: "Hotel savings worldwide",
    description:
      "Browse stays from boutique hotels to global chains with price transparency.",
    buttonLabel: "Explore hotel deals",
    illustration: "hotel",
    lightBackgroundColor: "#E5F7F5",
    darkBackgroundColor: "#123A35",
    lightBorderColor: "rgba(6,76,247,0.08)",
    darkBorderColor: "rgba(64,196,176,0.36)",
    darkIconBackgroundColor: "#1A514A",
    onPress: () => router.push(buildHomepageHotelPromoRoute()),
  },
] as const;

const MAIN_ICON_COLOR = "#064CF7";
const DECORATION_COLOR = "#78A7F5";

function PromoIllustration({
  kind,
  darkBackgroundColor,
  dark,
}: {
  kind: DealPromo["illustration"];
  darkBackgroundColor: string;
  dark: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      testID={`${kind}-promo-illustration`}
      style={[
        styles.illustrationContainer,
        dark && { backgroundColor: darkBackgroundColor },
      ]}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 160 160"
        accessibilityElementsHidden
      >
        <Path
          testID={`${kind}-promo-sparkle`}
          d="M34 25c0 8-4 12-12 12 8 0 12 4 12 12 0-8 4-12 12-12-8 0-12-4-12-12Z"
          fill="none"
          stroke={DECORATION_COLOR}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={4}
        />
        <Circle
          testID={`${kind}-promo-coin`}
          cx="121"
          cy="39"
          r="13"
          fill="none"
          stroke={DECORATION_COLOR}
          strokeWidth={4}
        />
        <Path
          d="M124 32h-5a4 4 0 0 0 0 8h4a4 4 0 0 1 0 8h-6m4-19v22"
          fill="none"
          stroke={DECORATION_COLOR}
          strokeLinecap="round"
          strokeWidth={3}
        />

        {kind === "flight" ? (
          <Path
            testID="flight-promo-airplane"
            d="m42 112 19-9 13-51c1-5 5-9 10-9s9 4 10 9l5 30 27-13c8-4 14-3 16 1 2 5-2 10-9 14l-31 18 2 18 13 9v7l-33-8-33 8v-7l13-9 3-12-22 11-13-4 10-3Z"
            fill="none"
            stroke={MAIN_ICON_COLOR}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={6}
          />
        ) : (
          <>
            <Path
              testID="hotel-promo-building"
              d="M45 132V66c0-5 4-9 9-9h52c5 0 9 4 9 9v66M36 132h88"
              fill="none"
              stroke={MAIN_ICON_COLOR}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={6}
            />
            {[
              [57, 72],
              [90, 72],
              [57, 95],
              [90, 95],
            ].map(([x, y]) => (
              <Rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width="13"
                height="13"
                rx="2"
                fill="none"
                stroke={MAIN_ICON_COLOR}
                strokeWidth={5}
              />
            ))}
            <Path
              d="M72 132v-16h16v16"
              fill="none"
              stroke={MAIN_ICON_COLOR}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={6}
            />
          </>
        )}
      </Svg>
    </View>
  );
}

export function HomepageDealPromos() {
  const ft = useFlowTheme();
  const titleColor = ft.theme.dark ? "#F4F7FF" : ft.colors.textPrimary;
  const descriptionColor = ft.theme.dark ? "#C8D2E6" : ft.colors.textSecondary;
  return (
    <View testID="homepage-deal-promos" style={styles.section}>
      {homepageDealPromos.map((promo) => (
        <View
          key={promo.title}
          style={[
            styles.card,
            flowStyles.shadow,
            {
              backgroundColor: ft.theme.dark
                ? promo.darkBackgroundColor
                : promo.lightBackgroundColor,
              borderColor: ft.theme.dark
                ? promo.darkBorderColor
                : promo.lightBorderColor,
            },
          ]}
        >
          <View style={styles.copy}>
            <Text
              accessibilityRole="header"
              style={[styles.heading, { color: titleColor }]}
            >
              {promo.title}
            </Text>
            <Text style={[styles.description, { color: descriptionColor }]}>
              {promo.description}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={promo.buttonLabel}
              onPress={promo.onPress}
              style={({ pressed }) => [
                styles.button,
                pressed && flowStyles.pressed,
              ]}
            >
              <Text style={styles.buttonText}>{promo.buttonLabel}</Text>
            </Pressable>
          </View>
          <PromoIllustration
            kind={promo.illustration}
            dark={ft.theme.dark}
            darkBackgroundColor={promo.darkIconBackgroundColor}
          />
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
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "800",
  },
  description: {
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
  illustrationContainer: {
    width: "42%",
    minWidth: 120,
    maxWidth: 150,
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.64)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    flexShrink: 0,
  },
});
