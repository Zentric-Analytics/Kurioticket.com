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
    startOpening: () => boolean;
    onSheetLayout: (event: LayoutChangeEvent) => void;
  },
) {
  const { onSheetLayout: reportSheetLayout, startOpening } = motion;
  const generationRef = useRef(0);
  const previousOpeningRef = useRef({ visible, openingKey });
  const focusedGenerationRef = useRef<number | undefined>(undefined);
  const modalPresentedRef = useRef(false);

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
      focusedGenerationRef.current === generation
    )
      return;
    if (!modalPresentedRef.current || !startOpening()) return;
    focusedGenerationRef.current = generation;
    inputRef.current?.focus();
  }, [generation, inputRef, startOpening, visible]);

  const onModalShow = useCallback(() => {
    modalPresentedRef.current = true;
    startCurrentOpening();
  }, [startCurrentOpening]);

  const onSheetLayout = useCallback(
    (event: LayoutChangeEvent) => {
      reportSheetLayout(event);
      startCurrentOpening();
    },
    [reportSheetLayout, startCurrentOpening],
  );

  useEffect(() => {
    if (!rendered) modalPresentedRef.current = false;
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
