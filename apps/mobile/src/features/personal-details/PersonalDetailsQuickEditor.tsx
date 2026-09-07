import { useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";
import {
  COUNTRY_OPTIONS,
  filterSelectorOptions,
  GENDER_VALUES,
  NATIONALITY_OPTIONS,
  personalDetailsLatestDateOfBirth,
} from "./personalDetailsModel";
import { personalDetailsCopy } from "./translations";
import { PersonalDetailsCountryFlag } from "./PersonalDetailsCountryFlag";
import { PersonalDetailsSaveButton } from "./PersonalDetailsSaveButton";

export type QuickDetail = "gender" | "nationality" | "birth";
export type DateDraft = { year: string; month: string; day: string };

// Each column is independently scrollable; tapping a value commits only to the draft.
function DateColumn({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { theme } = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const rowHeight = Math.max(48, Math.ceil(28 * fontScale));
  const initialIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value) - 1,
  );
  return (
    <View style={s.dateColumn}>
      <Text style={[s.columnLabel, { color: theme.muted }]}>{label}</Text>
      <FlatList
        data={options}
        extraData={value}
        style={{ height: rowHeight * 3 }}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: rowHeight,
          offset: rowHeight * index,
          index,
        })}
        keyExtractor={(item) => item.value}
        showsVerticalScrollIndicator
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${item.label}`}
            accessibilityState={{ selected: value === item.value }}
            onPress={() => onChange(item.value)}
            style={({ pressed }) => [
              s.dateOption,
              {
                height: rowHeight,
                borderColor:
                  value === item.value ? flowColors.blue : "transparent",
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Text
              style={[
                s.optionText,
                { color: value === item.value ? flowColors.blue : theme.text },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

export function PersonalDetailsQuickEditor({
  detail,
  dateDraft,
  gender,
  nationality,
  dirty,
  saving,
  error,
  onDateChange,
  onGenderChange,
  onNationalityChange,
  onClose,
  onSave,
}: {
  detail: QuickDetail;
  dateDraft: DateDraft;
  gender: string;
  nationality: string;
  dirty: boolean;
  saving: boolean;
  error: string;
  onDateChange: (part: keyof DateDraft, value: string) => void;
  onGenderChange: (value: string) => void;
  onNationalityChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const c = personalDetailsCopy(locale);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const countries = useMemo(
    () =>
      NATIONALITY_OPTIONS.map((value, index) => ({
        value,
        label: value,
        searchTerms: [COUNTRY_OPTIONS[index].code],
      })),
    [],
  );
  const shown = filterSelectorOptions(countries, query);
  const latestYear = Number(personalDetailsLatestDateOfBirth().slice(0, 4));
  const fullScreen = detail === "nationality";
  const title =
    detail === "birth"
      ? c.birth
      : detail === "gender"
        ? c.gender
        : c.nationality;
  return (
    <Modal
      transparent
      animationType="slide"
      visible
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.root}
      >
        {!fullScreen && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.back}
            disabled={saving}
            onPress={onClose}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.4)" },
            ]}
          />
        )}
        <View
          style={[
            s.panel,
            fullScreen
              ? { flex: 1, paddingTop: insets.top }
              : {
                  maxHeight: height - insets.top - 24,
                  borderTopLeftRadius: 22,
                  borderTopRightRadius: 22,
                },
            { backgroundColor: theme.background, paddingBottom: insets.bottom },
          ]}
        >
          <View style={s.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={c.back}
              disabled={saving}
              onPress={onClose}
              style={s.back}
            >
              <FlowIcon name="back" color={theme.icon} />
            </Pressable>
            <Text
              accessibilityRole="header"
              style={[s.title, { color: theme.text }]}
            >
              {title}
            </Text>
            <View style={s.back} />
          </View>
          {fullScreen ? (
            <>
              <View style={s.searchArea}>
                <TextInput
                  accessibilityLabel={c.searchCountry}
                  accessibilityHint={c.searchCountryHint}
                  placeholder={c.searchCountry}
                  placeholderTextColor={theme.muted}
                  value={query}
                  onChangeText={setQuery}
                  editable={!saving}
                  returnKeyType="done"
                  style={[
                    s.search,
                    { color: theme.text, borderColor: theme.border },
                  ]}
                />
              </View>
              <FlatList
                style={{ flex: 1 }}
                data={shown}
                extraData={nationality}
                keyExtractor={(item) => item.value}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={s.options}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{
                      selected: nationality === item.value,
                      disabled: saving,
                    }}
                    disabled={saving}
                    onPress={() => {
                      Keyboard.dismiss();
                      onNationalityChange(item.value);
                    }}
                    style={({ pressed }) => [
                      s.option,
                      {
                        borderBottomColor: theme.border,
                        opacity: pressed ? 0.6 : 1,
                      },
                    ]}
                  >
                    <PersonalDetailsCountryFlag
                      isoCode={
                        COUNTRY_OPTIONS.find(
                          (country) => country.label === item.value,
                        )?.code
                      }
                    />
                    <Text
                      style={[
                        s.optionText,
                        {
                          flex: 1,
                          color:
                            nationality === item.value
                              ? flowColors.blue
                              : theme.text,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {nationality === item.value && (
                      <FlowIcon
                        name="check"
                        color={flowColors.blue}
                        size={22}
                      />
                    )}
                  </Pressable>
                )}
              />
            </>
          ) : detail === "gender" ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.options}
            >
              <View pointerEvents={saving ? "none" : "auto"}>
                {GENDER_VALUES.map((value, index) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{
                      selected: gender === value,
                      disabled: saving,
                    }}
                    disabled={saving}
                    onPress={() => onGenderChange(value)}
                    style={({ pressed }) => [
                      s.option,
                      {
                        borderBottomColor: theme.border,
                        opacity: pressed ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[s.optionText, { flex: 1, color: theme.text }]}
                    >
                      {[c.male, c.female, c.prefer][index]}
                    </Text>
                    <View
                      style={[
                        s.radio,
                        {
                          borderColor:
                            gender === value ? flowColors.blue : theme.muted,
                        },
                      ]}
                    >
                      {gender === value && <View style={s.radioDot} />}
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View
              pointerEvents={saving ? "none" : "auto"}
              style={[s.dateColumns, s.options]}
            >
              <DateColumn
                label={c.day}
                value={dateDraft.day}
                onChange={(value) => onDateChange("day", value)}
                options={Array.from({ length: 31 }, (_, i) => ({
                  value: String(i + 1).padStart(2, "0"),
                  label: String(i + 1),
                }))}
              />
              <DateColumn
                label={c.month}
                value={dateDraft.month}
                onChange={(value) => onDateChange("month", value)}
                options={Array.from({ length: 12 }, (_, i) => ({
                  value: String(i + 1).padStart(2, "0"),
                  label: new Intl.DateTimeFormat(
                    locale === "es-es" ? "es-ES" : "en-US",
                    { month: "short", timeZone: "UTC" },
                  ).format(new Date(Date.UTC(2020, i, 1))),
                }))}
              />
              <DateColumn
                label={c.year}
                value={dateDraft.year}
                onChange={(value) => onDateChange("year", value)}
                options={Array.from({ length: 125 }, (_, i) => ({
                  value: String(latestYear - i),
                  label: String(latestYear - i),
                }))}
              />
            </View>
          )}
          <View style={s.footer}>
            {!!error && (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                style={s.error}
              >
                {error}
              </Text>
            )}
            <PersonalDetailsSaveButton
              dirty={dirty}
              saving={saving}
              onSave={onSave}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  panel: { overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", minHeight: 62 },
  back: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: appFonts.semibold,
    fontSize: 18,
    lineHeight: 26,
  },
  options: { paddingHorizontal: 20 },
  option: {
    minHeight: 56,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontFamily: appFonts.regular,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "left",
  },
  radio: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: flowColors.blue,
  },
  searchArea: { paddingHorizontal: 20, paddingBottom: 12 },
  search: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: appFonts.regular,
    fontSize: 16,
  },
  footer: { paddingHorizontal: 20, paddingVertical: 12 },
  error: {
    fontFamily: appFonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: "#D92D20",
    marginBottom: 12,
  },
  dateColumns: { flexDirection: "row", gap: 12, paddingBottom: 16 },
  dateColumn: { flex: 1, minWidth: 0 },
  columnLabel: {
    fontFamily: appFonts.medium,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
  dateOption: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
  },
});
