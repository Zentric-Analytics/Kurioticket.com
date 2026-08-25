import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, View } from "react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { ui } from "./SearchUi";
import type { NumericRange } from "./flightFilters";
import { lockedRangeEdgeForDrag, moveRangeEdge, positionForRangeValue, rangeValueForPosition, THUMB_CENTER_INSET, THUMB_HIT_SIZE } from "./flightRange";

type Props = {
  available: NumericRange;
  selected: NumericRange;
  step: number;
  singleMaximum?: boolean;
  formatValue: (value: number) => string;
  onChange: (range: NumericRange) => void;
  onDragStateChange?: (dragging: boolean) => void;
  accessibilityLabel?: string;
};

export function FlightRangeSlider({ available, selected, step, singleMaximum = false, formatValue, onChange, onDragStateChange, accessibilityLabel }: Props) {
  const { theme } = useAppTheme();
  const [width, setWidth] = useState(0);
  const [activeEdge, setActiveEdge] = useState<"min" | "max" | null>(null);
  const draggingEdgeRef = useRef<"min" | "max" | null>(null);
  const overlapAtGrantRef = useRef(false);
  const selectedRef = useRef(selected);
  const dragStartRef = useRef({ min: 0, max: 0 });
  selectedRef.current = selected;
  const updateEdge = (edge: "min" | "max", position: number) =>
    onChange(moveRangeEdge(selectedRef.current, edge, rangeValueForPosition(position, available, width, step), available));
  const responder = (edge: "min" | "max") => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      overlapAtGrantRef.current = !singleMaximum && selectedRef.current.min === selectedRef.current.max;
      draggingEdgeRef.current = overlapAtGrantRef.current ? null : edge;
      setActiveEdge(edge);
      dragStartRef.current[edge] = positionForRangeValue(selectedRef.current[edge], available, width);
      onDragStateChange?.(true);
    },
    onPanResponderMove: (_event, gesture) => {
      const movingEdge = lockedRangeEdgeForDrag(draggingEdgeRef.current, overlapAtGrantRef.current, edge, gesture.dx);
      if (!movingEdge) return;
      if (movingEdge !== draggingEdgeRef.current) {
        draggingEdgeRef.current = movingEdge;
        setActiveEdge(movingEdge);
      }
      updateEdge(movingEdge, dragStartRef.current[edge] + gesture.dx);
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: finishDrag,
    onPanResponderTerminate: finishDrag,
  });
  const finishDrag = () => {
    draggingEdgeRef.current = null;
    overlapAtGrantRef.current = false;
    setActiveEdge(null);
    onDragStateChange?.(false);
  };
  // Responders stay stable while dragging; refs provide the latest selection.
  const minResponder = useMemo(() => responder("min"), [available.min, available.max, step, width]);
  const maxResponder = useMemo(() => responder("max"), [available.min, available.max, step, width]);
  const minX = positionForRangeValue(selected.min, available, width);
  const maxX = positionForRangeValue(selected.max, available, width);
  const action = (edge: "min" | "max", direction: number) => onChange(moveRangeEdge(selectedRef.current, edge, selectedRef.current[edge] + direction * step, available));
  const thumb = (edge: "min" | "max", x: number, handlers: typeof minResponder.panHandlers, label: string) => <Pressable
    accessibilityRole="adjustable"
    accessibilityLabel={label}
    accessibilityValue={{ text: formatValue(selected[edge]), min: available.min, max: available.max, now: selected[edge] }}
    accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
    onAccessibilityAction={(event) => action(edge, event.nativeEvent.actionName === "increment" ? 1 : -1)}
    {...handlers}
    style={({ pressed }) => [styles.hitTarget, { left: x - THUMB_CENTER_INSET, zIndex: activeEdge === edge ? 2 : 1, elevation: activeEdge === edge ? 2 : 0 }, pressed && styles.pressed]}
  ><View style={[styles.thumb, { backgroundColor: ui.blue, borderColor: theme.surface }]} /></Pressable>;
  const tapTrack = (x: number) => updateEdge(singleMaximum ? "max" : (Math.abs(x - minX) < Math.abs(x - maxX) ? "min" : "max"), x);
  return <Pressable style={styles.container} onLayout={(event) => setWidth(event.nativeEvent.layout.width)} onPress={(event) => tapTrack(event.nativeEvent.locationX)}>
    <View pointerEvents="none" style={[styles.track, { backgroundColor: theme.border }]} />
    <View pointerEvents="none" style={[styles.active, { backgroundColor: ui.blue, left: singleMaximum ? 0 : minX, width: Math.max(0, maxX - (singleMaximum ? 0 : minX)) }]} />
    {!singleMaximum ? thumb("min", minX, minResponder.panHandlers, "Minimum price") : null}
    {thumb("max", maxX, maxResponder.panHandlers, accessibilityLabel ?? (singleMaximum ? "Maximum travel time" : "Maximum price"))}
  </Pressable>;
}

const styles = StyleSheet.create({
  container: { height: 44, justifyContent: "center", marginHorizontal: 4 },
  track: { position: "absolute", left: 0, right: 0, height: 4, borderRadius: 2 },
  active: { position: "absolute", height: 4, borderRadius: 2 },
  hitTarget: { position: "absolute", top: 0, width: THUMB_HIT_SIZE, height: THUMB_HIT_SIZE, alignItems: "center", justifyContent: "center" },
  thumb: { width: 18, height: 18, borderRadius: 9, borderWidth: 3 },
  pressed: { opacity: 0.72 },
});
