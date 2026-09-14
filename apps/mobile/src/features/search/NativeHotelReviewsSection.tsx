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
      <Text accessibilityRole="header" style={[styles.heading, { color: theme.textPrimary }]}>
        Guest reviews
      </Text>
      {review ? (
        <View style={styles.scoreRow}>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{review.score}</Text>
          </View>
          <View style={styles.metadata}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>{review.label}</Text>
            <Text style={[styles.count, { color: theme.textSecondary }]}>{review.count}</Text>
            {result.reviewSource ? (
              <Text style={[styles.source, { color: theme.textSecondary }]}>Source: {result.reviewSource}</Text>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.emptyCallout}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Verified guest reviews are not connected for this property yet.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  reviewsSection: { paddingVertical: 12 },
  heading: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
  emptyCallout: { marginTop: 8 },
  emptyText: { fontSize: 14, lineHeight: 21, fontWeight: "400" },
  scoreRow: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 14 },
  scoreBadge: { height: 56, minWidth: 56, borderRadius: 8, backgroundColor: colors.blue, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  scoreText: { color: "white", fontSize: 18, lineHeight: 24, fontWeight: "700", textAlign: "center" },
  metadata: { flex: 1, minWidth: 0 },
  label: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
  count: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
  source: { marginTop: 4, fontSize: 12, lineHeight: 16, fontWeight: "400" },
});
