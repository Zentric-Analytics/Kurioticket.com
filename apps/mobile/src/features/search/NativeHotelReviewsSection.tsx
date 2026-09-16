import { StyleSheet, Text, View } from "react-native";
import {
  getHotelReviewBand,
  normalizeHotelReviewCount,
  normalizeHotelReviewScale,
  normalizeHotelReviewScore,
  type HotelReviewBand,
} from "../../../../../src/lib/hotels/hotelRatingSemantics";
import { useAppTheme } from "../../theme/AppTheme";

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
    displayScore: formattedScore,
    scale,
    label: reviewLabels[band],
    count: `${formattedCount} ${count === 1 ? "review" : "reviews"}`,
  };
}

export function NativeHotelReviewsSection({ result }: { result: ReviewResult }) {
  const { theme } = useAppTheme();
  const review = nativeHotelReviewPresentation(result);

  return (
    <View style={styles.reviewsSection}>
      {review ? (
        <View
          accessibilityLabel={`${review.label}, ${review.score}, ${review.count}${result.reviewSource ? `, source ${result.reviewSource}` : ""}`}
          style={[
            styles.summaryCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.scoreColumn}>
            <Text style={[styles.scoreText, { color: theme.textPrimary }]}>
              {review.displayScore}
            </Text>
            <Text style={[styles.scaleText, { color: theme.textSecondary }]}>/ {review.scale}</Text>
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
        <>
          <Text accessibilityRole="header" style={[styles.heading, { color: theme.textPrimary }]}>
            Guest reviews
          </Text>
          <View style={styles.emptyCallout}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Verified guest reviews are not connected for this property yet.
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  reviewsSection: { paddingVertical: 6, gap: 16 },
  summaryCard: { borderWidth: 1, borderRadius: 22, paddingHorizontal: 20, paddingVertical: 22, flexDirection: "row", alignItems: "center", gap: 18 },
  scoreColumn: { flexDirection: "row", alignItems: "flex-end", minWidth: 112 },
  scoreText: { fontSize: 48, lineHeight: 52, fontWeight: "700", letterSpacing: -1.2 },
  scaleText: { marginBottom: 5, marginLeft: 4, fontSize: 16, lineHeight: 22, fontWeight: "500" },
  metadata: { flex: 1, minWidth: 0 },
  label: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  count: { marginTop: 4, fontSize: 15, lineHeight: 21, fontWeight: "400" },
  source: { marginTop: 8, fontSize: 12, lineHeight: 16, fontWeight: "400" },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
  emptyCallout: { marginTop: 5 },
  emptyText: { fontSize: 14, lineHeight: 21, fontWeight: "400" },
});