import { useEffect, useState } from "react";
import { Image, StyleSheet, Text } from "react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { getCountryFlagUri } from "./personalDetailsModel";

export function PersonalDetailsCountryFlag({ isoCode }: { isoCode?: string }) {
  const { theme } = useAppTheme();
  const [failed, setFailed] = useState(false);
  const uri = getCountryFlagUri(isoCode);
  useEffect(() => setFailed(false), [uri]);
  return uri && !failed ? (
    <Image
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      source={{ uri }}
      onError={() => setFailed(true)}
      style={s.flag}
    />
  ) : (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[s.flagFallback, { color: theme.text }]}
    >
      {isoCode || "--"}
    </Text>
  );
}

const s = StyleSheet.create({
  flag: { width: 28, height: 19 },
  flagFallback: {
    width: 28,
    textAlign: "center",
    fontSize: 13,
    fontFamily: appFonts.semibold,
  },
});
