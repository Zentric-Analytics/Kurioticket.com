import { StyleSheet, Text, View } from "react-native";
import type { HotelResult } from "../../api/travelApi";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { colors } from "../../theme/tokens";

const reviewLabels = {
  exceptional: "Exceptional",
  veryGood: "Very good",
  good: "Good",
  pleasant: "Pleasant",
  reviewScore: "Review score",
} as const;

function reviewLabel(score: number, scale: number) {
  const proportion = score / scale;
  if (proportion >= 0.9) return reviewLabels.exceptional;
  if (proportion >= 0.8) return reviewLabels.veryGood;
  if (proportion >= 0.7) return reviewLabels.good;
  if (proportion >= 0.6) return reviewLabels.pleasant;
  return reviewLabels.reviewScore;
}

export function NativeHotelReviewsSection({
  result,
}: {
  result: Pick<
    HotelResult,
    "reviewScore" | "reviewScale" | "reviewCount" | "reviewSource"
  >;
}) {
  const { theme } = useAppTheme();
  const scale =
    result.reviewScale === 5 || result.reviewScale === 10
      ? result.reviewScale
      : null;
  const score =
    scale !== null &&
    typeof result.reviewScore === "number" &&
    Number.isFinite(result.reviewScore) &&
    result.reviewScore >= 0 &&
    result.reviewScore <= scale
      ? result.reviewScore
      : null;
  const count =
    typeof result.reviewCount === "number" &&
    Number.isFinite(result.reviewCount) &&
    result.reviewCount >= 0
      ? Math.floor(result.reviewCount)
      : null;
  const hasVerifiedReview = score !== null && scale !== null && count !== null;

  return (
    <View style={styles.reviewsSection}>
      <Text style={[styles.reviewsHeading, { color: theme.textPrimary }]}>
        Guest reviews
      </Text>
      {hasVerifiedReview ? (
        <View style={styles.reviewsScoreRow}>
          <View style={styles.reviewsScoreBadge}>
            <Text style={styles.reviewsScoreValue}>
              {score.toLocaleString(undefined, { maximumFractionDigits: 1 })} /{" "}
              {scale}
            </Text>
          </View>
          <View style={styles.reviewsScoreMeta}>
            <Text
              style={[styles.reviewsScoreLabel, { color: theme.textPrimary }]}
            >
              {reviewLabel(score, scale)}
            </Text>
            <Text
              style={[
                styles.reviewsSupportText,
                { color: theme.textSecondary },
              ]}
            >
              {count.toLocaleString()} {count === 1 ? "review" : "reviews"}
            </Text>
            {result.reviewSource ? (
              <Text
                style={[styles.reviewsSource, { color: theme.textSecondary }]}
              >
                Source: {result.reviewSource}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <Text style={[styles.reviewsEmptyText, { color: theme.textSecondary }]}>
          Verified guest reviews are not connected for this property yet.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  reviewsSection: { paddingTop: 9, paddingBottom: 24 },
  reviewsHeading: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "800",
    fontFamily: appFonts.extraBold,
  },
  reviewsEmptyText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "400",
    fontFamily: appFonts.regular,
  },
  reviewsScoreRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  reviewsScoreBadge: {
    minWidth: 56,
    minHeight: 56,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: colors.blue,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewsScoreValue: {
    color: "white",
    textAlign: "center",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "800",
    fontFamily: appFonts.extraBold,
  },
  reviewsScoreMeta: { gap: 2 },
  reviewsScoreLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    fontFamily: appFonts.bold,
  },
  reviewsSupportText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    fontFamily: appFonts.regular,
  },
  reviewsSource: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    fontFamily: appFonts.regular,
  },
});
