import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";

export function FlightResultsSheetShell({
  visible,
  title,
  closeLabel,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { theme } = useAppTheme();
  const inset = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={StyleSheet.absoluteFill} />
        <View
          accessibilityLabel={title}
          style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: Math.max(inset.bottom, 12) }]}
        >
          <View accessible={false} style={[styles.handle, { backgroundColor: theme.border }]} />
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} hitSlop={4} onPress={onClose} style={styles.close}>
              <X size={20} strokeWidth={2} color={theme.icon} />
            </Pressable>
          </View>
          <View style={styles.content}>{children}</View>
          {footer ? <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10, 24, 48, 0.48)" },
  sheet: { maxHeight: "92%", minHeight: 220, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 8 },
  header: { minHeight: 52, paddingLeft: 20, paddingRight: 8, flexDirection: "row", alignItems: "center" },
  title: { flex: 1, minWidth: 0, fontSize: 17, lineHeight: 22, fontWeight: "800", fontFamily: appFonts.extraBold },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { flexShrink: 1, minHeight: 0 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 12 },
});
