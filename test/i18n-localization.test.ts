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
import {
  getLocalizedToolDescription,
  getLocalizedToolLabel,
  getToolById
} from "../zepp-app/shared/constants/tool-catalog.js";
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
    expect(i18n.getToolDescription("tool_v60")).toBe("Klasyczny stożkowy pour-over");
    expect(i18n.t("watch.toolList.title")).toBe("Zaparzacze");
    expect(i18n.t("settings.messages.recipeDeleted")).toBe("Usunięto przepis. Historia została zachowana.");
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

  it.each([
    [0, "0 przepisów", "0 recipes"],
    [1, "1 przepis", "1 recipe"],
    [2, "2 przepisy", "2 recipes"],
    [12, "12 przepisów", "12 recipes"],
    [22, "22 przepisy", "22 recipes"],
    [25, "25 przepisów", "25 recipes"]
  ])("inflects recipe counts in both languages for %i", (count, polish, english) => {
    expect(createTranslator("pl-PL").t("common.counts.recipes", { count })).toBe(polish);
    expect(createTranslator("en-US").t("common.counts.recipes", { count })).toBe(english);
  });

  it.each([
    ["pl-PL", "22 zaparzacze", "12 wpisów historii", "2 archiwalne parzenia w telefonie."],
    ["en-US", "22 brewers", "12 history entries", "2 archived brews on the phone."]
  ])("formats brewer and history totals in %s", (locale, brewers, history, archived) => {
    const i18n = createTranslator(locale);
    expect(i18n.t("common.counts.brewers", { count: 22 })).toBe(brewers);
    expect(i18n.t("common.counts.historyEntries", { count: 12 })).toBe(history);
    expect(i18n.t("common.counts.archivedBrews", { count: 2 })).toBe(archived);
  });

  it("localizes supported tool descriptions and preserves a useful label for an unknown tool", () => {
    expect(getLocalizedToolDescription("tool_aeropress", "pl-PL")).toBe("Imersja / ciśnieniowa hybryda");
    const tool = getToolById("tool_aeropress");
    expect(getLocalizedToolDescription(tool, createTranslator("en-US"))).toBe(tool.description);
    expect(getLocalizedToolLabel("tool_legacy", "pl-PL")).toBe("tool_legacy");
    expect(getLocalizedToolDescription("tool_legacy", "pl-PL")).toBe("");
    expect(getLocalizedToolLabel(null, "pl-PL")).toBe("");
  });

  it("localizes starter recipes without mutating the English source", () => {
    const polishSeed = getSeedRecipeRecordById("seed_ap_daily_clean", 1_000, "pl-PL");
    const englishSeed = getSeedRecipeRecordById("seed_ap_daily_clean", 1_000, "en-US");

    expect(polishSeed.name).toBe("AeroPress Daily Clean");
    expect(polishSeed.filterLabel).toBe("Papier");
    expect(polishSeed.steps[0].title).toBe("Przygotuj");
    expect(polishSeed.steps[0].body).toBe("Przepłucz filtr, włóż papier i wsyp kawę.");
    expect(englishSeed.filterLabel).toBe("Paper");
    expect(englishSeed.steps[0].title).toBe("Prep");
  });
});
