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

type DisplayPrice = {
  formatted: string;
  accessibilityLabel: string;
} | null;

type DetailsStatus = "loading" | "ready" | "error";

export type NativeHotelRateRow = {
  id: string;
  offerId: NativeHotelOffer["id"];
  roomOptionId?: string;
  providerKind: "kurioticket" | "provider";
  providerName: string;
  title: string;
  meta: string[];
  nightlyPrice: string;
  nightlyAccessibilityLabel: string;
  totalPrice: string;
  totalAccessibilityLabel: string;
  totalLabel: string;
  hasDisplayedPrice: boolean;
  actionable: boolean;
};

function capitalize(value: string) {
  return value ? `${value[0]!.toUpperCase()}${value.slice(1)}` : value;
}

function cleanRateCopy(value?: string | null) {
  return (value ?? "")
    .replace(/\bin planning estimate\b/gi, "")
    .replace(/\bplanning estimate\b/gi, "")
    .replace(/\bestimate\b/gi, "")
    .replace(/\bplanning\b/gi, "")
    .replace(/room-only/gi, "room only")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/^[\s—–-]+|[\s—–-]+$/g, "")
    .trim();
}

function conciseCondition(value?: string | null) {
  const cleaned = cleanRateCopy(value);
  if (!cleaned) return "";
  if (/free cancellation/i.test(cleaned)) return "Free cancellation";
  if (/non[- ]?refundable/i.test(cleaned)) return "Non-refundable";
  if (/pay later/i.test(cleaned)) return "Pay later";
  if (/breakfast/i.test(cleaned)) return "Breakfast included";
  if (/room only/i.test(cleaned)) return "Room only";
  if (/flexible/i.test(cleaned)) return "Flexible rate";
  return "";
}

