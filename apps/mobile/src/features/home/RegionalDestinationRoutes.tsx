import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { FlowIcon } from "../flow/FlowIcon";
import { flowStyles, useFlowTheme } from "../flow/flowStyles";
import { discoverAdventureNavigation } from "./homepageCardNavigation";
import { regionalDestinationRoutes, type RegionalDestinationRoute } from "./RegionalDestinationRoutesData";

function RegionalRouteCard({ route, width }: { route: RegionalDestinationRoute; width: number }) {
  const ft = useFlowTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const routeLabel = `${route.originCity} → ${route.destinationCity}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${route.originCity} to ${route.destinationCity} flight search.`}
      onPress={() => router.push(discoverAdventureNavigation(route))}
      style={({ pressed }) => [styles.card, { width, height: width * 0.75 }, ft.styles.shadow, pressed && flowStyles.pressed]}
    >
      {imageFailed ? (
        <View accessibilityLabel={`Image unavailable for ${route.destinationCode}`} style={[styles.imageFallback, { backgroundColor: ft.colors.neutralImage }]}>
          <FlowIcon name="compass" color={ft.colors.icon} size={18} />
          <Text style={[styles.fallbackLabel, { color: ft.colors.textSecondary }]}>DESTINATION</Text>
          <Text style={[styles.fallbackCode, { color: ft.colors.textPrimary }]}>{route.destinationCode}</Text>
        </View>
      ) : (
        <Image accessibilityIgnoresInvertColors accessibilityLabel={route.imageAlt} onError={() => setImageFailed(true)} resizeMode="cover" source={route.image} style={styles.image} />
      )}
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`regional-overlay-${ft.theme.dark ? "dark" : "light"}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#020617" stopOpacity="0" />
            <Stop offset="0.45" stopColor="#020617" stopOpacity="0.18" />
            <Stop offset="1" stopColor="#020617" stopOpacity={ft.theme.dark ? "0.9" : "0.78"} />
          </LinearGradient>
        </Defs>
        <Rect width="100" height="100" fill={`url(#regional-overlay-${ft.theme.dark ? "dark" : "light"})`} />
      </Svg>
      <Text numberOfLines={2} style={styles.routeLabel}>{routeLabel}</Text>
    </Pressable>
  );
}

export function RegionalDestinationRoutes() {
  const ft = useFlowTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width * 0.78, 250);

  return (
    <View collapsable={false} testID="regional-destination-routes" style={styles.section}>
      <Text accessibilityRole="header" style={[styles.heading, { color: ft.colors.textPrimary }]}>Discover destinations from your region</Text>
      <ScrollView horizontal nestedScrollEnabled removeClippedSubviews={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
        {regionalDestinationRoutes.map((route) => <RegionalRouteCard key={route.id} route={route} width={cardWidth} />)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 16, marginTop: 4 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: "800", letterSpacing: -0.25 },
  carousel: { gap: 16, paddingBottom: 2, paddingRight: 40 },
  card: { borderRadius: 16, backgroundColor: "#0F172A", overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  fallbackLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 1.4 },
  fallbackCode: { fontSize: 12, fontWeight: "900", letterSpacing: 1.4 },
  routeLabel: { position: "absolute", left: 16, right: 16, bottom: 20, color: "white", fontSize: 16, lineHeight: 20, fontWeight: "600", textShadowColor: "rgba(0,0,0,0.55)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
});
