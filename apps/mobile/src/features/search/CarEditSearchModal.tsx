import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { X } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CarSearchPanel } from "../flow/CarSearchPanel";
import type { RouteValue } from "../flow/hotelSearchModel";
import { useFlowTheme } from "../flow/flowStyles";
import { useRetainedPickerContext } from "../flow/retainedPickerContext";
import { useSearchPickerMotion } from "../flow/searchPickerPresentation";
import { FLIGHT_FLOATING_SHEET_BOTTOM_GAP, FLIGHT_QUICK_SHEET_HORIZONTAL_INSET, FLIGHT_RESULTS_LIGHT_CANVAS } from "./FlightResultsSheetShell";

type Props = {
  visible: boolean;
  params: Record<string, RouteValue>;
  onClose: () => void;
};

export function CarEditSearchModal({ visible, params, onClose }: Props) {
  const ft = useFlowTheme();
  const resultsCanvas = ft.theme.dark ? ft.colors.page : FLIGHT_RESULTS_LIGHT_CANVAS;
  const { bottom: bottomSafeAreaInset } = useSafeAreaInsets();
  const floatingBottomGap = FLIGHT_FLOATING_SHEET_BOTTOM_GAP;
  const internalBottomPadding = Math.max(20, bottomSafeAreaInset - floatingBottomGap);
  const motion = useSearchPickerMotion(visible, { additionalTravelDistance: floatingBottomGap });
  const presentedParams = useRetainedPickerContext(visible, params);
  if (!motion.rendered) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        pointerEvents={motion.pointerEvents}
        style={styles.viewport}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <SafeAreaView edges={["top", "left", "right"]} style={styles.backdrop}>
          <Animated.View
            pointerEvents="none"
            accessible={false}
            style={[
              StyleSheet.absoluteFill,
              styles.scrim,
              motion.backdropStyle,
            ]}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Close car edit search"
            accessibilityHint="Discards uncommitted changes"
            onPress={onClose}
          />
          <Animated.View
            accessibilityViewIsModal
            onLayout={motion.onSheetLayout}
            style={[
              styles.sheet,
              {
                backgroundColor: resultsCanvas,
                marginBottom: floatingBottomGap,
              },
              motion.sheetStyle,
            ]}
          >
            <View
              style={styles.header}
            >
              <Text
                accessibilityRole="header"
                style={[ft.styles.title, styles.title]}
              >
                Edit car search
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close car edit search"
                accessibilityHint="Discards uncommitted changes"
                hitSlop={8}
                onPress={onClose}
                style={({ pressed }) => [
                  styles.close,
                  pressed && ft.styles.pressed,
                ]}
              >
                <X accessible={false} size={20} color={ft.colors.icon} />
              </Pressable>
            </View>
            <ScrollView
              style={{ backgroundColor: resultsCanvas }}
              contentContainerStyle={[styles.content, { paddingBottom: internalBottomPadding }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
            >
              <CarSearchPanel
                embedded
                editAppearance
                params={presentedParams}
                submitNavigation="replace"
                onBeforeNavigate={onClose}
                submitLabel="Search"
              />
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
  sheet: { maxHeight: "88%", marginHorizontal: FLIGHT_QUICK_SHEET_HORIZONTAL_INSET, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" },
  header: { minHeight: 52, flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 8 },
  close: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "left",
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "600",
  },
  content: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 20 },
});
