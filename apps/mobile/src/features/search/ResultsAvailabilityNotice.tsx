import { StyleSheet, Text, View } from "react-native";
import { RESULTS_AVAILABILITY_NOTICE } from "../../../../../src/shared/presentation/resultsAvailabilityNotice";
import { useAppTheme } from "../../theme/AppTheme";

export function ResultsAvailabilityNotice() {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text
        testID="results-availability-notice"
        accessible
        allowFontScaling
        style={[styles.text, { color: theme.textSecondary }]}
      >
        {RESULTS_AVAILABILITY_NOTICE}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexShrink: 0, paddingHorizontal: 16, paddingVertical: 8 },
  text: { fontSize: 13, lineHeight: 19 },
});
