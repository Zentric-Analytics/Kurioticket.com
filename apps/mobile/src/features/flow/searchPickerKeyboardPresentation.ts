import { useCallback, useEffect, useRef, type RefObject } from "react";
import { Keyboard, type LayoutChangeEvent, type TextInput } from "react-native";

type FocusableInput = Pick<TextInput, "focus">;

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

  const previousOpening = previousOpeningRef.current;
  if (
    visible !== previousOpening.visible ||
    (visible && openingKey !== previousOpening.openingKey)
  ) {
    generationRef.current += 1;
    previousOpeningRef.current = { visible, openingKey };
  }
  const generation = generationRef.current;

  const startCurrentOpening = useCallback(() => {
    if (
      !visible ||
      generationRef.current !== generation ||
      openingStartedGenerationRef.current === generation
    )
      return;
    if (!modalPresentedRef.current || !sheetLayoutValidRef.current) return;
    // Flight airport pickers request focus while still wholly offscreen. This
    // starts the KeyboardAvoidingView adjustment before the entrance begins,
    // rather than moving a settled sheet a second time when the keyboard opens.
    if (
      keyboardSynchronizedOpening &&
      focusedGenerationRef.current !== generation
    ) {
      focusedGenerationRef.current = generation;
      inputRef.current?.focus();
    }
    if (!startOpening()) return;
    openingStartedGenerationRef.current = generation;
    // A fresh opening is already unsettled. Arm it here because recording the
    // successful start in a ref does not itself cause another render.
    if (!openSettled) settleArmedGenerationRef.current = generation;
  }, [generation, inputRef, keyboardSynchronizedOpening, openSettled, startOpening, visible]);

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
    startCurrentOpening();
  }, [startCurrentOpening]);

  const onSheetLayout = useCallback(
    (event: LayoutChangeEvent) => {
      reportSheetLayout(event);
      const { height } = event.nativeEvent.layout;
      if (Number.isFinite(height) && height > 0)
        sheetLayoutValidRef.current = true;
      startCurrentOpening();
    },
    [reportSheetLayout, startCurrentOpening],
  );

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
    if (modalPresentedRef.current) startCurrentOpening();
  }, [rendered, startCurrentOpening, visible]);

  return { onModalShow, onSheetLayout } as const;
}
