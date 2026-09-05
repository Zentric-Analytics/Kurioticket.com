import type { ReactNode } from "react";
import { BlurView } from "expo-blur";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SlidersHorizontal, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";

export function FlightResultsSheetShell({ visible,title,closeLabel,onClose,children,footer,fullScreen=false,subtitle,headerAction }:{visible:boolean;title:string;closeLabel:string;onClose:()=>void;children:ReactNode;footer?:ReactNode;fullScreen?:boolean;subtitle?:string;headerAction?:ReactNode}) {
 const {theme}=useAppTheme(),inset=useSafeAreaInsets(),{height}=useWindowDimensions();
 const sheet=<View accessibilityLabel={title} style={[styles.sheet,fullScreen&&styles.fullScreen,{maxHeight:fullScreen?"100%":Math.min(height*.82,700),backgroundColor:fullScreen?theme.background:theme.surface,paddingTop:fullScreen?inset.top:0}]}>
  <View style={[styles.header,{borderBottomColor:theme.border,backgroundColor:theme.surface}]}>
   {fullScreen?<View accessible={false} style={styles.filterIcon}><SlidersHorizontal size={19} color={theme.dark?"#8FB5FF":"#004BB8"}/></View>:null}
   <View style={styles.headerCopy}><Text accessibilityRole="header" style={[styles.title,{color:theme.textPrimary}]}>{title}</Text>{subtitle?<Text style={[styles.subtitle,{color:theme.textSecondary}]}>{subtitle}</Text>:null}</View>
   {headerAction}<Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={styles.close}><X accessible={false} size={21} color={theme.icon}/></Pressable>
  </View>
  <View style={styles.content}>{children}</View>
  {footer?<View style={[styles.footer,{borderTopColor:theme.border,backgroundColor:theme.surface,paddingBottom:Math.max(inset.bottom,12)}]}>{footer}</View>:null}
 </View>;
 return <Modal visible={visible} transparent={!fullScreen} presentationStyle={fullScreen?"fullScreen":"overFullScreen"} animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
  {fullScreen?sheet:<View style={styles.overlay} onAccessibilityEscape={onClose}><BlurView pointerEvents="none" intensity={1} tint="default" experimentalBlurMethod={Platform.OS==="android"?"dimezisBlurView":undefined} style={StyleSheet.absoluteFill}/><Pressable accessible={false} onPress={onClose} style={[StyleSheet.absoluteFill,styles.scrim]}/><KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":"height"} style={styles.bottom} pointerEvents="box-none">{sheet}</KeyboardAvoidingView></View>}
 </Modal>;
}
const styles=StyleSheet.create({overlay:{flex:1,justifyContent:"flex-end"},scrim:{backgroundColor:"rgba(15, 23, 42, 0.35)"},bottom:{justifyContent:"flex-end"},sheet:{width:"100%",minHeight:260,borderTopLeftRadius:24,borderTopRightRadius:24,overflow:"hidden",shadowColor:"#0F172A",shadowOffset:{width:0,height:-8},shadowOpacity:.2,shadowRadius:18,elevation:16},fullScreen:{flex:1,borderRadius:0},header:{minHeight:76,paddingLeft:16,paddingRight:8,flexDirection:"row",alignItems:"center",borderBottomWidth:StyleSheet.hairlineWidth},filterIcon:{width:36,height:44,alignItems:"flex-start",justifyContent:"center"},headerCopy:{flex:1,minWidth:0},title:{fontSize:18,lineHeight:23,fontWeight:"700",fontFamily:appFonts.bold},subtitle:{fontSize:12,lineHeight:18,fontWeight:"500",fontFamily:appFonts.medium},close:{width:44,height:44,alignItems:"center",justifyContent:"center"},content:{flex:1,minHeight:0},footer:{flexDirection:"row",borderTopWidth:StyleSheet.hairlineWidth,paddingHorizontal:16,paddingTop:12}});
