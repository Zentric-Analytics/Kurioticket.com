import { Pressable, StyleSheet, Text } from "react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { flowColors } from "../flow/flowStyles";
import { personalDetailsCopy } from "./translations";

export function PersonalDetailsSaveButton({
  dirty,
  saving,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const c = personalDetailsCopy(locale);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saving ? c.saving : c.save}
      accessibilityState={{ disabled: !dirty || saving, busy: saving }}
      disabled={!dirty || saving}
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
          { color: !dirty && !saving ? theme.muted : "#FFFFFF" },
        ]}
      >
        {saving ? c.saving : c.save}
      </Text>
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
