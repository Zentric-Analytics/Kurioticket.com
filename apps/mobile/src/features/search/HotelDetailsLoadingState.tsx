import { StyleSheet, View } from "react-native";

type LoadingTheme = {
  dark: boolean;
};

export function HotelDetailsLoadingState({
  hotelName,
  width,
  theme,
}: {
  hotelName: string;
  width: number;
  theme: LoadingTheme;
}) {
  const strong = theme.dark ? "#27272A" : "#E2E8F0";
  const soft = theme.dark ? "#18181B" : "#F1F5F9";
  const heroHeight = Math.round(width * 0.94);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      accessibilityLabel={`Loading ${hotelName} hotel details`}
      style={s.root}
    >
      <View style={[s.hero, { height: heroHeight, backgroundColor: strong }]} />
      <View style={s.body}>
        <View style={[s.titleLine, { backgroundColor: strong }]} />
        <View style={[s.metaLine, { backgroundColor: soft }]} />
        <View style={[s.metaLineShort, { backgroundColor: soft }]} />

        <View style={s.tabs}>
          <View style={[s.tabLine, { backgroundColor: soft }]} />
          <View style={[s.tabLine, { backgroundColor: soft }]} />
          <View style={[s.tabLine, { backgroundColor: soft }]} />
        </View>

        <View style={s.section}>
          <View style={[s.sectionTitle, { backgroundColor: strong }]} />
          <View style={[s.copyLine, { backgroundColor: soft }]} />
          <View style={[s.copyLine, { backgroundColor: soft }]} />
          <View style={[s.copyLineShort, { backgroundColor: soft }]} />
        </View>

        <View style={s.section}>
          <View style={[s.sectionTitleShort, { backgroundColor: strong }]} />
          <View style={[s.block, { backgroundColor: soft }]} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  hero: { width: "100%" },
  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  titleLine: { width: "74%", height: 28, borderRadius: 7 },
  metaLine: { width: "42%", height: 16, marginTop: 10, borderRadius: 5 },
  metaLineShort: { width: "31%", height: 16, marginTop: 7, borderRadius: 5 },
  tabs: { marginTop: 22, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12 },
  tabLine: { flex: 1, height: 14, borderRadius: 5 },
  section: { marginTop: 24 },
  sectionTitle: { width: "46%", height: 20, borderRadius: 6 },
  sectionTitleShort: { width: "34%", height: 20, borderRadius: 6 },
  copyLine: { width: "100%", height: 14, marginTop: 10, borderRadius: 5 },
  copyLineShort: { width: "72%", height: 14, marginTop: 8, borderRadius: 5 },
  block: { width: "100%", height: 112, marginTop: 12, borderRadius: 10 },
});
