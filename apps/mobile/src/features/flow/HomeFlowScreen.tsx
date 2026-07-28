import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { FlowIcon, type FlowIconName } from "./FlowIcon";
import { FlightSearchPanel } from "./FlightSearchPanel";
import { ResponsiveHero } from "./ResponsiveHero";
import { flowColors, flowStyles } from "./flowStyles";

const products: {
  label: string;
  route: "/flights" | "/hotels" | "/cars" | "/deals";
  icon: FlowIconName;
}[] = [
  { label: "Flights", route: "/flights", icon: "flight" },
  { label: "Hotels", route: "/hotels", icon: "hotel" },
  { label: "Cars", route: "/cars", icon: "car" },
  { label: "Deals", route: "/deals", icon: "deal" },
];
export function HomeFlowScreen() {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={flowStyles.safe} edges={[]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroShell}>
          <ResponsiveHero
            source={require("../../../assets/heroes/home-santorini.png")}
            sourceWidth={307}
            sourceHeight={596}
            height={342}
            focalY={0.45}
            accessibilityLabel="Santorini coastline"
          />
          <View style={[styles.heroOverlay, { paddingTop: insets.top + 6 }]}>
            <View style={styles.brandRow}>
              <Image
                accessibilityLabel="Kurioticket"
                resizeMode="contain"
                source={require("../../../assets/kurioticket-logo-primary-light-bg.png")}
                style={styles.logo}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                onPress={() => router.push("/notifications")}
                style={flowStyles.iconButton}
              >
                <FlowIcon name="bell" />
              </Pressable>
            </View>
          </View>
        </View>
        <View style={[styles.products, flowStyles.shadow]}>
          {products.map((product, index) => (
            <Pressable
              key={product.label}
              accessibilityRole="button"
              accessibilityLabel={`Open ${product.label}`}
              onPress={() => router.push(product.route)}
              style={({ pressed }) => [
                styles.product,
                index === 0 && styles.productActive,
                pressed && flowStyles.pressed,
              ]}
            >
              <FlowIcon
                name={product.icon}
                color={index === 0 ? flowColors.blue : flowColors.navy}
              />
              <Text
                style={[
                  styles.productText,
                  index === 0 && styles.productTextActive,
                ]}
              >
                {product.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <FlightSearchPanel compact />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Track prices and save"
          onPress={() => router.push("/price-alerts")}
          style={({ pressed }) => [
            styles.alert,
            flowStyles.shadow,
            pressed && flowStyles.pressed,
          ]}
        >
          <View style={styles.alertIcon}>
            <FlowIcon name="bell" color={flowColors.blue} />
          </View>
          <View style={styles.grow}>
            <Text style={flowStyles.value}>Track prices & save</Text>
            <Text style={flowStyles.meta}>
              Get alerts when prices drop{"\n"}for your favorite trips.
            </Text>
          </View>
          <FlowIcon name="chevron" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 14, paddingBottom: 26, gap: 14 },
  heroShell: { height: 342, marginHorizontal: -14, overflow: "hidden" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, paddingHorizontal: 14 },
  brandRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { width: 130, height: 36 },
  products: {
    marginTop: -34,
    minHeight: 78,
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 14,
    overflow: "hidden",
  },
  product: {
    flex: 1,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  productActive: {
    backgroundColor: "#F3F7FF",
    borderBottomColor: flowColors.blue,
    borderBottomWidth: 2,
  },
  productText: { color: flowColors.navy, fontSize: 11, fontWeight: "700" },
  productTextActive: { color: flowColors.blue },
  alert: {
    minHeight: 82,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: flowColors.border,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  alertIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  grow: { flex: 1 },
});
