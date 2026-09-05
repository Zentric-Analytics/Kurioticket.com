import type { ReactNode } from "react";
import { BlurView } from "expo-blur";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";

export function FlightResultsSheetShell({ visible, title, closeLabel, onClose, children, footer, fullScreen = false, subtitle, headerAction }: {
  visible: boolean; title: string; closeLabel: string; onClose: () => void; children: ReactNode; footer?: ReactNode;
  fullScreen?: boolean; subtitle?: string; headerAction?: ReactNode;
}) {
  const { theme } = useAppTheme();
  const inset = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheet = (
    <View accessibilityLabel={title} style={[styles.sheet, fullScreen ? styles.fullScreen : { maxHeight: Math.min(height * .76, 620) }, { backgroundColor: theme.background, paddingTop: fullScreen ? inset.top : 0 }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
        </View>
        {headerAction}
        <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={styles.close}>
          <X accessible={false} size={22} color={theme.icon} />
        </Pressable>
      </View>
      <View style={fullScreen ? styles.fullScreenContent : styles.quickContent}>{children}</View>
      {footer ? <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: Math.max(inset.bottom, fullScreen ? 16 : 12) }]}>{footer}</View> : null}
    </View>
  );
  return <Modal visible={visible} transparent={!fullScreen} animationType="slide" presentationStyle={fullScreen ? "fullScreen" : "overFullScreen"} onRequestClose={onClose} accessibilityViewIsModal>
    {fullScreen ? <View style={[styles.fullBackdrop, { backgroundColor: theme.background }]} onAccessibilityEscape={onClose}>{sheet}</View> :
      <View style={styles.overlay} onAccessibilityEscape={onClose}>
        <BlurView pointerEvents="none" intensity={1} tint="default" experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined} style={StyleSheet.absoluteFill}/>
        <Pressable accessible={false} onPress={onClose} style={[StyleSheet.absoluteFill, styles.scrim]}/>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.bottom} pointerEvents="box-none">{sheet}</KeyboardAvoidingView>
      </View>}
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" }, fullBackdrop: { flex: 1 }, bottom: { justifyContent: "flex-end" }, scrim: { backgroundColor: "rgba(15, 23, 42, 0.35)" },
  sheet: { width: "100%", minHeight: 240, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", shadowColor: "#0F172A", shadowOpacity: .2, shadowRadius: 18, elevation: 16 },
  fullScreen: { flex: 1, minHeight: 0, borderRadius: 0 }, header: { minHeight: 76, flexShrink: 0, paddingLeft: 20, paddingRight: 10, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth },
  headerCopy: { flex: 1, minWidth: 0 }, title: { fontSize: 18, lineHeight: 23, fontWeight: "700", fontFamily: appFonts.bold }, subtitle: { fontSize: 12, lineHeight: 18, fontFamily: appFonts.medium },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  fullScreenContent: { flex: 1, minHeight: 0 },
  quickContent: { flexShrink: 1, minHeight: 0 },
  footer: { flexShrink: 0, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 12 },
});
