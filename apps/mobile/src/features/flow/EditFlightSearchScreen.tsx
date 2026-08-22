import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { FlightSearchPanel } from "./FlightSearchPanel";
import { useFlowTheme } from "./flowStyles";

export function EditFlightSearchScreen() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const ft = useFlowTheme();

  return (
    <SafeAreaView style={ft.styles.safe} edges={["top", "bottom"]}>
      <StatusBar style={ft.theme.dark ? "light" : "dark"} backgroundColor={ft.colors.page} />
      <View style={[styles.header, { borderBottomColor: ft.colors.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [ft.styles.iconButton, pressed && ft.styles.pressed]}
        >
          <ArrowLeft color={ft.colors.icon} size={24} strokeWidth={2.25} />
        </Pressable>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={[ft.styles.title, styles.title]}>Edit flight search</Text>
          <Text style={[styles.subtitle, { color: ft.colors.secondaryText }]}>Update your trip details</Text>
        </View>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        >
          <FlightSearchPanel params={params} submitNavigation="replace" editAppearance />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { minHeight: 76, flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 8 },
  heading: { flex: 1, paddingRight: 12 },
  title: { fontSize: 22, lineHeight: 28 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 1 },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 },
});