function roomRatePresentation(option: PresentedHotelRoomOption) {
  const cleanedName = cleanRateCopy(option.name);
  const parts = cleanedName
    .split(/\s+[—–-]\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const title = capitalize(parts[0] || cleanRateCopy(option.name) || "Room rate");
  const suffixCondition = conciseCondition(parts.slice(1).join(" "));
  const cancellationCondition = conciseCondition(option.cancellationInfo);
  const mealCondition = conciseCondition(option.mealPlan);
  const featureCondition = option.features
    .map(conciseCondition)
    .find(Boolean) ?? "";

  return {
    title,
    meta: [suffixCondition || cancellationCondition || mealCondition || featureCondition].filter(Boolean),
  };
}

function meaningfulProviderMeta(value?: string | null) {
  const raw = value?.trim() ?? "";
  if (!raw || /planning|estimate|not yet confirmed|not currently offered/i.test(raw)) {
    return [];
  }
  const cleaned = cleanRateCopy(raw);
  return cleaned ? [capitalize(cleaned)] : [];
}

function providerRoomPresentation(value?: string | null) {
  const cleaned = cleanRateCopy(value);
  if (!cleaned) return { title: "Available rate", terms: [] as string[] };
  const parts = cleaned
    .split(/\s+[—–-]\s+/)
    .map(cleanRateCopy)
    .filter(Boolean);
  if (parts.length === 1) return { title: capitalize(parts[0]!), terms: [] as string[] };
  return {
    title: capitalize(parts[0]!),
    terms: parts.slice(1).map(capitalize),
  };
}

function providerRateTerms(roomTerms: string[], cancellationInfo?: string | null) {
  const condition = [
    ...roomTerms,
    ...meaningfulProviderMeta(cancellationInfo),
  ]
    .map(conciseCondition)
    .find(Boolean);
  return condition ? [condition] : [];
}

export function buildNativeHotelRateRows({
  offers,
  roomOptions,
  providerName,
  roomType,
  cancellationInfo,
  nightlyPrice,
  totalPrice,
  hasPrice,
}: {
  offers: NativeHotelOffer[];
  roomOptions: PresentedHotelRoomOption[];
  providerName: string;
  roomType?: string | null;
  cancellationInfo?: string | null;
  nightlyPrice: DisplayPrice;
  totalPrice: DisplayPrice;
  hasPrice: boolean;
}): NativeHotelRateRow[] {
  const internalOffer = offers.find((offer) => offer.kind === "internal-room-flow") ?? null;
  const providerOffer = offers.find((offer) => offer.kind === "provider-handoff") ?? null;
  const displayOnlyKayakOffer =
    !providerOffer &&
    providerName.trim() === "KAYAK sandbox" &&
    hasPrice &&
    nightlyPrice
      ? ({ id: "provider", kind: "provider-handoff" } as const)
      : null;
  const visibleProviderOffer = providerOffer ?? displayOnlyKayakOffer;
  const rows: NativeHotelRateRow[] = [];

  if (visibleProviderOffer) {
    const providerRoom = providerRoomPresentation(roomType);
    rows.push({
      id: `provider-${visibleProviderOffer.id}`,
      offerId: visibleProviderOffer.id,
      providerKind: "provider",
      providerName: providerName.trim() || "Provider",
      title: providerRoom.title,
      meta: providerRateTerms(providerRoom.terms, cancellationInfo),
      nightlyPrice: hasPrice && nightlyPrice ? nightlyPrice.formatted : "Price on provider",
      nightlyAccessibilityLabel: hasPrice && nightlyPrice
        ? `${nightlyPrice.accessibilityLabel} per night`
        : "Price confirmed on provider site",
      totalPrice: hasPrice && totalPrice ? totalPrice.formatted : "Price on provider",
      totalAccessibilityLabel: hasPrice && totalPrice
        ? `${totalPrice.accessibilityLabel} stay total`
        : "Price confirmed on provider site",
      totalLabel: "Stay total",
      hasDisplayedPrice: Boolean(hasPrice && nightlyPrice),
      actionable: Boolean(providerOffer),
    });
  }

  if (internalOffer) {
    for (const option of roomOptions) {
      const presentation = roomRatePresentation(option);
      const nightly = option.displayPrice?.nightly ?? null;
      const total = option.displayPrice?.total ?? null;
      rows.push({
        id: `room-${option.id}`,
        offerId: internalOffer.id,
        roomOptionId: option.id,
        providerKind: "kurioticket",
        providerName: "Kurioticket",
        title: presentation.title,
        meta: presentation.meta,
        nightlyPrice: nightly?.formatted ?? "Price unavailable",
        nightlyAccessibilityLabel: nightly
          ? `${nightly.accessibilityLabel} per night`
          : "Price unavailable",
        totalPrice: total?.formatted ?? "Price unavailable",
        totalAccessibilityLabel: total
          ? `${total.accessibilityLabel} estimated stay total`
          : "Price unavailable",
        totalLabel: "Estimated stay total",
        hasDisplayedPrice: Boolean(nightly),
        actionable: true,
      });
    }
  }

  return rows;
}

export function NativeHotelRatesSection({
  rows,
  selectedRateId,
  onSelectRate,
  stayDateText,
  nightText,
  detailsStatus,
  theme,
  accentColor,
}: {
  rows: NativeHotelRateRow[];
  selectedRateId: string | null;
  onSelectRate: (rateId: string) => void;
  stayDateText: string | null;
  nightText: string | null;
  detailsStatus: DetailsStatus;
  theme: Theme;
  accentColor: string;
}) {
  if (detailsStatus === "loading") return null;

  if (!rows.length) {
    return (
      <View style={s.section}>
        <View style={s.sectionHeading}>
          {stayDateText || nightText ? (
            <Text style={[s.stay, { color: theme.textSecondary }]}>
              {[stayDateText, nightText].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
        </View>
        <View style={[s.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>No reservable rates available</Text>
          <Text style={[s.emptyCopy, { color: theme.textSecondary }]}>Try updating your stay or check again later.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.section}>
      <View style={s.sectionHeading}>
        {stayDateText || nightText ? (
          <Text style={[s.stay, { color: theme.textSecondary }]}>
            {[stayDateText, nightText].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          s.rateList,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        {rows.map((row, index) => {
          const selected = row.id === selectedRateId;
          const showSelectionMarker = rows.length > 1 && selected;
          return (
            <View key={row.id}>
              {index > 0 ? <View style={[s.rateDivider, { backgroundColor: theme.border }]} /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: !row.actionable }}
                accessibilityLabel={`${selected ? "Selected. " : ""}${row.title}. ${row.nightlyAccessibilityLabel}`}
                disabled={!row.actionable}
                onPress={row.actionable ? () => onSelectRate(row.id) : undefined}
                style={({ pressed }) => [
                  s.rateCard,
                  { backgroundColor: theme.surface },
                  pressed && row.actionable && s.rateCardPressed,
                ]}
              >
                {showSelectionMarker ? (
                  <View pointerEvents="none" style={[s.selectedBar, { backgroundColor: accentColor }]} />
                ) : null}
                <View style={s.rateMain}>
                  <View style={s.rateCopy}>
                    <View style={s.providerIdentity}>
                      {row.providerKind === "kurioticket" ? (
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
                          {row.providerName}
                        </Text>
                      )}
                    </View>

                    <Text numberOfLines={2} style={[s.rateTitle, { color: theme.textPrimary }]}>
                      {row.title}
                    </Text>

                    {row.meta.length ? (
                      <Text numberOfLines={1} style={[s.rateMeta, { color: theme.textSecondary }]}>
                        {row.meta.join(" · ")}
                      </Text>
                    ) : null}
                  </View>

                  <View style={s.priceBlock}>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.68}
                      accessibilityLabel={row.nightlyAccessibilityLabel}
                      style={[
                        s.price,
                        !row.hasDisplayedPrice && s.priceUnavailable,
                        { color: row.hasDisplayedPrice ? theme.textPrimary : theme.textSecondary },
                      ]}
                    >
                      {row.nightlyPrice}
                    </Text>
                    {row.hasDisplayedPrice ? (
                      <Text style={[s.priceUnit, { color: accentColor }]}>per night</Text>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingBottom: 18 },
  sectionHeading: { paddingBottom: 12 },
  stay: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "400",
    fontFamily: appFonts.regular,
  },
  rateList: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  rateDivider: { height: StyleSheet.hairlineWidth },
  rateCard: {
    minHeight: 88,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "center",
    position: "relative",
  },
  selectedBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  rateCardPressed: { opacity: 0.84 },
  rateMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  providerIdentity: { minHeight: 18, justifyContent: "center" },
  brandLogo: { width: 92, height: 19, flexShrink: 0 },
  providerName: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    fontFamily: appFonts.semibold,
  },
  rateCopy: { flex: 1, minWidth: 0 },
  rateTitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    fontFamily: appFonts.semibold,
  },
  rateMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "400",
    fontFamily: appFonts.regular,
  },
  priceBlock: {
    flexShrink: 0,
    minWidth: 112,
    maxWidth: "42%",
    alignItems: "flex-end",
  },
  price: {
    maxWidth: "100%",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    fontFamily: appFonts.bold,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  priceUnit: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
    fontFamily: appFonts.medium,
    textAlign: "right",
  },
  priceUnavailable: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    fontFamily: appFonts.semibold,
  },
  emptyCard: {
    minHeight: 108,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 0,
    padding: 16,
  },
  emptyTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    fontFamily: appFonts.bold,
  },
  emptyCopy: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "400",
    fontFamily: appFonts.regular,
  },
});
