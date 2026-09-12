import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { CalendarDays, ChevronRight, Minus, Plus, X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { travelApi, type HotelResult } from "../../api/travelApi";
import { DateRangeSheet } from "../flow/DateRangeSheet";
import { HOTEL_LIMITS, localIsoDate } from "../flow/hotelSearchModel";
import { useAppTheme } from "../../theme/AppTheme";
import { colors } from "../../theme/tokens";
import { appFonts } from "../../theme/typography";
import { hotelStaySummary } from "./nativeHotelDetailsModel";
import { rebuildHotelStayNavigationState } from "./hotelDetailReturnNavigation";

type StayValues = {
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
};

type StayEditorTarget = "dates" | "counts";
type ApplyStayResult = "unchanged" | "updated" | "failed";

export function HotelStayEditor({
  result,
  destination,
  checkIn,
  checkOut,
  guests,
  rooms,
}: {
  result: HotelResult;
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}) {
  const navigation = useNavigation();
  const routeParams = useLocalSearchParams<Record<string, string | string[]>>();
  const { theme } = useAppTheme();
  const [editorOpen, setEditorOpen] = useState(false);
  const [pendingEditor, setPendingEditor] = useState<StayEditorTarget | null>(null);
  const [datesOpen, setDatesOpen] = useState(false);
  const [countsOpen, setCountsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const pendingDatesApply = useRef<{ checkIn: string; checkOut: string } | null>(null);
  const datesReturnToEditor = useRef(false);
  const pendingCountsApply = useRef<{ guests: number; rooms: number } | null>(null);
  const countsReturnToEditor = useRef(false);
  const summary = hotelStaySummary(checkIn, checkOut, guests, rooms);
  const iconColor = theme.dark ? theme.icon : "#0F172A";
  const titleColor = theme.dark ? theme.textPrimary : "#020617";
  const metaColor = theme.dark ? theme.textSecondary : "#475569";
  const reopenEditorParam = Array.isArray(routeParams.hotelStayEditor)
    ? routeParams.hotelStayEditor[0]
    : routeParams.hotelStayEditor;

  useEffect(() => {
    if (reopenEditorParam !== "1") return;
    setEditorOpen(true);
    router.setParams({ hotelStayEditor: "" });
  }, [reopenEditorParam]);

  const showUpdatedResults = (next: StayValues) => {
    router.replace({
      pathname: "/hotel-results",
      params: {
        destination,
        checkIn: next.checkIn,
        checkOut: next.checkOut,
        guests: String(next.guests),
        rooms: String(next.rooms),
      },
    });
  };

  const applyStay = async (
    next: StayValues,
    reopenEditorAfterUpdate = false,
  ): Promise<ApplyStayResult> => {
    if (updating) return "failed";
    if (
      next.checkIn === checkIn
      && next.checkOut === checkOut
      && next.guests === guests
      && next.rooms === rooms
    ) return "unchanged";
    setUpdating(true);
    try {
      const response = await travelApi.searchHotels({
        destination,
        checkIn: next.checkIn,
        checkOut: next.checkOut,
        guests: next.guests,
        rooms: next.rooms,
      });
      const refreshed = response.results.find((hotel) => hotel.id === result.id);
      if (!refreshed) {
        Alert.alert(
          "Hotel unavailable for this stay",
          "This hotel was not returned for the updated dates and occupancy.",
          [
            { text: "Keep current stay", style: "cancel" },
            { text: "View updated results", onPress: () => showUpdatedResults(next) },
          ],
        );
        return "failed";
      }

      const sharedStayParams = {
        destination,
        checkIn: next.checkIn,
        checkOut: next.checkOut,
        guests: String(next.guests),
        rooms: String(next.rooms),
      };
      const detailParams = {
        ...sharedStayParams,
        result: JSON.stringify(refreshed),
        hotelDisplayPrices: "",
        displayCurrencyContext: "",
        hotelStayEditor: reopenEditorAfterUpdate ? "1" : "",
      };
      const resetState = rebuildHotelStayNavigationState(
        navigation.getState(),
        sharedStayParams,
        { ...detailParams, hotelResultsStack: "1" },
      );

      if (resetState) {
        navigation.dispatch({ type: "RESET", payload: resetState });
      } else {
        router.setParams({ ...detailParams, hotelResultsStack: "0" });
      }
      return "updated";
    } catch {
      Alert.alert(
        "Unable to update stay",
        "We couldn't refresh this hotel for the new stay. Please try again.",
      );
      return "failed";
    } finally {
      setUpdating(false);
    }
  };

  const launchEditor = (target: StayEditorTarget) => {
    if (target === "dates") setDatesOpen(true);
    else setCountsOpen(true);
  };
  const chooseEditor = (target: StayEditorTarget) => {
    setPendingEditor(target);
    setEditorOpen(false);
    if (Platform.OS !== "ios") {
      requestAnimationFrame(() => {
        launchEditor(target);
        setPendingEditor(null);
      });
    }
  };
  const finishEditorDismiss = () => {
    if (Platform.OS !== "ios" || !pendingEditor) return;
    launchEditor(pendingEditor);
    setPendingEditor(null);
  };

  const finishDatesDismiss = () => {
    if (!datesReturnToEditor.current) return;
    const next = pendingDatesApply.current;
    pendingDatesApply.current = null;
    if (next) {
      void applyStay(
        { checkIn: next.checkIn, checkOut: next.checkOut, guests, rooms },
        true,
      ).then((outcome) => {
        datesReturnToEditor.current = false;
        if (outcome !== "updated") setEditorOpen(true);
      });
      return;
    }
    datesReturnToEditor.current = false;
    setEditorOpen(true);
  };
  const closeDatesToEditor = () => {
    pendingDatesApply.current = null;
    datesReturnToEditor.current = true;
    setDatesOpen(false);
  };
  const finishDates = (nextCheckIn: string, nextCheckOut: string) => {
    pendingDatesApply.current = { checkIn: nextCheckIn, checkOut: nextCheckOut };
    datesReturnToEditor.current = true;
    setDatesOpen(false);
  };

  const finishCountsDismiss = () => {
    if (Platform.OS !== "ios" || !countsReturnToEditor.current) return;
    const next = pendingCountsApply.current;
    pendingCountsApply.current = null;
    if (next) {
      void applyStay(
        { checkIn, checkOut, guests: next.guests, rooms: next.rooms },
        true,
      ).then((outcome) => {
        countsReturnToEditor.current = false;
        if (outcome !== "updated") setEditorOpen(true);
      });
      return;
    }
    countsReturnToEditor.current = false;
    setEditorOpen(true);
  };
  const closeCountsToEditor = () => {
    pendingCountsApply.current = null;
    countsReturnToEditor.current = true;
    setCountsOpen(false);
    if (Platform.OS !== "ios") {
      requestAnimationFrame(() => {
        countsReturnToEditor.current = false;
        setEditorOpen(true);
      });
    }
  };
  const finishCounts = (nextGuests: number, nextRooms: number) => {
    pendingCountsApply.current = { guests: nextGuests, rooms: nextRooms };
    countsReturnToEditor.current = true;
    setCountsOpen(false);
    if (Platform.OS !== "ios") {
      requestAnimationFrame(() => {
        const next = pendingCountsApply.current;
        pendingCountsApply.current = null;
        if (!next) return;
        void applyStay(
          { checkIn, checkOut, guests: next.guests, rooms: next.rooms },
          true,
        ).then((outcome) => {
          countsReturnToEditor.current = false;
          if (outcome !== "updated") setEditorOpen(true);
        });
      });
    }
  };

  return (
    <>
      <View style={s.section}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit stay. ${summary.dateText ?? "Stay dates unavailable"}. ${summary.occupancy}`}
          disabled={updating}
          onPress={() => setEditorOpen(true)}
          style={({ pressed }) => [
            s.card,
            { borderColor: theme.border, backgroundColor: theme.surface },
            pressed && s.pressed,
          ]}
        >
          <CalendarDays accessible={false} size={22} color={iconColor} />
          <View style={s.copy}>
            <Text style={[s.date, { color: titleColor }]}>
              {summary.dateText ?? "Stay dates unavailable"}
            </Text>
            <Text style={[s.meta, { color: metaColor }]}>{summary.occupancy}</Text>
          </View>
          {updating ? <ActivityIndicator accessibilityLabel="Updating stay" size="small" color={colors.blue} /> : null}
        </Pressable>
      </View>
      <HotelStayEditSheet
        visible={editorOpen}
        dateText={summary.dateText ?? "Stay dates unavailable"}
        occupancy={summary.occupancy}
        onCancel={() => {
          setPendingEditor(null);
          setEditorOpen(false);
        }}
        onDismiss={finishEditorDismiss}
        onEditDates={() => chooseEditor("dates")}
        onEditCounts={() => chooseEditor("counts")}
      />
      <DateRangeSheet
        visible={datesOpen}
        title="Travel dates"
        startLabel="Check-in date"
        endLabel="Check-out date"
        presentation="sheet"
        startDate={checkIn}
        endDate={checkOut}
        minimumStartDate={localIsoDate(new Date())}
        endMustBeAfterStart
        onDone={finishDates}
        onCancel={closeDatesToEditor}
        onDismiss={finishDatesDismiss}
      />
      <HotelStayCountsSheet
        visible={countsOpen}
        guests={guests}
        rooms={rooms}
        onCancel={closeCountsToEditor}
        onDismiss={finishCountsDismiss}
        onDone={finishCounts}
      />
    </>
  );
}

function HotelStayEditSheet({
  visible,
  dateText,
  occupancy,
  onEditDates,
  onEditCounts,
  onCancel,
  onDismiss,
}: {
  visible: boolean;
  dateText: string;
  occupancy: string;
  onEditDates: () => void;
  onEditCounts: () => void;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} onDismiss={onDismiss}>
      <View style={s.countBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close stay editor"
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
        />
        <SafeAreaView edges={["bottom"]} style={[s.countSheet, { backgroundColor: theme.surface }]}>
          <View style={s.countHeader}>
            <Text accessibilityRole="header" style={[s.countTitle, { color: theme.textPrimary }]}>Edit stay</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close stay editor" onPress={onCancel} style={s.closeButton}>
              <X size={20} color={theme.icon} />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit dates. ${dateText}`}
            onPress={onEditDates}
            style={({ pressed }) => [s.editOption, pressed && s.pressed]}
          >
            <View style={s.editOptionCopy}>
              <Text style={[s.editOptionLabel, { color: theme.textSecondary }]}>Dates</Text>
              <Text style={[s.editOptionValue, { color: theme.textPrimary }]}>{dateText}</Text>
            </View>
            <ChevronRight accessible={false} size={20} color={theme.icon} />
          </Pressable>
          <View style={[s.divider, { backgroundColor: theme.border }]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit rooms and guests. ${occupancy}`}
            onPress={onEditCounts}
            style={({ pressed }) => [s.editOption, pressed && s.pressed]}
          >
            <View style={s.editOptionCopy}>
              <Text style={[s.editOptionLabel, { color: theme.textSecondary }]}>Rooms and guests</Text>
              <Text style={[s.editOptionValue, { color: theme.textPrimary }]}>{occupancy}</Text>
            </View>
            <ChevronRight accessible={false} size={20} color={theme.icon} />
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function HotelStayCountsSheet({
  visible,
  guests,
  rooms,
  onDone,
  onCancel,
  onDismiss,
}: {
  visible: boolean;
  guests: number;
  rooms: number;
  onDone: (guests: number, rooms: number) => void;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  const { theme } = useAppTheme();
  const [draftGuests, setDraftGuests] = useState(guests);
  const [draftRooms, setDraftRooms] = useState(rooms);

  useEffect(() => {
    if (!visible) return;
    setDraftGuests(guests);
    setDraftRooms(rooms);
  }, [guests, rooms, visible]);

  const adjustRooms = (delta: number) => {
    setDraftRooms((current) => {
      const next = Math.max(
        HOTEL_LIMITS.rooms.min,
        Math.min(HOTEL_LIMITS.rooms.max, draftGuests, current + delta),
      );
      return next;
    });
  };
  const adjustGuests = (delta: number) => {
    setDraftGuests((current) => Math.max(
      draftRooms,
      HOTEL_LIMITS.guests.min,
      Math.min(HOTEL_LIMITS.guests.max, current + delta),
    ));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} onDismiss={onDismiss}>
      <View style={s.countBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close rooms and guests picker"
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
        />
        <SafeAreaView edges={["bottom"]} style={[s.countSheet, { backgroundColor: theme.surface }]}>
          <View style={s.countHeader}>
            <Text accessibilityRole="header" style={[s.countTitle, { color: theme.textPrimary }]}>Rooms and guests</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close rooms and guests picker" onPress={onCancel} style={s.closeButton}>
              <X size={20} color={theme.icon} />
            </Pressable>
          </View>
          <CounterRow
            label="Rooms"
            value={draftRooms}
            canDecrease={draftRooms > HOTEL_LIMITS.rooms.min}
            canIncrease={draftRooms < HOTEL_LIMITS.rooms.max && draftRooms < draftGuests}
            onDecrease={() => adjustRooms(-1)}
            onIncrease={() => adjustRooms(1)}
          />
          <View style={[s.divider, { backgroundColor: theme.border }]} />
          <CounterRow
            label="Guests"
            value={draftGuests}
            canDecrease={draftGuests > HOTEL_LIMITS.guests.min && draftGuests > draftRooms}
            canIncrease={draftGuests < HOTEL_LIMITS.guests.max}
            onDecrease={() => adjustGuests(-1)}
            onIncrease={() => adjustGuests(1)}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => onDone(draftGuests, draftRooms)}
            style={({ pressed }) => [s.doneButton, pressed && s.donePressed]}
          >
            <Text style={s.doneText}>Done</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function CounterRow({
  label,
  value,
  canDecrease,
  canIncrease,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: number;
  canDecrease: boolean;
  canIncrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={s.counterRow}>
      <Text style={[s.counterLabel, { color: theme.textPrimary }]}>{label}</Text>
      <View style={s.counterControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label.toLowerCase()}`}
          accessibilityState={{ disabled: !canDecrease }}
          disabled={!canDecrease}
          onPress={onDecrease}
          style={[s.counterButton, { borderColor: theme.border }, !canDecrease && s.counterDisabled]}
        >
          <Minus size={18} color={theme.icon} />
        </Pressable>
        <Text accessibilityLabel={`${value} ${label.toLowerCase()}`} style={[s.counterValue, { color: theme.textPrimary }]}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label.toLowerCase()}`}
          accessibilityState={{ disabled: !canIncrease }}
          disabled={!canIncrease}
          onPress={onIncrease}
          style={[s.counterButton, { borderColor: theme.border }, !canIncrease && s.counterDisabled]}
        >
          <Plus size={18} color={theme.icon} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 10, paddingTop: 24 },
  card: { minHeight: 60, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 10 },
  copy: { flex: 1, minWidth: 0, justifyContent: "center" },
  pressed: { opacity: 0.62 },
  date: { fontSize: 14, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  meta: { marginTop: 2, fontSize: 13, lineHeight: 18, fontWeight: "400", fontFamily: appFonts.regular },
  countBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(2,6,23,.42)" },
  countSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16 },
  countHeader: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  countTitle: { fontSize: 18, lineHeight: 24, fontWeight: "700", fontFamily: appFonts.bold },
  closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  editOption: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 7 },
  editOptionCopy: { flex: 1, minWidth: 0 },
  editOptionLabel: { fontSize: 12, lineHeight: 17, fontWeight: "500", fontFamily: appFonts.medium },
  editOptionValue: { marginTop: 2, fontSize: 14, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  counterRow: { minHeight: 70, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  counterLabel: { fontSize: 15, lineHeight: 21, fontWeight: "600", fontFamily: appFonts.semibold },
  counterControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  counterButton: { width: 44, height: 44, borderWidth: 1, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  counterDisabled: { opacity: 0.35 },
  counterValue: { minWidth: 28, textAlign: "center", fontSize: 15, lineHeight: 21, fontWeight: "600", fontFamily: appFonts.semibold },
  divider: { height: StyleSheet.hairlineWidth },
  doneButton: { minHeight: 48, marginTop: 12, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.blue },
  donePressed: { backgroundColor: "#003B91" },
  doneText: { color: "white", fontSize: 14, lineHeight: 20, fontWeight: "700", fontFamily: appFonts.bold },
});