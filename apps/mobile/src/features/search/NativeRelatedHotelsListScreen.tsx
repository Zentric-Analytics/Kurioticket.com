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
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ImageOff } from "lucide-react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import type { NativeRelatedHotel } from "./nativeHotelRelatedHotelsModel";

const one = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;

const parse = <T,>(value?: string | string[]) => {
  try {
    return JSON.parse(one(value) || "") as T;
  } catch {
    return undefined;
  }
};

function RelatedHotelListCard({
  item,
  onPress,
}: {
  item: NativeRelatedHotel;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View hotel ${item.hotel.name}`}
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && s.pressed,
      ]}
    >
      <View style={s.imageFrame}>
        {item.hotel.imageUrl && !imageFailed ? (
          <Image
            source={{ uri: item.hotel.imageUrl }}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
            style={s.image}
          />
        ) : (
          <View style={[s.imageFallback, { backgroundColor: theme.border }]}>
            <ImageOff accessible={false} size={20} color={theme.icon} />
          </View>
        )}
      </View>
      <View style={s.cardBody}>
        {item.classificationStars ? (
          <Text
            accessible
            accessibilityLabel={`${item.classificationStars} star hotel`}
            style={s.stars}
          >
            {"★".repeat(item.classificationStars)}
          </Text>
        ) : null}
        <Text numberOfLines={2} style={[s.hotelName, { color: theme.textPrimary }]}>
          {item.hotel.name}
        </Text>
        {item.location ? (
          <Text numberOfLines={2} style={[s.location, { color: theme.textSecondary }]}>
            {item.location}
          </Text>
        ) : null}
        <View style={s.priceBlock}>
          {item.displayPrices?.nightly ? (
            <Text
              accessibilityLabel={`${item.displayPrices.nightly.accessibilityLabel} per night`}
              style={[s.nightly, { color: theme.textPrimary }]}
            >
              {item.displayPrices.nightly.formatted} per night
            </Text>
          ) : (
            <Text style={[s.priceUnavailable, { color: theme.textSecondary }]}>Price unavailable</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export function NativeRelatedHotelsListScreen() {
  const { theme } = useAppTheme();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const hotels = parse<NativeRelatedHotel[]>(params.relatedHotels) ?? [];
  const cityName = one(params.city)?.trim();
  const canvasColor = theme.dark ? theme.background : theme.surface;
  const title = cityName ? `More hotels in ${cityName}` : "More hotels nearby";

  const viewHotel = (item: NativeRelatedHotel) => {
    router.push({
      pathname: "/hotel-details",
      params: {
        result: JSON.stringify(item.result),
        destination: one(params.destination) || cityName || item.hotel.location || "",
        checkIn: one(params.checkIn) || "",
        checkOut: one(params.checkOut) || "",
        guests: one(params.guests) || "2",
        rooms: one(params.rooms) || "1",
        hotelDisplayPrices: item.displayPrices ? JSON.stringify(item.displayPrices) : "",
        displayCurrencyContext: one(params.displayCurrencyContext) || "",
      },
    });
  };

  return (
    <SafeAreaView edges={["top"]} style={[s.safe, { backgroundColor: canvasColor }]}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to hotel details"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [s.backButton, pressed && s.pressed]}
        >
          <ArrowLeft accessible={false} size={24} color={theme.textPrimary} />
        </Pressable>
        <Text accessibilityRole="header" numberOfLines={1} style={[s.title, { color: theme.textPrimary }]}>
          {title}
        </Text>
        <View accessible={false} style={s.headerBalance} />
      </View>

      {hotels.length ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
        >
          {hotels.map((item) => (
            <RelatedHotelListCard
              key={item.hotel.id}
              item={item}
              onPress={() => viewHotel(item)}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={s.empty}>
          <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>No related hotels available</Text>
          <Text style={[s.emptyText, { color: theme.textSecondary }]}>Return to the hotel details page.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    minHeight: 56,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBalance: { width: 44, height: 44 },
  title: {
    flex: 1,
    minWidth: 0,
    textAlign: "center",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    fontFamily: appFonts.bold,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 12,
  },
  card: {
    minHeight: 132,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
  pressed: { opacity: 0.72 },
  imageFrame: {
    width: 122,
    minHeight: 132,
    backgroundColor: "#E7EBF2",
  },
  image: { width: "100%", height: "100%" },
  imageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 11,
  },
  stars: {
    color: "#F59E0B",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.96,
    fontWeight: "400",
    fontFamily: appFonts.regular,
  },
  hotelName: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    fontFamily: appFonts.semibold,
  },
  location: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "400",
    fontFamily: appFonts.regular,
  },
  priceBlock: { marginTop: "auto", paddingTop: 7 },
  nightly: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    fontFamily: appFonts.semibold,
  },
  priceUnavailable: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    fontFamily: appFonts.semibold,
  },
  empty: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    fontFamily: appFonts.bold,
    textAlign: "center",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "400",
    fontFamily: appFonts.regular,
    textAlign: "center",
  },
});
