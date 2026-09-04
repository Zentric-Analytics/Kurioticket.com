import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { getFlightResultsQuickMenuAnchor } from "./flightResultsQuickMenuAnchor";

export type FlightResultsCompactMenuFrame = {
  width: number;
};

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
  compactMenu,
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
  compactMenu?: FlightResultsCompactMenuFrame;
}) {
  const { theme } = useAppTheme();
  const inset = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const compactAnchor = compactMenu ? getFlightResultsQuickMenuAnchor() : undefined;
  const compactWidth = compactMenu ? Math.min(compactMenu.width, windowWidth - 24) : 0;
  const compactLeft = compactMenu
    ? Math.max(12, Math.min(compactAnchor?.x ?? 12, windowWidth - compactWidth - 12))
    : 0;
  const compactTop = compactMenu
    ? Math.max(inset.top + 8, Math.min(
        compactAnchor ? compactAnchor.y + compactAnchor.height + 6 : inset.top + 116,
        windowHeight - 300,
      ))
    : 0;

  if (compactMenu) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        accessibilityViewIsModal
      >
        <View style={styles.compactBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessibilityLabel={title}
            style={[
              styles.compactMenu,
              {
                top: compactTop,
                left: compactLeft,
                width: compactWidth,
                backgroundColor: theme.dark ? theme.surface : "#FFFFFF",
                borderColor: theme.dark ? theme.border : "#D8E1EC",
              },
            ]}
          >
            {children}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent={!fullScreen}
      presentationStyle={fullScreen ? "fullScreen" : undefined}
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={[styles.backdrop, fullScreen && { backgroundColor: theme.background }]}>
        {!fullScreen ? (
          <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={StyleSheet.absoluteFill} />
        ) : null}
        <View
          accessibilityLabel={title}
          style={[
            styles.sheet,
            fullScreen && styles.fullScreen,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingTop: fullScreen ? inset.top : 0,
              paddingBottom: Math.max(inset.bottom, 12),
            },
          ]}
        >
          {!fullScreen ? <View accessible={false} style={[styles.handle, { backgroundColor: theme.border }]} /> : null}
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
              {subtitle ? <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
            </View>
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
  compactBackdrop: { flex: 1, position: "relative", backgroundColor: "transparent" },
  compactMenu: {
    position: "absolute",
    maxHeight: 288,
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
  },
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
