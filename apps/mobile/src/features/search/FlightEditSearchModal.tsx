import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlightSearchPanel } from "../flow/FlightSearchPanel";
import type { RouteValue } from "../flow/flightSearchModel";
import { useFlowTheme } from "../flow/flowStyles";
import { useSearchPickerMotion } from "../flow/searchPickerPresentation";
import { useRetainedPickerContext } from "../flow/retainedPickerContext";

type Props = {
  visible: boolean;
  params: Record<string, RouteValue>;
  onClose: () => void;
};

export function FlightEditSearchModal({ visible, params, onClose }: Props) {
  const ft = useFlowTheme();
  const motion = useSearchPickerMotion(visible);
  const presentedParams = useRetainedPickerContext(visible, params);
  if (!motion.rendered) return null;

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.viewport} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <SafeAreaView style={styles.backdrop} edges={["top", "bottom"]}>
          <Animated.View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, styles.scrim, motion.backdropStyle]} />
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close edit search" onPress={onClose} />
          <Animated.View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: ft.colors.surface }, motion.sheetStyle]}>
            <View style={[styles.header, { borderBottomColor: ft.colors.border }]}>
              <Pressable accessibilityRole="button" accessibilityLabel="Close edit search" hitSlop={8} onPress={onClose} style={({ pressed }) => [styles.close, pressed && ft.styles.pressed]}>
                <X accessible={false} size={23} color={ft.colors.icon} />
              </Pressable>
              <Text accessibilityRole="header" style={[ft.styles.title, styles.title]}>Change your search</Text>
              <View style={styles.close} />
            </View>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
              <FlightSearchPanel params={presentedParams} submitNavigation="replace" onBeforeNavigate={onClose} editAppearance />
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
  sheet: { maxHeight: "88%", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  header: { minHeight: 56, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingHorizontal: 8 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 19, lineHeight: 24 },
  content: { flexGrow: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 24 },
});
