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
import { SafeAreaView } from "react-native-safe-area-context";
import { CarSearchPanel } from "../flow/CarSearchPanel";
import type { RouteValue } from "../flow/hotelSearchModel";
import { useFlowTheme } from "../flow/flowStyles";
import { useRetainedPickerContext } from "../flow/retainedPickerContext";
import { useSearchPickerMotion } from "../flow/searchPickerPresentation";

type Props = {
  visible: boolean;
  params: Record<string, RouteValue>;
  onClose: () => void;
};

export function CarEditSearchModal({ visible, params, onClose }: Props) {
  const ft = useFlowTheme();
  const motion = useSearchPickerMotion(visible);
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
                backgroundColor: ft.colors.surface,
                borderColor: ft.colors.border,
                paddingBottom: motion.bottomSafeAreaInset,
              },
              motion.sheetStyle,
            ]}
          >
            <View
              style={[styles.header, { borderBottomColor: ft.colors.border }]}
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
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
            >
              <CarSearchPanel
                embedded
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
  scrim: { backgroundColor: "rgba(15, 23, 42, 0.35)" },
  sheet: {
    maxHeight: "94%",
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
  },
  header: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "left",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700",
  },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },
});
