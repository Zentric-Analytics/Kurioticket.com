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
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors, flowStyles } from "../flow/flowStyles";

export const discoverNextAdventureItems = [
  {
    id: "ng-los-lhr",
    title: "London business and weekend mix",
    originCode: "LOS",
    destinationCode: "LHR",
    priceFromUsd: 535,
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Tower Bridge and London skyline",
  },
  {
    id: "ng-los-dxb",
    title: "Dubai shopping stopover",
    originCode: "LOS",
    destinationCode: "DXB",
    priceFromUsd: 498,
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Downtown Dubai skyline with Burj Khalifa",
  },
  {
    id: "ng-abv-acc",
    title: "Accra quick regional trip",
    originCode: "ABV",
    destinationCode: "ACC",
    priceFromUsd: 205,
    image: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "City traffic and skyline in Accra",
  },
  {
    id: "ng-los-nbo",
    title: "Nairobi safari gateway",
    originCode: "LOS",
    destinationCode: "NBO",
    priceFromUsd: 372,
    image: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Nairobi skyline with distant national park plains",
  },
  {
    id: "ng-abv-jnb",
    title: "Johannesburg city break",
    originCode: "ABV",
    destinationCode: "JNB",
    priceFromUsd: 441,
    image: "https://images.unsplash.com/photo-1604633193983-5ad0f0f9d4f8?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Johannesburg skyline at golden hour",
  },
  {
    id: "ng-los-ist",
    title: "Istanbul connector route",
    originCode: "LOS",
    destinationCode: "IST",
    priceFromUsd: 458,
    image: "https://images.pexels.com/photos/11540297/pexels-photo-11540297.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "Blue Mosque and Istanbul skyline under a clear travel-poster sky",
  },
  {
    id: "ng-abv-cdg",
    title: "Paris style escape",
    originCode: "ABV",
    destinationCode: "CDG",
    priceFromUsd: 549,
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Eiffel Tower above Paris streets",
  },
  {
    id: "ng-los-doh",
    title: "Doha premium transit",
    originCode: "LOS",
    destinationCode: "DOH",
    priceFromUsd: 432,
    image: "https://images.unsplash.com/photo-1578895101408-1a36b834405b?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Doha skyline and corniche waterfront",
  },
] as const;

function AdventureCard({
  item,
  width,
}: {
  item: (typeof discoverNextAdventureItems)[number];
  width: number;
}) {
  const { savedIds, toggle } = useSavedDestinations();
  const [imageFailed, setImageFailed] = useState(false);
  const saved = savedIds.has(item.id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.originCode} to ${item.destinationCode}. From $${item.priceFromUsd}.`}
      onPress={() =>
        router.push({
          pathname: "/flights",
          params: {
            from: item.originCode,
            to: item.destinationCode,
            tripType: "one-way",
            cabin: "economy",
            adults: "1",
          },
        })
      }
      style={({ pressed }) => [
        styles.card,
        flowStyles.shadow,
        { width },
        pressed && flowStyles.pressed,
      ]}
    >
      {imageFailed ? (
        <View style={styles.imageFallback}>
          <Text style={styles.fallbackCode}>{item.destinationCode}</Text>
        </View>
      ) : (
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel={item.imageAlt}
          onError={() => setImageFailed(true)}
          resizeMode="cover"
          source={{ uri: item.image }}
          style={styles.image}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${saved ? "Remove" : "Save"} ${item.originCode} to ${item.destinationCode} route`}
        accessibilityState={{ selected: saved }}
        hitSlop={8}
        onPress={(event) => {
          event.stopPropagation();
          toggle(item.id);
        }}
        style={[styles.heart, saved && styles.heartSaved]}
      >
        <FlowIcon name="heart" color={saved ? "#E11D48" : flowColors.muted} size={17} />
      </Pressable>
      <View style={styles.cardCopy}>
        <Text numberOfLines={2} style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.route}>{item.originCode} → {item.destinationCode}</Text>
        <Text style={styles.metadata}>ONE WAY · ECONOMY · 1 TRAVELER</Text>
        <View style={styles.priceRow}>
          <Text style={styles.from}>From</Text>
          <Text style={styles.price}>${item.priceFromUsd}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function DiscoverNextAdventure() {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(210, Math.max(170, width * 0.44));
  const rows = [
    discoverNextAdventureItems.slice(0, 4),
    discoverNextAdventureItems.slice(4, 8),
  ];

  return (
    <View testID="discover-next-adventure" style={styles.section}>
      <View style={styles.headingCopy}>
        <Text accessibilityRole="header" style={styles.heading}>Discover your next adventure here</Text>
        <Text style={styles.subtitle}>Fresh route ideas and destinations picked for your next trip.</Text>
      </View>
      {rows.map((items, index) => (
        <ScrollView
          key={index === 0 ? "top-row" : "bottom-row"}
          horizontal
          nestedScrollEnabled
          removeClippedSubviews={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {items.map((item) => <AdventureCard key={item.id} item={item} width={cardWidth} />)}
        </ScrollView>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, marginTop: 4 },
  headingCopy: { gap: 8 },
  heading: { color: "#0F172A", fontSize: 21, lineHeight: 27, fontWeight: "600", letterSpacing: -0.2 },
  subtitle: { color: "#475569", fontSize: 14, lineHeight: 24, fontWeight: "400" },
  row: { gap: 12, paddingBottom: 4, paddingRight: 40 },
  card: { height: 300, borderRadius: 16, borderWidth: 1, borderColor: "rgba(226,232,240,0.8)", backgroundColor: "white", overflow: "hidden" },
  image: { width: "100%", height: 135, backgroundColor: "#EAF2FF" },
  imageFallback: { width: "100%", height: 135, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF2FF" },
  fallbackCode: { color: flowColors.navy, fontSize: 18, fontWeight: "900", letterSpacing: 2 },
  heart: { position: "absolute", right: 12, top: 12, zIndex: 1, width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.8)", backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  heartSaved: { borderColor: "#FECDD3", backgroundColor: "#FFF1F2" },
  cardCopy: { flex: 1, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 },
  cardTitle: { minHeight: 36, color: "#020617", fontSize: 14, lineHeight: 18, fontWeight: "600", letterSpacing: -0.1 },
  route: { marginTop: 3, color: "#334155", fontSize: 12, lineHeight: 20, fontWeight: "600" },
  metadata: { color: "#64748B", fontSize: 10, lineHeight: 16, fontWeight: "600", letterSpacing: 0.8 },
  priceRow: { marginTop: "auto", paddingTop: 8, flexDirection: "row", alignItems: "baseline", gap: 6 },
  from: { color: "#334155", fontSize: 14, lineHeight: 20, fontWeight: "600" },
  price: { color: "#020617", fontSize: 16, lineHeight: 20, fontWeight: "700", letterSpacing: -0.2 },
});
