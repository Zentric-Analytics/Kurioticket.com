import { useState } from "react";
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
import { destinationImages } from "./flowData";
import { FlowIcon } from "./FlowIcon";
import { Segments, UnavailableNotice } from "./FlowPrimitives";
import { flowColors, flowStyles } from "./flowStyles";

type DetailTab = "itinerary" | "flights" | "hotels" | "cars" | "more";
export function TripDetailsScreen() {
  const [tab, setTab] = useState<DetailTab>("itinerary");
  const [notice, setNotice] = useState("");
  return (
    <SafeAreaView style={flowStyles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.hero}>
          <Image
            source={require("../../../assets/heroes/trip-city-skyline.png")}
            style={StyleSheet.absoluteFillObject}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={[flowStyles.iconButton, styles.back]}
          >
            <FlowIcon name="back" color="white" />
          </Pressable>
          <View style={styles.heroActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share trip"
              onPress={() =>
                setNotice("Trip sharing is not available for seeded trips.")
              }
              style={flowStyles.iconButton}
            >
              <FlowIcon name="share" color="white" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="More trip actions"
              onPress={() => setTab("more")}
              style={flowStyles.iconButton}
            >
              <FlowIcon name="more" color="white" />
            </Pressable>
          </View>
        </View>
        <View style={styles.sheet}>
          <View style={styles.titleRow}>
            <View style={styles.grow}>
              <Text accessibilityRole="header" style={flowStyles.title}>
                New York → Los Angeles
              </Text>
              <Text style={flowStyles.meta}>May 20 – May 27</Text>
            </View>
            <Text style={styles.confirmed}>Confirmed</Text>
          </View>
          <Segments
            value={tab}
            onChange={setTab}
            options={[
              { value: "itinerary", label: "Itinerary", icon: "calendar" },
              { value: "flights", label: "Flights", icon: "flight" },
              { value: "hotels", label: "Hotels", icon: "hotel" },
              { value: "cars", label: "Cars", icon: "car" },
              { value: "more", label: "More", icon: "more" },
            ]}
          />
          {notice ? <UnavailableNotice text={notice} /> : null}
          {tab === "itinerary" ? (
            <Itinerary />
          ) : (
            <View style={styles.empty}>
              <Text style={flowStyles.value}>
                {tab[0].toUpperCase() + tab.slice(1)} details
              </Text>
              <Text style={flowStyles.meta}>
                No {tab} are attached to this seeded trip.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
function Itinerary() {
  return (
    <View style={styles.itinerary}>
      <Text style={flowStyles.sectionTitle}>Itinerary</Text>
      <Leg
        date="MAY 20"
        from="JFK"
        fromCity="New York"
        flight="AA 1234"
        fromTime="07:30 AM"
        to="LAX"
        toCity="Los Angeles"
        toTime="10:35 AM"
      />
      <Leg
        date="MAY 27"
        from="LAX"
        fromCity="Los Angeles"
        fromTime="05:45 PM"
        to="JFK"
        toCity="New York"
        toTime="01:15 AM +1"
      />
    </View>
  );
}
function Leg({
  date,
  from,
  fromCity,
  flight,
  fromTime,
  to,
  toCity,
  toTime,
}: {
  date: string;
  from: string;
  fromCity: string;
  flight?: string;
  fromTime: string;
  to: string;
  toCity: string;
  toTime: string;
}) {
  return (
    <View>
      <Text style={styles.date}>{date}</Text>
      <View style={styles.leg}>
        <View style={styles.timeline}>
          <View style={styles.circle}>
            <Text style={styles.planeMark}>✈</Text>
          </View>
          <View style={styles.line} />
          <View style={styles.circle}>
            <Text style={styles.planeMark}>✈</Text>
          </View>
        </View>
        <View style={styles.legCopy}>
          <View style={styles.stop}>
            <View>
              <Text style={flowStyles.value}>{from}</Text>
              <Text style={flowStyles.meta}>{fromCity}</Text>
              {flight ? <Text style={flowStyles.meta}>{flight}</Text> : null}
            </View>
            <Text style={flowStyles.value}>{fromTime}</Text>
          </View>
          <View style={styles.stop}>
            <View>
              <Text style={flowStyles.value}>{to}</Text>
              <Text style={flowStyles.meta}>{toCity}</Text>
            </View>
            <Text style={flowStyles.value}>{toTime}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { paddingBottom: 28 },
  hero: { height: 180, backgroundColor: "#DDE7F0" },
  back: { position: "absolute", left: 5, top: 4 },
  heroActions: { position: "absolute", right: 4, top: 4, flexDirection: "row" },
  sheet: {
    marginTop: -18,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: flowColors.page,
    padding: 14,
    gap: 12,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  grow: { flex: 1 },
  confirmed: {
    color: flowColors.green,
    backgroundColor: flowColors.paleGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 10,
    fontWeight: "800",
  },
  itinerary: { gap: 11 },
  date: {
    color: flowColors.navy,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
  },
  leg: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    borderColor: flowColors.border,
    borderWidth: 1,
    padding: 12,
  },
  timeline: { width: 34, alignItems: "center" },
  circle: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: flowColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  planeMark: { color: flowColors.navy, fontSize: 11 },
  line: { width: 1, height: 42, backgroundColor: flowColors.border },
  legCopy: { flex: 1, gap: 22 },
  stop: { flexDirection: "row", justifyContent: "space-between" },
  empty: {
    minHeight: 190,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
});
