import { useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { FlowIcon, type FlowIconName } from "./FlowIcon";
import { flowColors, flowStyles } from "./flowStyles";

export function ScreenHeader({ title, back = false, settings = false }: { title: string; back?: boolean; settings?: boolean }) {
  return <View style={flowStyles.header}>
    {back ? <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={flowStyles.iconButton}><FlowIcon name="back" /></Pressable> : <Text accessibilityRole="header" style={flowStyles.title}>{title}</Text>}
    {back ? <Text accessibilityRole="header" style={[flowStyles.title, styles.centerTitle]}>{title}</Text> : null}
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={flowStyles.iconButton}><FlowIcon name="bell" /></Pressable>
      {settings ? <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push("/settings")} style={flowStyles.iconButton}><FlowIcon name="settings" /></Pressable> : null}
    </View>
  </View>;
}

export function Segments<T extends string>({ value, options, onChange }: { value: T; options: readonly { value: T; label: string; icon?: FlowIconName }[]; onChange: (value: T) => void }) {
  return <View accessibilityRole="tablist" style={styles.segments}>{options.map((item) => {
    const selected = value === item.value;
    return <Pressable key={item.value} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => onChange(item.value)} style={({ pressed }) => [styles.segment, selected && styles.segmentActive, pressed && flowStyles.pressed]}>
      {item.icon ? <FlowIcon name={item.icon} size={21} color={selected ? flowColors.blue : flowColors.navy} /> : null}
      <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{item.label}</Text>
    </Pressable>;
  })}</View>;
}

export function Field({ label, value, meta, icon, onPress, trailing }: { label: string; value: string; meta?: string; icon?: FlowIconName; onPress?: () => void; trailing?: ReactNode }) {
  const content = <>{icon ? <FlowIcon name={icon} size={22} /> : null}<View style={styles.grow}><Text style={flowStyles.label}>{label}</Text><Text style={flowStyles.value}>{value}</Text>{meta ? <Text style={flowStyles.meta}>{meta}</Text> : null}</View>{trailing}</>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${value}`} onPress={onPress} style={({ pressed }) => [styles.field, pressed && flowStyles.pressed]}>{content}</Pressable> : <View style={styles.field}>{content}</View>;
}

export function ChoiceSheet<T extends string>({ visible, title, choices, onChoose, onClose }: { visible: boolean; title: string; choices: readonly { value: T; label: string; meta?: string }[]; onChoose: (value: T) => void; onClose: () => void }) {
  return <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}><Pressable style={styles.overlay} onPress={onClose}><Pressable accessibilityViewIsModal style={styles.sheet}>
    <View style={styles.handle} /><Text accessibilityRole="header" style={flowStyles.title}>{title}</Text>
    <ScrollView>{choices.map((choice) => <Pressable key={choice.value} accessibilityRole="button" onPress={() => onChoose(choice.value)} style={styles.choice}><Text style={flowStyles.value}>{choice.label}</Text>{choice.meta ? <Text style={flowStyles.meta}>{choice.meta}</Text> : null}</Pressable>)}</ScrollView>
  </Pressable></Pressable></Modal>;
}

export function PrimaryButton({ label, onPress, icon = "search" }: { label: string; onPress: () => void; icon?: FlowIconName }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [flowStyles.primary, pressed && flowStyles.pressed]}><FlowIcon name={icon} color="white" /><Text style={flowStyles.primaryText}>{label}</Text></Pressable>;
}

export function UnavailableNotice({ text }: { text: string }) {
  return <Text accessibilityRole="alert" style={styles.notice}>{text}</Text>;
}

const styles = StyleSheet.create({
  centerTitle: { position: "absolute", left: 60, right: 60, textAlign: "center" },
  actions: { flexDirection: "row", marginLeft: "auto" },
  segments: { minHeight: 51, flexDirection: "row", borderBottomColor: flowColors.border, borderBottomWidth: 1 },
  segment: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 4 },
  segmentActive: { borderBottomColor: flowColors.blue, borderBottomWidth: 2 },
  segmentText: { color: flowColors.navy, fontSize: 11, fontWeight: "600", textAlign: "center" },
  segmentTextActive: { color: flowColors.blue, fontWeight: "800" },
  field: { minHeight: 68, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10, borderBottomColor: flowColors.border, borderBottomWidth: 1 },
  grow: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "#071A4866", justifyContent: "flex-end" },
  sheet: { maxHeight: "70%", backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  handle: { alignSelf: "center", width: 42, height: 5, borderRadius: 3, backgroundColor: flowColors.border },
  choice: { minHeight: 58, justifyContent: "center", borderBottomColor: flowColors.border, borderBottomWidth: 1 },
  notice: { color: flowColors.muted, fontSize: 12, lineHeight: 17, padding: 10, backgroundColor: "#F2F6FF", borderRadius: 8 },
});
