/** A field-width list joined to its lower border, regardless of space above. */
export function getCmsDropdownBelow(
  field: { left: number; bottom: number; width: number },
  viewportHeight: number,
) {
  return {
    left: field.left,
    top: field.bottom - 1,
    width: field.width,
    maxHeight: Math.min(232, Math.max(0, viewportHeight - field.bottom - 8)),
  };
}
