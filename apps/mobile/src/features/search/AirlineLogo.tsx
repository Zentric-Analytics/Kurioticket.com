import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { SvgUri } from "react-native-svg";
import { useAppTheme } from "../../theme/AppTheme";
import { resolveTravelProviderLogo } from "./providerLogoResolver";

type Props = {
  airlineName: string;
  logoUrl?: string | null;
  fallbackCharacters?: number;
  variant?: "default" | "result-card" | "compact-result-card" | "provider-deal" | "provider-deal-compact";
  /** Diagnostic seam: false keeps layout identical without mounting remote SVG native views. */
  allowRemoteSvg?: boolean;
};

const isSvgUrl = (url: string) => /\.svg(?:[?#]|$)/i.test(url);

export function AirlineLogo({
  airlineName,
  logoUrl,
  fallbackCharacters = 2,
  variant = "default",
  allowRemoteSvg = true,
}: Props) {
  const { theme } = useAppTheme();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const visibleUrl = resolveTravelProviderLogo(logoUrl);
  const failed = visibleUrl !== null && failedUrl === visibleUrl;
  const isResultCard = variant === "result-card" || variant === "compact-result-card";
  const isCompactResultCard = variant === "compact-result-card";
  const isProviderDeal = variant === "provider-deal" || variant === "provider-deal-compact";
  const isCompactProviderDeal = variant === "provider-deal-compact";
  const resultCardTileStyle = isCompactResultCard ? styles.compactResultCardTile : styles.resultCardTile;
  const providerDealStyle = isCompactProviderDeal ? styles.providerDealCompact : styles.providerDeal;
  const resultCardTileColors = {
    backgroundColor: theme.dark ? "#F8FAFC" : "#FFFFFF",
    borderColor: theme.dark ? theme.border : "#D8E1EC",
  };

  useEffect(() => {
    setFailedUrl(null);
  }, [visibleUrl]);

  if (!visibleUrl || failed || (isSvgUrl(visibleUrl) && !allowRemoteSvg)) {
    return (
      <View
        style={[
          isProviderDeal ? providerDealStyle : isResultCard ? resultCardTileStyle : styles.tile,
          isProviderDeal
            ? styles.providerDealFallback
            : isResultCard
              ? resultCardTileColors
              : { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.initials, { color: isResultCard ? "#18305B" : theme.textPrimary }]}>
          {airlineName.trim().slice(0, fallbackCharacters)}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={isProviderDeal ? providerDealStyle : isResultCard ? [resultCardTileStyle, resultCardTileColors] : styles.logo}
      accessibilityRole="image"
      accessibilityLabel={`${airlineName} logo`}
    >
      {isSvgUrl(visibleUrl) ? (
        <SvgUri
          uri={visibleUrl}
          width={isProviderDeal ? "100%" : isResultCard ? 32 : "100%"}
          height={isProviderDeal ? "100%" : isResultCard ? 32 : "100%"}
          onError={() => setFailedUrl(visibleUrl)}
        />
      ) : (
        <Image
          source={{ uri: visibleUrl }}
          style={isProviderDeal ? styles.image : isResultCard ? styles.resultCardArtwork : styles.image}
          resizeMode="contain"
          onError={() => setFailedUrl(visibleUrl)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 32,
    height: 32,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%" },
  tile: {
    width: 32,
    height: 32,
    flexShrink: 0,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resultCardTile: {
    width: 42,
    height: 42,
    flexShrink: 0,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  compactResultCardTile: {
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resultCardArtwork: { width: 32, height: 32 },
  providerDeal: {
    width: 64,
    height: 28,
    flexShrink: 0,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  providerDealCompact: {
    width: 48,
    height: 28,
    flexShrink: 0,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  providerDealFallback: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  initials: { fontSize: 12, fontWeight: "800" },
});
