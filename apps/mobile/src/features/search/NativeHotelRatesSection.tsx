import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

type RateRow = {
  id: string;
  offerId: NativeHotelOffer["id"];
  providerKind: "kurioticket" | "provider";
  providerName: string;
  title: string;
  meta: string[];
  price: string;
  priceUnit?: string;
  priceAccessibilityLabel: string;
  hasDisplayedPrice: boolean;
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
  const parts = option.name.split(/\s+[—–-]\s+/).filter(Boolean);
  const suffix = cleanRateCopy(
    parts.length > 1 ? parts.slice(1).join(" — ") : option.mealPlan,
  );
  const mealPlan = cleanRateCopy(option.mealPlan);

  if (/breakfast/i.test(suffix) && mealPlan) return capitalize(mealPlan);
  if (/room only/i.test(suffix) && mealPlan) return capitalize(mealPlan);
  if (/^flexible$/i.test(suffix)) return "Flexible rate";
  return capitalize(suffix || mealPlan || "Room rate");
}

function meaningfulRateMeta(option: PresentedHotelRoomOption, title: string) {
  const rawValues = [
    option.bedConfiguration,
    option.mealPlan,
    ...option.features.filter((feature) => !/planning|estimate/i.test(feature)),
  ];
  const normalizedTitle = title.toLocaleLowerCase();
  return rawValues
    .map(cleanRateCopy)
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .filter((value) => value.toLocaleLowerCase() !== normalizedTitle)
    .slice(0, 2);
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
    .slice(0, 2);
}

const previewReserve = () => undefined;
const reserveLabel = "Reserve";

export function NativeHotelRatesSection({
  offers,
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
  if (detailsStatus === "loading") return null;

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
  const rows: RateRow[] = [];

  if (internalOffer) {
    const option = roomOptions[0];
    if (option) {
      const title = roomRateTitle(option);
      const total = option.displayPrice?.total ?? null;
      rows.push({
        id: `room-${option.id}`,
        offerId: internalOffer.id,
        providerKind: "kurioticket",
        providerName: "Kurioticket",
        title,
        meta: meaningfulRateMeta(option, title),
        price: total?.formatted ?? "Price unavailable",
        priceAccessibilityLabel: total
          ? `${total.accessibilityLabel} stay price`
          : "Price unavailable",
        hasDisplayedPrice: Boolean(total),
      });
    }
  }

  if (visibleProviderOffer) {
    const providerRoom = providerRoomPresentation(roomType);
    const providerPrice = hasPrice ? nightlyPrice : null;
    rows.unshift({
      id: `provider-${visibleProviderOffer.id}`,
      offerId: visibleProviderOffer.id,
      providerKind: "provider",
      providerName: providerName.trim() || "Provider",
      title: providerRoom.title,
      meta: providerRateTerms(providerRoom.terms, cancellationInfo),
      price: providerPrice ? providerPrice.formatted : "Price on provider",
      priceUnit: providerPrice ? "per night" : undefined,
      priceAccessibilityLabel: providerPrice
        ? `${providerPrice.accessibilityLabel} per night`
        : "Price confirmed on provider site",
      hasDisplayedPrice: Boolean(providerPrice),
    });
  }

  const row = rows[0] ?? null;

  if (!row) {
    return (
      <View style={s.section}>
        <View style={[s.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>No reservable rates available</Text>
          <Text style={[s.emptyCopy, { color: theme.textSecondary }]}>Try updating your stay or check again later.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.section}>
      <View style={[s.rateCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={s.rateCopy}>
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
            <Text numberOfLines={1} style={[s.providerName, { color: theme.textSecondary }]}>
              {row.providerName}
            </Text>
          )}
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

        <View style={s.rateActionColumn}>
          <View style={s.priceBlock}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.68}
              accessibilityLabel={row.priceAccessibilityLabel}
              style={[
                s.price,
                !row.hasDisplayedPrice && s.priceUnavailable,
                { color: row.hasDisplayedPrice ? theme.textPrimary : theme.textSecondary },
              ]}
            >
              {row.price}
            </Text>
            {row.priceUnit ? (
              <Text style={[s.priceUnit, { color: theme.textSecondary }]}>{row.priceUnit}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            accessibilityRole={"button"}
            accessibilityLabel={`Reserve ${row.title}`}
            activeOpacity={0.84}
            onPress={previewReserve}
            style={[s.actionControl, { backgroundColor: accentColor }]}
          >
            <Text style={s.actionControlText}>{reserveLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingBottom: 12 },
  rateCard: {
    minHeight: 134,
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  rateCopy: { flex: 1, minWidth: 0, justifyContent: "flex-start" },
  brandLogo: { width: 88, height: 18, flexShrink: 0, marginBottom: 8 },
  providerName: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    fontFamily: appFonts.semibold,
    marginBottom: 6,
  },
  rateTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    fontFamily: appFonts.bold,
  },
  benefitList: { marginTop: 8, gap: 2 },
  rateMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    fontFamily: appFonts.regular,
  },
  rateActionColumn: {
    width: 128,
    flexShrink: 0,
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  priceBlock: { width: "100%", minWidth: 0, alignItems: "flex-end" },
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
    fontSize: 12,
    lineHeight: 16,
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
  actionControl: {
    minWidth: 82,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  actionControlText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    fontFamily: appFonts.bold,
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