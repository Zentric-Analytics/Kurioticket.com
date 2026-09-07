import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { wheelIndex } from "./personalDetailsEditorModel";

type Option = { value: string; label: string };

export function PersonalDetailsDateWheel({
  label,
  options,
  value,
  disabled,
  onChange,
  onScrollingChange,
}: {
  label: string;
  options: Option[];
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onScrollingChange: (scrolling: boolean) => void;
}) {
  const { theme } = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const rowHeight = Math.max(50, Math.ceil(28 * fontScale));
  const selected = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const initialOffset = useRef({ x: 0, y: selected * rowHeight }).current;
  const scroll = useRef<ScrollView>(null);
  const position = useRef(new Animated.Value(initialOffset.y)).current;
  const offset = useRef(initialOffset.y);
  const dragging = useRef(false);
  const moving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ options, value, onChange, onScrollingChange });
  latest.current = { options, value, onChange, onScrollingChange };
  const [reduceMotion, setReduceMotion] = useState(false);
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const setMoving = (next: boolean) => {
    moving.current = next;
    latest.current.onScrollingChange(next);
  };
  const settle = () => {
    clearTimer();
    if (dragging.current) return;
    const index = wheelIndex(
      offset.current,
      rowHeight,
      latest.current.options.length,
    );
    const y = index * rowHeight;
    offset.current = y;
    scroll.current?.scrollTo({ y, animated: false });
    position.setValue(y);
    latest.current.onChange(latest.current.options[index].value);
    setMoving(false);
  };
  const scheduleSettle = () => {
    clearTimer();
    timer.current = setTimeout(settle, 160);
  };
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduceMotion(value);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => {
      active = false;
      subscription.remove();
      clearTimer();
    };
  }, []);
  useEffect(() => {
    // A changed month/year can shorten an adjacent wheel. Reconcile its
    // position with the clamped date, including after an accessibility action.
    if (moving.current) return;
    const y = selected * rowHeight;
    offset.current = y;
    scroll.current?.scrollTo({ y, animated: false });
    position.setValue(y);
  }, [selected, rowHeight, options.length, position]);
  const choose = (index: number) => {
    if (disabled) return;
    const y = Math.max(0, Math.min(options.length - 1, index)) * rowHeight;
    setMoving(true);
    offset.current = y;
    scroll.current?.scrollTo({ y, animated: !reduceMotion });
    if (reduceMotion) settle();
    else scheduleSettle();
  };
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{
        text: options[selected].label,
        min: 1,
        max: options.length,
        now: selected + 1,
      }}
      accessibilityState={{ disabled }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) =>
        choose(
          selected + (event.nativeEvent.actionName === "increment" ? 1 : -1),
        )
      }
      style={[s.column, { height: rowHeight * 3 }]}
    >
      <Animated.ScrollView
        ref={scroll}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        scrollEnabled={!disabled}
        contentOffset={initialOffset}
        contentContainerStyle={{ paddingVertical: rowHeight }}
        showsVerticalScrollIndicator={false}
        snapToInterval={rowHeight}
        decelerationRate="fast"
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          clearTimer();
          dragging.current = true;
          setMoving(true);
        }}
        onScrollEndDrag={() => {
          dragging.current = false;
          scheduleSettle();
        }}
        onMomentumScrollBegin={() => {
          clearTimer();
          setMoving(true);
        }}
        onMomentumScrollEnd={(event) => {
          offset.current = event.nativeEvent.contentOffset.y;
          settle();
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: position } } }],
          {
            useNativeDriver: true,
            listener: (event: {
              nativeEvent: { contentOffset: { y: number } };
            }) => {
              offset.current = event.nativeEvent.contentOffset.y;
              if (moving.current && !dragging.current) scheduleSettle();
            },
          },
        )}
      >
        {options.map((option, index) => (
          <Pressable
            key={option.value}
            accessible={false}
            focusable={false}
            importantForAccessibility="no-hide-descendants"
            disabled={disabled}
            onPress={() => choose(index)}
            style={[s.row, { height: rowHeight }]}
          >
            <Animated.Text
              style={[
                s.text,
                {
                  color: theme.text,
                  opacity: position.interpolate({
                    inputRange: [
                      (index - 1) * rowHeight,
                      index * rowHeight,
                      (index + 1) * rowHeight,
                    ],
                    outputRange: [0.32, 1, 0.32],
                    extrapolate: "clamp",
                  }),
                },
              ]}
            >
              {option.label}
            </Animated.Text>
          </Pressable>
        ))}
      </Animated.ScrollView>
      <View
        pointerEvents="none"
        style={[
          s.selection,
          { top: rowHeight, height: rowHeight, borderColor: theme.muted },
        ]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  column: { flex: 1, minWidth: 0, overflow: "hidden" },
  row: { alignItems: "center", justifyContent: "center" },
  text: { fontFamily: appFonts.regular, fontSize: 18, lineHeight: 28 },
  selection: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
