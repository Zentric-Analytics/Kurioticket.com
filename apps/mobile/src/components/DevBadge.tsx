import { StyleSheet, Text } from "react-native";
import { colors } from "../theme/tokens";
export function DevBadge() { if (!__DEV__) return null; return <Text style={styles.badge}>Development</Text>; }
const styles = StyleSheet.create({ badge: { alignSelf: "flex-start", overflow: "hidden", borderRadius: 999, backgroundColor: colors.sky, color: colors.blue, fontSize: 12, fontWeight: "800", paddingHorizontal: 10, paddingVertical: 6 } });
