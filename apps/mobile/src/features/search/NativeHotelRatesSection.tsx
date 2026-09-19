import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeHotelOffer } from "./nativeHotelDetailsModel";
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
  providerKind: "kurioticket" | "provider";
  providerName: string;
  nightlyPrice: string;
  nightlyAccessibilityLabel: string;
  totalPrice: string;
  totalAccessibilityLabel: string;
  totalLabel: string;
  hasDisplayedPrice: boolean;
  actionable: boolean;
};

export function buildNativeHotelRateRows({
  offers,
  providerName,
  nightlyPrice,
  totalPrice,
  hasPrice,
}: {
  offers: NativeHotelOffer[];
  providerName: string;
  nightlyPrice: DisplayPrice;
  totalPrice: DisplayPrice;
  hasPrice: boolean;
}): NativeHotelRateRow[] {
  const internalOffer =
    offers.find((offer) => offer.kind === "internal-room-flow") ?? null;
  const providerOffer =
    offers.find((offer) => offer.kind === "provider-handoff") ?? null;
  const displayOnlyKayakOffer =
    !providerOffer &&
    providerName.trim() === "KAYAK sandbox" &&
    hasPrice &&
    nightlyPrice
      ? ({ id: "provider", kind: "provider-handoff" } as const)
      : null;
  const visibleProviderOffer = providerOffer ?? displayOnlyKayakOffer;
  const rows: NativeHotelRateRow[] = [];

  if (internalOffer) {
    rows.push({
      id: "provider-kurioticket",
      offerId: internalOffer.id,
      providerKind: "kurioticket",
      providerName: "Kurioticket",
      nightlyPrice:
        hasPrice && nightlyPrice ? nightlyPrice.formatted : "Price unavailable",
      nightlyAccessibilityLabel:
        hasPrice && nightlyPrice
          ? `${nightlyPrice.accessibilityLabel} per night`
          : "Price unavailable",
      totalPrice:
        hasPrice && totalPrice ? totalPrice.formatted : "Price unavailable",
      totalAccessibilityLabel:
        hasPrice && totalPrice
          ? `${totalPrice.accessibilityLabel} estimated stay total`
          : "Price unavailable",
      totalLabel: "Estimated stay total",
      hasDisplayedPrice: Boolean(hasPrice && nightlyPrice),
      actionable: true,
    });
  }

  if (visibleProviderOffer) {
    rows.push({
      id: `provider-${visibleProviderOffer.id}`,
      offerId: visibleProviderOffer.id,
      providerKind: "provider",
      providerName: providerName.trim() || "Provider",
      nightlyPrice:
        hasPrice && nightlyPrice ? nightlyPrice.formatted : "Price on provider",
      nightlyAccessibilityLabel:
        hasPrice && nightlyPrice
          ? `${nightlyPrice.accessibilityLabel} per night`
          : "Price confirmed on provider site",
      totalPrice:
        hasPrice && totalPrice ? totalPrice.formatted : "Price on provider",
      totalAccessibilityLabel:
        hasPrice && totalPrice
          ? `${totalPrice.accessibilityLabel} stay total`
          : "Price confirmed on provider site",
      totalLabel: "Stay total",
      hasDisplayedPrice: Boolean(hasPrice && nightlyPrice),
      actionable: Boolean(providerOffer),
    });
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
        <View
          style={[
            s.emptyCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>
            No reservable rates available
          </Text>
          <Text style={[s.emptyCopy, { color: theme.textSecondary }]}>
            Try updating your stay or check again later.
          </Text>
        </View>
      </View>
    );
  }

  const surfaceBorderColor = theme.dark ? "#344154" : "#D7E0EC";
  const selectedBackground = theme.dark ? "#142844" : "#F4F8FF";

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
        accessibilityRole="radiogroup"
        accessibilityLabel="Hotel deal options"
        style={s.dealList}
      >
        {rows.map((row) => {
          const selected = row.id === selectedRateId;
          return (
            <Pressable
              key={row.id}
              accessibilityRole="radio"
              accessibilityState={{
                selected,
                disabled: !row.actionable,
              }}
              accessibilityLabel={`${row.providerName}, ${row.nightlyAccessibilityLabel}`}
              disabled={!row.actionable}
              onPress={row.actionable ? () => onSelectRate(row.id) : undefined}
              style={({ pressed }) => [
                s.dealCard,
                {
                  backgroundColor: selected
                    ? selectedBackground
                    : theme.surface,
                  borderColor: selected ? accentColor : surfaceBorderColor,
                },
                selected &&
                  (theme.dark
                    ? s.dealCardSelectedDark
                    : s.dealCardSelectedLight),
                pressed && row.actionable && s.dealCardPressed,
              ]}
            >
              <View style={s.dealTop}>
                <Text
                  numberOfLines={1}
                  style={[s.dealProvider, { color: theme.textPrimary }]}
                >
                  {row.providerName}
                </Text>
                <View
                  accessible={false}
                  style={[
                    s.dealRadio,
                    {
                      borderColor: selected
                        ? accentColor
                        : theme.textSecondary,
                    },
                  ]}
                >
                  {selected ? (
                    <View
                      style={[
                        s.dealRadioDot,
                        { backgroundColor: accentColor },
                      ]}
                    />
                  ) : null}
                </View>
              </View>

              <View style={s.dealBottom}>
                <Text
                  style={[
                    s.dealPriceLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  {row.hasDisplayedPrice ? "per night" : "Provider price"}
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  accessibilityLabel={row.nightlyAccessibilityLabel}
                  style={[
                    s.dealPrice,
                    !row.hasDisplayedPrice && s.dealPriceUnavailable,
                    {
                      color: row.hasDisplayedPrice
                        ? theme.textPrimary
                        : theme.textSecondary,
                    },
                  ]}
                >
                  {row.nightlyPrice}
                </Text>
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
  sectionHeading: { paddingBottom: 2 },
  stay: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "400",
    fontFamily: appFonts.regular,
  },
  dealList: { gap: 10, paddingVertical: 12 },
  dealCard: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 13,
    justifyContent: "space-between",
    gap: 14,
  },
  dealCardSelectedLight: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  dealCardSelectedDark: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  dealCardPressed: { opacity: 0.88 },
  dealTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  dealProvider: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    fontFamily: appFonts.bold,
  },
  dealRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  dealRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dealBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  dealPriceLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
    fontFamily: appFonts.medium,
  },
  dealPrice: {
    flexShrink: 0,
    maxWidth: "60%",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
    fontFamily: appFonts.bold,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  dealPriceUnavailable: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    fontFamily: appFonts.semibold,
  },
  emptyCard: {
    minHeight: 108,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 14,
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
