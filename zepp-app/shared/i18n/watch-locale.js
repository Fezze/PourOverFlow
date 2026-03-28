import { getLanguage } from "@zos/settings";
import { createTranslator, DEFAULT_LOCALE, resolveSupportedLocale } from "./index.js";

export function resolveWatchLocale() {
  try {
    return resolveSupportedLocale(getLanguage(), DEFAULT_LOCALE);
  } catch (_error) {
    return DEFAULT_LOCALE;
  }
}

export function createWatchTranslator() {
  return createTranslator(resolveWatchLocale());
}
