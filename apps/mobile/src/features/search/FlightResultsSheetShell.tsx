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
  fullScreen = false,
  subtitle,
  headerAction,
}: {
  visible: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  fullScreen?: boolean;
  subtitle?: string;
  headerAction?: ReactNode;
}) {
  const { theme } = useAppTheme();
  const inset = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent={!fullScreen} presentationStyle={fullScreen ? "fullScreen" : undefined} animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
      <View style={[styles.backdrop, fullScreen && { backgroundColor: theme.background }]}>
        {!fullScreen ? <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={StyleSheet.absoluteFill} /> : null}
        <View
          accessibilityLabel={title}
          style={[styles.sheet, fullScreen && styles.fullScreen, { backgroundColor: theme.surface, borderColor: theme.border, paddingTop: fullScreen ? inset.top : 0, paddingBottom: Math.max(inset.bottom, 12) }]}
        >
          {!fullScreen ? <View accessible={false} style={[styles.handle, { backgroundColor: theme.border }]} /> : null}
          <View style={styles.header}>
            <View style={styles.headerCopy}><Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>{subtitle ? <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}</View>
            {headerAction}
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
  fullScreen: { flex: 1, width: "100%", maxHeight: "100%", borderRadius: 0, borderWidth: 0 },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 8 },
  header: { minHeight: 52, paddingLeft: 20, paddingRight: 8, flexDirection: "row", alignItems: "center" },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { flex: 1, minWidth: 0, fontSize: 17, lineHeight: 22, fontWeight: "800", fontFamily: appFonts.extraBold },
  subtitle: { marginTop: 1, fontSize: 12, lineHeight: 16, fontWeight: "500", fontFamily: appFonts.medium },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { flexShrink: 1, minHeight: 0 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 12 },
});
