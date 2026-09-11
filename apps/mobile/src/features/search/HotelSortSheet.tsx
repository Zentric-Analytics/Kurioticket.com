import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { defaultHotelSort, hotelSortOptions, type HotelSortMode } from "./hotelSort";
import { ui } from "./SearchUi";

export function HotelSortSheet({ sort, onApply, onClose }: {
  sort: HotelSortMode; onApply: (sort: HotelSortMode) => void; onClose: () => void;
}) {
  const { theme } = useAppTheme();
  const inset = useSafeAreaInsets();
  const [draft, setDraft] = useState(sort);
  return <Modal visible transparent animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
    <View style={styles.overlay} onAccessibilityEscape={onClose}>
      <Pressable accessible={false} style={styles.scrim} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>Sort</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close sort options" onPress={onClose} style={styles.close}><X size={22} color={theme.icon}/></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.options}>
          <View accessibilityRole="radiogroup">
            {hotelSortOptions.map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected: draft === option.value }} onPress={() => setDraft(option.value)} style={styles.option}>
              <View style={styles.copy}><Text style={[styles.label, { color: theme.textPrimary }]}>{option.label}</Text><Text style={[styles.description, { color: theme.textSecondary }]}>{option.description}</Text></View>
              {draft === option.value ? <Check size={20} color={ui.blue}/> : null}
            </Pressable>)}
          </View>
        </ScrollView>
        <View style={[styles.footer, { borderTopColor: theme.border, paddingBottom: Math.max(inset.bottom, 12) }]}>
          <Pressable accessibilityRole="button" onPress={() => setDraft(defaultHotelSort)} style={[styles.reset, { borderColor: theme.border }]}><Text style={[styles.buttonText, { color: theme.textPrimary }]}>Reset</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => onApply(draft)} style={styles.apply}><Text style={[styles.buttonText, { color: "white" }]}>Apply</Text></Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" }, scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.35)" },
  sheet: { maxHeight: "85%", borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
  header: { minHeight: 56, justifyContent: "center", paddingHorizontal: 60, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { textAlign: "center", fontSize: 18, fontFamily: appFonts.bold }, close: { position: "absolute", right: 8, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  options: { paddingHorizontal: 16, paddingVertical: 8 }, option: { minHeight: 56, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 12 }, copy: { flex: 1 },
  label: { fontSize: 15, lineHeight: 20, fontFamily: appFonts.semibold }, description: { fontSize: 12, lineHeight: 17, fontFamily: appFonts.regular },
  footer: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  reset: { minWidth: 90, minHeight: 48, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  apply: { flex: 1, minHeight: 48, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: ui.blue }, buttonText: { fontSize: 15, fontFamily: appFonts.bold },
});
