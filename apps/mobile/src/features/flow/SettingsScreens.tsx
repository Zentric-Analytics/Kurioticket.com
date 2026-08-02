import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { travelApi } from "../../api/travelApi";
import { clearSession, readSession } from "../../storage/sessionStorage";
import { readCurrency, writeCurrency } from "../../storage/preferenceStorage";
import { FlowIcon } from "./FlowIcon";
import { flowColors, flowStyles } from "./flowStyles";
import { getRuntimeDiagnostics } from "../../diagnostics/runtimeDiagnostics";

function Header({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={flowStyles.iconButton}>
        <FlowIcon name="back" />
      </Pressable>
      <Text accessibilityRole="header" style={flowStyles.title}>{title}</Text>
      <View style={flowStyles.iconButton} />
    </View>
  );
}

export function SettingsScreen() {
  const [email, setEmail] = useState("");
  const diagnostics = getRuntimeDiagnostics();
  useEffect(() => { void readSession().then((session) => setEmail(session?.user.email || "")); }, []);
  const signOut = async () => {
    await clearSession();
    router.replace("/email-auth");
  };
  return (
    <SafeAreaView style={flowStyles.safe}>
      <Header title="Settings" />
      <View style={styles.content}>
        <Text style={flowStyles.sectionTitle}>Account</Text>
        <View style={[flowStyles.card, flowStyles.shadow, styles.account]}>
          <Text style={flowStyles.label}>Signed in as</Text>
          <Text style={flowStyles.value}>{email || "Guest traveler"}</Text>
        </View>
        {email ? (
          <Pressable accessibilityRole="button" onPress={signOut} style={styles.dangerButton}>
            <Text style={styles.dangerText}>Sign out</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => router.replace("/email-auth")} style={styles.primaryButton}>
            <Text style={styles.primaryText}>Sign in</Text>
          </Pressable>
        )}
        <Text style={flowStyles.sectionTitle}>System information</Text>
        <View style={[flowStyles.card, flowStyles.shadow, styles.account]} accessibilityLabel="Build diagnostics">
          {[["Application version", diagnostics.applicationVersion], ["Native build", diagnostics.nativeBuildVersion], ["Runtime", diagnostics.runtimeVersion], ["Update ID", diagnostics.updateId], ["Channel", diagnostics.channel], ["Created", diagnostics.createdAt], ["Embedded update", diagnostics.embedded ? "Yes" : "No"], ["Expo project", diagnostics.projectId], ["API environment", diagnostics.apiBaseUrl]].map(([label, value]) => <View key={label}><Text style={flowStyles.label}>{label}</Text><Text selectable style={styles.diagnosticValue}>{value}</Text></View>)}
        </View>
      </View>
    </SafeAreaView>
  );
}

export function CurrencyScreen() {
  const [selected, setSelected] = useState("USD");
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    void Promise.all([readCurrency(), travelApi.currencyRates()])
      .then(([saved, payload]) => {
        setSelected(saved);
        setCurrencies(Object.keys(payload.rates).sort());
      })
      .catch(() => setError("Unable to load current exchange rates. Try again."));
  }, []);
  const select = async (currency: string) => {
    setSelected(currency);
    await writeCurrency(currency);
  };
  return (
    <SafeAreaView style={flowStyles.safe}>
      <Header title="Currency" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={flowStyles.meta}>Choose the currency used for price display. Provider checkout may use a different billing currency.</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {!error && !currencies.length ? <Text style={flowStyles.meta}>Loading currencies…</Text> : null}
        <View style={[flowStyles.card, flowStyles.shadow]}>
          {currencies.map((currency) => (
            <Pressable key={currency} accessibilityRole="radio" accessibilityState={{ checked: selected === currency }} onPress={() => void select(currency)} style={styles.row}>
              <Text style={[flowStyles.value, styles.grow]}>{currency}</Text>
              {selected === currency ? <FlowIcon name="check" color={flowColors.blue} /> : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 },
  content: { padding: 16, gap: 14 },
  account: { padding: 16, gap: 6 },
  dangerButton: { minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: "#D92D20", alignItems: "center", justifyContent: "center" },
  dangerText: { color: "#D92D20", fontWeight: "800" },
  primaryButton: { minHeight: 52, borderRadius: 12, backgroundColor: flowColors.blue, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "white", fontWeight: "800" },
  row: { minHeight: 54, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomColor: flowColors.border, borderBottomWidth: 1 },
  grow: { flex: 1 },
  diagnosticValue: { color: flowColors.navy, fontSize: 13 },
  error: { color: "#D92D20" },
});
