import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getGeneralFaqs } from "../../../../../src/content/faqs";
import { getTranslations } from "../../../../../src/lib/i18n";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { useAppTheme } from "../../theme/AppTheme";
import { FlowIcon } from "../flow/FlowIcon";
import { faqAccessibility, toggleExpanded } from "./nativeAccountModels";

export function MobileFaqScreen() {
  const { theme } = useAppTheme();
  const { t, locale } = useMobileLocalization();
  const [open, setOpen] = useState<string | null>(null);
  const webTranslations = useMemo(() => getTranslations(locale), [locale]);
  const faqs = useMemo(
    () => getGeneralFaqs((key) => t(key as Parameters<typeof t>[0])),
    [t],
  );
  const supportSuffix = webTranslations.faqNeedMoreHelpSuffix ?? "";

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("back")}
          onPress={() => router.back()}
          style={s.headerHit}
        >
          <FlowIcon name="back" color={theme.icon} />
        </Pressable>
        <Text accessibilityRole="header" style={[s.headerTitle, { color: theme.text }]}>
          {t("faqTitle")}
        </Text>
        <View style={s.headerHit} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <Text accessibilityRole="header" style={[s.heading, { color: theme.text }]}>
            {webTranslations.faqHeading}
          </Text>
          <Text style={[s.intro, { color: theme.muted }]}>
            {webTranslations.faqIntro}
          </Text>
        </View>

        <View style={s.faqSection}>
          <Text accessibilityRole="header" style={[s.sectionTitle, { color: theme.text }]}>
            {webTranslations.faqGeneralQuestions}
          </Text>

          <View style={s.faqList}>
            {faqs.map((item) => {
              const accessibilityState = faqAccessibility(open, item.question);
              return (
                <Pressable
                  key={item.question}
                  accessibilityRole="button"
                  accessibilityState={accessibilityState}
                  accessibilityHint={accessibilityState.expanded ? t("collapseAnswer") : t("expandAnswer")}
                  onPress={() => setOpen((current) => toggleExpanded(current, item.question))}
                  style={[s.faqRow, { borderColor: theme.border }]}
                >
                  <View style={s.questionRow}>
                    <Text style={[s.question, { color: theme.text }]}>{item.question}</Text>
                    <Text
                      aria-hidden
                      style={[s.expandIndicator, { color: theme.muted }]}
                    >
                      {accessibilityState.expanded ? "−" : "+"}
                    </Text>
                  </View>
                  {accessibilityState.expanded ? (
                    <Text style={[s.answer, { color: theme.muted }]}>{item.answer}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[s.supportCta, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[s.supportCopy, { color: theme.text }]}>
            {webTranslations.faqNeedMoreHelpPrefix}
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push("/support")}
            style={s.supportLinkHit}
          >
            <Text style={s.supportLink}>{webTranslations.faqSupportPage}</Text>
          </Pressable>
          {supportSuffix ? (
            <Text style={[s.supportCopy, { color: theme.muted }]}>{supportSuffix}</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 62, flexDirection: "row", alignItems: "center" },
  headerHit: { width: 52, minHeight: 52, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 22, lineHeight: 28, fontWeight: "800" },
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 40 },
  hero: { maxWidth: 620 },
  heading: { fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.4 },
  intro: { marginTop: 10, fontSize: 15, lineHeight: 23 },
  faqSection: { marginTop: 34 },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: "800" },
  faqList: { marginTop: 12 },
  faqRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 16 },
  questionRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  question: { flex: 1, fontSize: 16, lineHeight: 23, fontWeight: "700" },
  expandIndicator: { width: 22, textAlign: "center", fontSize: 22, lineHeight: 24, fontWeight: "400" },
  answer: { marginTop: 8, paddingRight: 38, fontSize: 15, lineHeight: 22 },
  supportCta: { marginTop: 28, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 16 },
  supportCopy: { fontSize: 14, lineHeight: 21, fontWeight: "500" },
  supportLinkHit: { alignSelf: "flex-start", minHeight: 40, justifyContent: "center" },
  supportLink: { color: "#0754F7", fontSize: 14, lineHeight: 21, fontWeight: "800" },
});
