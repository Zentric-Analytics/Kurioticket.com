import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router, useNavigation } from "expo-router";
import { Pencil } from "lucide-react-native";
import {
  travelApi,
  TravelApiError,
  type MobileProfile,
} from "../../api/travelApi";
import { PersonalDetailsEmailEditor } from "./PersonalDetailsEmailEditor";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import {
  readSession,
  updateStoredSessionName,
} from "../../storage/sessionStorage";
import { appFonts } from "../../theme/typography";
import { useAppTheme } from "../../theme/AppTheme";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";
import {
  canonicalDate,
  clampPersonalDetailsDateOfBirth,
  COUNTRY_OPTIONS,
  displayAddress,
  displayPhone,
  EMPTY_ADDRESS,
  filterSelectorOptions,
  GENDER_VALUES,
  getCountryFlagUri,
  isEligiblePersonalDetailsDateOfBirth,
  NATIONALITY_OPTIONS,
  normalizeProfile,
  parseAddress,
  personalDetailsLatestDateOfBirth,
  PHONE_COUNTRY_OPTIONS,
  profilesDiffer,
  serializeAddress,
  serializePhone,
  type AddressParts,
  type PersonalDetailsSelectorOption,
} from "./personalDetailsModel";
import { personalDetailsCopy } from "./translations";
import { signInHref } from "../auth/signInIntent";
import { PageContentState } from "../../components/PageContentState";

type DateDraft = {
  year: string;
  month: string;
  day: string;
};

