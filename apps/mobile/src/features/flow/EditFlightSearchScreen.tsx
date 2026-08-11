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
          accessibilityLabel="Cancel editing flight search"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [ft.styles.iconButton, pressed && ft.styles.pressed]}
        >
          <ArrowLeft color={ft.colors.icon} size={24} strokeWidth={2.25} />
        </Pressable>
        <Text accessibilityRole="header" style={[ft.styles.title, styles.title]}>Edit flight search</Text>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={ft.styles.iconButton} />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        >
          <FlightSearchPanel params={params} submitNavigation="replace" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { minHeight: 58, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingHorizontal: 4 },
  title: { flex: 1, textAlign: "center", fontSize: 20 },
  content: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 28 },
});
