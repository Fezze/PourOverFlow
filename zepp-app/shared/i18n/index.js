import enUS from "./locales/en-US.js";
import plPL from "./locales/pl-PL.js";

export const DEFAULT_LOCALE = "en-US";
export const SUPPORTED_LOCALES = ["en-US", "pl-PL"];

const WATCH_LANGUAGE_CODE_TO_LOCALE = {
  1: "zh-CN",
  2: "en-US",
  9: "pl-PL"
};

const LOCALE_MESSAGES = {
  "en-US": enUS,
  "pl-PL": plPL
};

function getMessage(messages, key) {
  return String(key)
    .split(".")
    .reduce((current, segment) => (current && segment in current ? current[segment] : undefined), messages);
}

export function resolveSupportedLocale(candidate, fallbackLocale = DEFAULT_LOCALE) {
  if (typeof candidate === "number" && candidate in WATCH_LANGUAGE_CODE_TO_LOCALE) {
    return WATCH_LANGUAGE_CODE_TO_LOCALE[candidate];
  }

  if (typeof candidate === "string") {
    const normalized = candidate.trim();

    if (SUPPORTED_LOCALES.includes(normalized)) {
      return normalized;
    }

    const lowerCase = normalized.toLowerCase();

    if (lowerCase.startsWith("pl")) {
      return "pl-PL";
    }

    if (lowerCase.startsWith("en")) {
      return "en-US";
    }
  }

  return SUPPORTED_LOCALES.includes(fallbackLocale) ? fallbackLocale : DEFAULT_LOCALE;
}

export function getMessagesForLocale(locale) {
  return LOCALE_MESSAGES[resolveSupportedLocale(locale)] || LOCALE_MESSAGES[DEFAULT_LOCALE];
}

export function createTranslator(locale) {
  const resolvedLocale = resolveSupportedLocale(locale);
  const localeMessages = getMessagesForLocale(resolvedLocale);
  const fallbackMessages = getMessagesForLocale(DEFAULT_LOCALE);

  function t(key, params = {}, fallbackValue = key) {
    const localizedMessage = getMessage(localeMessages, key);
    const fallbackMessage = getMessage(fallbackMessages, key);
    const message = localizedMessage !== undefined ? localizedMessage : fallbackMessage;

    if (typeof message === "function") {
      return message(params);
    }

    if (typeof message === "string") {
      return message.replace(/\{(\w+)\}/g, (_match, name) => (
        name in params ? String(params[name]) : ""
      ));
    }

    return fallbackValue;
  }

  function getToolLabel(toolOrId, fallbackValue = null) {
    const toolId = typeof toolOrId === "string" ? toolOrId : toolOrId?.toolId;
    const defaultValue = fallbackValue || (typeof toolOrId === "object" ? toolOrId?.label : toolId) || "";
    return t(`common.tool.${toolId}.label`, {}, defaultValue);
  }

  function getToolDescription(toolOrId, fallbackValue = "") {
    const toolId = typeof toolOrId === "string" ? toolOrId : toolOrId?.toolId;
    const defaultValue = fallbackValue || (typeof toolOrId === "object" ? toolOrId?.description : "") || "";
    return t(`common.tool.${toolId}.description`, {}, defaultValue);
  }

  function getHistoryStatus(status) {
    return t(`common.historyStatus.${status}`, {}, status);
  }

  function getSessionStatus(status) {
    return t(`common.sessionStatus.${status}`, {}, status);
  }

  function getStepKindLabel(kind) {
    return t(`common.stepKind.${kind}`, {}, kind);
  }

  return {
    locale: resolvedLocale,
    t,
    getToolLabel,
    getToolDescription,
    getHistoryStatus,
    getSessionStatus,
    getStepKindLabel
  };
}
