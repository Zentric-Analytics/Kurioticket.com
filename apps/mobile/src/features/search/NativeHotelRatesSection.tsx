import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { appFonts } from "../../theme/typography";
import type { NativeHotelOffer } from "./nativeHotelDetailsModel";
import type { PresentedHotelRoomOption } from "./NativeHotelDetails";

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

function capitalize(value: string) {
  return value ? `${value[0]!.toUpperCase()}${value.slice(1)}` : value;
}

function roomRateTitle(options: PresentedHotelRoomOption[]) {
  const name = options[0]?.name?.trim();
  if (!name) return null;
  const parts = name.split(/\s+[—–-]\s+/).filter(Boolean);
  return capitalize(parts.length > 1 ? parts.slice(1).join(" — ").trim() : name);
}

export function NativeHotelRatesSection({
  offers,
  selectedOfferId,
  onSelectOffer,
  roomOptions,
  providerName,
  roomType,
  cancellationInfo,
  nightlyPrice,
  hasPrice,
  detailsStatus,
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
  const representativeRoom = roomOptions[0] ?? null;
  const internalTitle = roomRateTitle(roomOptions);
  const internalMeta = representativeRoom?.cancellationInfo.trim() ?? "";
  const internalNightlyPrice = representativeRoom?.displayPrice?.nightly ?? nightlyPrice;
  const providerMeta = cancellationInfo?.trim() ?? "";

  return (
    <View style={s.section}>
      {offers.length ? (
        <View style={[s.groupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {offers.map((offer, index) => {
            const selected = offer.id === selectedOfferId;
            const internal = offer.kind === "internal-room-flow";
            const title = internal
              ? internalTitle ?? "Room option"
              : roomType?.trim() || "Provider rate";
            const meta = internal ? internalMeta : providerMeta;
            const offerNightlyPrice = internal ? internalNightlyPrice : nightlyPrice;
            const offerHasPrice = internal ? Boolean(internalNightlyPrice) : hasPrice;

            return (
              <Pressable
                key={offer.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${internal ? "Kurioticket" : providerName} ${title}`}
                onPress={() => onSelectOffer(offer.id)}
                style={({ pressed }) => [
                  s.rateRow,
                  index > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth },
                  pressed && s.rateRowPressed,
                ]}
              >
                <View style={s.rateCopy}>
                  {internal ? (
                    <Image
                      accessible
                      accessibilityLabel="Kurioticket"
                      accessibilityIgnoresInvertColors
                      source={require("../../../assets/kurioticket-logo-primary-light-bg.png")}
                      resizeMode="contain"
                      style={s.brandLogo}
                    />
                  ) : (
                    <Text numberOfLines={1} style={[s.providerName, { color: theme.textPrimary }]}>
                      {providerName}
                    </Text>
                  )}
                  <Text numberOfLines={2} style={[s.rateTitle, { color: theme.textPrimary }]}>
                    {title}
                  </Text>
                  {meta ? (
                    <Text numberOfLines={2} style={[s.rateMeta, { color: theme.textSecondary }]}>
                      {meta}
                    </Text>
                  ) : null}
                </View>

                <View style={s.rateActionColumn}>
                  <View style={s.priceBlock}>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.68}
                      accessibilityLabel={
                        offerHasPrice && offerNightlyPrice
                          ? `${offerNightlyPrice.accessibilityLabel} per night`
                          : "Price unavailable"
                      }
                      style={[s.price, { color: theme.textPrimary }]}
                    >
                      {offerHasPrice ? (offerNightlyPrice?.formatted ?? "—") : "Price unavailable"}
                    </Text>
                    {offerHasPrice ? (
                      <Text style={[s.perNight, { color: theme.textSecondary }]}>per night</Text>
                    ) : null}
                  </View>
                  <View style={[s.selectButton, { backgroundColor: accentColor }]}>
                    <Text style={s.selectButtonText}>{selected ? "Selected" : "Select"}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : detailsStatus !== "loading" ? (
        <View style={[s.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[s.providerName, { color: theme.textPrimary }]}>{providerName}</Text>
          <Text style={[s.rateMeta, { color: theme.textSecondary }]}>Planning inventory · no live checkout</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingBottom: 4 },
  groupCard: { overflow: "hidden", borderWidth: 1, borderRadius: 12 },
  rateRow: { minHeight: 134, flexDirection: "row", alignItems: "stretch", padding: 16, gap: 14 },
  rateRowPressed: { opacity: 0.82 },
  rateCopy: { flex: 1, minWidth: 0, justifyContent: "flex-start" },
  brandLogo: { width: 104, height: 22, flexShrink: 0, marginBottom: 10 },
  providerName: { fontSize: 15, lineHeight: 20, fontWeight: "700", fontFamily: appFonts.bold, marginBottom: 10 },
  rateTitle: { fontSize: 16, lineHeight: 22, fontWeight: "700", fontFamily: appFonts.bold },
  rateMeta: { marginTop: 10, fontSize: 14, lineHeight: 19, fontWeight: "400", fontFamily: appFonts.regular },
  rateActionColumn: { width: 112, flexShrink: 0, alignItems: "flex-end", justifyContent: "space-between" },
  priceBlock: { width: "100%", alignItems: "flex-end" },
  price: { maxWidth: "100%", fontSize: 20, lineHeight: 26, fontWeight: "700", fontFamily: appFonts.bold, textAlign: "right" },
  perNight: { marginTop: 2, fontSize: 12, lineHeight: 17, fontWeight: "400", fontFamily: appFonts.regular, textAlign: "right" },
  selectButton: { minWidth: 88, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  selectButtonText: { color: "#FFFFFF", fontSize: 15, lineHeight: 20, fontWeight: "700", fontFamily: appFonts.bold },
  emptyCard: { minHeight: 112, justifyContent: "center", borderWidth: 1, borderRadius: 12, padding: 16 },
});
