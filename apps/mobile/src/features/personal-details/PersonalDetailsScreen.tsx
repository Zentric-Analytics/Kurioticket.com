import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  InputAccessoryView,
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
import {
  travelApi,
  TravelApiError,
  type MobileProfile,
} from "../../api/travelApi";
import { getApiBaseUrl } from "../../config/apiUrl";
import { useMobileLocalization } from "../../localization/MobileLocalization";
import {
  readSession,
  updateStoredSessionName,
} from "../../storage/sessionStorage";
import { useAppTheme } from "../../theme/AppTheme";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";
import { openSafeExternalUrl } from "../profile/safeExternalLink";
import {
  canonicalDate,
  COUNTRY_OPTIONS,
  displayAddress,
  EMPTY_ADDRESS,
  filterSelectorOptions,
  GENDER_VALUES,
  getCountryFlagUri,
  NATIONALITY_OPTIONS,
  normalizeProfile,
  parseAddress,
  PHONE_COUNTRY_OPTIONS,
  profilesDiffer,
  serializeAddress,
  serializePhone,
  type AddressParts,
  type PersonalDetailsSelectorOption,
} from "./personalDetailsModel";
import { personalDetailsCopy } from "./translations";

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
}: SelectorProps) {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const c = personalDetailsCopy(locale);
  const [q, setQ] = useState("");
  const { height } = useWindowDimensions();
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

type CountrySelectorProps = Omit<SelectorProps, "searchable" | "onSelect"> & {
  kind: "phone" | "nationality" | "addressCountry";
  onSave: (value: string) => Promise<boolean>;
};

const COUNTRY_SEARCH_ACCESSORY = "personal-details-country-search-accessory";

/** Full-screen country picker. Draft state intentionally lives inside the modal. */
function CountrySelector({
  visible,
  title,
  selectorType,
  kind,
  options,
  selected,
  onClose,
  onSave,
  onDismiss,
}: CountrySelectorProps) {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const c = personalDetailsCopy(locale);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [q, setQ] = useState("");
  const [draftSelection, setDraftSelection] = useState(selected);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);
  const committing = useRef(false);
  const visibleRef = useRef(visible);
  const translateX = useRef(new Animated.Value(width)).current;
  const shown = filterSelectorOptions(options, q);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  useEffect(() => {
    if (!visible) return;
    setQ("");
    setDraftSelection(selected);
    committing.current = false;
    setSavingSelection(false);
    setKeyboardVisible(false);
    Keyboard.dismiss();
    translateX.stopAnimation();
    translateX.setValue(width);
    Animated.timing(translateX, {
      toValue: 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [selected, selectorType, translateX, visible, width]);

  const closeWithPushAnimation = (afterClose: () => void) => {
    Keyboard.dismiss();
    translateX.stopAnimation();
    Animated.timing(translateX, {
      toValue: width,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) afterClose();
    });
  };
  const cancel = () => {
    if (savingSelection) return;
    closeWithPushAnimation(onClose);
  };
  const saveSelection = async () => {
    if (committing.current || !draftSelection) return;
    committing.current = true;
    setSavingSelection(true);
    Keyboard.dismiss();
    const savedSelection = await onSave(draftSelection);
    if (!savedSelection) {
      committing.current = false;
      setSavingSelection(false);
      return;
    }
    closeWithPushAnimation(onClose);
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      onRequestClose={cancel}
      onDismiss={handleDismiss}
    >
      <Animated.View
        style={[
          s.countryModalSafe,
          {
            backgroundColor: theme.background,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            transform: [{ translateX }],
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={c.back}
              onPress={cancel}
              disabled={savingSelection}
              style={s.iconButton}
            >
              <FlowIcon name="back" color={theme.icon} />
            </Pressable>
            <Text
              accessibilityRole="header"
              style={[s.title, { color: theme.text }]}
            >
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={c.cancel}
              onPress={cancel}
              disabled={savingSelection}
              style={s.iconButton}
            >
              <FlowIcon name="close" color={theme.icon} />
            </Pressable>
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
              value={q}
              onChangeText={setQ}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
              inputAccessoryViewID={
                Platform.OS === "ios" ? COUNTRY_SEARCH_ACCESSORY : undefined
              }
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
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    Keyboard.dismiss();
                    setDraftSelection(item.value);
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
                  {isSelected ? (
                    <FlowIcon name="check" color={flowColors.blue} size={22} />
                  ) : null}
                </Pressable>
              );
            }}
          />
          {!keyboardVisible ? (
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
                onPress={() => void saveSelection()}
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
        {Platform.OS === "ios" ? (
          <InputAccessoryView nativeID={COUNTRY_SEARCH_ACCESSORY}>
            <View
              style={[
                s.keyboardAccessory,
                {
                  backgroundColor: theme.surface,
                  borderTopColor: theme.border,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={c.done}
                onPress={Keyboard.dismiss}
                style={s.keyboardDone}
              >
                <Text style={s.blue}>{c.done}</Text>
              </Pressable>
            </View>
          </InputAccessoryView>
        ) : null}
      </Animated.View>
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
  return (
    <View style={containerStyle}>
      <Text style={[s.label, { color: theme.muted }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
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
  onPress: () => void;
  hideLabel?: boolean;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={s.selectField}>
      {hideLabel ? null : (
        <Text style={[s.label, { color: theme.muted }]}>{label}</Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        accessibilityValue={{ text: value }}
        onPress={onPress}
        style={[
          s.input,
          s.select,
          { borderColor: theme.border, backgroundColor: theme.background },
        ]}
      >
        <Text numberOfLines={1} style={{ color: theme.text, flex: 1 }}>
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
  onOpenCountry: () => void;
  onChangeNumber: (value: string) => void;
}) {
  const { theme } = useAppTheme();
  const [failed, setFailed] = useState(false);
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
        onPress={onOpenCountry}
        style={[
          s.input,
          s.countrySegment,
          { borderColor: theme.border, backgroundColor: theme.background },
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
        <FlowIcon name="chevron" color={theme.muted} size={16} />
      </Pressable>
      <View
        style={[
          s.input,
          s.phoneInput,
          { borderColor: theme.border, backgroundColor: theme.background },
        ]}
      >
        <Text style={{ color: theme.text }}>{option?.dialCode}</Text>
        <TextInput
          accessibilityLabel={localLabel}
          accessibilityHint={label}
          keyboardType="phone-pad"
          value={localNumber}
          onChangeText={onChangeNumber}
          style={[s.localPhoneInput, { color: theme.text }]}
        />
      </View>
    </View>
  );
}

export function PersonalDetailsScreen() {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const { locale } = useMobileLocalization();
  const c = personalDetailsCopy(locale);
  const navigation = useNavigation();
  const mounted = useRef(true),
    submitting = useRef(false),
    selectorVisibleRef = useRef(false);
  const [saved, setSaved] = useState<MobileProfile | null>(null),
    [draft, setDraft] = useState<MobileProfile>({}),
    [dateDraft, setDateDraft] = useState<DateDraft>(() => dateDraftFromValue()),
    [email, setEmail] = useState(""),
    [editing, setEditing] = useState(false),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("") ,
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
  const openSelector = (type: Exclude<typeof selector, null>) => {
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
        router.replace({
          pathname: "/(tabs)/profile/sign-in",
          params: { returnTo: "/personal-information" },
        });
        return;
      }
      if (mounted.current) setError(c.loadFailure);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [c.loadFailure]);
  useEffect(() => {
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);
  const resetDateDraft = (profile: MobileProfile | null) =>
    setDateDraft(dateDraftFromValue(profile?.dateOfBirth));
  const discard = useCallback(
    (leave: boolean) => {
      if (!dirty) {
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
    [c, dirty, saved],
  );
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (!editing || !dirty) return;
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
    [navigation, editing, dirty, c],
  );
  const patch = (key: keyof MobileProfile, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const patchAddress = (key: keyof AddressParts, value: string) =>
    patch("address", serializeAddress({ ...address, [key]: value }));
  const updateDateDraft = (part: keyof DateDraft, value: string) => {
    const next = { ...dateDraft, [part]: value };
    setDateDraft(next);
    if (next.year && next.month && next.day) {
      patch("dateOfBirth", `${next.year}-${next.month}-${next.day}`);
    }
  };
  const saveCountrySelection = async (
    kind: "phone" | "nationality" | "addressCountry",
    value: string,
  ) => {
    if (!saved) return false;
    setError("");
    setSuccess("");
    try {
      const payload: MobileProfile =
        kind === "phone"
          ? { phoneCountryCode: value }
          : kind === "nationality"
            ? { nationality: value }
            : {
                address: serializeAddress({
                  ...parseAddress(saved.address || ""),
                  countryCode: value,
                }),
              };
      const result = await travelApi.updateProfile(payload);
      if (!mounted.current) return false;
      const authoritative = normalizeProfile(result.profile);
      setSaved(authoritative);
      setDraft((current) => {
        if (kind === "phone") {
          return {
            ...current,
            phoneCountryCode: authoritative.phoneCountryCode || value,
          };
        }
        if (kind === "nationality") {
          return {
            ...current,
            nationality: authoritative.nationality || value,
          };
        }
        return {
          ...current,
          address: serializeAddress({
            ...parseAddress(current.address || ""),
            countryCode: value,
          }),
        };
      });
      setSuccess(c.saveSuccess);
      AccessibilityInfo.announceForAccessibility(c.saveSuccess);
      return true;
    } catch {
      if (mounted.current) {
        setError(c.saveFailure);
        AccessibilityInfo.announceForAccessibility(c.saveFailure);
      }
      return false;
    }
  };
  const save = async () => {
    if (!saved || !dirty || submitting.current) return;
    if ((draft.fullName || "").trim().length > 120) {
      setError(c.invalidName);
      return;
    }
    if (
      draft.dateOfBirth &&
      !canonicalDate(date?.[1] || "", date?.[2] || "", date?.[3] || "")
    ) {
      setError(c.invalidDate);
      return;
    }
    submitting.current = true;
    setSaving(true);
    setError("");
    setSuccess("");
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
      setSuccess(c.saveSuccess);
      AccessibilityInfo.announceForAccessibility(c.saveSuccess);
    } catch {
      if (mounted.current) {
        setError(c.saveFailure);
        AccessibilityInfo.announceForAccessibility(c.saveFailure);
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const goBack = () => (editing ? discard(true) : router.back());
  const openWeb = async () => {
    const base = getApiBaseUrl(Platform.OS, __DEV__);
    if (
      !base.ok ||
      !(await openSafeExternalUrl(
        new URL("/dashboard", `${base.baseUrl}/`).toString(),
      ))
    ) {
      setError(c.openFailure);
      AccessibilityInfo.announceForAccessibility(c.openFailure);
    }
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
    saved?.phoneNumber,
    saved?.dateOfBirth ? safeDate(saved.dateOfBirth, locale) : "",
    saved?.gender,
    saved?.nationality,
    displayAddress(saved?.address || ""),
  ];
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
                      value: String(new Date().getUTCFullYear() - i),
                      label: String(new Date().getUTCFullYear() - i),
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
      style={[s.safe, { backgroundColor: theme.background }]}
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
        <View style={s.center}>
          <ActivityIndicator color={flowColors.blue} />
          <Text style={{ color: theme.muted }}>{c.loading}</Text>
        </View>
      ) : !saved ? (
        <View style={s.center}>
          <Text accessibilityRole="alert" style={{ color: theme.text }}>
            {error || c.loadFailure}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void load()}
            style={s.primary}
          >
            <Text style={s.primaryText}>{c.retry}</Text>
          </Pressable>
        </View>
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
            {success ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={[s.feedback, { color: "#16803C" }]}
              >
                {success}
              </Text>
            ) : null}
            {!editing ? (
              <View>
                <Text style={[s.description, { color: theme.muted }]}> 
                  {c.description}
                </Text>
                {labels.map((label, index) => (
                  <View
                    key={label}
                    accessible
                    accessibilityLabel={`${label}: ${values[index] || c.missing}`}
                    style={[
                      s.detailRow,
                      index > 0 && {
                        borderTopColor: theme.border,
                        borderTopWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <Text style={[s.label, { color: theme.muted }]}> 
                      {label}
                    </Text>
                    <Text style={[s.value, { color: theme.text }]}> 
                      {values[index] || c.missing}
                    </Text>
                  </View>
                ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={c.edit}
                  onPress={() => {
                    setDraft(saved);
                    setDateDraft(dateDraftFromValue(saved.dateOfBirth));
                    setError("");
                    setSuccess("");
                    setEditing(true);
                  }}
                  style={s.edit}
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
                <Text style={[s.label, { color: theme.muted }]}>{c.email}</Text>
                <TextInput
                  editable={false}
                  accessibilityLabel={`${c.email}, ${email}`}
                  value={email}
                  style={[
                    s.input,
                    {
                      color: theme.muted,
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                    },
                  ]}
                />
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={c.changeEmail}
                  accessibilityHint={c.externalHint}
                  onPress={() => void openWeb()}
                  style={s.linkHit}
                >
                  <Text style={s.blue}>{c.changeEmail}</Text>
                </Pressable>
                <Text style={[s.label, { color: theme.muted }]}>{c.phone}</Text>
                <PhoneControl
                  countryCode={draft.phoneCountryCode || ""}
                  localNumber={draft.phoneNumber || ""}
                  label={c.phone}
                  localLabel={c.localPhone}
                  onOpenCountry={() => {
                    Keyboard.dismiss();
                    openSelector("phone");
                  }}
                  onChangeNumber={(v) => patch("phoneNumber", v)}
                />
                <Text style={[s.label, { color: theme.muted }]}>{c.birth}</Text>
                <View style={[s.date, width < 340 && s.compactGap]}>
                  <View style={s.dayControl}>
                    <SelectButton
                      hideLabel
                      label={c.day}
                      value={dateDraft.day || c.day}
                      onPress={() => openSelector("day")}
                    />
                  </View>
                  <View style={s.monthControl}>
                    <SelectButton
                      hideLabel
                      label={c.month}
                      value={dateMonthLabel(dateDraft.month, locale) || c.month}
                      onPress={() => openSelector("month")}
                    />
                  </View>
                  <View style={s.yearControl}>
                    <SelectButton
                      hideLabel
                      label={c.year}
                      value={dateDraft.year || c.year}
                      onPress={() => openSelector("year")}
                    />
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
                <Text style={[s.addressDescription, { color: theme.muted }]}> 
                  {c.addressDescription}
                </Text>
                <SelectButton
                  label={c.country}
                  value={
                    COUNTRY_OPTIONS.find((x) => x.code === address.countryCode)
                      ?.label || c.select
                  }
                  onPress={() => {
                    Keyboard.dismiss();
                    openSelector("addressCountry");
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
                      disabled: !dirty || saving,
                      busy: saving,
                    }}
                    disabled={!dirty || saving}
                    onPress={() => void save()}
                    style={[s.primary, (!dirty || saving) && s.disabled]}
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
      <Selector
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
  description: { fontSize: 14, lineHeight: 20, padding: 16, paddingBottom: 10 },
  detailRow: { paddingHorizontal: 16, paddingVertical: 13, gap: 4 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "700", marginBottom: 5 },
  value: { fontSize: 16, lineHeight: 23 },
  edit: {
    minHeight: 44,
    alignSelf: "flex-end",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: flowColors.blue,
    borderRadius: 9,
    paddingHorizontal: 18,
    margin: 16,
  },
  blue: { color: flowColors.blue, fontWeight: "800" },
  formContent: { gap: 12 },
  sectionTitle: { fontSize: 17, lineHeight: 23, fontWeight: "800" },
  addressDescription: { fontSize: 14, lineHeight: 20, marginBottom: 2 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  phone: { height: 50, flexDirection: "row", alignItems: "stretch" },
  countrySegment: {
    width: 82,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  flag: { width: 28, height: 19 },
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
  },
  date: { flexDirection: "row", gap: 8 },
  compactGap: { gap: 4 },
  dayControl: { flex: 3 },
  monthControl: { flex: 6 },
  yearControl: { flex: 4 },
  selectField: { flex: 1 },
  select: { flexDirection: "row", alignItems: "center", gap: 6 },
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
  keyboardAccessory: {
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  keyboardDone: {
    minWidth: 64,
    minHeight: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
