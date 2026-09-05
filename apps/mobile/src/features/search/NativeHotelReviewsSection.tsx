import { StyleSheet, Text, View } from "react-native";
import {
  getHotelReviewBand,
  normalizeHotelReviewCount,
  normalizeHotelReviewScale,
  normalizeHotelReviewScore,
  type HotelReviewBand,
} from "../../../../../src/lib/hotels/hotelRatingSemantics";
import { useAppTheme } from "../../theme/AppTheme";
import { colors } from "../../theme/tokens";
import { appFonts } from "../../theme/typography";

const reviewLabels: Record<HotelReviewBand, string> = {
  exceptional: "Exceptional",
  veryGood: "Very good",
  good: "Good",
  pleasant: "Pleasant",
  reviewScore: "Review score",
};

type ReviewResult = {
  reviewScore?: unknown;
  reviewScale?: unknown;
  reviewCount?: unknown;
  reviewSource?: string;
};

export function nativeHotelReviewPresentation(result: ReviewResult) {
  const scale = normalizeHotelReviewScale(result.reviewScale);
  const score = normalizeHotelReviewScore(result.reviewScore, scale);
  const count = normalizeHotelReviewCount(result.reviewCount);
  const band = getHotelReviewBand(score, scale);

  if (
    scale === undefined ||
    score === undefined ||
    count === undefined ||
    band === null
  ) {
    return null;
  }

  const formattedScore = score.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
  const formattedCount = count.toLocaleString();

  return {
    score: `${formattedScore} / ${scale}`,
    label: reviewLabels[band],
    count: `${formattedCount} ${count === 1 ? "review" : "reviews"}`,
  };
}

export function NativeHotelReviewsSection({ result }: { result: ReviewResult }) {
  const { theme } = useAppTheme();
  const review = nativeHotelReviewPresentation(result);

  return (
    <View style={styles.reviewsSection}>
      <Text
        accessibilityRole="header"
        style={[styles.heading, { color: theme.dark ? theme.textPrimary : "#020617" }]}
      >
        Guest reviews
      </Text>
      {review ? (
        <View style={styles.scoreRow}>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{review.score}</Text>
          </View>
          <View style={styles.metadata}>
            <Text style={[styles.label, { color: theme.dark ? theme.textPrimary : "#020617" }]}>
              {review.label}
            </Text>
            <Text style={[styles.count, { color: theme.dark ? theme.textSecondary : "#475569" }]}>
              {review.count}
            </Text>
            {result.reviewSource ? (
              <Text style={[styles.source, { color: theme.dark ? theme.textSecondary : "#64748B" }]}>
                Source: {result.reviewSource}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.emptyCallout,
            { borderLeftColor: theme.dark ? theme.border : "#E2E8F0" },
          ]}
        >
          <Text style={[styles.emptyText, { color: theme.dark ? theme.textSecondary : "#475569" }]}>
            Verified guest reviews are not connected for this property yet.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  reviewsSection: { paddingVertical: 12 },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: "800", fontFamily: appFonts.extraBold, letterSpacing: -0.5 },
  emptyCallout: { marginTop: 12, borderLeftWidth: 2, paddingVertical: 4, paddingLeft: 16 },
  emptyText: { fontSize: 14, lineHeight: 24, fontWeight: "400", fontFamily: appFonts.regular },
  scoreRow: { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 16 },
  scoreBadge: { height: 56, minWidth: 56, borderRadius: 8, backgroundColor: colors.blue, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  scoreText: { color: "white", fontSize: 20, lineHeight: 28, fontWeight: "800", fontFamily: appFonts.extraBold, textAlign: "center" },
  metadata: { flex: 1, minWidth: 0 },
  label: { fontSize: 16, lineHeight: 24, fontWeight: "700", fontFamily: appFonts.bold },
  count: { fontSize: 14, lineHeight: 20, fontWeight: "400", fontFamily: appFonts.regular },
  source: { marginTop: 4, fontSize: 12, lineHeight: 16, fontWeight: "400", fontFamily: appFonts.regular },
});
