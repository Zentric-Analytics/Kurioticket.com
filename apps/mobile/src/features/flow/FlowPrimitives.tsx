import { useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { FlowIcon, type FlowIconName } from "./FlowIcon";
import { flowColors, flowStyles, useFlowTheme } from "./flowStyles";

export function ScreenHeader({
  title,
  back = false,
  settings = false,
}: {
  title: string;
  back?: boolean;
  settings?: boolean;
}) {
  const ft = useFlowTheme();
  return (
    <View style={ft.styles.header}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={ft.styles.iconButton}
        >
          <FlowIcon name="back" color={ft.colors.icon} />
        </Pressable>
      ) : (
        <Text accessibilityRole="header" style={ft.styles.title}>
          {title}
        </Text>
      )}
      {back ? (
        <Text
          accessibilityRole="header"
          style={[ft.styles.title, styles.centerTitle]}
        >
          {title}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => router.push("/notifications")}
          style={ft.styles.iconButton}
        >
          <FlowIcon name="bell" color={ft.colors.icon} />
        </Pressable>
        {settings ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => router.push("/settings")}
            style={ft.styles.iconButton}
          >
            <FlowIcon name="settings" color={ft.colors.icon} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function PickerSheetHeader({ title, onClose, closeLabel }: { title: string; onClose: () => void; closeLabel?: string }) {
  const ft = useFlowTheme();
  return <View style={styles.pickerSheetHeader}>
    <Text accessibilityRole="header" style={[ft.styles.title, styles.pickerSheetTitle]}>{title}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={closeLabel ?? `Close ${title}`} accessibilityHint="Discards uncommitted changes" onPress={onClose} style={({ pressed }) => [ft.styles.iconButton, pressed && ft.styles.pressed]}>
      <FlowIcon name="close" size={22} color={ft.colors.icon}/>
    </Pressable>
  </View>;
}

export function Segments<T extends string>({
  value,
  options,
  onChange,
  appearance = "default",
}: {
  value: T;
  options: readonly {
    value: T;
    label: string;
    icon?: FlowIconName;
    disabled?: boolean;
    accessibilityHint?: string;
  }[];
  onChange: (value: T) => void;
  appearance?: "default" | "filled";
}) {
  const ft = useFlowTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.segments, { borderBottomColor: ft.colors.border }]}
    >
      {options.map((item) => {
        const selected = !item.disabled && value === item.value;
        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityHint={item.accessibilityHint}
            accessibilityState={{ selected, disabled: item.disabled }}
            disabled={item.disabled}
            onPress={() => onChange(item.value)}
            style={({ pressed }) => [
              styles.segment,
              appearance === "filled" && styles.filledSegment,
              appearance === "filled" && item.disabled && styles.disabledSegment,
              selected && (appearance === "filled" ? styles.filledSegmentActive : styles.segmentActive),
              pressed && !item.disabled && ft.styles.pressed,
            ]}
          >
            {item.icon ? (
              <FlowIcon
                name={item.icon}
                size={21}
                color={selected ? flowColors.blue : ft.colors.icon}
              />
            ) : null}
            <Text
              style={[
                styles.segmentText,
                { color: item.disabled ? ft.colors.secondaryText : ft.colors.text },
                selected && (appearance === "filled" ? styles.filledSegmentTextActive : styles.segmentTextActive),
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({
  label,
  value,
  meta,
  icon,
  onPress,
  trailing,
}: {
  label: string;
  value: string;
  meta?: string;
  icon?: FlowIconName;
  onPress?: () => void;
  trailing?: ReactNode;
}) {
  const ft = useFlowTheme();
  const content = (
    <>
      {icon ? <FlowIcon name={icon} size={22} color={ft.colors.icon} /> : null}
      <View style={styles.grow}>
        <Text style={ft.styles.label}>{label}</Text>
        <Text style={ft.styles.value}>{value}</Text>
        {meta ? <Text style={ft.styles.meta}>{meta}</Text> : null}
      </View>
      {trailing}
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.field,
        {
          borderBottomColor: ft.colors.border,
          backgroundColor: ft.colors.input,
        },
        pressed && ft.styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  ) : (
    <View
      style={[
        styles.field,
        {
          borderBottomColor: ft.colors.border,
          backgroundColor: ft.colors.input,
        },
      ]}
    >
      {content}
    </View>
  );
}

export function CompactSearchField({
  label,
  value,
  meta,
  icon,
  muted = false,
  onPress,
  trailing,
  valueNumberOfLines = 1,
}: {
  label: string;
  value: string;
  meta?: string;
  icon: FlowIconName;
  muted?: boolean;
  onPress: () => void;
  trailing?: ReactNode;
  valueNumberOfLines?: number;
}) {
  const ft = useFlowTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[label, value, meta].filter(Boolean).join(", ")}
      onPress={onPress}
      style={({ pressed }) => [
        styles.compactField,
        { backgroundColor: ft.colors.input, borderBottomColor: ft.colors.border },
        pressed && ft.styles.pressed,
      ]}
    >
      <Text style={[styles.compactLabel, { color: ft.colors.secondaryText }]}>
        {label.toUpperCase()}
      </Text>
      <View style={styles.compactValueRow}>
        <FlowIcon name={icon} size={18} color={ft.colors.icon} />
        <View style={styles.compactTextColumn}>
          <Text numberOfLines={valueNumberOfLines} style={[styles.compactValue, { color: muted ? ft.colors.placeholder : ft.colors.text }]}>{value}</Text>
          {meta ? <Text style={[styles.compactMeta, { color: ft.colors.secondaryText }]}>{meta}</Text> : null}
        </View>
        {trailing ?? <FlowIcon name="chevron" size={16} color={ft.colors.icon} />}
      </View>
    </Pressable>
  );
}

export function ChoiceSheet<T extends string>({
  visible,
  title,
  choices,
  onChoose,
  onClose,
}: {
  visible: boolean;
  title: string;
  choices: readonly { value: T; label: string; meta?: string }[];
  onChoose: (value: T) => void;
  onClose: () => void;
}) {
  const ft = useFlowTheme();
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: ft.colors.overlay }]}
        onPress={onClose}
      >
        <Pressable
          accessibilityViewIsModal
          style={[styles.sheet, { backgroundColor: ft.colors.surface }]}
        >
          <View style={styles.handle} />
          <Text accessibilityRole="header" style={ft.styles.title}>
            {title}
          </Text>
          <ScrollView>
            {choices.map((choice) => (
              <Pressable
                key={choice.value}
                accessibilityRole="button"
                onPress={() => onChoose(choice.value)}
                style={[styles.choice, { borderBottomColor: ft.colors.border }]}
              >
                <Text style={ft.styles.value}>{choice.label}</Text>
                {choice.meta ? (
                  <Text style={ft.styles.meta}>{choice.meta}</Text>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon = "search",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  icon?: FlowIconName | null;
  disabled?: boolean;
}) {
  const ft = useFlowTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [ft.styles.primary, disabled && { opacity: 0.6 }, pressed && ft.styles.pressed]}
    >
      {icon ? <FlowIcon name={icon} color="white" /> : null}
      <Text style={ft.styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function UnavailableNotice({ text }: { text: string }) {
  const ft = useFlowTheme();
  return (
    <Text
      accessibilityRole="alert"
      style={[
        styles.notice,
        { backgroundColor: ft.colors.notice, color: ft.colors.secondaryText },
      ]}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  pickerSheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerSheetTitle: { flex: 1, minWidth: 0 },
  centerTitle: {
    position: "absolute",
    left: 60,
    right: 60,
    textAlign: "center",
  },
  actions: { flexDirection: "row", marginLeft: "auto" },
  segments: {
    minHeight: 51,
    flexDirection: "row",
    borderBottomColor: flowColors.border,
    borderBottomWidth: 1,
  },
  segment: {
    flex: 1,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  segmentActive: { borderBottomColor: flowColors.blue, borderBottomWidth: 2 },
  filledSegment: { margin: 4, minHeight: 44, borderRadius: 10 },
  filledSegmentActive: { backgroundColor: flowColors.blue },
  filledSegmentTextActive: { color: flowColors.white },
  disabledSegment: { opacity: 0.48 },
  segmentText: {
    color: flowColors.navy,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  segmentTextActive: { color: flowColors.blue, fontWeight: "800" },
  field: {
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomColor: flowColors.border,
    borderBottomWidth: 1,
  },
  grow: { flex: 1 },
  compactField: { minHeight: 66, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, justifyContent: "center", gap: 4 },
  compactLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  compactValueRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  compactTextColumn: { flex: 1, minWidth: 0 },
  compactValue: { fontSize: 15, fontWeight: "600", flexShrink: 1 },
  compactMeta: { fontSize: 12, lineHeight: 17, marginTop: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "#071A4866",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "70%",
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: flowColors.border,
  },
  choice: {
    minHeight: 58,
    justifyContent: "center",
    borderBottomColor: flowColors.border,
    borderBottomWidth: 1,
  },
  notice: {
    color: flowColors.muted,
    fontSize: 12,
    lineHeight: 17,
    padding: 10,
    backgroundColor: "#F2F6FF",
    borderRadius: 8,
  },
});
