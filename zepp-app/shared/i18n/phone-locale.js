import { createTranslator, DEFAULT_LOCALE, resolveSupportedLocale } from "./index.js";

export function resolvePhoneLocale(preferredLocale = null) {
  if (preferredLocale) {
    return resolveSupportedLocale(preferredLocale, DEFAULT_LOCALE);
  }

  const navigatorLocale = globalThis?.navigator?.language;

  if (navigatorLocale) {
    return resolveSupportedLocale(navigatorLocale, DEFAULT_LOCALE);
  }

  try {
    const intlLocale = globalThis?.Intl?.DateTimeFormat?.().resolvedOptions?.().locale;
    return resolveSupportedLocale(intlLocale, DEFAULT_LOCALE);
  } catch (_error) {
    return DEFAULT_LOCALE;
  }
}

export function createPhoneTranslator(preferredLocale = null) {
  return createTranslator(resolvePhoneLocale(preferredLocale));
}
