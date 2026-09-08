import { useCallback, useEffect, useRef, type RefObject } from "react";
import { Keyboard, Platform, type LayoutChangeEvent, type TextInput } from "react-native";

type FocusableInput = Pick<TextInput, "focus" | "measureInWindow">;

/** Coordinates one automatic focus request with each native Modal opening. */
export function useSearchPickerKeyboardPresentation(
  visible: boolean,
  rendered: boolean,
  openingKey: unknown,
  inputRef: RefObject<FocusableInput | null>,
  motion: {
    openSettled: boolean;
    startOpening: () => boolean;
    onSheetLayout: (event: LayoutChangeEvent) => void;
  },
  options: { keyboardSynchronizedOpening?: boolean } = {},
) {
  const { keyboardSynchronizedOpening = false } = options;
  const {
    onSheetLayout: reportSheetLayout,
    openSettled,
    startOpening,
  } = motion;
  const generationRef = useRef(0);
  const previousOpeningRef = useRef({ visible, openingKey });
  const openingStartedGenerationRef = useRef<number | undefined>(undefined);
  const settleArmedGenerationRef = useRef<number | undefined>(undefined);
  const focusedGenerationRef = useRef<number | undefined>(undefined);
  const modalPresentedRef = useRef(false);
  const sheetLayoutValidRef = useRef(false);
  const keyboardReadyGenerationRef = useRef<number | undefined>(undefined);

  const previousOpening = previousOpeningRef.current;
  if (
    visible !== previousOpening.visible ||
    (visible && openingKey !== previousOpening.openingKey)
  ) {
    generationRef.current += 1;
    previousOpeningRef.current = { visible, openingKey };
  }
  const generation = generationRef.current;

  const startCurrentEntrance = useCallback(() => {
    if (
      !visible ||
      generationRef.current !== generation ||
      openingStartedGenerationRef.current === generation
    )
      return;
    if (!modalPresentedRef.current || !sheetLayoutValidRef.current) return;
    if (keyboardSynchronizedOpening && keyboardReadyGenerationRef.current !== generation) return;
    if (!startOpening()) return;
    openingStartedGenerationRef.current = generation;
    // A fresh opening is already unsettled. Arm it here because recording the
    // successful start in a ref does not itself cause another render.
    if (!openSettled) settleArmedGenerationRef.current = generation;
  }, [generation, keyboardSynchronizedOpening, openSettled, startOpening, visible]);

  const prepareCurrentOpening = useCallback(() => {
    if (!visible || generationRef.current !== generation) return;
    if (!modalPresentedRef.current || !sheetLayoutValidRef.current) return;
    if (!keyboardSynchronizedOpening) {
      startCurrentEntrance();
      return;
    }
    if (focusedGenerationRef.current === generation) return;
    focusedGenerationRef.current = generation;
    inputRef.current?.focus();
  }, [generation, inputRef, keyboardSynchronizedOpening, startCurrentEntrance, visible]);

  const markKeyboardReady = useCallback(() => {
    if (!visible || generationRef.current !== generation || focusedGenerationRef.current !== generation) return;
    keyboardReadyGenerationRef.current = generation;
    startCurrentEntrance();
  }, [generation, startCurrentEntrance, visible]);

  useEffect(() => {
    if (!keyboardSynchronizedOpening || !visible) return;
    const eventName = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const subscription = Keyboard.addListener(eventName, markKeyboardReady);
    return () => subscription.remove();
  }, [keyboardSynchronizedOpening, markKeyboardReady, visible]);

  useEffect(() => {
    if (
      !visible ||
      generationRef.current !== generation ||
      openingStartedGenerationRef.current !== generation
    )
      return;

    // A retained reopen can briefly render the previous generation's settled
    // state. Observe this generation's unsettled state before accepting settle.
    if (!openSettled) {
      settleArmedGenerationRef.current = generation;
      return;
    }
    if (
      keyboardSynchronizedOpening ||
      settleArmedGenerationRef.current !== generation ||
      focusedGenerationRef.current === generation
    )
      return;
    focusedGenerationRef.current = generation;
    inputRef.current?.focus();
  }, [generation, inputRef, keyboardSynchronizedOpening, openSettled, visible]);

  const onModalShow = useCallback(() => {
    modalPresentedRef.current = true;
    prepareCurrentOpening();
  }, [prepareCurrentOpening]);

  const onSheetLayout = useCallback(
    (event: LayoutChangeEvent) => {
      reportSheetLayout(event);
      const { height } = event.nativeEvent.layout;
      if (Number.isFinite(height) && height > 0)
        sheetLayoutValidRef.current = true;
      if (focusedGenerationRef.current === generation && Keyboard.isVisible()) markKeyboardReady();
      else prepareCurrentOpening();
    },
    [generation, markKeyboardReady, prepareCurrentOpening, reportSheetLayout],
  );

  const onInputFocus = useCallback(() => {
    if (!keyboardSynchronizedOpening || generationRef.current !== generation) return;
    if (Keyboard.isVisible()) {
      markKeyboardReady();
      return;
    }
    // A native measurement callback is the deterministic no-resize fallback
    // for hardware keyboards. A software keyboard that has appeared meanwhile
    // is observed through Keyboard.metrics()/isVisible before entrance.
    inputRef.current?.measureInWindow(() => {
      if (generationRef.current !== generation || !visible) return;
      if (!Keyboard.metrics()) keyboardReadyGenerationRef.current = generation;
      if (Keyboard.isVisible() || keyboardReadyGenerationRef.current === generation) startCurrentEntrance();
    });
  }, [generation, inputRef, keyboardSynchronizedOpening, markKeyboardReady, startCurrentEntrance, visible]);

  useEffect(() => {
    if (!rendered) {
      modalPresentedRef.current = false;
      sheetLayoutValidRef.current = false;
    }
    if (!visible) {
      Keyboard.dismiss();
      return;
    }
    // A close/reopen can interrupt the exit while the native Modal remains
    // presented. It will not emit onShow again, but its mounted layout is
    // already a valid focus lifecycle signal for the new generation.
    if (modalPresentedRef.current) prepareCurrentOpening();
  }, [prepareCurrentOpening, rendered, visible]);

  return { onInputFocus, onModalShow, onSheetLayout } as const;
}
