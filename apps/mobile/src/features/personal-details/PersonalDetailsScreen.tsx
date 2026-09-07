import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  BackHandler,
  type TextInputProps,
  Alert,
  Animated,
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
import {
  travelApi,
  TravelApiError,
  type MobileProfile,
} from "../../api/travelApi";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import {
  readSession,
  updateStoredSessionName,
} from "../../storage/sessionStorage";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";
import {
  canonicalDate,
  COUNTRY_OPTIONS,
  displayAddress,
  displayPhone,
  filterSelectorOptions,
  GENDER_VALUES,
  getCountryFlagUri,
  isEligiblePersonalDetailsDateOfBirth,
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
import {
  dateDraftFromValue,
  dateDraftValue,
  normalizeBirthDate,
  splitProfileName,
  joinProfileName,
  missingAddressFields,
  type NameDraft,
} from "./personalDetailsEditorModel";
import {
  PersonalDetailsQuickEditor,
  type DateDraft,
  type QuickDetail,
} from "./PersonalDetailsQuickEditor";
import { PersonalDetailsCountryFlag } from "./PersonalDetailsCountryFlag";
import { PersonalDetailsSaveButton } from "./PersonalDetailsSaveButton";
import { PersonalDetailsEmailEditor } from "./PersonalDetailsEmailEditor";
import { signInHref } from "../auth/signInIntent";
import { PageContentState } from "../../components/PageContentState";

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
type CountrySelectorProps = Omit<SelectorProps, "searchable" | "onSelect"> & {
  kind: "phone" | "nationality" | "addressCountry";
  onSave: (value: string) => boolean;
};

/** A country choice returns to the editor; main Save persists the draft. */
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
  const [savingSelection, setSavingSelection] = useState(false);
  const committing = useRef(false);
  const visibleRef = useRef(visible);
  const wasVisibleRef = useRef(false);
  const translateX = useRef(new Animated.Value(width)).current;
  const shown = filterSelectorOptions(options, q);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);
  useEffect(() => {
    const isOpening = visible && !wasVisibleRef.current;
    wasVisibleRef.current = visible;
    if (!isOpening) return;
    setQ("");
    setDraftSelection(selected);
    committing.current = false;
    setSavingSelection(false);
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
  const saveSelection = (value: string) => {
    if (committing.current || !value) return;
    setDraftSelection(value);
    committing.current = true;
    setSavingSelection(true);
    Keyboard.dismiss();
    const savedSelection = onSave(value);
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
            {kind === "addressCountry" ? (
              <View style={s.iconButton} />
            ) : (
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
              value={q}
              onChangeText={setQ}
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
                    saveSelection(item.value);
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
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

function CountryFlag({ isoCode }: { isoCode?: string }) {
  return <PersonalDetailsCountryFlag isoCode={isoCode} />;
}

function inputBorderColor(dark: boolean) {
  return dark ? "#75839B" : "#818A99";
}

function Field({
  label,
  value,
  onChange,
  containerStyle,
  inputRef,
  ...inputProps
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  containerStyle?: object;
  inputRef?: React.Ref<TextInput>;
} & Omit<TextInputProps, "value" | "onChangeText" | "onChange">) {
  const { theme } = useAppTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={containerStyle}>
      <Text style={[s.label, { color: theme.muted }]}>{label}</Text>
      <TextInput
        {...inputProps}
        ref={inputRef}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={flowColors.blue}
        returnKeyType={inputProps.returnKeyType || "done"}
        onSubmitEditing={inputProps.onSubmitEditing || Keyboard.dismiss}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        style={[
          s.input,
          {
            color: theme.text,
            borderColor: focused
              ? flowColors.blue
              : inputBorderColor(theme.dark),
            borderWidth: 1,
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
  onOpenCountry: () => void;
  onChangeNumber: (value: string) => void;
}) {
  const { theme } = useAppTheme();
  const [focused, setFocused] = useState(false);
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
        <FlowIcon name="chevron" color={theme.muted} size={16} />
      </Pressable>
      <View
        style={[
          s.input,
          s.phoneInput,
          {
            borderColor: focused
              ? flowColors.blue
              : inputBorderColor(theme.dark),
            borderWidth: 1,
            backgroundColor: theme.surface,
          },
        ]}
      >
        <Text
          style={{
            color: theme.text,
            fontFamily: appFonts.regular,
            fontSize: 16,
          }}
        >
          {option?.dialCode}
        </Text>
        <TextInput
          accessibilityLabel={localLabel}
          accessibilityHint={label}
          keyboardType="phone-pad"
          autoComplete="tel-national"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          value={localNumber}
          onChangeText={onChangeNumber}
          style={[s.localPhoneInput, { color: theme.text }]}
        />
      </View>
    </View>
  );
}

type DetailKey =
  | "fullName"
  | "email"
  | "phone"
  | "birth"
  | "gender"
  | "nationality"
  | "address";

export function PersonalDetailsScreen() {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const { locale } = useMobileLocalization();
  const c = personalDetailsCopy(locale);
  const navigation = useNavigation();
  const [activeDetail, setActiveDetail] = useState<DetailKey>("fullName");
  const scrollRef = useRef<ScrollView>(null);
  const overviewOffset = useRef(0);
  const profileUserId = useRef<string | undefined>(undefined);
  const [emailDirty, setEmailDirty] = useState(false);
  const lastNameRef = useRef<TextInput>(null);
  const [nameDraft, setNameDraft] = useState<NameDraft>(() =>
    splitProfileName(),
  );
  const dateDraftRef = useRef<DateDraft>(dateDraftFromValue());
  const apartmentRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const stateRef = useRef<TextInput>(null);
  const postalRef = useRef<TextInput>(null);
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
    [selector, setSelector] = useState<"phone" | "addressCountry" | null>(null),
    [selectorVisible, setSelectorVisible] = useState(false);
  dateDraftRef.current = dateDraft;
  const quickDetail: QuickDetail | null =
    editing &&
    (activeDetail === "gender" ||
      activeDetail === "nationality" ||
      activeDetail === "birth")
      ? activeDetail
      : null;
  const pageEditing = editing && !quickDetail;
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
  const savedDateDraft = dateDraftFromValue(saved?.dateOfBirth);
  const dateDirty =
    editing &&
    activeDetail === "birth" &&
    (dateDraft.year !== savedDateDraft.year ||
      dateDraft.month !== savedDateDraft.month ||
      dateDraft.day !== savedDateDraft.day);
  const dirty =
    !!saved && (profilesDiffer(draft, saved) || dateDirty || emailDirty);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await travelApi.profile();
      if (!mounted.current) return;
      const next = normalizeProfile(data.profile || {});
      setSaved(next);
      setDraft(next);
      setNameDraft(splitProfileName(next.fullName));
      setDateDraft(dateDraftFromValue(next.dateOfBirth));
      profileUserId.current = data.user.id;
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
      if (submitting.current) return;
      Keyboard.dismiss();
      setError("");
      if (!dirty) {
        setDraft(saved || {});
        setNameDraft(splitProfileName(saved?.fullName));
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
            setNameDraft(splitProfileName(saved?.fullName));
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
        if (submitting.current) {
          event.preventDefault();
          return;
        }
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
  const patch = (key: keyof MobileProfile, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  };
  const patchAddress = (key: keyof AddressParts, value: string) =>
    patch("address", serializeAddress({ ...address, [key]: value }));
  const patchName = (part: keyof NameDraft, value: string) => {
    const next = { ...nameDraft, [part]: value };
    setNameDraft(next);
    patch("fullName", joinProfileName(next));
    setError("");
  };
  const updateDateDraft = (part: keyof DateDraft, value: string) => {
    const next = normalizeBirthDate({ ...dateDraftRef.current, [part]: value });
    dateDraftRef.current = next;
    setDateDraft(next);
    patch("dateOfBirth", dateDraftValue(next));
    setError("");
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
    if (!saved || !dirty || submitting.current) return;
    if (dateDirty && (!dateDraft.year || !dateDraft.month || !dateDraft.day)) {
      setError(c.invalidDate);
      return;
    }
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
    if (activeDetail === "address") {
      const labels = {
        countryCode: c.country,
        addressLine1: c.street,
        apartmentOrSuite: c.apartment,
        city: c.city,
        stateOrRegion: c.state,
      };
      const missing = missingAddressFields(address);
      if (missing.length) {
        const message =
          c.requiredAddressFields +
          " " +
          missing.map((key) => labels[key]).join(", ") +
          ".";
        setError(message);
        AccessibilityInfo.announceForAccessibility(message);
        return;
      }
    }
    submitting.current = true;
    Keyboard.dismiss();
    setSaving(true);
    setError("");
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
      setNameDraft(splitProfileName(authoritative.fullName));
      setDateDraft(dateDraftFromValue(authoritative.dateOfBirth));
      // A cache write failure must not turn a successful server save into an error.
      await updateStoredSessionName(
        authoritative.fullName || null,
        profileUserId.current,
      ).catch(() => {});
      Keyboard.dismiss();
      setEditing(false);
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
  const goBack = () => (editing ? discard(false) : router.back());
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!editing) return false;
        discard(false);
        return true;
      },
    );
    return () => subscription.remove();
  }, [editing, discard]);
  const beginEditing = (detail: DetailKey) => {
    if (!saved) return;
    setActiveDetail(detail);
    setEmailDirty(false);
    setNameDraft(splitProfileName(saved.fullName));
    const nextDate =
      detail === "birth"
        ? normalizeBirthDate(dateDraftFromValue(saved.dateOfBirth))
        : dateDraftFromValue(saved.dateOfBirth);
    dateDraftRef.current = nextDate;
    setDraft(
      detail === "birth"
        ? { ...saved, dateOfBirth: dateDraftValue(nextDate) }
        : saved,
    );
    setDateDraft(nextDate);
    setError("");
    setEditing(true);
  };
  const displayedBirthDate = useMemo(
    () => (saved?.dateOfBirth ? safeDate(saved.dateOfBirth, locale) : ""),
    [saved?.dateOfBirth, locale],
  );
  const details = {
    fullName: { label: c.fullName, value: saved?.fullName },
    email: { label: c.email, value: email },
    phone: {
      label: c.phone,
      value: displayPhone(
        saved?.phoneCountryCode || "",
        saved?.phoneNumber || "",
      ),
    },
    birth: {
      label: c.birth,
      value: displayedBirthDate,
    },
    gender: {
      label: c.gender,
      value: saved?.gender
        ? [c.male, c.female, c.prefer][
            GENDER_VALUES.findIndex((value) => value === saved.gender)
          ] || saved.gender
        : "",
    },
    nationality: { label: c.nationality, value: saved?.nationality },
    address: { label: c.address, value: displayAddress(saved?.address || "") },
  };
  const detailOrder: DetailKey[] = [
    "fullName",
    "email",
    "phone",
    "birth",
    "gender",
    "nationality",
    "address",
  ];
  const selectOptions =
    selector === "phone"
      ? PHONE_COUNTRY_OPTIONS.map((x) => ({
          label: x.countryName,
          value: x.isoCode,
          searchTerms: [x.isoCode, x.dialCode, x.dialCode.replace("+", "")],
        }))
      : COUNTRY_OPTIONS.map((x) => ({
          label: x.label,
          value: x.code,
          searchTerms: [x.code],
        }));
  const selected =
    selector === "phone" ? draft.phoneCountryCode || "" : address.countryCode;
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
          disabled={saving}
          onPress={goBack}
          style={s.iconButton}
        >
          <FlowIcon name="back" color={theme.icon} />
        </Pressable>
        <Text
          accessibilityRole="header"
          style={[s.title, { color: theme.text }]}
        >
          {pageEditing ? details[activeDetail].label : c.title}
        </Text>
        <View style={s.iconButton} />
      </View>
      {loading && !saved ? (
        <PageContentState state="loading" pageName="personal details" />
      ) : !saved ? (
        <PageContentState
          state="error"
          pageName="personal details"
          onRetry={() => void load()}
        />
      ) : pageEditing && activeDetail === "email" ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <PersonalDetailsEmailEditor
            email={email}
            onDirtyChange={setEmailDirty}
            onBusyChange={(busy) => {
              submitting.current = busy;
              setSaving(busy);
            }}
            onSaved={(nextEmail) => {
              setEmail(nextEmail);
              setEmailDirty(false);
              submitting.current = false;
              setSaving(false);
              setEditing(false);
            }}
          />
        </KeyboardAvoidingView>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView
            ref={scrollRef}
            key={pageEditing ? activeDetail : "overview"}
            contentOffset={{
              x: 0,
              y: pageEditing ? 0 : overviewOffset.current,
            }}
            onScroll={(event) => {
              if (!pageEditing)
                overviewOffset.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={s.scroll}
          >
            {error && (!editing || activeDetail === "email") ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                style={[s.feedback, { color: "#D92D20" }]}
              >
                {error}
              </Text>
            ) : null}
            {!pageEditing ? (
              <View>
                <Text style={[s.description, { color: theme.muted }]}>
                  {c.description}
                </Text>
                {detailOrder.map((key, index) => {
                  const { label, value } = details[key];
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityLabel={`${label}: ${value || c.missing}`}
                      accessibilityHint={c.edit}
                      onPress={() => beginEditing(key)}
                      style={({ pressed }) => [
                        s.detailRow,
                        { opacity: pressed ? 0.65 : 1 },
                        index > 0 && {
                          borderTopColor: theme.border,
                          borderTopWidth: StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <View style={s.detailText}>
                        <Text style={[s.detailLabel, { color: theme.muted }]}>
                          {label}
                        </Text>
                        <Text
                          style={[
                            s.value,
                            {
                              color: value ? theme.text : flowColors.blue,
                            },
                          ]}
                        >
                          {value || c.add}
                        </Text>
                      </View>
                      <FlowIcon name="chevron" color={theme.muted} size={18} />
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View
                style={s.formContent}
                pointerEvents={saving ? "none" : "auto"}
              >
                {activeDetail === "fullName" && (
                  <>
                    <Field
                      autoComplete="given-name"
                      autoCapitalize="words"
                      label={c.firstName}
                      value={nameDraft.firstName}
                      onChange={(value) => patchName("firstName", value)}
                      returnKeyType="next"
                      submitBehavior="submit"
                      onSubmitEditing={() => lastNameRef.current?.focus()}
                    />
                    <Field
                      inputRef={lastNameRef}
                      autoComplete="family-name"
                      autoCapitalize="words"
                      label={c.lastName}
                      value={nameDraft.lastName}
                      onChange={(value) => patchName("lastName", value)}
                    />
                  </>
                )}
                {activeDetail === "phone" && (
                  <>
                    <Text style={[s.label, { color: theme.muted }]}>
                      {c.phone}
                    </Text>
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
                  </>
                )}
                {activeDetail === "address" && (
                  <>
                    <Text
                      style={[s.addressDescription, { color: theme.muted }]}
                    >
                      {c.addressDescription}
                    </Text>
                    <SelectButton
                      label={c.country}
                      value={
                        COUNTRY_OPTIONS.find(
                          (x) => x.code === address.countryCode,
                        )?.label || c.select
                      }
                      onPress={() => {
                        Keyboard.dismiss();
                        openSelector("addressCountry");
                      }}
                    />
                    <Field
                      autoComplete="street-address"
                      returnKeyType="next"
                      submitBehavior="submit"
                      onSubmitEditing={() => apartmentRef.current?.focus()}
                      label={c.street}
                      value={address.addressLine1}
                      onChange={(v) => patchAddress("addressLine1", v)}
                    />
                    <Field
                      inputRef={apartmentRef}
                      returnKeyType="next"
                      submitBehavior="submit"
                      onSubmitEditing={() => cityRef.current?.focus()}
                      label={c.apartment}
                      value={address.apartmentOrSuite}
                      onChange={(v) => patchAddress("apartmentOrSuite", v)}
                    />
                    <View
                      style={[s.localityRow, width < 340 && s.localityStack]}
                    >
                      <Field
                        containerStyle={s.localityField}
                        inputRef={cityRef}
                        returnKeyType="next"
                        submitBehavior="submit"
                        onSubmitEditing={() => stateRef.current?.focus()}
                        label={c.city}
                        value={address.city}
                        onChange={(v) => patchAddress("city", v)}
                      />
                      <Field
                        containerStyle={s.localityField}
                        inputRef={stateRef}
                        returnKeyType="next"
                        submitBehavior="submit"
                        onSubmitEditing={() => postalRef.current?.focus()}
                        label={c.state}
                        value={address.stateOrRegion}
                        onChange={(v) => patchAddress("stateOrRegion", v)}
                      />
                    </View>
                    <Field
                      containerStyle={width >= 340 ? s.postalField : undefined}
                      inputRef={postalRef}
                      autoComplete="postal-code"
                      label={c.postal}
                      value={address.postalCode}
                      onChange={(v) => patchAddress("postalCode", v)}
                    />
                  </>
                )}
              </View>
            )}
          </ScrollView>
          {pageEditing && activeDetail !== "email" ? (
            <View
              style={[
                s.editorFooter,
                {
                  backgroundColor: theme.background,
                  borderTopColor: theme.border,
                },
              ]}
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
              <PersonalDetailsSaveButton
                dirty={dirty}
                saving={saving}
                onSave={() => void save()}
              />
            </View>
          ) : null}
        </KeyboardAvoidingView>
      )}
      {quickDetail && (
        <PersonalDetailsQuickEditor
          detail={quickDetail}
          dateDraft={dateDraft}
          gender={draft.gender || ""}
          nationality={draft.nationality || ""}
          dirty={dirty}
          saving={saving}
          error={error}
          onDateChange={updateDateDraft}
          onGenderChange={(value) => patch("gender", value)}
          onNationalityChange={(value) => patch("nationality", value)}
          onClose={() => discard(false)}
          onSave={() => void save()}
        />
      )}
      <CountrySelector
        visible={selectorVisible}
        selectorType={selector}
        kind={selector === "phone" ? "phone" : "addressCountry"}
        title={c.country}
        options={selectOptions}
        selected={selected}
        onClose={closeSelector}
        onSave={(value) => {
          const kind = selector === "phone" ? "phone" : "addressCountry";
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
    fontSize: 18,
    lineHeight: 26,
    fontFamily: appFonts.semibold,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  scroll: { padding: 20, paddingBottom: 40 },
  description: {
    fontFamily: appFonts.regular,
    fontSize: 14,
    lineHeight: 22,
    paddingTop: 4,
    paddingBottom: 16,
  },
  detailText: { flex: 1, gap: 4 },
  editorFooter: { paddingHorizontal: 20, paddingVertical: 12 },
  detailRow: {
    minHeight: 78,
    paddingHorizontal: 0,
    paddingVertical: 16,
    gap: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  detailLabel: { fontSize: 13, lineHeight: 18, fontFamily: appFonts.regular },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: appFonts.semibold,
    marginBottom: 5,
  },
  value: { fontSize: 16, lineHeight: 23, fontFamily: appFonts.medium },
  blue: { color: flowColors.blue, fontFamily: appFonts.semibold },
  formContent: { gap: 20, paddingTop: 8 },
  addressDescription: {
    fontFamily: appFonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 2,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: appFonts.regular,
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
    fontFamily: appFonts.semibold,
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
    fontFamily: appFonts.regular,
    fontSize: 16,
  },
  selectField: { flex: 1 },
  select: { flexDirection: "row", alignItems: "center", gap: 6 },
  linkHit: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  localityRow: { flexDirection: "row", gap: 10 },
  localityStack: { flexDirection: "column", gap: 12 },
  localityField: { flex: 1, minWidth: 0 },
  postalField: { width: "50%" },
  feedback: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: appFonts.semibold,
    marginBottom: 12,
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
    fontFamily: appFonts.medium,
  },
  countryDialCode: {
    fontFamily: appFonts.regular,
    fontSize: 16,
    lineHeight: 23,
  },
});
