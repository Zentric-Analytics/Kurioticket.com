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
  priceAccessibilityLabel: string;
  hasDisplayedPrice: boolean;
};

type RateGroup = {
  id: string;
  title: string;
  rows: RateRow[];
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

function roomGroupTitle(name: string) {
  const base = name.split(/\s+[—–-]\s+/)[0]?.trim() ?? "";
  return capitalize(cleanRateCopy(base) || "Room");
}

function roomCardCategory(name: string) {
  const category = roomGroupTitle(name);
  return category.replace(/\s+options$/i, "").trim() || category;
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

function composeRoomRateTitle(category: string, rateLabel: string) {
  if (!rateLabel || category.toLocaleLowerCase() === rateLabel.toLocaleLowerCase()) {
    return category;
  }
  return `${category} — ${rateLabel}`;
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
  return cleaned ? [cleaned] : [];
}

function addRateRow(groups: RateGroup[], groupTitle: string, row: RateRow) {
  const groupKey = groupTitle.toLocaleLowerCase();
  const existing = groups.find((group) => group.id === groupKey);
  if (existing) {
    existing.rows.push(row);
    return;
  }
  groups.push({ id: groupKey, title: groupTitle, rows: [row] });
}

const previewReserve = () => undefined;
const reserveLabel = "Reserve";

export function NativeHotelRatesSection({
  offers,
  roomOptions,
  providerName,
  roomType,
  cancellationInfo,
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

  const groups: RateGroup[] = [];
  const internalOffer = offers.find((offer) => offer.kind === "internal-room-flow") ?? null;
  const providerOffer = offers.find((offer) => offer.kind === "provider-handoff") ?? null;

  if (internalOffer) {
    roomOptions.forEach((option) => {
      const groupTitle = roomGroupTitle(option.name);
      const roomCategory = roomCardCategory(option.name);
      const rateLabel = roomRateTitle(option);
      const title = composeRoomRateTitle(roomCategory, rateLabel);
      const total = option.displayPrice?.total ?? null;
      addRateRow(groups, groupTitle, {
        id: `room-${option.id}`,
        offerId: internalOffer.id,
        providerKind: "kurioticket",
        providerName: "Kurioticket",
        title,
        meta: meaningfulRateMeta(option, rateLabel),
        price: total?.formatted ?? "Price unavailable",
        priceAccessibilityLabel: total
          ? `${total.accessibilityLabel} stay price`
          : "Price unavailable",
        hasDisplayedPrice: Boolean(total),
      });
    });
  }

  if (providerOffer) {
    const roomParts = (roomType ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);
    const groupTitle = capitalize(cleanRateCopy(roomParts[0]) || "Available rate");
    const providerTitle = capitalize(
      cleanRateCopy(roomParts.slice(1).join(", ")) || groupTitle,
    );
    addRateRow(groups, groupTitle, {
      id: `provider-${providerOffer.id}`,
      offerId: providerOffer.id,
      providerKind: "provider",
      providerName: providerName.trim() || "Provider",
      title: providerTitle,
      meta: meaningfulProviderMeta(cancellationInfo),
      price: "Price on provider",
      priceAccessibilityLabel: "Price confirmed on provider site",
      hasDisplayedPrice: false,
    });
  }

  const rows = groups.flatMap((group) => group.rows);

  if (!rows.length) {
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
      {rows.map((row) => (
        <View
          key={row.id}
          style={[s.rateCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
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
              <Text numberOfLines={1} style={[s.providerName, { color: theme.textPrimary }]}>
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
            <Text
              numberOfLines={2}
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
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingBottom: 12, gap: 12 },
  rateCard: {
    minHeight: 134,
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  rateCopy: { flex: 1, minWidth: 0, justifyContent: "flex-start" },
  brandLogo: { width: 88, height: 18, flexShrink: 0, marginBottom: 8 },
  providerName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    fontFamily: appFonts.bold,
    marginBottom: 8,
  },
  rateTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    fontFamily: appFonts.bold,
  },
  benefitList: { marginTop: "auto", paddingTop: 18, gap: 1 },
  rateMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    fontFamily: appFonts.regular,
  },
  rateActionColumn: {
    width: 104,
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
