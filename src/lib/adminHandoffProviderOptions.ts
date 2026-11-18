/** Handoff filter choices come from configured integration names, not guesses.
 * Retain an explicitly selected historical name when the registry no longer
 * lists it, so a bookmarked investigation still shows its exact filter. */
export type HandoffProviderOption = { value: string; label: string };

export function buildHandoffProviderOptions(
  integrations: readonly { provider: string }[],
  selected: string | null = null,
): HandoffProviderOption[] {
  const names = new Map<string, string>();
  for (const input of [...integrations.map(item => item.provider), selected]) {
    const name = input?.trim();
    if (!name || name.length > 100 || /[\u0000-\u001f\u007f]/.test(name)) continue;
    const key = name.toLocaleLowerCase("en");
    if (!names.has(key)) names.set(key, name);
  }
  const options = [...names.values()].sort((a, b) => a.localeCompare(b, "en"))
    .map(name => ({ value: name, label: name }));
  if (selected && selected.trim()) {
    const matching = options.find(option => option.value.toLocaleLowerCase("en") === selected.trim().toLocaleLowerCase("en"));
    if (matching) matching.value = selected;
  }
  return [{ value: "", label: "All providers" }, ...options];
}
