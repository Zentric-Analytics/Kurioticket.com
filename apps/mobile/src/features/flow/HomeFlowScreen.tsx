import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { readSession } from "../../storage/sessionStorage";
import { FlowIcon, type FlowIconName } from "./FlowIcon";
import { FlightSearchPanel } from "./FlightSearchPanel";
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
function greeting(hour: number) {
  return hour < 12
    ? "Good morning,"
    : hour < 18
      ? "Good afternoon,"
      : "Good evening,";
}

export function HomeFlowScreen() {
  const [name, setName] = useState("Traveler");
  useEffect(() => {
    void readSession()
      .then((session) => {
        const first = session?.user.name?.trim().split(/\s+/)[0];
        if (first) setName(first);
      })
      .catch(() => undefined);
  }, []);
  return (
    <SafeAreaView style={flowStyles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={flowStyles.scroll}
        keyboardShouldPersistTaps="handled"
      >
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
      <View>
        <Text style={styles.greeting}>{greeting(new Date().getHours())}</Text>
        <Text accessibilityRole="header" style={styles.name}>
          {name}
        </Text>
      </View>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="Santorini coastline"
        source={require("../../../assets/heroes/home-santorini.png")}
        resizeMode="cover"
        style={styles.hero}
      />
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
  brandRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { width: 130, height: 36 },
  greeting: { color: flowColors.muted, fontSize: 13, fontWeight: "600" },
  name: {
    color: flowColors.navy,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800",
  },
  hero: {
    height: 196,
    borderRadius: 14,
    backgroundColor: "#EAF3FF",
  },
  products: {
    minHeight: 78,
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 14,
    borderColor: flowColors.border,
    borderWidth: 1,
  },
  product: {
    flex: 1,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRightColor: flowColors.border,
    borderRightWidth: 1,
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
