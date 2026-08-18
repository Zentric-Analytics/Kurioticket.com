import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { SvgUri } from "react-native-svg";
import { useAppTheme } from "../../theme/AppTheme";
import { resolveTravelProviderLogo } from "./providerLogoResolver";

type Props = {
  airlineName: string;
  logoUrl?: string | null;
  fallbackCharacters?: number;
};

const isSvgUrl = (url: string) => /\.svg(?:[?#]|$)/i.test(url);

export function AirlineLogo({ airlineName, logoUrl, fallbackCharacters = 2 }: Props) {
  const { theme } = useAppTheme();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const visibleUrl = resolveTravelProviderLogo(logoUrl);
  const failed = visibleUrl !== null && failedUrl === visibleUrl;

  useEffect(() => {
    setFailedUrl(null);
  }, [visibleUrl]);

  if (!visibleUrl || failed) {
    return (
      <View
        style={[
          styles.tile,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.initials, { color: theme.textPrimary }]}>
          {airlineName.trim().slice(0, fallbackCharacters)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.logo} accessibilityRole="image" accessibilityLabel={`${airlineName} logo`}>
      {isSvgUrl(visibleUrl) ? (
        <SvgUri
          uri={visibleUrl}
          width="100%"
          height="100%"
          onError={() => setFailedUrl(visibleUrl)}
        />
      ) : (
        <Image
          source={{ uri: visibleUrl }}
          style={styles.image}
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
  initials: { fontSize: 12, fontWeight: "800" },
});
