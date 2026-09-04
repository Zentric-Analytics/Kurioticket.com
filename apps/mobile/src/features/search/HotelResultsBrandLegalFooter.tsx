import { router } from "expo-router";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getCaliforniaSellerOfTravelNotice, legalProfile } from "@/data/legalProfile";
import { COOKIE_POLICY_URL } from "../../config/legalUrls";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { colors } from "../../theme/tokens";
import { hotelResultsFooterCopy } from "./hotelResultsFooterCopy";

const logo = require("../../../assets/kurioticket-logo-primary-light-bg.png");

const privacyRoute = "/(tabs)/profile/privacy-policy" as const;
const termsRoute = "/(tabs)/profile/terms-of-service" as const;

export function HotelResultsBrandLegalFooter() {
  const { theme } = useAppTheme();
  const { locale, direction } = useMobileLocalization();
  const insets = useSafeAreaInsets();
  const currentYear = new Date().getFullYear();
  const copy = hotelResultsFooterCopy[locale];
  const sellerNotice = copy.sellerNotice?.({
    companyName: legalProfile.company.legalName,
    registrationNumber: legalProfile.californiaSellerOfTravel.registrationNumber,
  }) ?? `${legalProfile.company.legalName} — ${getCaliforniaSellerOfTravelNotice()}`;
  const linkColor = theme.dark ? "#8FB5FF" : colors.blue;
  const textDirection = { textAlign: direction === "rtl" ? "right" : "left", writingDirection: direction } as const;

  return (
    <View
      accessibilityLabel="Kurioticket hotel results information"
      style={[
        styles.footer,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom + 72, 88),
        },
      ]}
    >
      <View style={[styles.logoFrame, theme.dark && styles.logoFrameDark]}>
        <Image source={logo} resizeMode="contain" style={styles.logo} accessibilityLabel="Kurioticket" />
      </View>
      <Text style={[styles.tagline, { color: theme.textSecondary }, textDirection]}>{copy.tagline}</Text>
      <Text style={[styles.sellerNotice, { color: theme.textMuted }, textDirection]}>{sellerNotice}</Text>
      <Text style={[styles.copyright, { color: theme.textSecondary }, textDirection]}>© {currentYear} Kurioticket LLC. {copy.rights}</Text>
      <View accessibilityLabel="Hotel results legal links" style={[styles.links, { direction }]}>
        <LegalLink label={copy.privacy} color={linkColor} onPress={() => router.push(privacyRoute)} />
        <LegalLink label={copy.terms} color={linkColor} onPress={() => router.push(termsRoute)} />
        <LegalLink label={copy.cookies} color={linkColor} onPress={() => void Linking.openURL(COOKIE_POLICY_URL)} />
      </View>
    </View>
  );
}

function LegalLink({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress} style={styles.linkTarget}>
      <Text style={[styles.linkText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginHorizontal: -16,
    marginTop: 24,
    paddingHorizontal: 16,
    paddingTop: 26,
  },
  logoFrame: { alignSelf: "flex-start", marginBottom: 8 },
  logoFrameDark: { backgroundColor: "#FFFFFF", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4 },
  logo: { width: 150, height: 30 },
  tagline: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  sellerNotice: { fontSize: 12, lineHeight: 19, marginBottom: 22 },
  copyright: { fontSize: 12, lineHeight: 19, marginBottom: 4 },
  links: { flexDirection: "row", flexWrap: "wrap", columnGap: 16 },
  linkTarget: { minHeight: 44, justifyContent: "center" },
  linkText: { fontFamily: appFonts.semibold, fontSize: 12, lineHeight: 18 },
});
