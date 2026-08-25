import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { ui } from "./SearchUi";
import type { NumericRange } from "./flightFilters";
import { moveRangeEdge, positionForRangeValue, rangeValueForGesture } from "./flightRange";

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
  const draggingEdgeRef = useRef<"min" | "max" | null>(null);
  const grantXRef = useRef(0);
  const selectedRef = useRef(selected);
  const onChangeRef = useRef(onChange);
  const onDragStateChangeRef = useRef(onDragStateChange);
  selectedRef.current = selected;
  onChangeRef.current = onChange;
  onDragStateChangeRef.current = onDragStateChange;
  const updateEdge = (edge: "min" | "max", grantX: number, deltaX = 0) =>
    onChangeRef.current(moveRangeEdge(selectedRef.current, edge, rangeValueForGesture(grantX, deltaX, available, width, step), available));
  const finishDrag = () => {
    draggingEdgeRef.current = null;
    onDragStateChangeRef.current?.(false);
  };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      const grantX = event.nativeEvent.locationX;
      const minX = positionForRangeValue(selectedRef.current.min, available, width);
      const maxX = positionForRangeValue(selectedRef.current.max, available, width);
      const edge = singleMaximum || Math.abs(grantX - maxX) <= Math.abs(grantX - minX) ? "max" : "min";
      grantXRef.current = grantX;
      draggingEdgeRef.current = edge;
      onDragStateChangeRef.current?.(true);
      updateEdge(edge, grantX);
    },
    onPanResponderMove: (_event, gesture) => {
      const edge = draggingEdgeRef.current;
      if (edge) updateEdge(edge, grantXRef.current, gesture.dx);
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: finishDrag,
    onPanResponderTerminate: finishDrag,
  }), [available.min, available.max, singleMaximum, step, width]);
  useEffect(() => () => onDragStateChangeRef.current?.(false), []);
  const minX = positionForRangeValue(selected.min, available, width);
  const maxX = positionForRangeValue(selected.max, available, width);
  const action = (direction: number) => onChangeRef.current(moveRangeEdge(selectedRef.current, "max", selectedRef.current.max + direction * step, available));
  const thumb = (x: number) => <View pointerEvents="none" style={[styles.thumb, { left: x - 9, backgroundColor: ui.blue, borderColor: theme.surface }]} />;
  return <View
    accessible
    accessibilityRole="adjustable"
    accessibilityLabel={accessibilityLabel ?? (singleMaximum ? "Maximum travel time" : "Maximum price")}
    accessibilityValue={{ text: formatValue(selected.max), min: available.min, max: available.max, now: selected.max }}
    accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
    onAccessibilityAction={(event) => action(event.nativeEvent.actionName === "increment" ? 1 : -1)}
    style={styles.container}
    onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    {...responder.panHandlers}
  >
    <View pointerEvents="none" style={[styles.track, { backgroundColor: theme.border }]} />
    <View pointerEvents="none" style={[styles.active, { backgroundColor: ui.blue, left: singleMaximum ? 0 : minX, width: Math.max(0, maxX - (singleMaximum ? 0 : minX)) }]} />
    {!singleMaximum ? thumb(minX) : null}
    {thumb(maxX)}
  </View>;
}

const styles = StyleSheet.create({
  container: { height: 44, justifyContent: "center", marginHorizontal: 4 },
  track: { position: "absolute", left: 0, right: 0, height: 4, borderRadius: 2 },
  active: { position: "absolute", height: 4, borderRadius: 2 },
  thumb: { position: "absolute", top: 13, width: 18, height: 18, borderRadius: 9, borderWidth: 3 },
});
