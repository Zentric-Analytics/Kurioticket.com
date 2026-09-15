import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeHotelOffer } from "./nativeHotelDetailsModel";
import type { PresentedHotelRoomOption } from "./NativeHotelDetails";
import { appFonts } from "../../theme/typography";

type Theme = {
  dark: boolean;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
};

type NightlyPrice = {
  formatted: string;
  accessibilityLabel: string;
} | null;

type DetailsStatus = "loading" | "ready" | "error";

type StaticRate = {
  id: string;
  roomName: string;
  price: string;
  benefits: string[];
};

type StaticRateGroup = {
  id: string;
  title: string;
  rates: StaticRate[];
};

const STATIC_RATE_GROUPS: StaticRateGroup[] = [
  {
    id: "standard",
    title: "Standard Room",
    rates: [
      {
        id: "standard-queen-flex",
        roomName: "Standard Room, 1 Queen Bed",
        price: "$1,225",
        benefits: ["Free cancellation", "Breakfast included"],
      },
      {
        id: "standard-queen",
        roomName: "Standard Room, 1 Queen Bed",
        price: "$1,389",
        benefits: ["Free cancellation"],
      },
    ],
  },
  {
    id: "deluxe",
    title: "Deluxe Room",
    rates: [
      {
        id: "deluxe-king",
        roomName: "Deluxe Room, 1 King Bed",
        price: "$1,512",
        benefits: ["Breakfast included", "Free cancellation"],
      },
    ],
  },
  {
    id: "suite",
    title: "One-Bedroom Suite",
    rates: [
      {
        id: "suite-king",
        roomName: "One-Bedroom Suite, 1 King Bed",
        price: "$1,890",
        benefits: ["Free cancellation", "Breakfast included"],
      },
    ],
  },
];

export function NativeHotelRatesSection({
  offers,
  onSelectOffer,
  theme,
  accentColor,
}: {
  offers: NativeHotelOffer[];
  selectedOfferId: NativeHotelOffer["id"] | null;
  onSelectOffer: (offerId: NativeHotelOffer["id"]) => void;
  roomOptions: PresentedHotelRoomOption[];
  providerName: string;
  roomType?: string | null;
  cancellationInfo?: string | null;
  nightlyPrice: NightlyPrice;
  hasPrice: boolean;
  detailsStatus: DetailsStatus;
  theme: Theme;
  accentColor: string;
}) {
  const reserveOffer = () => {
    const firstOffer = offers[0];
    if (firstOffer) onSelectOffer(firstOffer.id);
  };

  return (
    <View style={s.section}>
      {STATIC_RATE_GROUPS.map((group) => (
        <View key={group.id} style={s.groupSection}>
          <Text style={[s.groupTitle, { color: theme.textPrimary }]}>{group.title}</Text>
          <View style={[s.groupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {group.rates.map((rate, index) => (
              <View
                key={rate.id}
                style={[
                  s.rateRow,
                  index > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <View style={s.rateCopy}>
                  <Image
                    accessible
                    accessibilityLabel="Kurioticket"
                    accessibilityIgnoresInvertColors
                    source={require("../../../assets/kurioticket-logo-primary-light-bg.png")}
                    resizeMode="contain"
                    style={s.brandLogo}
                  />
                  <Text numberOfLines={2} style={[s.rateTitle, { color: theme.textPrimary }]}>
                    {rate.roomName}
                  </Text>
                  <View style={s.benefitList}>
                    {rate.benefits.map((benefit) => (
                      <Text key={benefit} style={[s.rateMeta, { color: theme.textSecondary }]}>
                        {benefit}
                      </Text>
                    ))}
                  </View>
                </View>

                <View style={s.rateActionColumn}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.68}
                    accessibilityLabel={`${rate.price} stay price`}
                    style={[s.price, { color: theme.textPrimary }]}
                  >
                    {rate.price}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Reserve ${rate.roomName}`}
                    onPress={reserveOffer}
                    disabled={!offers.length}
                    style={({ pressed }) => [
                      s.reserveButton,
                      { backgroundColor: accentColor },
                      !offers.length && s.reserveButtonDisabled,
                      pressed && offers.length && s.reserveButtonPressed,
                    ]}
                  >
                    <Text style={s.reserveButtonText}>Reserve</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingBottom: 12, gap: 18 },
  groupSection: { gap: 8 },
  groupTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "700",
    fontFamily: appFonts.bold,
  },
  groupCard: { overflow: "hidden", borderWidth: 1, borderRadius: 14 },
  rateRow: {
    minHeight: 142,
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 14,
  },
  rateCopy: { flex: 1, minWidth: 0, justifyContent: "flex-start" },
  brandLogo: { width: 104, height: 22, flexShrink: 0, marginBottom: 10 },
  rateTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    fontFamily: appFonts.bold,
  },
  benefitList: { marginTop: 8, gap: 2 },
  rateMeta: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "400",
    fontFamily: appFonts.regular,
  },
  rateActionColumn: {
    width: 112,
    flexShrink: 0,
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  price: {
    maxWidth: "100%",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    fontFamily: appFonts.bold,
    textAlign: "right",
  },
  reserveButton: {
    minWidth: 88,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  reserveButtonPressed: { opacity: 0.84 },
  reserveButtonDisabled: { opacity: 0.5 },
  reserveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    fontFamily: appFonts.bold,
  },
});
