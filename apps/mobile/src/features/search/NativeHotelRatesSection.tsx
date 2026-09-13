import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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

function roomGroupName(options: PresentedHotelRoomOption[], fallback: string) {
  const name = options[0]?.name?.trim();
  if (!name) return fallback.trim() || "Available rates";
  return name.split(/\s+[—–-]\s+/)[0]?.trim() || fallback.trim() || "Available rates";
}

function roomRateTags(options: PresentedHotelRoomOption[]) {
  const tags: string[] = [];
  const add = (label: string) => {
    if (!tags.includes(label)) tags.push(label);
  };

  for (const option of options) {
    const mealPlan = option.mealPlan.trim().toLocaleLowerCase();
    const cancellation = option.cancellationInfo.trim().toLocaleLowerCase();
    if (mealPlan.includes("breakfast")) add("Breakfast included");
    if (mealPlan === "room only" || mealPlan.startsWith("room only")) add("Room only");
    if (cancellation.includes("flexible")) add("Flexible terms");
    if (option.taxesAndFeesIncluded === true) add("Taxes included");
  }

  return tags.slice(0, 4);
}

function internalRateSummary(options: PresentedHotelRoomOption[]) {
  if (!options.length) return null;
  if (options.length === 1) return options[0]!.name;
  return `${options.length} room choices`;
}

function internalTerms(options: PresentedHotelRoomOption[]) {
  return roomRateTags(options).join(" · ");
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
  theme: Theme;
  accentColor: string;
}) {
  const tags = roomRateTags(roomOptions);
  const heading = roomGroupName(roomOptions, roomType ?? "Available rates");
  const internalSummary = internalRateSummary(roomOptions);
  const internalMeta = internalTerms(roomOptions);
  const providerMeta = cancellationInfo?.trim() ?? "";

  return (
    <View style={s.section}>
      {tags.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipViewport}
          contentContainerStyle={s.chipRow}
        >
          {tags.map((tag) => (
            <View
              key={tag}
              style={[
                s.chip,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text numberOfLines={1} style={[s.chipText, { color: theme.textPrimary }]}>
                {tag}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <Text accessibilityRole="header" style={[s.groupHeading, { color: theme.textPrimary }]}>
        {heading}
      </Text>

      {offers.length ? (
        <View style={[s.groupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {offers.map((offer, index) => {
            const selected = offer.id === selectedOfferId;
            const internal = offer.kind === "internal-room-flow";
            const title = internal
              ? internalSummary ?? "Room options"
              : roomType?.trim() || "Provider rate";
            const meta = internal ? internalMeta : providerMeta;

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
                      minimumFontScale={0.72}
                      accessibilityLabel={
                        hasPrice && nightlyPrice
                          ? `${nightlyPrice.accessibilityLabel} per night`
                          : "Price unavailable"
                      }
                      style={[s.price, { color: theme.textPrimary }]}
                    >
                      {hasPrice ? (nightlyPrice?.formatted ?? "—") : "Price unavailable"}
                    </Text>
                    {hasPrice ? (
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
      ) : (
        <View style={[s.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[s.providerName, { color: theme.textPrimary }]}>{providerName}</Text>
          <Text style={[s.rateMeta, { color: theme.textSecondary }]}>Planning inventory · no live checkout</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingTop: 4, paddingBottom: 4 },
  chipViewport: { marginHorizontal: -16 },
  chipRow: { gap: 8, paddingHorizontal: 16, paddingBottom: 28 },
  chip: { height: 36, justifyContent: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  chipText: { fontSize: 14, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  groupHeading: { fontSize: 18, lineHeight: 24, fontWeight: "700", fontFamily: appFonts.bold, letterSpacing: -0.2 },
  groupCard: { marginTop: 16, overflow: "hidden", borderWidth: 1, borderRadius: 12 },
  rateRow: { minHeight: 132, flexDirection: "row", alignItems: "stretch", padding: 16, gap: 12 },
  rateRowPressed: { opacity: 0.82 },
  rateCopy: { flex: 1, minWidth: 0, justifyContent: "center" },
  brandLogo: { width: 112, height: 24, flexShrink: 0, marginBottom: 8 },
  providerName: { fontSize: 15, lineHeight: 20, fontWeight: "700", fontFamily: appFonts.bold, marginBottom: 8 },
  rateTitle: { fontSize: 16, lineHeight: 22, fontWeight: "700", fontFamily: appFonts.bold },
  rateMeta: { marginTop: 8, fontSize: 14, lineHeight: 19, fontWeight: "400", fontFamily: appFonts.regular },
  rateActionColumn: { width: 132, flexShrink: 0, alignItems: "flex-end", justifyContent: "space-between" },
  priceBlock: { width: "100%", alignItems: "flex-end" },
  price: { maxWidth: "100%", fontSize: 20, lineHeight: 26, fontWeight: "700", fontFamily: appFonts.bold, textAlign: "right" },
  perNight: { marginTop: 2, fontSize: 12, lineHeight: 17, fontWeight: "400", fontFamily: appFonts.regular, textAlign: "right" },
  selectButton: { minWidth: 88, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  selectButtonText: { color: "#FFFFFF", fontSize: 15, lineHeight: 20, fontWeight: "700", fontFamily: appFonts.bold },
  emptyCard: { marginTop: 16, minHeight: 112, justifyContent: "center", borderWidth: 1, borderRadius: 12, padding: 16 },
});
