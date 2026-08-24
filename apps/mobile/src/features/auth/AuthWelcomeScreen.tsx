import { Image, Linking, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { AuthButton, authColors } from "./AuthPrimitives";
import { AuthIcon } from "./AuthIcon";

const hero = require("../../../assets/auth-mediterranean-hero.jpeg");
const heroSource = Image.resolveAssetSource(hero);
const logo = require("../../../assets/kurioticket-logo-primary-light-bg.png");
const TERMS = "https://kurioticket.com/terms";
const PRIVACY = "https://kurioticket.com/privacy";
const COMPACT_SCREEN_HEIGHT = 800;
const BASE_HERO_SHIFT = 18;
const MAX_HERO_SHIFT = 84;
const COMPACT_SHIFT_RATIO = 0.45;

function GoogleG() {
  return <Svg width={21} height={21} viewBox="0 0 24 24"><Path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.6z" /><Path fill="#34A853" d="M12 22c2.7 0 5-.9 6.8-2.3l-3.3-2.6c-.9.6-2.1 1-3.5 1-2.6 0-4.8-1.8-5.6-4.2H3v2.7A10.3 10.3 0 0 0 12 22z" /><Path fill="#FBBC05" d="M6.4 13.9A6.2 6.2 0 0 1 6 12c0-.7.1-1.3.4-1.9V7.4H3A10 10 0 0 0 2 12c0 1.7.4 3.2 1 4.6z" /><Path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.9 1.5l2.9-2.8A9.8 9.8 0 0 0 3 7.4l3.4 2.7C7.2 7.7 9.4 5.9 12 5.9z" /></Svg>;
}
export function AuthWelcomeScreen({ onEmail, onGoogle, onGuest, busy, error }: { onEmail: () => void; onGoogle: () => void; onGuest: () => void; busy?: boolean; error?: string }) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const coverScale = Math.max(width / heroSource.width, height / heroSource.height);
  const renderedHeroWidth = heroSource.width * coverScale;
  const renderedHeroHeight = heroSource.height * coverScale;
  const compactHeightDeficit = Math.max(0, COMPACT_SCREEN_HEIGHT - height);
  const heroShift = Math.min(MAX_HERO_SHIFT, BASE_HERO_SHIFT + compactHeightDeficit * COMPACT_SHIFT_RATIO);
  const heroStyle = {
    height: renderedHeroHeight,
    left: (width - renderedHeroWidth) / 2,
    top: -heroShift,
    width: renderedHeroWidth,
  };
  return <View style={styles.background}><Image source={hero} resizeMode="cover" style={[styles.image, heroStyle]} /><View style={styles.overlay} /><SafeAreaView style={styles.safe} edges={["top"]}>
    <View style={styles.brand}><Image source={logo} resizeMode="contain" style={styles.logo} accessibilityLabel="Kurioticket" /><Text style={styles.tagline}>Your journey starts here</Text></View>
    <View style={[styles.panel, { paddingBottom: 10 + insets.bottom }]}><Text style={styles.title}>Continue your journey</Text><Text style={styles.body}>Sign in or create an account to get the{"\n"}best travel experience.</Text>
      <View style={styles.buttons}><AuthButton label="Continue with Email" onPress={onEmail} disabled={busy} icon={<AuthIcon name="mail" color="white" size={21} />} /><AuthButton label="Continue with Google" onPress={onGoogle} disabled={busy} secondary icon={<GoogleG />} /><AuthButton label="Continue as Guest" onPress={onGuest} disabled={busy} secondary icon={<AuthIcon name="user" color={authColors.navy} size={21} />} /></View>
      {error ? <Text accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
      <Text style={styles.legal}>By continuing, you agree to our{"\n"}<Text accessibilityRole="link" onPress={() => void Linking.openURL(TERMS)} style={styles.link}>Terms of Service</Text> and <Text accessibilityRole="link" onPress={() => void Linking.openURL(PRIVACY)} style={styles.link}>Privacy Policy</Text></Text>
    </View>
  </SafeAreaView></View>;
}
const styles = StyleSheet.create({
  background: { flex: 1, overflow: "hidden" }, image: { position: "absolute" }, overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,.06)" }, safe: { flex: 1, justifyContent: "space-between" },
  brand: { marginTop: 12, marginLeft: 26, alignItems: "flex-start" }, logo: { width: 208, height: 58 }, tagline: { color: authColors.navy, fontSize: 15, marginLeft: 8, marginTop: -5, fontWeight: "500" },
  panel: { backgroundColor: "white", marginHorizontal: 14, borderTopLeftRadius: 27, borderTopRightRadius: 27, paddingHorizontal: 20, paddingTop: 17, paddingBottom: 10, alignItems: "stretch" },
  title: { color: authColors.navy, fontSize: 20, lineHeight: 25, fontWeight: "800", textAlign: "center" }, body: { color: authColors.text, fontSize: 13, lineHeight: 18, textAlign: "center", marginTop: 4 },
  buttons: { gap: 8, marginTop: 12 }, legal: { color: authColors.text, fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 8 }, link: { color: authColors.blue, textDecorationLine: "underline", fontWeight: "600" },
  error: { color: "#B42318", fontSize: 12, lineHeight: 16, textAlign: "center", marginTop: 7 },
});
