import { afterEach, describe, expect, it } from "vitest";

import {
  createTranslator,
  getMessagesForLocale,
  resolveSupportedLocale
} from "../zepp-app/shared/i18n/index.js";
import {
  createPhoneTranslator,
  resolvePhoneLocale
} from "../zepp-app/shared/i18n/phone-locale.js";
import {
  createWatchTranslator,
  resolveWatchLocale
} from "../zepp-app/shared/i18n/watch-locale.js";
import { getSeedRecipeRecordById } from "../zepp-app/shared/domain/seed-library.js";
import { setLanguageCode } from "./zeus-runtime/runtime.ts";

function withNavigatorLanguage(language, callback) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      ...(descriptor?.value || {}),
      language
    }
  });

  try {
    return callback();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "navigator", descriptor);
    } else {
      delete globalThis.navigator;
    }
  }
}

afterEach(() => {
  setLanguageCode(2);
});

describe("i18n localization", () => {
  it("resolves supported locales from watch codes and language tags", () => {
    expect(resolveSupportedLocale(9)).toBe("pl-PL");
    expect(resolveSupportedLocale(2)).toBe("en-US");
    expect(resolveSupportedLocale("pl")).toBe("pl-PL");
    expect(resolveSupportedLocale("en-GB")).toBe("en-US");
    expect(resolveSupportedLocale("de-DE", "pl-PL")).toBe("pl-PL");
  });

  it("loads localized messages and tool labels for Polish", () => {
    const i18n = createTranslator("pl-PL");

    expect(getMessagesForLocale("pl-PL").settings.nav.library).toBe("Biblioteka");
    expect(i18n.getToolDescription("tool_v60")).toBe("Klasyczny stozkowy pour-over");
    expect(i18n.t("watch.toolList.title")).toBe("Zaparzacze");
    expect(i18n.t("settings.messages.recipeDeleted")).toBe("Usunieto przepis. Historia zostala zachowana.");
  });

  it("resolves phone locale from explicit preference and navigator fallback", () => {
    expect(resolvePhoneLocale("pl-PL")).toBe("pl-PL");
    expect(createPhoneTranslator("pl-PL").t("settings.nav.history")).toBe("Historia");

    withNavigatorLanguage("pl-PL", () => {
      expect(resolvePhoneLocale()).toBe("pl-PL");
      expect(createPhoneTranslator().t("settings.nav.sync")).toBe("Sync");
    });
  });

  it("resolves watch locale from the mocked Zepp settings language", () => {
    setLanguageCode(9);

    expect(resolveWatchLocale()).toBe("pl-PL");
    expect(createWatchTranslator().t("watch.home.actions.resume")).toBe("Wznow");
  });

  it("localizes starter recipes without mutating the English source", () => {
    const polishSeed = getSeedRecipeRecordById("seed_ap_daily_clean", 1_000, "pl-PL");
    const englishSeed = getSeedRecipeRecordById("seed_ap_daily_clean", 1_000, "en-US");

    expect(polishSeed.name).toBe("AeroPress Daily Clean");
    expect(polishSeed.filterLabel).toBe("Papier");
    expect(polishSeed.steps[0].title).toBe("Przygotuj");
    expect(polishSeed.steps[0].body).toBe("Przeplucz filtr, wloz papier i wsyp kawe.");
    expect(englishSeed.filterLabel).toBe("Paper");
    expect(englishSeed.steps[0].title).toBe("Prep");
  });
});
