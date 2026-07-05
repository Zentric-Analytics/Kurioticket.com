# i18n fallback policy

This document records the current Kurioticket internationalization fallback behavior. It is documentation only; it does not introduce enforcement or change runtime behavior.

## Core dictionary loading

- Translation dictionaries are loaded from `src/lib/i18n/index.ts`.
- The current `fallbackLocale` is `en-us`.
- `getTranslations(locale)` normalizes known aliases, looks up the resolved locale in the dictionary map, and returns the English dictionary when the locale is missing, unsupported, unknown, or empty.
- The exported `dictionaries` map contains the supported dictionary modules that the app can resolve at runtime.

## Locale normalization and public locale acceptance

- `src/lib/language.ts` is responsible for normalizing language inputs used by UI language helpers.
- Known aliases are normalized to the app's canonical language codes. Examples include `en` to `en-us`, `es` to `es-es`, `pt` to `pt-br`, `zh` to `zh-cn`, and selected region aliases such as `ar-sa`, `ar-ae`, and `ar-eg` to `ar`.
- Unknown language codes normalize to the default language, `en-us`.
- `LocaleProvider` does not accept every code that can be normalized. It only stores and activates locales that are available and public according to the supported/public locale lists.

## Missing-key behavior

- The `t` value exposed through `LocaleProvider` is currently a dictionary object, not a strict translation function.
- Direct dictionary reads such as `t.someKey` or `t[key]` can produce `undefined` when the key is absent.
- Many locale files intentionally start with `...en`, inheriting English keys before applying localized overrides. This keeps missing localized keys readable without requiring each locale file to duplicate the full English dictionary.
- Some route and component code uses scoped helpers that try the active dictionary first and then fall back to English.
- Some auth helpers can fall back to the raw message key if the dictionary value is missing.
- Some components still contain generic hardcoded English fallback strings.

## Known examples

- `LocalizedLoadingLabel` reads the active dictionary, then the English dictionary, then falls back to an empty string.
- `AboutPageContent` reads the active dictionary and then the English dictionary.
- `SigninForm` and `SignupForm` format status/error messages from dictionary keys and can fall back to the raw message key when a translation is missing.
- `BrandedLoading` contains generic hardcoded English fallback strings for non-hotel loading states and default loading copy.
- `/destinations` uses scoped safe fallback hardening for destination labels, summaries, alt text suffixes, and card aria-label templates: it tries the active dictionary, then English, then a local route-specific fallback string.

## Operational guidance

- Do not remove `...en` spreads globally in one patch.
- Do not change `getTranslations()` to throw globally in one patch.
- Do not convert `t` from a dictionary object to a function app-wide in one patch.
- Prefer small route/component-scoped fallback hardening when improving missing-key behavior.
- Prefer a report-only audit first, followed by focused fixes.
- Use `npm run audit:i18n` as the report-only audit command.
