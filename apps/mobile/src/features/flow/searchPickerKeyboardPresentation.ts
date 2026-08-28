import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";
import { Keyboard, type TextInput } from "react-native";

type FocusableInput = Pick<TextInput, "focus">;

/** Coordinates one automatic focus request with each native Modal opening. */
export function useSearchPickerKeyboardPresentation(
  visible: boolean,
  rendered: boolean,
  openingKey: unknown,
  inputRef: RefObject<FocusableInput | null>,
) {
  const generationRef = useRef(0);
  const previousOpeningRef = useRef({ visible, openingKey });
  const focusedGenerationRef = useRef<number | undefined>(undefined);
  const modalPresentedRef = useRef(false);

  const previousOpening = previousOpeningRef.current;
  if (visible !== previousOpening.visible || (visible && openingKey !== previousOpening.openingKey)) {
    generationRef.current += 1;
    previousOpeningRef.current = { visible, openingKey };
  }
  const generation = generationRef.current;

  const focusCurrentOpening = useCallback(() => {
    if (!visible || generationRef.current !== generation || focusedGenerationRef.current === generation) return;
    focusedGenerationRef.current = generation;
    inputRef.current?.focus();
  }, [generation, inputRef, visible]);

  const onModalShow = useCallback(() => {
    modalPresentedRef.current = true;
    focusCurrentOpening();
  }, [focusCurrentOpening]);

  useLayoutEffect(() => {
    if (!rendered) modalPresentedRef.current = false;
    if (!visible) {
      Keyboard.dismiss();
      return;
    }
    // A close/reopen can interrupt the exit while the native Modal remains
    // presented. It will not emit onShow again, but its mounted layout is
    // already a valid focus lifecycle signal for the new generation.
    if (modalPresentedRef.current) focusCurrentOpening();
  }, [focusCurrentOpening, rendered, visible]);

  return { onModalShow } as const;
}
