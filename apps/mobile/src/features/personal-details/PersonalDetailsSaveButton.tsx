import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { flowColors } from "../flow/flowStyles";
import { personalDetailsCopy } from "./translations";

export function PersonalDetailsSaveButton({
  dirty,
  saving,
  blocked = false,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  blocked?: boolean;
  onSave: () => void;
}) {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const c = personalDetailsCopy(locale);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saving ? c.saving : c.save}
      accessibilityState={{
        disabled: !dirty || saving || blocked,
        busy: saving,
      }}
      disabled={!dirty || saving || blocked}
      onPress={onSave}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: !dirty && !saving ? theme.border : flowColors.blue,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text
        style={[
          s.label,
          saving && { opacity: 0 },
          { color: !dirty && !saving ? theme.muted : "#FFFFFF" },
        ]}
      >
        {c.save}
      </Text>
      {saving && (
        <ActivityIndicator
          accessible={false}
          color="#FFFFFF"
          style={StyleSheet.absoluteFill}
        />
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  label: {
    fontFamily: appFonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    textAlign: "center",
  },
});
