import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useAppTheme } from "../../theme/AppTheme";

export function NativeSupplierInformation({ facts, title = "Supplier information" }: {
  facts?: Array<{ label: string; value: string }>;
  title?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { theme } = useAppTheme();
  if (!facts?.length) return null;
  return <View style={{ padding: 12, backgroundColor: theme.surface }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={title} onPress={() => setExpanded(value => !value)} style={{ minHeight: 44, justifyContent: "center" }}>
      <Text style={{ color: theme.textPrimary, fontWeight: "600" }}>{title} {expanded ? "−" : "+"}</Text>
    </Pressable>
    {expanded ? facts.map((fact, index) => <View key={`${fact.label}-${index}`} style={{ marginBottom: 12 }}>
      <Text style={{ color: theme.textPrimary, fontWeight: "600" }}>{fact.label}</Text>
      <Text selectable style={{ color: theme.textSecondary }}>{fact.value}</Text>
    </View>) : null}
  </View>;
}
