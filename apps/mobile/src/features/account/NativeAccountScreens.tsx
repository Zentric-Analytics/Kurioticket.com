import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getGeneralFaqs } from "../../../../../src/content/faqs";
import { airports } from "../../../../../src/shared/airports";
import { airlines } from "../../../../../src/data/airlines";
import { travelApi, TravelApiError, type EmailPreferences, type TravelPreferences } from "../../api/travelApi";
import { readSession } from "../../storage/sessionStorage";
import { useAppTheme } from "../../theme/AppTheme";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { FlowIcon } from "../flow/FlowIcon";
import { addAirline, airlinePreferenceLabel, airportPreferenceValue, beginLoad, beginSave, canSubmitSupport, editDraft, failLoad, failSave, faqAccessibility, filterAirlinePreferences, filterFaqs, finishLoad, finishSave, initialAsyncDraft, invalidateRequests, isDirty, supportCategories, supportDraft, toggleExpanded, type AsyncDraft } from "./nativeAccountModels";
import { signInHref } from "../auth/signInIntent";
import { searchTravelAirports, type TravelAirportSuggestion } from "./travelAirportSearch";
import { PageContentState } from "../../components/PageContentState";
import { areAllEmailCategoriesEnabled, defaultEmailPreferences, normalizeLoadedEmailPreferences, toggleAllEmailCategories, toggleEmailCategory, type EmailCategoryKey } from "./emailPreferencesModel";

function Header({ title }: { title: string }) { const { theme } = useAppTheme(); const { t } = useMobileLocalization(); return <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel={t("back")} onPress={() => { Keyboard.dismiss(); router.back(); }} style={s.hit}><FlowIcon name="back" color={theme.icon} /></Pressable><Text accessibilityRole="header" style={[s.title, { color: theme.text }]}>{title}</Text><View style={s.hit} /></View>; }
function Shell({ title, children }: { title: string; children: React.ReactNode }) { const { theme } = useAppTheme(); return <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]} edges={["top", "bottom"]}><Header title={title}/>{children}</SafeAreaView>; }
function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) { const { theme } = useAppTheme(); return <View style={s.field}><Text style={[s.label, { color: theme.text }]}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={theme.muted} style={[s.input, props.multiline && s.multiline, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} {...props}/></View>; }
function Button({ label, onPress, disabled = false, accessibilityLabel }: { label: string; onPress: () => void; disabled?: boolean; accessibilityLabel?: string }) { return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[s.button, disabled && s.disabled]}><Text style={s.buttonText}>{label}</Text></Pressable>; }
function ErrorNotice({ text, retry }: { text: string; retry?: () => void }) { const { t } = useMobileLocalization(); return <View><Text accessibilityRole="alert" style={s.error}>{text}</Text>{retry ? <Pressable accessibilityRole="button" onPress={retry} style={s.linkHit}><Text style={s.link}>{t("retry")}</Text></Pressable> : null}</View>; }
async function requireAccount(returnTo: "/email-preferences" | "/travel-preferences") { if (await readSession().catch(() => null)) return true; router.replace(signInHref(returnTo)); return false; }

function useAsyncDraftModel<T>(initial: T) {
  const [state, setState] = useState(() => initialAsyncDraft(initial));
  const stateRef = useRef(state);
  const commit = useCallback((next: AsyncDraft<T>) => {
    stateRef.current = next;
    setState(next);
    return next;
  }, []);
  return { state, stateRef, commit };
}

