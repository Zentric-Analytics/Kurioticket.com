import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useNavigation } from "expo-router";
import {
  travelApi,
  TravelApiError,
  type MobileProfile,
} from "../../api/travelApi";
import { getApiBaseUrl } from "../../config/apiUrl";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { readSession, updateStoredSessionName } from "../../storage/sessionStorage";
import { useAppTheme } from "../../theme/AppTheme";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";
import { openSafeExternalUrl } from "../profile/safeExternalLink";
import { signInHref } from "../auth/signInIntent";
import {
  canonicalDate,
  clampPersonalDetailsDateOfBirth,
  COUNTRY_OPTIONS,
  displayAddress,
  displayPhone,
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

type DateDraft = { year: string; month: string; day: string };
type SelectorKind =
  | "phone"
  | "gender"
  | "nationality"
  | "addressCountry"
  | "day"
  | "month"
  | "year"
  | null;

function dateDraftFromValue(value?: string | null): DateDraft {
  const match = (value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return { year: match?.[1] || "", month: match?.[2] || "", day: match?.[3] || "" };
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

function CountryFlag({ isoCode }: { isoCode?: string }) {
  const { theme } = useAppTheme();
  const [failed, setFailed] = useState(false);
  const uri = getCountryFlagUri(isoCode);
  useEffect(() => setFailed(false), [uri]);
  return uri && !failed ? (
    <Image accessible={false} source={{ uri }} onError={() => setFailed(true)} style={s.flag} />
  ) : (
    <Text style={[s.flagFallback, { color: theme.text }]}>{isoCode || "--"}</Text>
  );
}

function ReadOnlyRow({
  label,
  value,
  missing,
  onPress,
  maxLines = 2,
}: {
  label: string;
  value?: string | null;
  missing: string;
  onPress: () => void;
  maxLines?: number;
}) {
  const { theme } = useAppTheme();
  const shown = value || missing;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${shown}`}
      onPress={onPress}
      style={({ pressed }) => [
        s.readOnlyRow,
        { borderBottomColor: theme.border },
        pressed && s.pressed,
      ]}
    >
      <View style={s.readOnlyText}>
        <Text style={[s.readOnlyLabel, { color: theme.text }]}>{label}</Text>
        <Text
          numberOfLines={maxLines}
          style={[s.readOnlyValue, { color: value ? theme.text : theme.muted }]}
        >
          {shown}
        </Text>
      </View>
      <FlowIcon name="chevron" color={theme.muted} size={16} />
    </Pressable>
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
  onChange: (value: string) => void;
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
        style={[s.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
      />
    </View>
  );
}

function SelectButton({ label, value, onPress, hideLabel = false }: { label: string; value: string; onPress: () => void; hideLabel?: boolean }) {
  const { theme } = useAppTheme();
  return (
    <View style={s.selectField}>
      {hideLabel ? null : <Text style={[s.label, { color: theme.muted }]}>{label}</Text>}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        accessibilityValue={{ text: value }}
        onPress={onPress}
        style={[s.input, s.select, { borderColor: theme.border, backgroundColor: theme.background }]}
      >
        <Text numberOfLines={1} style={{ color: theme.text, flex: 1 }}>{value}</Text>
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
  const option = PHONE_COUNTRY_OPTIONS.find((item) => item.isoCode === countryCode) || PHONE_COUNTRY_OPTIONS[0];
  return (
    <View style={s.phone} testID="personal-details-phone-row">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} country, ${option?.countryName || countryCode}, ${option?.dialCode || ""}`}
        onPress={onOpenCountry}
        style={[s.input, s.countrySegment, { borderColor: theme.border, backgroundColor: theme.background }]}
      >
        <CountryFlag isoCode={option?.isoCode} />
        <FlowIcon name="chevron" color={theme.muted} size={16} />
      </Pressable>
      <View style={[s.input, s.phoneInput, { borderColor: theme.border, backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>{option?.dialCode}</Text>
        <TextInput
          accessibilityLabel={localLabel}
          keyboardType="phone-pad"
          value={localNumber}
          onChangeText={onChangeNumber}
          style={[s.localPhoneInput, { color: theme.text }]}
        />
      </View>
    </View>
  );
}

function SelectorModal({
  visible,
  kind,
  title,
  options,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  kind: SelectorKind;
  title: string;
  options: PersonalDetailsSelectorOption[];
  selected: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const c = personalDetailsCopy(locale);
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [draftSelection, setDraftSelection] = useState(selected);
  const searchable = kind === "phone" || kind === "nationality" || kind === "addressCountry";
  const shown = searchable ? filterSelectorOptions(options, query) : options;

  useEffect(() => {
    if (visible) {
      setQuery("");
      setDraftSelection(selected);
      Keyboard.dismiss();
    }
  }, [visible, kind, selected]);

  const commitSelection = () => {
    if (!draftSelection) return;
    Keyboard.dismiss();
    onSelect(draftSelection);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[s.modalSafe, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
        <View style={[s.header, { borderBottomColor: theme.border }]}> 
          <Pressable accessibilityRole="button" accessibilityLabel={c.back} onPress={onClose} style={s.iconButton}>
            <FlowIcon name="back" color={theme.icon} />
          </Pressable>
          <Text accessibilityRole="header" style={[s.title, { color: theme.text }]}>{title}</Text>
          <View style={s.iconButton} />
        </View>
        {searchable ? (
          <View style={s.searchWrap}>
            <TextInput
              accessibilityLabel={c.searchCountry}
              placeholder={c.searchCountry}
              placeholderTextColor={theme.muted}
              value={query}
              onChangeText={setQuery}
              style={[s.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            />
          </View>
        ) : null}
        <FlatList
          data={shown}
          keyExtractor={(item) => item.value}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: searchable ? 16 : insets.bottom + 16 }}
          renderItem={({ item }) => {
            const phoneOption = kind === "phone" ? PHONE_COUNTRY_OPTIONS.find((option) => option.isoCode === item.value) : null;
            const isoCode = kind === "nationality"
              ? COUNTRY_OPTIONS.find((option) => option.label === item.value)?.code
              : kind === "phone" || kind === "addressCountry"
                ? item.value
                : undefined;
            const active = item.value === (searchable ? draftSelection : selected);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  Keyboard.dismiss();
                  if (searchable) {
                    setDraftSelection(item.value);
                    return;
                  }
                  onSelect(item.value);
                  onClose();
                }}
                style={[s.modalOption, { borderBottomColor: theme.border }]}
              >
                {isoCode ? <CountryFlag isoCode={isoCode} /> : null}
                <Text style={[s.modalOptionText, { color: active ? flowColors.blue : theme.text }]}>{item.label}</Text>
                {phoneOption?.dialCode ? <Text style={{ color: theme.muted }}>{phoneOption.dialCode}</Text> : null}
                {active ? <FlowIcon name="check" color={flowColors.blue} size={20} /> : null}
              </Pressable>
            );
          }}
        />
        {searchable ? (
          <View style={[s.modalCommit, { borderTopColor: theme.border, backgroundColor: theme.background }]}> 
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={c.selectorSave}
              accessibilityState={{ disabled: !draftSelection }}
              disabled={!draftSelection}
              onPress={commitSelection}
              style={[s.primary, !draftSelection && s.disabled]}
            >
              <Text style={s.primaryText}>{c.selectorSave}</Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

export function AlignedPersonalDetailsScreen() {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const c = personalDetailsCopy(locale);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const mounted = useRef(true);
  const submitting = useRef(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saved, setSaved] = useState<MobileProfile | null>(null);
  const [draft, setDraft] = useState<MobileProfile>({});
  const [dateDraft, setDateDraft] = useState<DateDraft>(() => dateDraftFromValue());
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selector, setSelector] = useState<SelectorKind>(null);

  const address = useMemo(() => parseAddress(draft.address || ""), [draft.address]);
  const dirty = !!saved && profilesDiffer(draft, saved);

  const dismissSuccess = useCallback(() => {
    if (successTimer.current) {
      clearTimeout(successTimer.current);
      successTimer.current = null;
    }
    setSuccess("");
  }, []);

  const showSuccess = useCallback((message: string) => {
    if (successTimer.current) clearTimeout(successTimer.current);
    setSuccess(message);
    successTimer.current = setTimeout(() => {
      successTimer.current = null;
      setSuccess("");
    }, 1500);
  }, []);

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
      const expired = (e instanceof TravelApiError && e.status === 401) || !(await readSession().catch(() => null));
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
    void load();
    return () => {
      mounted.current = false;
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [load]);

  const discard = useCallback((leave: boolean) => {
    if (!saved) return;
    const finish = () => {
      setDraft(saved);
      setDateDraft(dateDraftFromValue(saved.dateOfBirth));
      setEditing(false);
      setError("");
      if (leave) router.back();
    };
    if (!dirty) {
      finish();
      return;
    }
    Alert.alert(c.discardTitle, c.discardBody, [
      { text: c.keepEditing, style: "cancel" },
      { text: c.discard, style: "destructive", onPress: finish },
    ]);
  }, [c, dirty, saved]);

  useEffect(() => navigation.addListener("beforeRemove", (event) => {
    if (!editing || !dirty) return;
    event.preventDefault();
    Alert.alert(c.discardTitle, c.discardBody, [
      { text: c.keepEditing, style: "cancel" },
      { text: c.discard, style: "destructive", onPress: () => navigation.dispatch(event.data.action) },
    ]);
  }), [navigation, editing, dirty, c]);

  const beginEditing = () => {
    if (!saved) return;
    setDraft(saved);
    setDateDraft(dateDraftFromValue(saved.dateOfBirth));
    setError("");
    dismissSuccess();
    setEditing(true);
  };

  const patch = (key: keyof MobileProfile, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const patchAddress = (key: keyof AddressParts, value: string) => patch("address", serializeAddress({ ...address, [key]: value }));

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

  const save = async () => {
    if (!saved || !dirty || submitting.current) return;
    if ((draft.fullName || "").trim().length > 120) {
      setError(c.invalidName);
      return;
    }
    const dateOfBirthChanged = (draft.dateOfBirth || "") !== (saved.dateOfBirth || "");
    if (dateOfBirthChanged && draft.dateOfBirth && !isEligiblePersonalDetailsDateOfBirth(draft.dateOfBirth)) {
      setError(c.invalidDate);
      return;
    }
    submitting.current = true;
    setSaving(true);
    setError("");
    dismissSuccess();
    try {
      const phone = serializePhone(draft.phoneCountryCode || "", draft.phoneNumber || "");
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
      const expired = (e instanceof TravelApiError && e.status === 401) || !(await readSession().catch(() => null));
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

  const openWeb = async () => {
    const base = getApiBaseUrl(Platform.OS, __DEV__);
    if (!base.ok || !(await openSafeExternalUrl(new URL("/dashboard", `${base.baseUrl}/`).toString()))) {
      setError(c.openFailure);
      AccessibilityInfo.announceForAccessibility(c.openFailure);
    }
  };

  const latestBirthYear = Number(personalDetailsLatestDateOfBirth().slice(0, 4));
  const selectOptions: PersonalDetailsSelectorOption[] = selector === "phone"
    ? PHONE_COUNTRY_OPTIONS.map((item) => ({ label: item.countryName, value: item.isoCode, searchTerms: [item.isoCode, item.dialCode, item.dialCode.replace("+", "")] }))
    : selector === "addressCountry"
      ? COUNTRY_OPTIONS.map((item) => ({ label: item.label, value: item.code, searchTerms: [item.code] }))
      : selector === "gender"
        ? GENDER_VALUES.map((value, index) => ({ value, label: [c.male, c.female, c.prefer][index] }))
        : selector === "nationality"
          ? NATIONALITY_OPTIONS.map((value, index) => ({ value, label: value, searchTerms: [COUNTRY_OPTIONS[index].code] }))
          : selector === "day"
            ? Array.from({ length: 31 }, (_, index) => ({ value: String(index + 1).padStart(2, "0"), label: String(index + 1) }))
            : selector === "month"
              ? Array.from({ length: 12 }, (_, index) => ({
                  value: String(index + 1).padStart(2, "0"),
                  label: new Intl.DateTimeFormat(locale === "es-es" ? "es-ES" : "en-US", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2020, index, 1))),
                }))
              : selector === "year"
                ? Array.from({ length: 125 }, (_, index) => ({ value: String(latestBirthYear - index), label: String(latestBirthYear - index) }))
                : [];

  const selected = selector === "phone" ? draft.phoneCountryCode || ""
    : selector === "addressCountry" ? address.countryCode
      : selector === "gender" ? draft.gender || ""
        : selector === "nationality" ? draft.nationality || ""
          : selector === "day" ? dateDraft.day
            : selector === "month" ? dateDraft.month
              : selector === "year" ? dateDraft.year : "";

  const selectorTitle = selector === "phone" || selector === "addressCountry" ? c.country
    : selector === "gender" ? c.gender
      : selector === "nationality" ? c.nationality
        : selector === "day" ? c.day
          : selector === "month" ? c.month
            : selector === "year" ? c.year : "";

  const applySelection = (value: string) => {
    if (selector === "phone") patch("phoneCountryCode", value);
    else if (selector === "gender") patch("gender", value);
    else if (selector === "nationality") patch("nationality", value);
    else if (selector === "addressCountry") patchAddress("countryCode", value);
    else if (selector === "day") updateDateDraft("day", value);
    else if (selector === "month") updateDateDraft("month", value);
    else if (selector === "year") updateDateDraft("year", value);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={[s.safe, { backgroundColor: theme.background }]}> 
      <View style={[s.header, { borderBottomColor: theme.border }]}> 
        <Pressable accessibilityRole="button" accessibilityLabel={c.back} onPress={() => editing ? discard(true) : router.back()} style={s.iconButton}>
          <FlowIcon name="back" color={theme.icon} />
        </Pressable>
        <Text accessibilityRole="header" style={[s.title, { color: theme.text }]}>{c.title}</Text>
        <View style={s.iconButton} />
      </View>

      {loading && !saved ? (
        <View style={s.center}>
          <ActivityIndicator color={flowColors.blue} />
          <Text style={{ color: theme.muted }}>{c.loading}</Text>
        </View>
      ) : !saved ? (
        <View style={s.center}>
          <Text accessibilityRole="alert" style={{ color: theme.text }}>{error || c.loadFailure}</Text>
          <Pressable accessibilityRole="button" onPress={() => void load()} style={s.primary}><Text style={s.primaryText}>{c.retry}</Text></Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={editing ? s.editScroll : s.readScroll}>
            {error ? <Text accessibilityRole="alert" style={[s.feedback, { color: "#D92D20" }]}>{error}</Text> : null}

            {!editing ? (
              <View>
                <Text style={[s.description, { color: theme.muted }]}>{c.description}</Text>
                <View style={s.readOnlyList}>
                  <ReadOnlyRow label={c.fullName} value={saved.fullName} missing={c.missing} onPress={beginEditing} />
                  <ReadOnlyRow label={c.gender} value={saved.gender} missing={c.missing} onPress={beginEditing} />
                  <ReadOnlyRow label={c.birth} value={saved.dateOfBirth ? safeDate(saved.dateOfBirth, locale) : ""} missing={c.missing} onPress={beginEditing} />
                  <ReadOnlyRow label={c.nationality} value={saved.nationality} missing={c.missing} onPress={beginEditing} />
                  <ReadOnlyRow label={c.email} value={email} missing={c.missing} onPress={beginEditing} />
                  <ReadOnlyRow label={c.phone} value={displayPhone(saved.phoneCountryCode || "", saved.phoneNumber || "")} missing={c.missing} onPress={beginEditing} />
                  <ReadOnlyRow label={c.address} value={displayAddress(saved.address || "")} missing={c.missing} onPress={beginEditing} maxLines={3} />
                </View>
              </View>
            ) : (
              <View style={s.formContent}>
                <Text accessibilityRole="header" style={[s.sectionTitle, { color: theme.text }]}>{c.basic}</Text>
                <Field label={c.fullName} value={draft.fullName || ""} onChange={(value) => patch("fullName", value)} />
                <Text style={[s.label, { color: theme.muted }]}>{c.email}</Text>
                <TextInput editable={false} accessibilityLabel={`${c.email}, ${email}`} value={email} style={[s.input, { color: theme.muted, borderColor: theme.border, backgroundColor: theme.background }]} />
                <Pressable accessibilityRole="link" accessibilityLabel={c.changeEmail} accessibilityHint={c.externalHint} onPress={() => void openWeb()} style={s.linkHit}><Text style={s.blue}>{c.changeEmail}</Text></Pressable>
                <Text style={[s.label, { color: theme.muted }]}>{c.phone}</Text>
                <PhoneControl countryCode={draft.phoneCountryCode || ""} localNumber={draft.phoneNumber || ""} label={c.phone} localLabel={c.localPhone} onOpenCountry={() => { Keyboard.dismiss(); setSelector("phone"); }} onChangeNumber={(value) => patch("phoneNumber", value)} />
                <Text style={[s.label, { color: theme.muted }]}>{c.birth}</Text>
                <View style={[s.date, width < 340 && s.compactGap]}>
                  <View style={s.dayControl}><SelectButton hideLabel label={c.day} value={dateDraft.day || c.day} onPress={() => setSelector("day")} /></View>
                  <View style={s.monthControl}><SelectButton hideLabel label={c.month} value={dateMonthLabel(dateDraft.month, locale) || c.month} onPress={() => setSelector("month")} /></View>
                  <View style={s.yearControl}><SelectButton hideLabel label={c.year} value={dateDraft.year || c.year} onPress={() => setSelector("year")} /></View>
                </View>
                <SelectButton label={c.gender} value={draft.gender || c.select} onPress={() => setSelector("gender")} />
                <SelectButton label={c.nationality} value={draft.nationality || c.select} onPress={() => { Keyboard.dismiss(); setSelector("nationality"); }} />
                <View style={[s.sectionDivider, { borderTopColor: theme.border }]} />
                <Text accessibilityRole="header" style={[s.sectionTitle, { color: theme.text }]}>{c.addressSection}</Text>
                <Text style={[s.addressDescription, { color: theme.muted }]}>{c.addressDescription}</Text>
                <SelectButton label={c.country} value={COUNTRY_OPTIONS.find((item) => item.code === address.countryCode)?.label || c.select} onPress={() => { Keyboard.dismiss(); setSelector("addressCountry"); }} />
                <Field label={c.street} value={address.addressLine1} onChange={(value) => patchAddress("addressLine1", value)} />
                <Field label={c.apartment} value={address.apartmentOrSuite} onChange={(value) => patchAddress("apartmentOrSuite", value)} />
                <View style={[s.localityRow, width < 340 && s.localityStack]}>
                  <Field containerStyle={s.localityField} label={c.city} value={address.city} onChange={(value) => patchAddress("city", value)} />
                  <Field containerStyle={s.localityField} label={c.state} value={address.stateOrRegion} onChange={(value) => patchAddress("stateOrRegion", value)} />
                </View>
                <Field containerStyle={width >= 340 ? s.postalField : undefined} label={c.postal} value={address.postalCode} onChange={(value) => patchAddress("postalCode", value)} />
                <View style={[s.actionDivider, { borderTopColor: theme.border }]} />
                <View style={s.actions}>
                  <Pressable accessibilityRole="button" accessibilityLabel={c.cancel} onPress={() => discard(false)} style={[s.secondary, { borderColor: theme.border }]}><Text style={[s.buttonText, { color: theme.text }]}>{c.cancel}</Text></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={saving ? c.saving : c.save} accessibilityState={{ disabled: !dirty || saving, busy: saving }} disabled={!dirty || saving} onPress={() => void save()} style={[s.primary, (!dirty || saving) && s.disabled]}><Text style={s.primaryText}>{saving ? c.saving : c.save}</Text></Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {success ? (
        <View pointerEvents="none" style={[s.toastPosition, { bottom: insets.bottom + 16 }]}> 
          <View style={[s.toast, { backgroundColor: theme.dark ? "#163B2A" : "#E9F8EF" }]}> 
            <FlowIcon name="check" color={theme.dark ? "#86E3A7" : "#16803C"} size={18} />
            <Text accessibilityLiveRegion="polite" style={[s.toastText, { color: theme.dark ? "#C6F6D5" : "#126B34" }]}>{success}</Text>
          </View>
        </View>
      ) : null}

      <SelectorModal visible={!!selector} kind={selector} title={selectorTitle} options={selectOptions} selected={selected} onClose={() => setSelector(null)} onSelect={applySelection} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 58, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 4 },
  iconButton: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 18, lineHeight: 24, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  readScroll: { paddingBottom: 40 },
  editScroll: { padding: 16, paddingBottom: 40 },
  description: { fontSize: 14, lineHeight: 20, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14 },
  readOnlyList: { paddingHorizontal: 16 },
  readOnlyRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  readOnlyText: { flex: 1, gap: 4 },
  readOnlyLabel: { fontSize: 14, lineHeight: 19, fontWeight: "600" },
  readOnlyValue: { fontSize: 15, lineHeight: 21, fontWeight: "400" },
  pressed: { opacity: 0.65 },
  formContent: { gap: 12 },
  sectionTitle: { fontSize: 17, lineHeight: 23, fontWeight: "800" },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "700", marginBottom: 5 },
  input: { height: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
  selectField: { flex: 1 },
  select: { flexDirection: "row", alignItems: "center", gap: 6 },
  phone: { height: 50, flexDirection: "row", alignItems: "stretch" },
  countrySegment: { width: 82, borderTopRightRadius: 0, borderBottomRightRadius: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 10 },
  phoneInput: { minWidth: 0, flex: 1, marginLeft: -1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, flexDirection: "row", alignItems: "center", gap: 8 },
  localPhoneInput: { minWidth: 0, flex: 1, height: 48, padding: 0, fontSize: 16 },
  flag: { width: 28, height: 19 },
  flagFallback: { width: 28, textAlign: "center", fontSize: 13, fontWeight: "700" },
  date: { flexDirection: "row", gap: 8 },
  compactGap: { gap: 4 },
  dayControl: { flex: 3 },
  monthControl: { flex: 6 },
  yearControl: { flex: 4 },
  linkHit: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  blue: { color: flowColors.blue, fontWeight: "800" },
  sectionDivider: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, marginBottom: 4 },
  addressDescription: { fontSize: 14, lineHeight: 20, marginBottom: 2 },
  localityRow: { flexDirection: "row", gap: 10 },
  localityStack: { flexDirection: "column", gap: 12 },
  localityField: { flex: 1, minWidth: 0 },
  postalField: { width: "50%" },
  actionDivider: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 2, flexWrap: "wrap" },
  primary: { minHeight: 48, minWidth: 142, borderRadius: 10, backgroundColor: flowColors.blue, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  secondary: { minHeight: 48, minWidth: 94, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  buttonText: { fontWeight: "800" },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.45 },
  feedback: { fontSize: 14, lineHeight: 20, fontWeight: "700", marginHorizontal: 16, marginTop: 12 },
  toastPosition: { position: "absolute", left: 16, right: 16, alignItems: "center", zIndex: 10 },
  toast: { maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  toastText: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
  modalSafe: { flex: 1 },
  searchWrap: { padding: 16, paddingBottom: 8 },
  modalOption: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalOptionText: { flex: 1, fontSize: 16, lineHeight: 23, fontWeight: "500" },
  modalCommit: { borderTopWidth: StyleSheet.hairlineWidth, padding: 16, alignItems: "stretch" },
});