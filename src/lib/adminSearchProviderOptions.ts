/** Provider names shown by the Search activity filter must match execution-log
 * provider names exactly. Use the existing integration registry and the owned
 * catalogue recorded in hotel-search telemetry; no extra database scan on
 * every page load. Keep the current selection visible for historical deep links.
 */
const OWNED_CATALOGUE_PROVIDER = "Kurioticket static catalogue";

export type AdminSearchProviderOption = { value: string; label: string };

export function buildAdminSearchProviderOptions(
  integrations: readonly { provider: string }[],
  selectedProvider: string | null = null,
): AdminSearchProviderOption[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const name of [
    ...integrations.map((integration) => integration.provider),
    OWNED_CATALOGUE_PROVIDER,
    selectedProvider,
  ]) {
    const clean = name?.trim();
    if (!clean || clean.length > 100 || /[\u0000-\u001f\u007f]/.test(clean)) continue;
    const key = clean.toLocaleLowerCase("en");
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(clean);
  }

  names.sort((a, b) => a.localeCompare(b, "en"));
  return [
    { value: "", label: "All providers" },
    ...names.map((name) => ({ value: name, label: name })),
  ];
}