export function FaqScreen() { const { theme } = useAppTheme(); const { t } = useMobileLocalization(); const [query, setQuery] = useState(""); const [open, setOpen] = useState<string | null>(null); const faqs = useMemo(() => getGeneralFaqs((key) => t(key as Parameters<typeof t>[0])), [t]); const filtered = useMemo(() => filterFaqs(faqs, query), [faqs, query]); return <Shell title={t("faqTitle")}><ScrollView keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss} contentContainerStyle={s.content}><Text style={[s.intro, { color: theme.muted }]}>{t("faqIntro")}</Text><Field label={t("faqSearch")} value={query} onChangeText={value => { setQuery(value); setOpen(null); }} placeholder={t("faqSearch")}/>{query ? <Pressable accessibilityRole="button" onPress={() => setQuery("")} style={s.linkHit}><Text style={s.link}>{t("clearSearch")}</Text></Pressable> : null}{filtered.map((item) => { const accessibilityState = faqAccessibility(open, item.question); return <Pressable key={item.question} accessibilityRole="button" accessibilityState={accessibilityState} accessibilityHint={accessibilityState.expanded ? t("collapseAnswer") : t("expandAnswer")} onPress={() => setOpen(current => toggleExpanded(current, item.question))} style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}><View style={s.row}><Text style={[s.question, { color: theme.text }]}>{item.question}</Text><FlowIcon name="chevron" color={theme.icon}/></View>{accessibilityState.expanded ? <Text style={[s.answer, { color: theme.muted }]}>{item.answer}</Text> : null}</Pressable>; })}{!filtered.length ? <Text style={[s.empty, { color: theme.muted }]}>{t("faqEmpty")}</Text> : null}</ScrollView></Shell>; }

