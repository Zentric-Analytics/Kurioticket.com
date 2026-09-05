import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { isMobileProductAvailable, useFeatureAvailability } from "../availability/FeatureAvailability";
import { ApprovedCarResultsScreen } from "../search/ApprovedCarResultsScreen";
import { ApprovedResultsScreen } from "../search/ApprovedResultsScreen";
import { NativeTravelSearchLoadingScreen } from "../search/NativeTravelSearchLoadingScreen";
import { useAppTheme } from "../../theme/AppTheme";
import { buildSearchPlan, type Product } from "./travelSearchModel";

const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export function TravelResultsScreen({ product }: { product: Product }) {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const hotelPlan = product === "hotel" ? buildSearchPlan("hotel", params) : undefined;
  const { availability, initializing } = useFeatureAvailability();

  useEffect(() => {
    if (product !== "hotel" || hotelPlan?.plan) return;
    const recoveryParams = {
      destinationId: one(params.destinationId),
      destination: one(params.destination),
      checkIn: one(params.checkIn),
      checkOut: one(params.checkOut),
      guests: one(params.guests),
      rooms: one(params.rooms),
    };
    router.replace({ pathname: "/hotels", params: recoveryParams });
  }, [hotelPlan?.plan?.key, product, one(params.destinationId), one(params.destination), one(params.checkIn), one(params.checkOut), one(params.guests), one(params.rooms)]);

  if (product === "hotel" && !hotelPlan?.plan) return null;
  if (initializing) return <NativeTravelSearchLoadingScreen product={product} />;
  if (!isMobileProductAvailable(availability, product)) return <TravelProductUnavailableScreen product={product} />;
  if (product === "car") return <ApprovedCarResultsScreen />;
  return <ApprovedResultsScreen product={product} />;
}

function TravelProductUnavailableScreen({ product }: { product: Product }) {
  const { theme } = useAppTheme();
  const label = product === "car" ? "Car" : product[0].toUpperCase() + product.slice(1);
  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
    <View style={styles.content} accessibilityRole="alert">
      <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{label} search is temporarily unavailable</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>Please try again later or edit your search.</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${product} search`}
        onPress={() => router.canGoBack() ? router.back() : router.replace(product === "flight" ? "/flights" : product === "hotel" ? "/hotels" : "/cars")}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text style={styles.actionText}>Edit search</Text>
      </Pressable>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  title: { fontSize: 20, lineHeight: 27, fontWeight: "800", textAlign: "center" },
  body: { marginTop: 8, fontSize: 14, lineHeight: 21, textAlign: "center" },
  action: { minWidth: 180, minHeight: 48, marginTop: 22, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, backgroundColor: "#004BB8" },
  actionText: { color: "white", fontSize: 14, lineHeight: 20, fontWeight: "800" },
  pressed: { opacity: 0.72 },
});
