import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { Logo } from "../src/components/Logo";
import { Screen } from "../src/components/Screen";
import { colors } from "../src/theme/tokens";
export default function LaunchScreen() { const [ready, setReady] = useState(false); useEffect(() => { const id = setTimeout(() => setReady(true), 750); return () => clearTimeout(id); }, []); useEffect(() => { if (ready) router.replace("/welcome"); }, [ready]); return <Screen centered><Logo /><Text style={styles.title}>Kurioticket</Text><ActivityIndicator color={colors.blue} size="large" /><Text style={styles.copy}>Preparing your travel app.</Text></Screen>; }
const styles = StyleSheet.create({ title: { color: colors.navy, fontSize: 28, fontWeight: "900", textAlign: "center" }, copy: { color: colors.muted, fontSize: 16, textAlign: "center" } });
