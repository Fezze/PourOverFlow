import { TOOL_CATALOG } from "../constants/tool-catalog";
import { CURRENT_SCHEMA_VERSION } from "../domain/schema";
import { PHONE_STORAGE_KEYS } from "./keys";

export function safeParseJson(rawValue, fallbackValue) {
  if (!rawValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    console.log("Failed to parse settingsStorage JSON", error);
    return fallbackValue;
  }
}

export function readSettingsJson(settingsStorage, key, fallbackValue) {
  return safeParseJson(settingsStorage.getItem(key), fallbackValue);
}

export function writeSettingsJson(settingsStorage, key, value) {
  settingsStorage.setItem(key, JSON.stringify(value));
  return value;
}

export function createDefaultPhoneSyncMeta() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    toolCatalogRevision: 1,
    recipeCatalogRevision: 0,
    historyRevision: 0,
    seededAt: Date.now()
  };
}

export function ensurePhoneScaffoldStorage(settingsStorage) {
  if (!settingsStorage.getItem(PHONE_STORAGE_KEYS.tools)) {
    writeSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.tools, TOOL_CATALOG);
  }

  if (!settingsStorage.getItem(PHONE_STORAGE_KEYS.recipeIndex)) {
    writeSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.recipeIndex, []);
  }

  if (!settingsStorage.getItem(PHONE_STORAGE_KEYS.historyIndex)) {
    writeSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.historyIndex, []);
  }

  if (!settingsStorage.getItem(PHONE_STORAGE_KEYS.syncMeta)) {
    writeSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.syncMeta, createDefaultPhoneSyncMeta());
  }

  return readPhoneScaffoldSnapshot(settingsStorage);
}

export function readPhoneScaffoldSnapshot(settingsStorage) {
  const tools = readSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.tools, TOOL_CATALOG);
  const recipeIndex = readSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.recipeIndex, []);
  const historyIndex = readSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.historyIndex, []);
  const syncMeta = readSettingsJson(
    settingsStorage,
    PHONE_STORAGE_KEYS.syncMeta,
    createDefaultPhoneSyncMeta()
  );

  const recipesByTool = tools.reduce((accumulator, tool) => {
    accumulator[tool.toolId] = recipeIndex.filter(
      (recipeSummary) => recipeSummary.toolId === tool.toolId && !recipeSummary.archived
    );
    return accumulator;
  }, {});

  return {
    tools,
    recipeIndex,
    historyIndex,
    syncMeta,
    recipesByTool
  };
}