function dateDraftFromValue(value?: string | null): DateDraft {
  const match = (value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return {
    year: match?.[1] || "",
    month: match?.[2] || "",
    day: match?.[3] || "",
  };
}

function dateMonthLabel(value: string, locale: string) {
  if (!/^\d{2}$/.test(value)) return "";
  const monthIndex = Number(value) - 1;
  if (monthIndex < 0 || monthIndex > 11) return "";
  return new Intl.DateTimeFormat(locale === "es-es" ? "es-ES" : "en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, monthIndex, 1)));
}

type SelectorProps = {
  visible: boolean;
  title: string;
  selectorType: string | null;
  options: PersonalDetailsSelectorOption[];
  selected: string;
  searchable?: boolean;
  anchor?: SelectorAnchor | null;
  onClose: () => void;
  onDismiss: () => void;
  onSelect: (value: string) => void;
};
function Selector({
  visible,
  title,
  selectorType,
  options,
  selected,
  searchable,
  onClose,
  onDismiss,
  onSelect,
  anchor,
}: SelectorProps) {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const c = personalDetailsCopy(locale);
  const [q, setQ] = useState("");
  const { height, width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const shown = filterSelectorOptions(options, q);
  useEffect(() => {
    setQ("");
    if (visible) Keyboard.dismiss();
  }, [selectorType, visible]);
  const close = () => {
    Keyboard.dismiss();
    setQ("");
    onClose();
  };
  if (["day", "month", "year"].includes(selectorType || "")) {
    const rowHeight = Math.max(44, Math.ceil(40 * fontScale));
    const menuWidth = anchor?.width ?? (selectorType === "month" ? 170 : 100);
    const left = anchor?.x ?? 12;
    const fieldTop = (anchor?.y ?? insets.top) + (Platform.OS === "android" ? insets.top : 0);
    const below = fieldTop + (anchor?.height ?? 0) + 4;
    const availableBelow = height - insets.bottom - below - 8;
    const opensBelow = availableBelow >= rowHeight * 3;
    const menuHeight = Math.min(rowHeight * 6, opensBelow ? availableBelow : fieldTop - insets.top - 12);
    const top = opensBelow ? below : fieldTop - menuHeight - 4;
    const selectedIndex = Math.max(0, options.findIndex(item => item.value === selected));
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close} onDismiss={onDismiss}>
        <View style={StyleSheet.absoluteFill}>
          <Pressable accessibilityRole="button" accessibilityLabel={c.cancel} onPress={close} style={StyleSheet.absoluteFill} />
          <View accessibilityViewIsModal style={[s.floatingCountryMenu, { left, top, width: menuWidth, height: menuHeight, borderRadius: 10, backgroundColor: theme.dark ? "#2C2C2E" : "#F7F7F7", elevation: 8 }]}>
            <FlatList
              accessibilityLabel={title}
              data={options}
              extraData={selected}
              keyExtractor={item => item.value}
              initialScrollIndex={Math.max(0, selectedIndex - 2)}
              getItemLayout={(_, index) => ({ length: rowHeight, offset: rowHeight * index, index })}
              renderItem={({ item }) => (
                <Pressable accessibilityRole="menuitem" accessibilityState={{ selected: item.value === selected }} onPress={() => { onSelect(item.value); close(); }} style={({ pressed }) => [s.floatingCountryOption, { height: rowHeight, backgroundColor: pressed ? theme.border : "transparent" }]}>
                  <View style={s.floatingCountryCheck}>{item.value === selected && <FlowIcon name="check" size={16} color={theme.text} />}</View>
                  <Text numberOfLines={1} style={{ flex: 1, fontFamily: appFonts.regular, fontSize: 16, color: theme.text }}>{item.label}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    );
  }
  if (selectorType === "gender") {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={close} onDismiss={onDismiss} statusBarTranslucent>
        <View style={s.modalRoot}>
          <Pressable accessibilityRole="button" accessibilityLabel={c.cancel} onPress={close} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]} />
          <SafeAreaView edges={["bottom"]} style={[s.genderSheet, { backgroundColor: theme.background, maxHeight: height * 0.82 }]}>
            <Text accessibilityRole="header" style={[s.genderTitle, { color: theme.text }]}>{title}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.genderOptions}>
              {options.map((item) => (
                <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ selected: item.value === selected }} onPress={() => { onSelect(item.value); close(); }} style={({ pressed }) => [s.genderOption, { borderBottomColor: theme.border, opacity: pressed ? 0.6 : 1 }]}>
                  <Text style={[s.genderOptionText, { color: theme.text }]}>{item.label}</Text>
                  <View style={[s.genderRadio, { borderColor: item.value === selected ? flowColors.blue : theme.muted }]}>
                    {item.value === selected && <View style={s.genderRadioDot} />}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    );
  }
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
      onDismiss={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.modalRoot}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={c.cancel}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,.45)" },
          ]}
          onPress={close}
        />
        <SafeAreaView
          edges={["bottom"]}
          style={[
            s.sheet,
            { backgroundColor: theme.surface, maxHeight: height * 0.82 },
          ]}
        >
          <Text
            accessibilityRole="header"
            style={[s.sectionTitle, { color: theme.text }]}
          >
            {title}
          </Text>
          {searchable ? (
            <TextInput
              accessibilityLabel={c.searchCountry}
              placeholder={c.searchCountry}
              placeholderTextColor={theme.muted}
              value={q}
              onChangeText={setQ}
              style={[
                s.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            />
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled">
            {shown.map((item) => (
              <Pressable
                key={item.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: item.value === selected }}
                onPress={() => {
                  Keyboard.dismiss();
                  onSelect(item.value);
                  setQ("");
                  onClose();
                }}
                style={[s.option, { borderBottomColor: theme.border }]}
              >
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: item.value === selected ? "800" : "500",
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            onPress={close}
            style={s.modalCancel}
          >
            <Text style={s.blue}>{c.cancel}</Text>
          </Pressable>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type SelectorAnchor = { x: number; y: number; width: number; height: number };

type CountrySelectorProps = Omit<SelectorProps, "searchable" | "onSelect"> & {
  kind: "phone" | "nationality" | "addressCountry";
  onSave: (value: string) => boolean;
  onAutoSave: (value: string) => Promise<boolean>;
  anchor: SelectorAnchor | null;
};

/** Country picker. Draft state intentionally lives inside the modal. */
function CountrySelector({
  visible,
  title,
  selectorType,
  kind,
  options,
  selected,
  onClose,
  onSave,
  onAutoSave,
  anchor,
  onDismiss,
}: CountrySelectorProps) {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const c = personalDetailsCopy(locale);
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const [q, setQ] = useState("");
  const [draftSelection, setDraftSelection] = useState(selected);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  useEffect(() => {
    if (!selectionError) return;
    const timer = setTimeout(() => setSelectionError(""), 5000);
    return () => clearTimeout(timer);
  }, [selectionError]);
  const committing = useRef(false);
  const visibleRef = useRef(visible);
  const wasVisibleRef = useRef(false);
  const translateY = useRef(new Animated.Value(height)).current;
  const shown = filterSelectorOptions(options, q);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);
  useEffect(() => {
    const willShow = Keyboard.addListener("keyboardWillShow", () =>
      setKeyboardVisible(true),
    );
    const didShow = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      willShow.remove();
      didShow.remove();
      hide.remove();
    };
  }, []);
  useEffect(() => {
    const isOpening = visible && !wasVisibleRef.current;
    wasVisibleRef.current = visible;
    if (!isOpening) return;
    setQ("");
    setDraftSelection(selected);
    committing.current = false;
    setSavingSelection(false);
    setKeyboardVisible(false);
    Keyboard.dismiss();
    translateY.stopAnimation();
    translateY.setValue(height);
  }, [selected, selectorType, translateY, visible, height]);

  // Wait for the native modal to be visible so mounting cannot consume the animation.
  const showSheet = () => {
    if (!visibleRef.current) return;
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeWithSheetAnimation = (afterClose: () => void) => {
    Keyboard.dismiss();
    translateY.stopAnimation();
    Animated.timing(translateY, {
      toValue: height,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) afterClose();
    });
  };
  const cancel = () => {
    if (savingSelection) return;
    closeWithSheetAnimation(onClose);
  };
  const saveSelection = () => {
    if (committing.current || !draftSelection) return;
    committing.current = true;
    setSavingSelection(true);
    Keyboard.dismiss();
    const savedSelection = onSave(draftSelection);
    if (!savedSelection) {
      committing.current = false;
      setSavingSelection(false);
      return;
    }
    closeWithSheetAnimation(onClose);
  };
  const selectNationality = async (value: string) => {
    if (committing.current) return;
    committing.current = true;
    setSavingSelection(true);
    setSelectionError("");
    const succeeded = await onAutoSave(value).catch(() => false);
    if (succeeded) closeWithSheetAnimation(onClose);
    else {
      setDraftSelection(selected);
      setSelectionError(c.saveFailure);
      committing.current = false;
      setSavingSelection(false);
    }
  };
  const handleDismiss = () => {
    if (visibleRef.current) return;
    setQ("");
    setDraftSelection(selected);
    setKeyboardVisible(false);
    setSavingSelection(false);
    committing.current = false;
    onDismiss();
  };

  if (["phone", "addressCountry"].includes(kind)) {
    const menuWidth = Math.min(240, width - 24);
    const rowHeight = Math.max(44, Math.ceil(40 * fontScale));
    const topLimit = insets.top + 8;
    const bottomLimit = height - insets.bottom - 8;
    const fieldTop = Math.max(topLimit, Math.min(anchor?.y ?? topLimit, bottomLimit - 180));
    const menuHeight = Math.min(480, bottomLimit - fieldTop);
    const menuLeft = Math.max(12, Math.min(width - menuWidth - 12, anchor?.x ?? 12));
    const currentIndex = Math.max(0, options.findIndex(item => item.value === selected));
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onDismiss={handleDismiss}>
        <View style={StyleSheet.absoluteFill}>
          <Pressable accessibilityRole="button" accessibilityLabel={c.cancel} onPress={onClose} style={StyleSheet.absoluteFill} />
          <View accessibilityViewIsModal style={[s.floatingCountryMenu, { left: menuLeft, top: fieldTop, width: menuWidth, height: menuHeight, backgroundColor: theme.dark ? "#2C2C2E" : "#F7F7F7" }]}>
            <FlatList
              accessibilityLabel={title}
              data={options}
              extraData={selected}
              keyExtractor={item => item.value}
              initialScrollIndex={Math.max(0, currentIndex - 6)}
              getItemLayout={(_, index) => ({ length: rowHeight, offset: rowHeight * index, index })}
              renderItem={({ item }) => {
                const active = item.value === selected;
                const dialCode = kind === "phone" ? PHONE_COUNTRY_OPTIONS.find(option => option.isoCode === item.value)?.dialCode : "";
                return (
                  <Pressable accessibilityRole="menuitem" accessibilityState={{ selected: active }} onPress={() => { if (onSave(item.value)) onClose(); }} style={({ pressed }) => [s.floatingCountryOption, { height: rowHeight, backgroundColor: pressed ? (theme.dark ? "#48484A" : "#E5E5EA") : "transparent" }]}>
                    <View style={s.floatingCountryCheck}>{active && <FlowIcon name="check" size={16} color={theme.dark ? "#FFFFFF" : "#1C1C1E"} />}</View>
                    <Text numberOfLines={2} style={[s.floatingCountryText, { color: theme.dark ? "#FFFFFF" : "#1C1C1E" }]}>{item.label}{dialCode ? " " + dialCode : ""}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      onShow={showSheet}
      onRequestClose={cancel}
      onDismiss={handleDismiss}
    >
      <View style={s.modalRoot}>
        <Animated.View style={[StyleSheet.absoluteFill, {
          backgroundColor: "rgba(0,0,0,0.4)",
          opacity: translateY.interpolate({ inputRange: [0, height], outputRange: [1, 0], extrapolate: "clamp" }),
        }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={c.cancel} disabled={savingSelection} onPress={cancel} style={StyleSheet.absoluteFill} />
        </Animated.View>
      <Animated.View
        style={[
          s.genderSheet,
          {
            backgroundColor: theme.background,
            height: height * 0.82,
            paddingBottom: insets.bottom,
            transform: [{ translateY }],
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.countryModalLayout}
        >
          <View
            style={[
              s.header,
              {
                backgroundColor: theme.background,
                borderBottomColor: theme.border,
              },
            ]}
          >
            <View style={s.iconButton} />
            <Text
              accessibilityRole="header"
              style={[s.title, { color: theme.text }]}
            >
              {title}
            </Text>
            {kind === "nationality" ? <View style={s.iconButton} /> : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={c.cancel}
              onPress={cancel}
              disabled={savingSelection}
              style={s.iconButton}
            >
              <FlowIcon name="close" color={theme.icon} />
            </Pressable>
            )}
          </View>
          <View style={s.countrySearchArea}>
            <TextInput
              accessibilityLabel={c.searchCountry}
              accessibilityHint={
                kind === "phone"
                  ? c.searchCountryPhoneHint
                  : c.searchCountryHint
              }
              placeholder={c.searchCountry}
              placeholderTextColor={theme.muted}
              editable={!savingSelection}
              value={q}
              onChangeText={setQ}
              onFocus={() => setKeyboardVisible(true)}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
              style={[
                s.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            />
          </View>
          {!!selectionError && <Text accessibilityRole="alert" style={{ color: theme.dark ? "#FF8A80" : "#D92D20", fontFamily: appFonts.regular, paddingHorizontal: 20, paddingBottom: 8 }}>{selectionError}</Text>}
          <FlatList
            style={s.countryResults}
            data={shown}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={s.countryResultsContent}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={7}
            renderItem={({ item }) => {
              const phoneOption = PHONE_COUNTRY_OPTIONS.find(
                (option) => option.isoCode === item.value,
              );
              const isoCode =
                kind === "nationality"
                  ? COUNTRY_OPTIONS.find(
                      (option) => option.label === item.value,
                    )?.code
                  : item.value;
              const isSelected = item.value === draftSelection;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label}${kind === "phone" && phoneOption?.dialCode ? `, ${phoneOption.dialCode}` : ""}`}
                  disabled={savingSelection}
                  accessibilityState={{ selected: isSelected, disabled: savingSelection, busy: isSelected && savingSelection }}
                  onPress={() => {
                    Keyboard.dismiss();
                    setDraftSelection(item.value);
                    if (kind === "nationality") void selectNationality(item.value);
                  }}
                  style={[s.countryOption, { borderBottomColor: theme.border }]}
                >
                  <CountryFlag isoCode={isoCode} />
                  <Text
                    style={[
                      s.countryOptionLabel,
                      { color: isSelected ? flowColors.blue : theme.text },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {kind === "phone" && phoneOption?.dialCode ? (
                    <Text style={[s.countryDialCode, { color: theme.muted }]}>
                      {phoneOption.dialCode}
                    </Text>
                  ) : null}
                  {isSelected && savingSelection ? <ActivityIndicator color={flowColors.blue} /> : isSelected ? (
                    <FlowIcon name="check" color={flowColors.blue} size={22} />
                  ) : null}
                </Pressable>
              );
            }}
          />
          {kind !== "nationality" && !keyboardVisible ? (
            <View
              style={[
                s.countryAction,
                {
                  backgroundColor: theme.background,
                  borderTopColor: theme.border,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={c.selectorSave}
                accessibilityState={{
                  disabled: !draftSelection || savingSelection,
                  busy: savingSelection,
                }}
                disabled={!draftSelection || savingSelection}
                onPress={saveSelection}
                style={[
                  s.primary,
                  (!draftSelection || savingSelection) && s.disabled,
                ]}
              >
                {savingSelection ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={s.primaryText}>{c.selectorSave}</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </Animated.View>
      </View>
    </Modal>
  );
}

function CountryFlag({ isoCode }: { isoCode?: string }) {
  const { theme } = useAppTheme();
  const [failed, setFailed] = useState(false);
  const uri = getCountryFlagUri(isoCode);
  useEffect(() => setFailed(false), [uri]);
  return uri && !failed ? (
    <Image
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      source={{ uri }}
      onError={() => setFailed(true)}
      style={s.flag}
    />
  ) : (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[s.flagFallback, { color: theme.text }]}
    >
      {isoCode || "--"}
    </Text>
  );
}

function inputBorderColor(dark: boolean) {
  return dark ? "#75839B" : "#B8C0CC";
}

function Field({
  label,
  value,
  onChange,
  containerStyle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  containerStyle?: object;
}) {
  const { theme } = useAppTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={containerStyle}>
      <Text style={[s.label, { color: theme.muted }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={flowColors.blue}
        style={[
          s.input,
          {
            color: theme.text,
            borderColor: focused
              ? flowColors.blue
              : inputBorderColor(theme.dark),
            backgroundColor: theme.surface,
          },
        ]}
      />
    </View>
  );
}
function SelectButton({
  label,
  value,
  onPress,
  hideLabel = false,
}: {
  label: string;
  value: string;
  onPress: (anchor?: SelectorAnchor) => void;
  hideLabel?: boolean;
}) {
  const { theme } = useAppTheme();
  const trigger = useRef<View>(null);
  return (
    <View style={s.selectField}>
      {hideLabel ? null : (
        <Text style={[s.label, { color: theme.muted }]}>{label}</Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        accessibilityValue={{ text: value }}
        ref={trigger}
        onPress={() => {
          if (trigger.current) trigger.current.measureInWindow((x, y, width, height) => onPress({ x, y, width, height }));
          else onPress();
        }}
        style={[
          s.input,
          s.select,
          {
            borderColor: inputBorderColor(theme.dark),
            backgroundColor: theme.surface,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={{
            color: theme.text,
            flex: 1,
            fontFamily: appFonts.regular,
            fontSize: 16,
          }}
        >
          {value}
        </Text>
        <FlowIcon name="chevron" color={theme.muted} size={16} />
      </Pressable>
    </View>
  );
}
function PhoneControl({
  countryCode,
  localNumber,
  label,
  localLabel,
  onOpenCountry,
  onChangeNumber,
}: {
  countryCode: string;
  localNumber: string;
  label: string;
  localLabel: string;
  onOpenCountry: (anchor?: SelectorAnchor) => void;
  onChangeNumber: (value: string) => void;
}) {
  const { theme } = useAppTheme();
  const trigger = useRef<View>(null);
  const [failed, setFailed] = useState(false);
  const [focused, setFocused] = useState(false);
  const option =
    PHONE_COUNTRY_OPTIONS.find((x) => x.isoCode === countryCode) ||
    PHONE_COUNTRY_OPTIONS[0];
  const uri = getCountryFlagUri(option?.isoCode);
  useEffect(() => setFailed(false), [uri]);
  return (
    <View style={s.phone} testID="personal-details-phone-row">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} country, ${option?.countryName || countryCode}, ${option?.dialCode || ""}`}
        accessibilityValue={{
          text: `${option?.countryName || countryCode} ${option?.dialCode || ""}`,
        }}
        ref={trigger}
        onPress={() => {
          if (trigger.current) trigger.current.measureInWindow((x, y, width, height) => onOpenCountry({ x, y, width, height }));
          else onOpenCountry();
        }}
        style={[
          s.input,
          s.countrySegment,
          {
            borderColor: inputBorderColor(theme.dark),
            backgroundColor: theme.surface,
          },
        ]}
      >
        {uri && !failed ? (
          <Image
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            source={{ uri }}
            onError={() => setFailed(true)}
            style={s.flag}
          />
        ) : (
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[s.flagFallback, { color: theme.text }]}
          >
            {option?.isoCode || "--"}
          </Text>
        )}
        <Text style={{ color: theme.text, fontFamily: appFonts.regular, fontSize: 16 }}>{option?.dialCode}</Text>
        <FlowIcon name="chevron" color={theme.muted} size={14} />
      </Pressable>
      <View
        style={[
          s.input,
          s.phoneInput,
          {
            borderColor: focused ? flowColors.blue : inputBorderColor(theme.dark),
            backgroundColor: theme.surface,
          },
        ]}
      >
        <TextInput
          accessibilityLabel={localLabel}
          accessibilityHint={label}
          keyboardType="phone-pad"
          value={localNumber}
          onChangeText={onChangeNumber}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={flowColors.blue}
          style={[s.localPhoneInput, { color: theme.text }]}
        />
      </View>
    </View>
  );
}

export function PersonalDetailsScreen() {
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailDirty, setEmailDirty] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const sessionExpired = useRef(false);
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { locale } = useMobileLocalization();
  const c = personalDetailsCopy(locale);
  const navigation = useNavigation();
  const mounted = useRef(true),
    submitting = useRef(false),
    selectorVisibleRef = useRef(false),
    successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saved, setSaved] = useState<MobileProfile | null>(null),
    [draft, setDraft] = useState<MobileProfile>({}),
    [dateDraft, setDateDraft] = useState<DateDraft>(() => dateDraftFromValue()),
    [email, setEmail] = useState(""),
    [editing, setEditing] = useState(false),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [selector, setSelector] = useState<
      | "phone"
      | "gender"
      | "nationality"
      | "addressCountry"
      | "day"
      | "month"
      | "year"
      | null
    >(null),
    [selectorVisible, setSelectorVisible] = useState(false);
  const dismissSuccess = useCallback(() => {
    if (successTimer.current) {
      clearTimeout(successTimer.current);
      successTimer.current = null;
    }
    setSuccess("");
  }, []);
  const showSuccess = useCallback(
    (message: string) => {
      if (successTimer.current) clearTimeout(successTimer.current);
      setSuccess(message);
      successTimer.current = setTimeout(() => {
        successTimer.current = null;
        setSuccess("");
      }, 1500);
    },
    [],
  );
  useEffect(
    () => () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    },
    [],
  );
  const [selectorAnchor, setSelectorAnchor] = useState<SelectorAnchor | null>(null);
  const openSelector = (type: Exclude<typeof selector, null>, anchor?: SelectorAnchor) => {
    setSelectorAnchor(anchor ?? null);
    selectorVisibleRef.current = true;
    setSelector(type);
    setSelectorVisible(true);
  };
  const closeSelector = () => {
    selectorVisibleRef.current = false;
    setSelectorVisible(false);
  };
  const finishSelectorDismiss = () => {
    if (!selectorVisibleRef.current) setSelector(null);
  };
  const address = useMemo(
    () => parseAddress(draft.address || ""),
    [draft.address],
  );
  const date = (draft.dateOfBirth || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dirty = !!saved && profilesDiffer(draft, saved);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await travelApi.profile();
      if (!mounted.current) return;
      const next = normalizeProfile(data.profile || {});
      setSaved(next);
      setDraft(next);
      setDateDraft(dateDraftFromValue(next.dateOfBirth));
      setEmail(data.user.email);
      setEditing(false);
    } catch (e) {
      const expired =
        (e instanceof TravelApiError && e.status === 401) ||
        !(await readSession().catch(() => null));
      if (expired) {
        router.replace(signInHref("/personal-information"));
        return;
      }
      if (mounted.current) setError(c.loadFailure);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [c.loadFailure]);
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);
  const resetDateDraft = (profile: MobileProfile | null) =>
    setDateDraft(dateDraftFromValue(profile?.dateOfBirth));
  const discard = useCallback(
    (leave: boolean) => {
      if (emailBusy) return;
      if (!dirty && !emailDirty) {
        setDraft(saved || {});
        resetDateDraft(saved);
        setEditing(false);
        if (leave) router.back();
        return;
      }
      Alert.alert(c.discardTitle, c.discardBody, [
        { text: c.keepEditing, style: "cancel" },
        {
          text: c.discard,
          style: "destructive",
          onPress: () => {
            setDraft(saved || {});
            resetDateDraft(saved);
            setEditing(false);
            if (leave) router.back();
          },
        },
      ]);
    },
    [c, dirty, saved, emailBusy, emailDirty],
  );
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (sessionExpired.current) return;
        if (emailBusy) { event.preventDefault(); return; }
        if (!editing || (!dirty && !emailDirty)) return;
        event.preventDefault();
        Alert.alert(c.discardTitle, c.discardBody, [
          { text: c.keepEditing, style: "cancel" },
          {
            text: c.discard,
            style: "destructive",
            onPress: () => navigation.dispatch(event.data.action),
          },
        ]);
      }),
    [navigation, editing, dirty, emailBusy, emailDirty, c],
  );
  const patch = (key: keyof MobileProfile, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const patchAddress = (key: keyof AddressParts, value: string) =>
    patch("address", serializeAddress({ ...address, [key]: value }));
  const updateDateDraft = (part: keyof DateDraft, value: string) => {
    const next = { ...dateDraft, [part]: value };
    setDateDraft(next);
    if (!next.year || !next.month || !next.day) return;

    const candidate = `${next.year}-${next.month}-${next.day}`;
    const clamped = clampPersonalDetailsDateOfBirth(candidate);
    if (!clamped) {
      patch("dateOfBirth", candidate);
      return;
    }
    if (clamped !== candidate) setDateDraft(dateDraftFromValue(clamped));
    patch("dateOfBirth", clamped);
  };
  const saveNationality = async (value: string) => {
    if (!saved) return false;
    if (value === saved.nationality) {
      setDraft(current => ({ ...current, nationality: value }));
      return true;
    }
    try {
      const result = await travelApi.updateProfile({ nationality: value });
      if (!mounted.current) return false;
      const nationality = normalizeProfile(result.profile).nationality;
      setSaved(current => current ? { ...current, nationality } : current);
      setDraft(current => ({ ...current, nationality }));
      return true;
    } catch { return false; }
  };
  const saveCountrySelection = (
    kind: "phone" | "nationality" | "addressCountry",
    value: string,
  ) => {
    setDraft((current) => {
      if (kind === "phone") {
        return { ...current, phoneCountryCode: value };
      }
      if (kind === "nationality") {
        return { ...current, nationality: value };
      }
      return {
        ...current,
        address: serializeAddress({
          ...parseAddress(current.address || ""),
          countryCode: value,
        }),
      };
    });
    return true;
  };
  const save = async () => {
    if (!saved || !dirty || submitting.current || emailBusy || emailDirty) return;
    if ((draft.fullName || "").trim().length > 120) {
      setError(c.invalidName);
      return;
    }
    const dateOfBirthChanged =
      (draft.dateOfBirth || "") !== (saved.dateOfBirth || "");
    if (
      dateOfBirthChanged &&
      draft.dateOfBirth &&
      !isEligiblePersonalDetailsDateOfBirth(draft.dateOfBirth)
    ) {
      setError(c.invalidDate);
      return;
    }
    submitting.current = true;
    setSaving(true);
    setError("");
    dismissSuccess();
    try {
      const phone = serializePhone(
        draft.phoneCountryCode || "",
        draft.phoneNumber || "",
      );
      const payload = normalizeProfile({ ...draft, ...phone });
      const result = await travelApi.updateProfile(payload);
      if (!mounted.current) return;
      const authoritative = normalizeProfile(result.profile);
      setSaved(authoritative);
      setDraft(authoritative);
      setDateDraft(dateDraftFromValue(authoritative.dateOfBirth));
      await updateStoredSessionName(authoritative.fullName || null);
      setEditing(false);
      showSuccess(c.saveSuccess);
      AccessibilityInfo.announceForAccessibility(c.saveSuccess);
    } catch (e) {
      const expired =
        (e instanceof TravelApiError && e.status === 401) ||
        !(await readSession().catch(() => null));
      if (expired) {
        router.replace(signInHref("/personal-information"));
        return;
      }
      if (mounted.current) {
        setError(c.saveFailure);
        AccessibilityInfo.announceForAccessibility(c.saveFailure);
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const goBack = () => {
    if (emailBusy) return;
    if (emailOpen) { closeEmail(); return; }
    editing ? discard(true) : router.back();
  };
  const beginEditing = () => {
    setEmailOpen(false);
    setEmailDirty(false);
    if (!saved) return;
    setDraft(saved);
    setDateDraft(dateDraftFromValue(saved.dateOfBirth));
    setError("");
    dismissSuccess();
    setEditing(true);
  };
  const handleEmailSessionExpired = () => {
    // A ref bypasses the listener synchronously, before React commits state.
    sessionExpired.current = true;
    setEmailBusy(false);
    router.replace(signInHref("/personal-information"));
  };
  const closeEmail = () => {
    if (emailBusy) return;
    Keyboard.dismiss();
    if (!emailDirty) { setEmailOpen(false); return; }
    Alert.alert(c.discardTitle, c.discardBody, [
      { text: c.keepEditing, style: "cancel" },
      { text: c.discard, style: "destructive", onPress: () => { setEmailDirty(false); setEmailOpen(false); } },
    ]);
  };
  const labels = [
    c.fullName,
    c.email,
    c.phone,
    c.birth,
    c.gender,
    c.nationality,
    c.address,
  ];
  const values = [
    saved?.fullName,
    email,
    displayPhone(saved?.phoneCountryCode || "", saved?.phoneNumber || ""),
    saved?.dateOfBirth ? safeDate(saved.dateOfBirth, locale) : "",
    saved?.gender,
    saved?.nationality,
    displayAddress(saved?.address || ""),
  ];
  const latestBirthYear = Number(personalDetailsLatestDateOfBirth().slice(0, 4));
  const selectOptions =
    selector === "phone"
      ? PHONE_COUNTRY_OPTIONS.map((x) => ({
          label: x.countryName,
          value: x.isoCode,
          searchTerms: [x.isoCode, x.dialCode, x.dialCode.replace("+", "")],
        }))
      : selector === "addressCountry"
        ? COUNTRY_OPTIONS.map((x) => ({
            label: x.label,
            value: x.code,
            searchTerms: [x.code],
          }))
        : selector === "gender"
          ? GENDER_VALUES.map((value, index) => ({
              value,
              label: [c.male, c.female, c.prefer][index],
            }))
          : selector === "nationality"
            ? NATIONALITY_OPTIONS.map((value, index) => ({
                value,
                label: value,
                searchTerms: [COUNTRY_OPTIONS[index].code],
              }))
            : selector === "day"
              ? Array.from({ length: 31 }, (_, i) => ({
                  value: String(i + 1).padStart(2, "0"),
                  label: String(i + 1),
                }))
              : selector === "month"
                ? Array.from({ length: 12 }, (_, i) => ({
                    value: String(i + 1).padStart(2, "0"),
                    label: new Intl.DateTimeFormat(
                      locale === "es-es" ? "es-ES" : "en-US",
                      { month: "long", timeZone: "UTC" },
                    ).format(new Date(Date.UTC(2020, i, 1))),
                  }))
                : selector === "year"
                  ? Array.from({ length: 125 }, (_, i) => ({
                      value: String(latestBirthYear - i),
                      label: String(latestBirthYear - i),
                    }))
                  : [];
  const selected =
    selector === "phone"
      ? draft.phoneCountryCode || ""
      : selector === "addressCountry"
        ? address.countryCode
        : selector === "gender"
          ? draft.gender || ""
          : selector === "nationality"
            ? draft.nationality || ""
            : selector === "day"
              ? dateDraft.day
              : selector === "month"
                ? dateDraft.month
                : selector === "year"
                  ? dateDraft.year
                  : "";
  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[s.safe, { backgroundColor: theme.dark ? theme.background : "#F5F7FB" }]}
    >
      <View
        style={[
          s.header,
          {
            backgroundColor: theme.dark ? theme.background : "#F5F7FB",
            borderBottomColor: theme.border,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={c.back}
          onPress={goBack}
          style={s.iconButton}
        >
          <FlowIcon name="back" color={theme.icon} />
        </Pressable>
        <Text
          accessibilityRole="header"
          style={[s.title, { color: theme.text }]}
        >
          {c.title}
        </Text>
        <View style={s.iconButton} />
      </View>
      {loading && !saved ? (
        <PageContentState state="loading" pageName="personal details" />
      ) : !saved ? (
        <PageContentState state="error" pageName="personal details" onRetry={() => void load()} />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={s.scroll}
          >
            {error ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                style={[s.feedback, { color: "#D92D20" }]}
              >
                {error}
              </Text>
            ) : null}
            {!editing ? (
              <View>
                <Text style={[s.description, { color: theme.muted }]}>
                  {c.description}
                </Text>
                {labels.map((label, index) => {
                  const value = values[index];
                  return (
                    <View
                      key={label}
                      accessible
                      accessibilityLabel={`${label}: ${value || c.missing}`}
                      style={[
                        s.detailRow,
                        index > 0 && {
                          borderTopColor: theme.border,
                          borderTopWidth: StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <Text style={[s.detailLabel, { color: theme.muted }]}>
                        {label}
                      </Text>
                      <Text
                        style={[
                          s.value,
                          { color: value ? theme.text : theme.muted },
                          !value && s.missingValue,
                        ]}
                      >
                        {value || c.missing}
                      </Text>
                    </View>
                  );
                })}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={c.edit}
                  onPress={beginEditing}
                  style={s.readOnlyEdit}
                >
                  <Text style={s.blue}>{c.edit}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={s.formContent}>
                <Text
                  accessibilityRole="header"
                  style={[s.sectionTitle, { color: theme.text }]}
                >
                  {c.basic}
                </Text>
                <Field
                  label={c.fullName}
                  value={draft.fullName || ""}
                  onChange={(v) => patch("fullName", v)}
                />
                <View>
                  <Text style={[s.label, { color: theme.muted }]}>
                    {c.email}
                  </Text>
                  <View style={[s.input, s.emailBox, { borderColor: theme.border, backgroundColor: theme.background }]}>
                    <Text numberOfLines={1} style={[s.emailValue, { color: theme.muted }]}>{email}</Text>
                    {!emailOpen && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={c.changeEmail}
                        onPress={() => { Keyboard.dismiss(); setEmailDirty(false); setEmailOpen(true); }}
                        disabled={emailBusy}
                        accessibilityState={{ expanded: emailOpen, disabled: emailBusy }}
                        style={s.changeEmailHit}
                      >
                        <Pencil size={18} color={theme.dark ? theme.icon : "#000000"} />
                      </Pressable>
                    )}
                  </View>

                </View>
                <View>
                  <Text style={[s.label, { color: theme.muted }]}>
                    {c.phone}
                  </Text>
                  <PhoneControl
                    countryCode={draft.phoneCountryCode || ""}
                    localNumber={draft.phoneNumber || ""}
                    label={c.phone}
                    localLabel={c.localPhone}
                    onOpenCountry={(anchor) => {
                      Keyboard.dismiss();
                      openSelector("phone", anchor);
                    }}
                    onChangeNumber={(v) => patch("phoneNumber", v)}
                  />
                </View>
                <View>
                  <Text style={[s.label, { color: theme.muted }]}>
                    {c.birth}
                  </Text>
                  <View style={[s.date, width < 340 && s.compactGap]}>
                    <View style={s.dayControl}>
                      <SelectButton
                        hideLabel
                        label={c.day}
                        value={dateDraft.day || c.day}
                        onPress={(anchor) => openSelector("day", anchor)}
                      />
                    </View>
                    <View style={s.monthControl}>
                      <SelectButton
                        hideLabel
                        label={c.month}
                        value={dateMonthLabel(dateDraft.month, locale) || c.month}
                        onPress={(anchor) => openSelector("month", anchor)}
                      />
                    </View>
                    <View style={s.yearControl}>
                      <SelectButton
                        hideLabel
                        label={c.year}
                        value={dateDraft.year || c.year}
                        onPress={(anchor) => openSelector("year", anchor)}
                      />
                    </View>
                  </View>
                </View>
                <SelectButton
                  label={c.gender}
                  value={draft.gender || c.select}
                  onPress={() => openSelector("gender")}
                />
                <SelectButton
                  label={c.nationality}
                  value={draft.nationality || c.select}
                  onPress={() => {
                    Keyboard.dismiss();
                    openSelector("nationality");
                  }}
                />
                <View
                  style={[s.sectionDivider, { borderTopColor: theme.border }]}
                />
                <Text
                  accessibilityRole="header"
                  style={[s.sectionTitle, { color: theme.text }]}
                >
                  {c.addressSection}
                </Text>
                <SelectButton
                  label={c.country}
                  value={
                    COUNTRY_OPTIONS.find((x) => x.code === address.countryCode)
                      ?.label || c.select
                  }
                  onPress={(anchor) => {
                    Keyboard.dismiss();
                    openSelector("addressCountry", anchor);
                  }}
                />
                <Field
                  label={c.street}
                  value={address.addressLine1}
                  onChange={(v) => patchAddress("addressLine1", v)}
                />
                <Field
                  label={c.apartment}
                  value={address.apartmentOrSuite}
                  onChange={(v) => patchAddress("apartmentOrSuite", v)}
                />
                <View style={[s.localityRow, width < 340 && s.localityStack]}>
                  <Field
                    containerStyle={s.localityField}
                    label={c.city}
                    value={address.city}
                    onChange={(v) => patchAddress("city", v)}
                  />
                  <Field
                    containerStyle={s.localityField}
                    label={c.state}
                    value={address.stateOrRegion}
                    onChange={(v) => patchAddress("stateOrRegion", v)}
                  />
                </View>
                <Field
                  containerStyle={width >= 340 ? s.postalField : undefined}
                  label={c.postal}
                  value={address.postalCode}
                  onChange={(v) => patchAddress("postalCode", v)}
                />
                <View
                  style={[s.actionDivider, { borderTopColor: theme.border }]}
                />
                <View style={s.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={c.cancel}
                    disabled={emailBusy}
                    onPress={() => discard(false)}
                    style={[s.secondary, { borderColor: theme.border }]}
                  >
                    <Text style={[s.buttonText, { color: theme.text }]}>
                      {c.cancel}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={saving ? c.saving : c.save}
                    accessibilityState={{
                      disabled: !dirty || saving || emailBusy || emailDirty,
                      busy: saving,
                    }}
                    disabled={!dirty || saving || emailBusy || emailDirty}
                    onPress={() => void save()}
                    style={[s.primary, (!dirty || saving || emailBusy || emailDirty) && s.disabled]}
                  >
                    <Text style={s.primaryText}>
                      {saving ? c.saving : c.save}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
      <Modal visible={emailOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={closeEmail}>
        <View style={[s.safe, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
          <View style={[s.header, { borderBottomColor: theme.border }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={c.back} onPress={closeEmail} disabled={emailBusy} style={s.iconButton}>
              <FlowIcon name="back" color={theme.icon} />
            </Pressable>
            <Text accessibilityRole="header" style={[s.title, { color: theme.text }]}>{c.email}</Text>
            <View style={s.iconButton} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.emailScroll}>
              {emailOpen && <PersonalDetailsEmailEditor onSessionExpired={handleEmailSessionExpired} email={email} onDirtyChange={setEmailDirty} onBusyChange={setEmailBusy} onSaved={(nextEmail) => { setEmail(nextEmail); setEmailDirty(false); setEmailOpen(false); }} />}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {success ? (
        <View
          accessible={false}
          pointerEvents="none"
          testID="personal-details-success-toast"
          style={[
            s.toastPosition,
            {
              bottom: insets.bottom + 16,
            },
          ]}
        >
          <View
            style={[
              s.toast,
              { backgroundColor: theme.dark ? "#163B2A" : "#E9F8EF" },
            ]}
          >
            <FlowIcon
              name="check"
              color={theme.dark ? "#86E3A7" : "#16803C"}
              size={18}
            />
            <Text
              style={[
                s.toastText,
                { color: theme.dark ? "#C6F6D5" : "#126B34" },
              ]}
            >
              {success}
            </Text>
          </View>
        </View>
      ) : null}
      <Selector
        anchor={selectorAnchor}
        visible={
          selectorVisible &&
          !!selector &&
          selector !== "phone" &&
          selector !== "nationality" &&
          selector !== "addressCountry"
        }
        selectorType={selector}
        title={
          selector
            ? {
                phone: c.country,
                gender: c.gender,
                nationality: c.nationality,
                addressCountry: c.country,
                day: c.day,
                month: c.month,
                year: c.year,
              }[selector]
            : ""
        }
        options={selectOptions}
        selected={selected}
        searchable={
          selector === "phone" ||
          selector === "nationality" ||
          selector === "addressCountry"
        }
        onClose={closeSelector}
        onSelect={(value) => {
          if (selector === "phone") patch("phoneCountryCode", value);
          else if (selector === "gender") patch("gender", value);
          else if (selector === "nationality") patch("nationality", value);
          else if (selector === "addressCountry")
            patchAddress("countryCode", value);
          else if (selector === "year") updateDateDraft("year", value);
          else if (selector === "month") updateDateDraft("month", value);
          else if (selector === "day") updateDateDraft("day", value);
        }}
        onDismiss={finishSelectorDismiss}
      />
      <CountrySelector
        anchor={selectorAnchor}
        visible={
          selectorVisible &&
          (selector === "phone" ||
            selector === "nationality" ||
            selector === "addressCountry")
        }
        selectorType={selector}
        kind={
          selector === "nationality"
            ? "nationality"
            : selector === "addressCountry"
              ? "addressCountry"
              : "phone"
        }
        title={
          selector === "nationality"
            ? c.nationality
            : selector === "phone" || selector === "addressCountry"
              ? c.country
              : ""
        }
        options={selectOptions}
        selected={selected}
        onClose={closeSelector}
        onAutoSave={saveNationality}
        onSave={(value) => {
          const kind =
            selector === "nationality"
              ? "nationality"
              : selector === "addressCountry"
                ? "addressCountry"
                : "phone";
          return saveCountrySelection(kind, value);
        }}
        onDismiss={finishSelectorDismiss}
      />
    </SafeAreaView>
  );
}
function safeDate(value: string, locale: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const valid = canonicalDate(match[1], match[2], match[3]);
  return valid
    ? new Intl.DateTimeFormat(locale === "es-es" ? "es-ES" : "en-US", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(`${valid}T00:00:00Z`))
    : value;
}
const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  iconButton: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  scroll: { padding: 16, paddingBottom: 40 },
  emailScroll: { flexGrow: 1, padding: 16, paddingBottom: 16 },
  description: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  detailRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 3 },
  detailLabel: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: appFonts.semibold,
    marginBottom: 5,
  },
  value: { fontSize: 16, lineHeight: 23, fontWeight: "500" },
  missingValue: { fontWeight: "400" },
  readOnlyEdit: {
    minHeight: 44,
    alignSelf: "flex-end",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: flowColors.blue,
    borderRadius: 9,
    paddingHorizontal: 18,
    marginHorizontal: 16,
    marginTop: 8,
  },
  blue: { color: flowColors.blue, fontWeight: "800" },
  formContent: { gap: 20 },
  sectionTitle: { fontSize: 17, lineHeight: 23, fontWeight: "800" },
  addressDescription: { fontSize: 14, lineHeight: 20, marginBottom: 2 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: appFonts.regular,
    letterSpacing: 0,
  },
  phone: { height: 50, flexDirection: "row", alignItems: "stretch" },
  countrySegment: {
    flexShrink: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 8,
  },
  flag: { width: 22, height: 15 },
  flagFallback: {
    width: 28,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
  },
  phoneInput: {
    minWidth: 0,
    flex: 1,
    marginLeft: -1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  localPhoneInput: {
    minWidth: 0,
    flex: 1,
    height: 48,
    padding: 0,
    fontSize: 16,
    fontFamily: appFonts.regular,
    letterSpacing: 0,
  },
  date: { flexDirection: "row", gap: 8 },
  compactGap: { gap: 4 },
  dayControl: { flex: 3 },
  monthControl: { flex: 6 },
  yearControl: { flex: 4 },
  selectField: { flex: 1 },
  select: { flexDirection: "row", alignItems: "center", gap: 6 },
  emailBox: { flexDirection: "row", alignItems: "center", paddingRight: 2 },
  emailValue: { flex: 1, fontFamily: appFonts.regular, fontSize: 16 },
  changeEmailHit: { width: 44, minHeight: 44, justifyContent: "center", alignItems: "center" },
  linkHit: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  sectionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    marginBottom: 4,
  },
  localityRow: { flexDirection: "row", gap: 10 },
  localityStack: { flexDirection: "column", gap: 12 },
  localityField: { flex: 1, minWidth: 0 },
  postalField: { width: "50%" },
  actionDivider: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 2,
    flexWrap: "wrap",
  },
  primary: {
    minHeight: 48,
    minWidth: 142,
    borderRadius: 10,
    backgroundColor: flowColors.blue,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  secondary: {
    minHeight: 48,
    minWidth: 94,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  buttonText: { fontWeight: "800" },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.45 },
  feedback: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  toastPosition: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 10,
  },
  toast: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  toastText: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
  floatingCountryMenu: { position: "absolute", borderRadius: 24, overflow: "hidden", shadowColor: "#000000", shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  floatingCountryOption: { flexDirection: "row", alignItems: "center", paddingRight: 12 },
  floatingCountryCheck: { width: 32, alignItems: "center" },
  floatingCountryText: { flex: 1, fontSize: 16, lineHeight: 20 },
  genderSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden" },
  genderTitle: { textAlign: "center", fontFamily: appFonts.semibold, fontSize: 18, lineHeight: 26, paddingVertical: 18 },
  genderOptions: { paddingHorizontal: 20, paddingBottom: 12 },
  genderOption: { minHeight: 56, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  genderOptionText: { flex: 1, fontFamily: appFonts.regular, fontSize: 16, lineHeight: 24 },
  genderRadio: { width: 22, height: 22, borderWidth: 1.5, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  genderRadioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: flowColors.blue },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    maxHeight: "82%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    gap: 10,
  },
  option: {
    minHeight: 50,
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalCancel: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  countryModalSafe: { flex: 1 },
  countryModalLayout: { flex: 1 },
  countrySearchArea: { paddingHorizontal: 16, paddingVertical: 12 },
  countryResults: { flex: 1 },
  countryResultsContent: { paddingHorizontal: 16 },
  countryOption: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  countryOptionLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "500",
  },
  countryDialCode: { fontSize: 16, lineHeight: 23 },
  countryAction: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
});
