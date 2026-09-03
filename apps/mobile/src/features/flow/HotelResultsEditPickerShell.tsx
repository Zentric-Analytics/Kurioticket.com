import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFlowTheme } from "./flowStyles";

type Props = { visible: boolean; title: string; children: ReactNode; footer?: ReactNode; onBack: () => void; onShow?: () => void };

/** Opaque child-editor presentation used only by Hotel Results Edit. */
export function HotelResultsEditPickerShell({ visible, title, children, footer, onBack, onShow }: Props) {
  const ft = useFlowTheme();
  return <Modal visible={visible} transparent={false} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={false} onShow={onShow} onRequestClose={onBack}>
    <SafeAreaView edges={["top", "bottom", "left", "right"]} accessibilityViewIsModal style={[styles.screen, { backgroundColor: ft.colors.surface }]}>
      <View style={[styles.header, { backgroundColor: ft.colors.surface, borderBottomColor: ft.colors.border }]}>
        <View style={styles.side}><Pressable accessibilityRole="button" accessibilityLabel="Back to edit hotel search" accessibilityHint="Discards uncommitted changes" onPress={onBack} style={({ pressed }) => [styles.back, pressed && ft.styles.pressed]}><ChevronLeft accessible={false} size={20} color={ft.colors.icon}/><Text style={[styles.backText, { color: ft.colors.text }]}>Back</Text></Pressable></View>
        <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.title, { color: ft.colors.text }]}>{title}</Text>
        <View accessible={false} style={styles.side}/>
      </View>
      <View style={styles.body}>{children}</View>
      {footer ? <View style={[styles.footer, { backgroundColor: ft.colors.surface, borderTopColor: ft.colors.border }]}>{footer}</View> : null}
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({screen:{flex:1},header:{minHeight:62,flexDirection:"row",alignItems:"center",borderBottomWidth:StyleSheet.hairlineWidth},side:{width:76,minHeight:44,justifyContent:"center"},back:{minWidth:44,minHeight:44,paddingHorizontal:10,flexDirection:"row",alignItems:"center"},backText:{fontSize:14,lineHeight:20,fontWeight:"600"},title:{flex:1,minWidth:0,textAlign:"center",fontSize:18,lineHeight:24,fontWeight:"700"},body:{flex:1,minHeight:0},footer:{borderTopWidth:StyleSheet.hairlineWidth,paddingHorizontal:16,paddingTop:12,paddingBottom:12}});
