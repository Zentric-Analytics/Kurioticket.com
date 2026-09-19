import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
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

function roomRateTitle(option: PresentedHotelRoomOption) {
  const cleanedName = cleanRateCopy(option.name);
  if (cleanedName) return capitalize(cleanedName);
  const mealPlan = cleanRateCopy(option.mealPlan);
  return capitalize(mealPlan || "Room rate");
}

function meaningfulRateMeta(option: PresentedHotelRoomOption, title: string) {
  const rawValues = [
    option.bedConfiguration,
    option.mealPlan,
    option.cancellationInfo,
    ...option.features.filter((feature) => !/planning|estimate/i.test(feature)),
  ];
  const normalizedTitle = title.toLocaleLowerCase();
  return rawValues
    .map(cleanRateCopy)
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .filter((value) => value.toLocaleLowerCase() !== normalizedTitle)
    .slice(0, 3);
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
  const hasSpecificCancellation = roomTerms.some((term) =>
    /non[- ]?refundable|refundable|free cancellation|cancel/i.test(term),
  );
  return [...roomTerms, ...meaningfulProviderMeta(cancellationInfo)]
    .map(cleanRateCopy)
    .filter(Boolean)
    .filter((term) =>
      !(hasSpecificCancellation && /cancellation conditions apply|see supplied rate details/i.test(term)),
    )
    .filter(
      (term, index, values) =>
        values.findIndex((candidate) => candidate.toLocaleLowerCase() === term.toLocaleLowerCase()) === index,
    )
    .slice(0, 3);
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
      const title = roomRateTitle(option);
      const nightly = option.displayPrice?.nightly ?? null;
      const total = option.displayPrice?.total ?? null;
      rows.push({
        id: `room-${option.id}`,
        offerId: internalOffer.id,
        roomOptionId: option.id,
        providerKind: "kurioticket",
        providerName: "Kurioticket",
        title,
        meta: meaningfulRateMeta(option, title),
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
          <Text style={[s.heading, { color: theme.textPrimary }]}>Rates</Text>
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
        <Text style={[s.heading, { color: theme.textPrimary }]}>Rates</Text>
        {stayDateText || nightText ? (
          <Text style={[s.stay, { color: theme.textSecondary }]}>
            {[stayDateText, nightText].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
      </View>

      <View style={s.rateList}>
        {rows.map((row) => {
          const selected = row.id === selectedRateId;
          return (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !row.actionable }}
              accessibilityLabel={`${selected ? "Selected. " : ""}${row.title}. ${row.nightlyAccessibilityLabel}`}
              disabled={!row.actionable}
              onPress={row.actionable ? () => onSelectRate(row.id) : undefined}
              style={({ pressed }) => [
                s.rateCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: selected ? accentColor : theme.border,
                  borderWidth: selected ? 2 : 1,
                },
                pressed && row.actionable && s.rateCardPressed,
              ]}
            >
              <View style={s.rateTop}>
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
                {selected ? (
                  <View
                    pointerEvents="none"
                    accessible={false}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={s.selectedMark}
                  >
                    <Check size={19} strokeWidth={2.6} color={accentColor} />
                  </View>
                ) : null}
              </View>

              <View style={s.rateBottom}>
                <View style={s.rateCopy}>
                  <Text numberOfLines={2} style={[s.rateTitle, { color: theme.textPrimary }]}>
                    {row.title}
                  </Text>
                  {row.meta.length ? (
                    <View style={s.benefitList}>
                      {row.meta.map((benefit) => (
                        <Text key={benefit} numberOfLines={1} style={[s.rateMeta, { color: theme.textSecondary }]}>
                          {benefit}
                        </Text>
                      ))}
                    </View>
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
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingBottom: 18 },
  sectionHeading: { paddingBottom: 14 },
  heading: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    fontFamily: appFonts.bold,
  },
  stay: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "400",
    fontFamily: appFonts.regular,
  },
  rateList: { gap: 12 },
  rateCard: {
    minHeight: 126,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    overflow: "hidden",
  },
  rateCardPressed: { opacity: 0.88 },
  rateTop: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  providerIdentity: { flex: 1, minWidth: 0 },
  brandLogo: { width: 104, height: 22, flexShrink: 0 },
  providerName: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    fontFamily: appFonts.bold,
  },
  selectedMark: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rateBottom: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 14,
  },
  rateCopy: { flex: 1, minWidth: 0 },
  rateTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    fontFamily: appFonts.bold,
  },
  benefitList: { marginTop: 7, gap: 2 },
  rateMeta: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "400",
    fontFamily: appFonts.regular,
  },
  priceBlock: {
    flexShrink: 1,
    minWidth: 112,
    maxWidth: "44%",
    alignItems: "flex-end",
  },
  price: {
    maxWidth: "100%",
    fontSize: 20,
    lineHeight: 24,
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
