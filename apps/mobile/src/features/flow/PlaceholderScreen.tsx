import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { FlowIcon } from "./FlowIcon";
import { flowColors, flowStyles } from "./flowStyles";

export function PlaceholderScreen({ title, body }: { title: string; body: string }) {
  return <SafeAreaView style={flowStyles.safe}><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={flowStyles.iconButton}><FlowIcon name="back" /></Pressable><Text accessibilityRole="header" style={flowStyles.title}>{title}</Text><View style={flowStyles.iconButton} /></View><View style={styles.body}><FlowIcon name="compass" color={flowColors.blue} size={40} /><Text style={flowStyles.value}>{body}</Text><Text style={flowStyles.meta}>This capability is not connected to a production mobile API yet.</Text></View></SafeAreaView>;
}
const styles = StyleSheet.create({ header: { minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 }, body: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 12 } });
