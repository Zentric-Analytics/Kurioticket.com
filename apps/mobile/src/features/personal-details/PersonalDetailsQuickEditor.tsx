import { useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
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
} from "./personalDetailsModel";
import { personalDetailsCopy } from "./translations";
import { PersonalDetailsCountryFlag } from "./PersonalDetailsCountryFlag";
import { PersonalDetailsSaveButton } from "./PersonalDetailsSaveButton";
import { PersonalDetailsDateWheel } from "./PersonalDetailsDateWheel";
import { birthDateOptions, type DateDraft } from "./personalDetailsEditorModel";
export type { DateDraft } from "./personalDetailsEditorModel";

export type QuickDetail = "gender" | "nationality" | "birth";
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
  const { height, width } = useWindowDimensions();
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
  const { latestYear, monthCount, dayCount } = birthDateOptions(dateDraft);
  const [scrolling, setScrolling] = useState({
    month: false,
    day: false,
    year: false,
  });
  const wheelsMoving = Object.values(scrolling).some(Boolean);
  const translateY = useRef(new Animated.Value(0)).current;
  const sheetGesture = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !saving,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !saving &&
          gesture.dy > 6 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) =>
          translateY.setValue(Math.max(0, gesture.dy)),
        onPanResponderRelease: (_, gesture) => {
          translateY.setValue(0);
          if (gesture.dy > 60 || gesture.vy > 0.7) onClose();
        },
        onPanResponderTerminate: () => translateY.setValue(0),
      }),
    [saving, onClose, translateY],
  );
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
        <Animated.View
          style={[
            s.panel,
            detail === "birth" && { transform: [{ translateY }] },
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
          {detail === "birth" ? (
            <View {...sheetGesture.panHandlers}>
              <View style={s.handleArea}>
                <View style={[s.handle, { backgroundColor: theme.muted }]} />
              </View>
              <Text
                accessibilityRole="header"
                style={[s.birthTitle, { color: theme.text }]}
              >
                {title}
              </Text>
            </View>
          ) : (
            <View style={s.header}>
              {fullScreen ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={c.back}
                  disabled={saving}
                  onPress={onClose}
                  style={s.back}
                >
                  <FlowIcon name="back" color={theme.icon} />
                </Pressable>
              ) : (
                <View style={s.back} />
              )}
              <Text
                accessibilityRole="header"
                style={[s.title, { color: theme.text }]}
              >
                {title}
              </Text>
              <View style={s.back} />
            </View>
          )}
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
              style={[
                s.dateColumns,
                {
                  paddingHorizontal: Math.max(
                    20,
                    Math.min(90, (width - 232) / 2),
                  ),
                },
              ]}
            >
              <PersonalDetailsDateWheel
                label={c.month}
                value={dateDraft.month}
                disabled={saving}
                onScrollingChange={(value) =>
                  setScrolling((current) => ({ ...current, month: value }))
                }
                onChange={(value) => onDateChange("month", value)}
                options={Array.from({ length: monthCount }, (_, i) => ({
                  value: String(i + 1).padStart(2, "0"),
                  label: new Intl.DateTimeFormat(
                    locale === "es-es" ? "es-ES" : "en-US",
                    { month: "short", timeZone: "UTC" },
                  ).format(new Date(Date.UTC(2020, i, 1))),
                }))}
              />
              <PersonalDetailsDateWheel
                label={c.day}
                value={dateDraft.day}
                disabled={saving}
                onScrollingChange={(value) =>
                  setScrolling((current) => ({ ...current, day: value }))
                }
                onChange={(value) => onDateChange("day", value)}
                options={Array.from({ length: dayCount }, (_, i) => ({
                  value: String(i + 1).padStart(2, "0"),
                  label: String(i + 1).padStart(2, "0"),
                }))}
              />
              <PersonalDetailsDateWheel
                label={c.year}
                value={dateDraft.year}
                disabled={saving}
                onScrollingChange={(value) =>
                  setScrolling((current) => ({ ...current, year: value }))
                }
                onChange={(value) => onDateChange("year", value)}
                options={Array.from({ length: 125 }, (_, i) => ({
                  value: String(latestYear - 124 + i),
                  label: String(latestYear - 124 + i),
                }))}
              />
            </View>
          )}
          <View
            style={[
              s.footer,
              detail === "birth" && {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.border,
                paddingVertical: 16,
              },
            ]}
          >
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
              blocked={detail === "birth" && wheelsMoving}
              saving={saving}
              onSave={onSave}
            />
          </View>
        </Animated.View>
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
  dateColumns: {
    flexDirection: "row",
    gap: 16,
    paddingVertical: 44,
    minHeight: 250,
    alignItems: "center",
  },
  handleArea: { height: 26, alignItems: "center", justifyContent: "center" },
  handle: { width: 48, height: 4, borderRadius: 2, opacity: 0.5 },
  birthTitle: {
    fontFamily: appFonts.semibold,
    fontSize: 22,
    lineHeight: 30,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
});
