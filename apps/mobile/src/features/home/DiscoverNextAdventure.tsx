import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSavedDestinations } from "../../storage/useSavedDestinations";
import { flowStyles, useFlowTheme } from "../flow/flowStyles";
import { AndroidFavoriteButton } from "./HomepageFavoriteButton";
import { discoverAdventureNavigation } from "./homepageCardNavigation";
import { discoveryAdventures, type DiscoveryAdventure } from "./DiscoverNextAdventureData";

export const DISCOVERY_GRID_LAYOUT = {
  columns: 2,
  columnGap: 12,
  rowGap: 12,
  sectionSideInset: 16,
  cardHeight: 300,
  imageHeight: 135,
  cardRadius: 16,
  contentPadding: 12,
} as const;

function DiscoveryCard({
  adventure,
  saved,
  onToggleFavorite,
  width,
}: {
  adventure: DiscoveryAdventure;
  saved: boolean;
  onToggleFavorite: (id: string) => void;
  width: number;
}) {
  const ft = useFlowTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const route = `${adventure.originCode} → ${adventure.destinationCode}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${adventure.title}. ${adventure.originCode} to ${adventure.destinationCode}.`}
      onPress={() => router.push(discoverAdventureNavigation(adventure))}
      style={({ pressed }) => [
        styles.card,
        { width },
        { backgroundColor: ft.colors.card, borderColor: ft.colors.border },
        ft.styles.shadow,
        pressed && flowStyles.pressed,
      ]}
      testID={`discovery-card-${adventure.id}`}
    >
      <View style={styles.imageFrame} testID={`discovery-image-frame-${adventure.id}`}>
        {imageFailed ? (
          <View
            accessibilityLabel={`Image unavailable for ${adventure.destinationCode}`}
            style={[styles.imageFallback, { backgroundColor: ft.colors.neutralImage }]}
          >
            <Text style={[styles.fallbackCode, { color: ft.colors.textPrimary }]}>{adventure.destinationCode}</Text>
          </View>
        ) : (
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel={adventure.imageAlt}
            onError={() => setImageFailed(true)}
            resizeMode="cover"
            source={adventure.image}
            style={styles.image}
          />
        )}
        <AndroidFavoriteButton
          saved={saved}
          label={`${saved ? "Remove" : "Add"} ${adventure.title} ${saved ? "from" : "to"} favorites`}
          onPress={(event) => {
            event.stopPropagation();
            onToggleFavorite(adventure.id);
          }}
          style={styles.favorite}
        />
      </View>
      <View
        style={[styles.contentPanel, { backgroundColor: ft.colors.card }]}
        testID={`discovery-content-panel-${adventure.id}`}
      >
        <Text
          numberOfLines={2}
          style={[styles.title, { color: ft.colors.textPrimary }]}
        >
          {adventure.title}
        </Text>
        <Text style={[styles.route, { color: ft.colors.textSecondary }]}>
          {route}
        </Text>
        <Text style={[styles.tripSummary, { color: ft.colors.textMuted }]}>
          ONE WAY · ECONOMY · 1 TRAVELER
        </Text>
        <Text style={[styles.from, { color: ft.colors.textSecondary }]}>
          From
        </Text>
      </View>
    </Pressable>
  );
}

export function DiscoverNextAdventure() {
  const ft = useFlowTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const { savedIds, toggle } = useSavedDestinations();
  const cardWidth =
    (viewportWidth -
      DISCOVERY_GRID_LAYOUT.sectionSideInset * 2 -
      DISCOVERY_GRID_LAYOUT.columnGap) /
    DISCOVERY_GRID_LAYOUT.columns;

  return (
    <View collapsable={false} testID="discover-next-adventure" style={styles.section}>
      <View style={styles.headingGroup}>
        <Text
          accessibilityRole="header"
          style={[styles.heading, { color: ft.colors.textPrimary }]}
        >
          Discover your next adventure here
        </Text>
        <Text style={[styles.subtitle, { color: ft.colors.textSecondary }]}>
          Compare smart route ideas, flexible fares, and destinations picked
          for your region.
        </Text>
      </View>
      <View style={styles.grid} testID="discover-next-adventure-grid">
        {discoveryAdventures.map((adventure) => (
          <DiscoveryCard
            key={adventure.id}
            adventure={adventure}
            saved={savedIds.has(adventure.id)}
            onToggleFavorite={toggle}
            width={cardWidth}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, marginHorizontal: 2, marginTop: 4 },
  headingGroup: { gap: 8 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: "600", letterSpacing: -0.25 },
  subtitle: { fontSize: 14, lineHeight: 24, fontWeight: "400" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: DISCOVERY_GRID_LAYOUT.columnGap,
    rowGap: DISCOVERY_GRID_LAYOUT.rowGap,
  },
  card: { height: DISCOVERY_GRID_LAYOUT.cardHeight, borderRadius: DISCOVERY_GRID_LAYOUT.cardRadius, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  imageFrame: { width: "100%", height: DISCOVERY_GRID_LAYOUT.imageHeight, position: "relative", overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  imageFallback: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  fallbackCode: { fontSize: 14, fontWeight: "900", letterSpacing: 1.4 },
  favorite: { position: "absolute", right: 12, top: 12 },
  contentPanel: { flex: 1, padding: DISCOVERY_GRID_LAYOUT.contentPadding },
  title: { fontSize: 14, lineHeight: 18, fontWeight: "600", letterSpacing: -0.14 },
  route: { marginTop: 6, fontSize: 12, lineHeight: 20, fontWeight: "600" },
  tripSummary: { marginTop: 2, fontSize: 10, lineHeight: 16, fontWeight: "600", letterSpacing: 0.8 },
  from: { marginTop: "auto", paddingTop: 8, fontSize: 14, lineHeight: 20, fontWeight: "600" },
});
