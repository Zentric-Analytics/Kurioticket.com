import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { FlightSearchPanel } from "../flow/FlightSearchPanel";
import type { RouteValue } from "../flow/flightSearchModel";
import { useFlowTheme } from "../flow/flowStyles";
import { useRetainedPickerContext } from "../flow/retainedPickerContext";
import { useSearchPickerMotion } from "../flow/searchPickerPresentation";
import { FLIGHT_QUICK_SHEET_HORIZONTAL_INSET } from "./FlightResultsSheetShell";

type Props = {
  visible: boolean;
  params: Record<string, RouteValue>;
  onClose: () => void;
  onSubmit: (params: Record<string, string | undefined>) => void;
};

export function FlightEditSearchModal({ visible, params, onClose, onSubmit }: Props) {
  const ft = useFlowTheme();
  const motion = useSearchPickerMotion(visible);
  const presentedParams = useRetainedPickerContext(visible, params);
  if (!motion.rendered) return null;

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView pointerEvents={motion.pointerEvents} style={styles.viewport} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <SafeAreaView edges={["top", "left", "right"]} style={styles.backdrop}>
          <Animated.View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, styles.scrim, motion.backdropStyle]} />
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close edit search" onPress={onClose} />
          <Animated.View accessibilityViewIsModal onLayout={motion.onSheetLayout} style={[styles.sheet, { backgroundColor: ft.colors.surface, paddingBottom: motion.bottomSafeAreaInset }, motion.sheetStyle]}>
            <View style={[styles.header, { borderBottomColor: ft.colors.border }]}>
              <Text accessibilityRole="header" style={[ft.styles.title, styles.title]}>Change your search</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close edit search" hitSlop={8} onPress={onClose} style={({ pressed }) => [styles.close, pressed && ft.styles.pressed]}>
                <X accessible={false} size={23} color={ft.colors.icon} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
              <FlightSearchPanel embedded params={presentedParams} onValidatedSubmit={onSubmit} editAppearance />
            </ScrollView>
          </Animated.View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1 },
  backdrop: { flex: 1, justifyContent: "flex-end" },
  scrim: { backgroundColor: "rgba(8, 18, 35, 0.52)" },
  sheet: { maxHeight: "88%", marginHorizontal: FLIGHT_QUICK_SHEET_HORIZONTAL_INSET, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  header: { minHeight: 52, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingLeft: 16, paddingRight: 8 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "left", fontSize: 19, lineHeight: 24 },
  content: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 20 },
});