export function SupportScreen() {
  const { theme } = useAppTheme(); const { t } = useMobileLocalization(); const [draft,setDraft]=useState(() => supportDraft()); const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [ticket,setTicket]=useState("");
  useEffect(()=>{void travelApi.profile().then(r=>{setDraft(current => ({...current, email:r.user.email, ownedEmail:true}));}).catch(()=>undefined);},[]);
  const submit=async()=>{if(busy)return;if(!canSubmitSupport(draft, busy)){setError(t("supportValidation"));return;}setBusy(true);setError("");try{const r=await travelApi.createSupportTicket({email:draft.email,subject:draft.subject,category:draft.category,body:draft.body,sourceContext:{page:"mobile_support",platform:Platform.OS as "ios"|"android"}});setTicket(r.ticket.id);}catch(e){setError(e instanceof TravelApiError?e.message:t("supportError"));}finally{setBusy(false);}};
  if(ticket)return <Shell title={t("supportTitle")}><View style={s.center}><Text accessibilityLiveRegion="polite" style={[s.question,{color:theme.text}]}>{t("supportSuccess")}</Text><Text selectable style={[s.answer,{color:theme.muted}]}>{t("ticketId")}: {ticket}</Text><Button label={t("newRequest")} onPress={()=>{setTicket("");setError("");setDraft(current => supportDraft(current.email, current.ownedEmail));}}/></View></Shell>;
  return <Shell title={t("supportTitle")}><KeyboardAvoidingView style={s.flex} behavior={Platform.OS==="ios"?"padding":undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
    <View style={s.supportIntro}><FlowIcon name="help" size={19} color={theme.icon}/><Text style={[s.supportIntroText,{color:theme.muted}]}>{t("supportIntro")}</Text></View>
    <Field label={t("supportEmail")} value={draft.email} onChangeText={email=>setDraft(current=>({...current,email}))} editable={!draft.ownedEmail} keyboardType="email-address" autoCapitalize="none"/>
    {draft.ownedEmail?<Text style={[s.help,{color:theme.muted}]}>{t("accountEmailHelp")}</Text>:null}
    <Field label={t("supportSubject")} value={draft.subject} onChangeText={subject=>setDraft(current=>({...current,subject}))} placeholder={t("supportSubjectPlaceholder")}/>
    <View style={s.supportSection}><Text style={[s.label,{color:theme.text}]}>{t("supportCategory")}</Text><View accessibilityRole="radiogroup" style={s.categoryGrid}>{supportCategories.map(category=>{const selected=category===draft.category;return <Pressable key={category} accessibilityRole="radio" accessibilityState={{checked:selected}} onPress={()=>setDraft(current=>({...current,category}))} style={[s.categoryOption,{borderColor:selected?theme.icon:theme.border,backgroundColor:theme.surface}]}><Text numberOfLines={2} style={[s.categoryText,{color:theme.text}]}>{t(`category_${category}` as Parameters<typeof t>[0])}</Text>{selected?<FlowIcon name="check" size={17} color={theme.icon}/>:null}</Pressable>;})}</View></View>
    <Field label={t("supportMessage")} value={draft.body} onChangeText={body=>setDraft(current=>({...current,body}))} placeholder={t("supportMessagePlaceholder")} multiline maxLength={4000}/>
    {error?<ErrorNotice text={error}/>:null}<Button label={busy?t("sending"):t("submitRequest")} disabled={busy} onPress={()=>void submit()}/>
  </ScrollView></KeyboardAvoidingView></Shell>;
}

const emailSections: { label: "emailTravelAlerts" | "emailInspirationUpdates"; keys: EmailCategoryKey[] }[] = [
  { label: "emailTravelAlerts", keys: ["priceAlerts"] },
  { label: "emailInspirationUpdates", keys: ["travelInspiration", "productUpdates", "dealsRecommendations"] },
];
export function EmailPreferencesScreen(){const{theme}=useAppTheme();const{t}=useMobileLocalization();const{state,stateRef,commit}=useAsyncDraftModel(defaultEmailPreferences);const[hasLoaded,setHasLoaded]=useState(false);const pendingEmailPreferences=useRef<EmailPreferences|null>(null);const persistTimer=useRef<ReturnType<typeof setTimeout>|null>(null);const flushPending=useCallback(async()=>{if(stateRef.current.saving)return;const next=pendingEmailPreferences.current;if(!next)return;pendingEmailPreferences.current=null;if(persistTimer.current){clearTimeout(persistTimer.current);persistTimer.current=null;}const confirmed=stateRef.current.saved;const started=beginSave({...stateRef.current,draft:next,error:""});if(!started)return;commit(started.state);try{const response=await travelApi.updateEmailPreferences(started.value);commit(finishSave(stateRef.current,started.token,started.editVersion,normalizeLoadedEmailPreferences(response.preferences)));}catch{const failed=failSave(stateRef.current,started.token,t("emailSaveError"));if(failed.requestVersion===started.token)commit({...failed,draft:confirmed});}},[commit,stateRef,t]);const schedulePersist=useCallback((next:EmailPreferences)=>{if(stateRef.current.saving)return;pendingEmailPreferences.current=next;commit({...editDraft(stateRef.current,next),error:""});if(persistTimer.current)clearTimeout(persistTimer.current);persistTimer.current=setTimeout(()=>{persistTimer.current=null;void flushPending();},500);},[commit,flushPending,stateRef]);const load=useCallback(async()=>{if(!await requireAccount("/email-preferences"))return;const started=beginLoad(stateRef.current);commit(started.state);try{const r=await travelApi.emailPreferences();const normalized=normalizeLoadedEmailPreferences(r.preferences);const finished=finishLoad(stateRef.current,started.token,started.editVersion,normalized);commit(finished);if(finished.requestVersion===started.token)setHasLoaded(true);}catch{commit(failLoad(stateRef.current,started.token,t("emailLoadError")));}},[commit,stateRef,t]);useFocusEffect(useCallback(()=>{void load();return()=>{if(persistTimer.current){clearTimeout(persistTimer.current);persistTimer.current=null;}if(pendingEmailPreferences.current)void flushPending();stateRef.current=invalidateRequests(stateRef.current);};},[flushPending,load,stateRef]));const prefs=state.draft;const row=(key:EmailCategoryKey)=><View key={key} style={[s.emailRow,{borderColor:theme.border}]}><View style={s.emailRowCopy}><Text style={[s.question,{color:theme.text}]}>{t(`email_${key}` as Parameters<typeof t>[0])}</Text><Text style={[s.help,s.emailDescription,{color:theme.muted}]}>{t(`email_${key}_help` as Parameters<typeof t>[0])}</Text></View><Switch style={s.emailSwitch} accessibilityRole="switch" accessibilityState={{checked:prefs[key],disabled:state.saving}} disabled={state.saving} value={prefs[key]} onValueChange={checked=>schedulePersist(toggleEmailCategory(prefs,key,checked))}/></View>;return <Shell title={t("emailPreferences")}>{state.loading&&!hasLoaded?<PageContentState state="loading" pageName="email preferences"/>:!hasLoaded&&state.error?<PageContentState state="error" pageName="email preferences" onRetry={()=>void load()}/>:<ScrollView contentContainerStyle={s.content}><><Text style={[s.intro,{color:theme.muted}]}>{t("emailPreferencesIntro")}</Text>{emailSections.map(section=><View key={section.label} style={s.emailSectionGroup}><Text style={[s.emailSection,{color:theme.muted}]}>{t(section.label)}</Text>{section.keys.map(row)}</View>)}<View style={[s.masterRow,{borderColor:theme.border}]}><View style={s.emailRowCopy}><Text style={[s.question,{color:theme.text}]}>{t("emailAllOptional")}</Text><Text style={[s.help,s.emailDescription,{color:theme.muted}]}>{t("emailAllOptionalHelp")}</Text></View><Switch style={s.emailSwitch} accessibilityRole="switch" accessibilityState={{checked:areAllEmailCategoriesEnabled(prefs),disabled:state.saving}} disabled={state.saving} value={areAllEmailCategoriesEnabled(prefs)} onValueChange={checked=>schedulePersist(toggleAllEmailCategories(prefs,checked))}/></View>{state.error?<Text accessibilityRole="alert" style={s.error}>{state.error}</Text>:null}</></ScrollView>}</Shell>}

const travelDefaults:TravelPreferences={homeAirport:"",preferredAirlines:[],notificationPreferences:{emailUpdates:false,priceAlertEmails:false,travelInspirationEmails:false}};
export function TravelPreferencesScreen() {
  const { theme } = useAppTheme();
  const { t } = useMobileLocalization();
  const { state, stateRef, commit } = useAsyncDraftModel(travelDefaults);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [errorAction, setErrorAction] = useState<"load" | "save" | null>(null);
  const [airportQuery, setAirportQuery] = useState("");
  const [airlineQuery, setAirlineQuery] = useState("");
  const [airportOpen, setAirportOpen] = useState(false);
  const [airlineOpen, setAirlineOpen] = useState(false);
  const [airportResults, setAirportResults] = useState<TravelAirportSuggestion[]>([]);
  const [airportSearchStatus, setAirportSearchStatus] = useState<"idle" | "searching" | "success" | "error">("idle");
  const [selectedLiveAirport, setSelectedLiveAirport] = useState<TravelAirportSuggestion | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [revertConfirmation, setRevertConfirmation] = useState(false);
  const airportRequestVersion = useRef(0);
  const saveSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revertConfirmationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSaveSuccess = useCallback(() => {
    if (saveSuccessTimer.current) clearTimeout(saveSuccessTimer.current);
    saveSuccessTimer.current = null;
    setSaveSuccess(false);
  }, []);
  const clearRevertConfirmation = useCallback(() => {
    if (revertConfirmationTimer.current) clearTimeout(revertConfirmationTimer.current);
    revertConfirmationTimer.current = null;
    setRevertConfirmation(false);
  }, []);
  const showSaveSuccess = useCallback(() => {
    if (saveSuccessTimer.current) clearTimeout(saveSuccessTimer.current);
    setSaveSuccess(true);
    saveSuccessTimer.current = setTimeout(() => {
      saveSuccessTimer.current = null;
      setSaveSuccess(false);
    }, 1500);
  }, []);
  const showRevertConfirmation = useCallback(() => {
    if (revertConfirmationTimer.current) clearTimeout(revertConfirmationTimer.current);
    setRevertConfirmation(true);
    revertConfirmationTimer.current = setTimeout(() => {
      revertConfirmationTimer.current = null;
      setRevertConfirmation(false);
    }, 2000);
  }, []);
  const closeAirportSelector = useCallback(() => {
    airportRequestVersion.current += 1;
    setAirportQuery("");
    setAirportResults([]);
    setAirportSearchStatus("idle");
    setAirportOpen(false);
  }, []);
  const closeAirlineSelector = useCallback(() => {
    setAirlineQuery("");
    setAirlineOpen(false);
  }, []);
  const closeSelectors = useCallback(() => {
    closeAirportSelector();
    closeAirlineSelector();
  }, [closeAirlineSelector, closeAirportSelector]);
  const load = useCallback(async () => {
    if (!await requireAccount("/travel-preferences")) return;
    const started = beginLoad(stateRef.current); setErrorAction(null); commit(started.state);
    try {
      const response = await travelApi.travelPreferences();
      const finished = finishLoad(stateRef.current, started.token, started.editVersion, response.preferences);
      commit(finished);
      if (finished.requestVersion === started.token) setHasLoaded(true);
      setErrorAction(null);
    } catch (error) {
      setErrorAction("load");
      commit(failLoad(stateRef.current, started.token, error instanceof TravelApiError ? error.message : t("travelLoadError")));
    }
  }, [commit, stateRef, t]);
  useFocusEffect(useCallback(() => {
    void load();
    return () => {
      airportRequestVersion.current += 1;
      clearSaveSuccess();
      clearRevertConfirmation();
      stateRef.current = invalidateRequests(stateRef.current);
    };
  }, [clearRevertConfirmation, clearSaveSuccess, load, stateRef]));

  useEffect(() => {
    const query = airportQuery.trim();
    if (!airportOpen || !query) {
      airportRequestVersion.current += 1;
      setAirportResults([]); setAirportSearchStatus("idle");
      return undefined;
    }
    setAirportResults([]);
    setAirportSearchStatus("searching");
    const controller = new AbortController();
    const version = ++airportRequestVersion.current;
    const timer = setTimeout(() => {
      if (version !== airportRequestVersion.current) return;
      void searchTravelAirports(query, { signal: controller.signal }).then(results => {
        if (version !== airportRequestVersion.current || controller.signal.aborted) return;
        setAirportResults(results); setAirportSearchStatus("success");
      }).catch(() => {
        if (version !== airportRequestVersion.current || controller.signal.aborted) return;
        setAirportResults([]); setAirportSearchStatus("error");
      });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [airportOpen, airportQuery]);

  const value = state.draft;
  const localAirport = useMemo(() => airportPreferenceValue(value.homeAirport, airports), [value.homeAirport]);
  const selectedAirport = localAirport ?? (selectedLiveAirport?.code === value.homeAirport.toUpperCase() ? selectedLiveAirport : undefined);
  const airportSearchValue = selectedAirport ? `${selectedAirport.code} ${selectedAirport.airport}` : value.homeAirport;
  const airlineResults = useMemo(() => airlineOpen && airlineQuery.trim() && value.preferredAirlines.length < 10 ? filterAirlinePreferences(airlines, airlineQuery, value.preferredAirlines) : [], [airlineOpen, airlineQuery, value.preferredAirlines]);
  const change = (next: TravelPreferences) => { clearSaveSuccess(); clearRevertConfirmation(); commit(editDraft(stateRef.current, next)); };
  const dirty = isDirty(state);
  const revert = () => {
    if (!dirty || state.saving) return;
    setErrorAction(null); commit({ ...editDraft(stateRef.current, state.saved), error: "" });
    closeSelectors(); Keyboard.dismiss(); showRevertConfirmation();
  };
  const save = async () => {
    const started = beginSave(stateRef.current); if (!started) return;
    clearSaveSuccess(); clearRevertConfirmation(); setErrorAction(null); commit(started.state);
    try {
      const response = await travelApi.updateTravelPreferences({ homeAirport: started.value.homeAirport, preferredAirlines: started.value.preferredAirlines });
      const finished = commit(finishSave(stateRef.current, started.token, started.editVersion, response.preferences));
      setErrorAction(null); closeSelectors(); Keyboard.dismiss();
      if (!isDirty(finished)) {
        showSaveSuccess();
        AccessibilityInfo.announceForAccessibility(t("travelSaved"));
      }
    } catch (error) {
      setErrorAction("save");
      commit(failSave(stateRef.current, started.token, error instanceof TravelApiError ? error.message : t("travelSaveError")));
    }
  };
  const airportStatus = airportOpen && airportQuery.trim() ? airportSearchStatus : "idle";

  return <Shell title={t("travelPreferences")}>{state.loading && !hasLoaded ? <PageContentState state="loading" pageName="travel preferences" /> : !hasLoaded && state.error ? <PageContentState state="error" pageName="travel preferences" onRetry={() => void load()} /> : <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}><>
    <View style={s.preferenceSection}><Text style={[s.label, { color: theme.text }]}>{t("homeAirport")}</Text>
      <View style={[s.selector, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        {value.homeAirport && !airportOpen ? <View style={s.selectedAirport}><Pressable accessibilityRole="button" accessibilityLabel={`${t("homeAirport")}: ${selectedAirport ? `${selectedAirport.code}, ${selectedAirport.airport}, ${selectedAirport.country ? `${selectedAirport.city}, ${selectedAirport.country}` : selectedAirport.city}` : value.homeAirport}`} onPress={() => { setAirportQuery(airportSearchValue); setAirportResults([]); setAirportSearchStatus("searching"); setAirportOpen(true); }} style={s.selectorValue}><Text style={[s.selectorPrimary, { color: theme.text }]}>{selectedAirport?.code ?? value.homeAirport}</Text>{selectedAirport ? <><Text style={[s.selectorSecondary, { color: theme.text }]}>{selectedAirport.airport}</Text><Text style={[s.help, { color: theme.muted }]}>{selectedAirport.country ? `${selectedAirport.city}, ${selectedAirport.country}` : selectedAirport.city}</Text></> : null}</Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${t("clear")} ${t("homeAirport")}`} onPress={() => { change({ ...value, homeAirport: "" }); closeAirportSelector(); }} style={s.clearButton}><Text style={[s.clearIcon, { color: theme.muted }]}>×</Text></Pressable></View> :
        <TextInput accessibilityLabel={t("airportSearch")} autoFocus={airportOpen} selectTextOnFocus={Boolean(value.homeAirport)} autoCapitalize="characters" autoCorrect={false} placeholder={t("airportSearch")} placeholderTextColor={theme.muted} value={airportQuery} onFocus={() => setAirportOpen(true)} onBlur={() => { setTimeout(closeAirportSelector, 0); }} onChangeText={query => { setAirportQuery(query); setAirportResults([]); setAirportSearchStatus(query.trim() ? "searching" : "idle"); setAirportOpen(true); }} style={[s.selectorInput, { color: theme.text }]} />}</View>
      {airportStatus === "searching" ? <Text accessibilityLiveRegion="polite" style={[s.help, { color: theme.muted }]}>{t("airportSearching")}</Text> : null}
      {airportStatus === "success" && airportResults.length === 0 ? <Text accessibilityLiveRegion="polite" style={[s.help, { color: theme.muted }]}>{t("airportNoResults")}</Text> : null}
      {airportStatus === "error" ? <Text accessibilityRole="alert" style={s.error}>{t("airportSearchError")}</Text> : null}
      {airportStatus === "success" && airportResults.length ? <View style={[s.suggestions, { borderColor: theme.border }]}>{airportResults.map(airport => <Pressable key={airport.code} accessibilityRole="button" accessibilityLabel={`${airport.code}, ${airport.airport}, ${airport.country ? `${airport.city}, ${airport.country}` : airport.city}`} accessibilityState={{ selected: value.homeAirport === airport.code }} onPress={() => { setSelectedLiveAirport(airport); change({ ...value, homeAirport: airport.code }); closeAirportSelector(); Keyboard.dismiss(); }} style={[s.option, { borderColor: theme.border }]}><Text style={[s.question, { color: theme.text }]}>{airport.code} · {airport.airport}</Text><Text style={[s.help, { color: theme.muted }]}>{airport.country ? `${airport.city}, ${airport.country}` : airport.city}</Text></Pressable>)}</View> : null}
    </View>
    <View style={s.preferenceSection}><View style={s.sectionHeading}><Text style={[s.label, { color: theme.text }]}>{t("preferredAirlines")}</Text>{value.preferredAirlines.length ? <Pressable accessibilityRole="button" onPress={() => { change({ ...value, preferredAirlines: [] }); closeAirlineSelector(); }} style={s.subtleAction}><Text style={s.link}>{t("clearAll")}</Text></Pressable> : null}</View>
      <Text accessibilityLiveRegion="polite" style={[s.help, { color: theme.muted }]}>{t("airlineSelectedCount").replace("{{count}}", String(value.preferredAirlines.length))}</Text>
      <Text style={[s.help, { color: theme.muted }]}>{t("airlineChooseHelp")}</Text>
      <View style={[s.selector, s.multiSelector, { borderColor: theme.border, backgroundColor: theme.surface }]}>{value.preferredAirlines.map(code => { const label = airlinePreferenceLabel(code, airlines); return <Pressable key={code} accessibilityRole="button" accessibilityLabel={`${t("remove")} ${label}`} onPress={() => change({ ...value, preferredAirlines: value.preferredAirlines.filter(item => item !== code) })} style={[s.selectedChip, { borderColor: theme.border }]}><Text style={[s.chipText, { color: theme.text }]}>{label} ×</Text></Pressable>; })}<TextInput accessibilityLabel={t("airlineSearch")} editable={value.preferredAirlines.length < 10} placeholder={value.preferredAirlines.length >= 10 ? undefined : t("airlineSearch")} placeholderTextColor={theme.muted} value={airlineQuery} onFocus={() => setAirlineOpen(true)} onBlur={() => { setTimeout(closeAirlineSelector, 0); }} onChangeText={query => { setAirlineQuery(query); setAirlineOpen(true); }} style={[s.multiInput, { color: theme.text }]} /></View>
      {airlineResults.length ? <View style={[s.suggestions, { borderColor: theme.border }]}>{airlineResults.map(airline => <Pressable key={airline.code} accessibilityRole="button" accessibilityLabel={`${airline.name}, ${airline.code}`} onPress={() => { change({ ...value, preferredAirlines: addAirline(value.preferredAirlines, airline.code) }); closeAirlineSelector(); Keyboard.dismiss(); }} style={[s.option, { borderColor: theme.border }]}><Text style={[s.question, { color: theme.text }]}>{airline.name} ({airline.code})</Text></Pressable>)}</View> : null}
      {value.preferredAirlines.length >= 10 ? <Text accessibilityRole="alert" style={s.error}>{t("airlineMaximum")}</Text> : null}
    </View>
    {state.error ? <ErrorNotice text={state.error} retry={errorAction === "save" ? () => void save() : () => void load()} /> : null}
    {revertConfirmation ? <Text accessibilityLiveRegion="polite" style={s.success}>{t("travelReverted")}</Text> : null}
    {dirty ? <Text style={[s.help, { color: theme.muted }]}>{t("unsavedChanges")}</Text> : null}
    <View style={s.travelActions}><Pressable accessibilityRole="button" accessibilityState={{ disabled: !dirty || state.saving }} disabled={!dirty || state.saving} onPress={revert} style={[s.secondaryButton, { borderColor: theme.border }, (!dirty || state.saving) && s.disabled]}><Text style={[s.secondaryButtonText, { color: theme.text }]}>{t("revertChanges")}</Text></Pressable><View style={s.actionButton}><Button label={state.saving ? t("saving") : saveSuccess ? `✓ ${t("saved")}` : t("save")} accessibilityLabel={saveSuccess ? t("saved") : undefined} onPress={() => void save()} disabled={!dirty || state.saving} /></View></View>
  </></ScrollView>}</Shell>;
}
const s=StyleSheet.create({safe:{flex:1},flex:{flex:1},header:{minHeight:62,flexDirection:"row",alignItems:"center"},hit:{width:52,minHeight:52,alignItems:"center",justifyContent:"center"},title:{flex:1,textAlign:"center",fontSize:22,lineHeight:28,fontWeight:"800"},content:{padding:18,paddingBottom:40,gap:12},intro:{fontSize:15,lineHeight:22},field:{gap:6},label:{fontSize:14,fontWeight:"800",marginTop:5},input:{minHeight:50,borderWidth:1,borderRadius:12,paddingHorizontal:14,fontSize:16},multiline:{minHeight:130,textAlignVertical:"top",paddingTop:13},card:{borderWidth:1,borderRadius:14,padding:15,gap:10},row:{flexDirection:"row",alignItems:"center",gap:10},question:{flex:1,fontSize:16,lineHeight:22,fontWeight:"700"},answer:{fontSize:15,lineHeight:22},empty:{textAlign:"center",padding:28},button:{minHeight:52,borderRadius:12,backgroundColor:"#0754F7",alignItems:"center",justifyContent:"center",paddingHorizontal:18},buttonText:{color:"white",fontSize:16,fontWeight:"800"},disabled:{opacity:.45},error:{color:"#D92D20",fontSize:14,lineHeight:20},success:{color:"#16803C",fontWeight:"700"},link:{color:"#0754F7",fontWeight:"700"},linkHit:{minHeight:44,justifyContent:"center",alignSelf:"flex-start"},help:{fontSize:13,lineHeight:19},supportIntro:{flexDirection:"row",alignItems:"flex-start",gap:9,paddingVertical:3},supportIntroText:{flex:1,fontSize:14,lineHeight:20},supportSection:{gap:8},categoryGrid:{flexDirection:"row",flexWrap:"wrap",gap:8},categoryOption:{flexGrow:1,flexBasis:"47%",minWidth:0,minHeight:50,borderWidth:1,borderRadius:12,paddingHorizontal:12,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6},categoryText:{flexShrink:1,fontSize:14,lineHeight:18,fontWeight:"700",textAlign:"center"},center:{flex:1,padding:24,alignItems:"center",justifyContent:"center",gap:18},switchRow:{minHeight:76,borderWidth:1,borderRadius:14,padding:14,flexDirection:"row",alignItems:"center",gap:12},option:{minHeight:56,borderBottomWidth:StyleSheet.hairlineWidth,paddingVertical:9,justifyContent:"center"},emailSectionGroup:{marginTop:16},emailSection:{fontSize:12,lineHeight:16,fontWeight:"800",letterSpacing:.6,marginBottom:4},emailRow:{minHeight:76,paddingVertical:12,flexDirection:"row",alignItems:"flex-start",gap:12,borderBottomWidth:StyleSheet.hairlineWidth},emailRowCopy:{flex:1,minWidth:0,gap:2},emailDescription:{textAlign:"left"},emailSwitch:{flexShrink:0},masterRow:{marginTop:16,paddingVertical:12,flexDirection:"row",alignItems:"flex-start",gap:12,borderTopWidth:StyleSheet.hairlineWidth},preferenceSection:{gap:8,marginBottom:8},sectionHeading:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},selector:{minHeight:54,borderWidth:1,borderRadius:10,paddingHorizontal:12,justifyContent:"center"},selectorInput:{minHeight:52,fontSize:16,padding:0},selectedAirport:{flexDirection:"row",alignItems:"center",paddingVertical:10},selectorValue:{flex:1,gap:2},selectorPrimary:{fontSize:16,fontWeight:"800"},selectorSecondary:{fontSize:14,lineHeight:19,fontWeight:"600"},clearButton:{width:40,minHeight:44,alignItems:"flex-end",justifyContent:"center"},clearIcon:{fontSize:26,lineHeight:28},suggestions:{borderWidth:1,borderTopWidth:0,paddingHorizontal:12},subtleAction:{minHeight:40,justifyContent:"center"},multiSelector:{paddingVertical:9,flexDirection:"row",flexWrap:"wrap",alignItems:"center",gap:7},selectedChip:{minHeight:36,borderWidth:1,borderRadius:18,paddingHorizontal:11,justifyContent:"center",maxWidth:"100%"},chipText:{fontSize:14,fontWeight:"600"},multiInput:{minWidth:150,flexGrow:1,minHeight:38,fontSize:16,padding:0},travelActions:{flexDirection:"row",gap:10,marginTop:4},secondaryButton:{flex:1,minHeight:48,borderWidth:1,borderRadius:10,alignItems:"center",justifyContent:"center",paddingHorizontal:10},secondaryButtonText:{fontSize:14,fontWeight:"800",textAlign:"center"},actionButton:{flex:1}});
