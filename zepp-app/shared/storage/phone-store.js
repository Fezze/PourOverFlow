import { TOOL_CATALOG } from "../constants/tool-catalog.js";
import {
  compareHistoryIndexEntries,
  compareRecipeSummaries,
  createEmptyRecipeRecord,
  createGeneratedId,
  createHistoryIndexEntry,
  createLastResultSummary,
  createRecipeSnapshot,
  createRecipeSummary,
  CURRENT_SCHEMA_VERSION,
  DEFAULT_RECIPE_COLOR_TOKEN,
  normalizeRecipeSteps,
  normalizeText,
  sumRecipeStepDurations,
  toNumberOrFallback,
  toOptionalNumber
} from "../domain/schema.js";
import {
  SEED_LIBRARY_VERSION,
  getSeedRecipeRecords,
  getSeedRecipeRecordsAddedAfterVersion
} from "../domain/seed-library.js";
import { validateHistoryEntry, validateRecipeRecord } from "../domain/validators.js";
import {
  getPhoneHistoryRecordKey,
  getPhoneRecipeRecordKey,
  PHONE_STORAGE_KEYS
} from "./keys.js";

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

export function removeSettingsItem(settingsStorage, key) {
  if (settingsStorage && typeof settingsStorage.removeItem === "function") {
    settingsStorage.removeItem(key);
  }
}

export function createDefaultPhoneSyncMeta() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    toolCatalogRevision: 1,
    recipeCatalogRevision: 1,
    historyRevision: 0,
    seedCatalogVersion: 1,
    seededAt: Date.now()
  };
}

function sortRecipeIndex(recipeIndex) {
  return [...recipeIndex].sort(compareRecipeSummaries);
}

function sortHistoryIndex(historyIndex) {
  return [...historyIndex].sort(compareHistoryIndexEntries);
}

function buildRecipesByTool(tools, recipeIndex) {
  return tools.reduce((accumulator, tool) => {
    accumulator[tool.toolId] = sortRecipeIndex(
      recipeIndex.filter((recipeSummary) => recipeSummary.toolId === tool.toolId && !recipeSummary.archived)
    );
    return accumulator;
  }, {});
}

function writeRecipeIndex(settingsStorage, recipeIndex) {
  return writeSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.recipeIndex, sortRecipeIndex(recipeIndex));
}

function writeHistoryIndex(settingsStorage, historyIndex) {
  return writeSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.historyIndex, sortHistoryIndex(historyIndex));
}

function updatePhoneSyncMeta(settingsStorage, updater) {
  const currentSyncMeta = readPhoneSyncMeta(settingsStorage);
  const nextSyncMeta = updater(currentSyncMeta);
  writeSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.syncMeta, nextSyncMeta);
  return nextSyncMeta;
}

function writeRecipeRecords(settingsStorage, recipeRecords) {
  recipeRecords.forEach((recipeRecord) => {
    writeSettingsJson(settingsStorage, getPhoneRecipeRecordKey(recipeRecord.recipeId), recipeRecord);
  });
}

export function ensurePhoneStorage(settingsStorage) {
  const seedTimestamp = Date.now();
  const hasRecipeIndex = Boolean(settingsStorage.getItem(PHONE_STORAGE_KEYS.recipeIndex));

  if (!settingsStorage.getItem(PHONE_STORAGE_KEYS.tools)) {
    writeSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.tools, TOOL_CATALOG);
  }

  if (!settingsStorage.getItem(PHONE_STORAGE_KEYS.recipeIndex)) {
    const seedRecipeRecords = getSeedRecipeRecords(seedTimestamp);
    writeRecipeRecords(settingsStorage, seedRecipeRecords);
    writeRecipeIndex(
      settingsStorage,
      seedRecipeRecords.map((recipeRecord) => createRecipeSummary(recipeRecord))
    );
  }

  if (!settingsStorage.getItem(PHONE_STORAGE_KEYS.historyIndex)) {
    writeSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.historyIndex, []);
  }

  if (!settingsStorage.getItem(PHONE_STORAGE_KEYS.syncMeta)) {
    writeSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.syncMeta, {
      ...createDefaultPhoneSyncMeta(),
      seedCatalogVersion: hasRecipeIndex ? 1 : SEED_LIBRARY_VERSION,
      seededAt: seedTimestamp
    });
  }

  migrateSeedRecipeLibrary(settingsStorage, seedTimestamp);

  return readPhoneSnapshot(settingsStorage);
}

export function readToolCatalog(settingsStorage) {
  return readSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.tools, TOOL_CATALOG);
}

export function readRecipeIndex(settingsStorage) {
  return sortRecipeIndex(readSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.recipeIndex, []));
}

export function readHistoryIndex(settingsStorage) {
  return sortHistoryIndex(readSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.historyIndex, []));
}

export function readPhoneSyncMeta(settingsStorage) {
  const syncMeta = readSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.syncMeta, createDefaultPhoneSyncMeta());

  return {
    ...createDefaultPhoneSyncMeta(),
    ...syncMeta,
    seedCatalogVersion: Number.isFinite(syncMeta?.seedCatalogVersion)
      ? syncMeta.seedCatalogVersion
      : 1
  };
}

function migrateSeedRecipeLibrary(settingsStorage, seedTimestamp) {
  const currentSyncMeta = readPhoneSyncMeta(settingsStorage);
  const currentSeedCatalogVersion = currentSyncMeta.seedCatalogVersion || 1;

  if (currentSeedCatalogVersion >= SEED_LIBRARY_VERSION) {
    return currentSyncMeta;
  }

  const recipeIndex = readRecipeIndex(settingsStorage);
  const existingRecipeIds = new Set(recipeIndex.map((recipeSummary) => recipeSummary.recipeId));
  const missingSeedRecipes = getSeedRecipeRecordsAddedAfterVersion(currentSeedCatalogVersion, seedTimestamp)
    .filter((recipeRecord) => !existingRecipeIds.has(recipeRecord.recipeId));

  if (missingSeedRecipes.length) {
    writeRecipeRecords(settingsStorage, missingSeedRecipes);
    writeRecipeIndex(settingsStorage, [
      ...recipeIndex,
      ...missingSeedRecipes.map((recipeRecord) => createRecipeSummary(recipeRecord))
    ]);
  }

  const nextSyncMeta = {
    ...currentSyncMeta,
    seedCatalogVersion: SEED_LIBRARY_VERSION,
    recipeCatalogRevision: missingSeedRecipes.length
      ? currentSyncMeta.recipeCatalogRevision + 1
      : currentSyncMeta.recipeCatalogRevision
  };

  writeSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.syncMeta, nextSyncMeta);
  return nextSyncMeta;
}

export function readRecipeRecord(settingsStorage, recipeId) {
  if (!recipeId) {
    return null;
  }

  return readSettingsJson(settingsStorage, getPhoneRecipeRecordKey(recipeId), null);
}

export function readHistoryEntry(settingsStorage, historyId) {
  if (!historyId) {
    return null;
  }

  return readSettingsJson(settingsStorage, getPhoneHistoryRecordKey(historyId), null);
}

export function listRecipeRecords(settingsStorage) {
  return readRecipeIndex(settingsStorage)
    .map((recipeSummary) => readRecipeRecord(settingsStorage, recipeSummary.recipeId))
    .filter(Boolean);
}

export function listHistoryEntries(settingsStorage) {
  return readHistoryIndex(settingsStorage)
    .map((historyIndexEntry) => readHistoryEntry(settingsStorage, historyIndexEntry.historyId))
    .filter(Boolean);
}

export function readPhoneSnapshot(settingsStorage) {
  const tools = readToolCatalog(settingsStorage);
  const recipeIndex = readRecipeIndex(settingsStorage);
  const historyIndex = readHistoryIndex(settingsStorage);
  const syncMeta = readPhoneSyncMeta(settingsStorage);
  const recipesByTool = buildRecipesByTool(tools, recipeIndex);
  const latestHistoryEntry = historyIndex.length
    ? readHistoryEntry(settingsStorage, historyIndex[0].historyId)
    : null;

  return {
    tools,
    recipeIndex,
    historyIndex,
    syncMeta,
    recipesByTool,
    latestHistoryEntry,
    latestResult: latestHistoryEntry ? createLastResultSummary(latestHistoryEntry) : null
  };
}

export function createUserRecipeRecord(options = {}) {
  return createEmptyRecipeRecord({
    ...options,
    toolId: options.toolId,
    colorToken: options.colorToken || DEFAULT_RECIPE_COLOR_TOKEN,
    now: options.now
  });
}

function createRecipeId() {
  return createGeneratedId("recipe");
}

function normalizeRecipeRecordInput(recipeDraft, existingRecipeRecord = null) {
  const now = Date.now();
  const normalizedSteps = normalizeRecipeSteps(
    Array.isArray(recipeDraft.steps) && recipeDraft.steps.length
      ? recipeDraft.steps
      : existingRecipeRecord && Array.isArray(existingRecipeRecord.steps)
        ? existingRecipeRecord.steps
        : createEmptyRecipeRecord().steps
  );
  const minimumDurationMs = sumRecipeStepDurations(normalizedSteps);

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    recipeId:
      normalizeText(recipeDraft.recipeId) ||
      (existingRecipeRecord ? existingRecipeRecord.recipeId : createRecipeId()),
    toolId: normalizeText(recipeDraft.toolId, existingRecipeRecord ? existingRecipeRecord.toolId : ""),
    name: normalizeText(recipeDraft.name),
    colorToken: normalizeText(
      recipeDraft.colorToken,
      existingRecipeRecord ? existingRecipeRecord.colorToken : DEFAULT_RECIPE_COLOR_TOKEN
    ),
    description: normalizeText(recipeDraft.description),
    coffeeDoseG: toNumberOrFallback(
      recipeDraft.coffeeDoseG,
      existingRecipeRecord ? existingRecipeRecord.coffeeDoseG : 0
    ),
    totalWaterMl: toNumberOrFallback(
      recipeDraft.totalWaterMl,
      existingRecipeRecord ? existingRecipeRecord.totalWaterMl : 0
    ),
    waterTempC: toNumberOrFallback(
      recipeDraft.waterTempC,
      existingRecipeRecord ? existingRecipeRecord.waterTempC : 0
    ),
    filterLabel: normalizeText(recipeDraft.filterLabel),
    grindLabel: normalizeText(recipeDraft.grindLabel),
    estimatedTotalDurationMs: toNumberOrFallback(
      recipeDraft.estimatedTotalDurationMs,
      existingRecipeRecord ? existingRecipeRecord.estimatedTotalDurationMs : minimumDurationMs
    ),
    notes: normalizeText(recipeDraft.notes),
    steps: normalizedSteps,
    createdAt: existingRecipeRecord ? existingRecipeRecord.createdAt : now,
    updatedAt: now,
    source: existingRecipeRecord ? existingRecipeRecord.source : "user",
    archived: existingRecipeRecord ? Boolean(existingRecipeRecord.archived) : false
  };
}

export function saveRecipeRecord(settingsStorage, recipeDraft) {
  const existingRecipeRecord = recipeDraft.recipeId
    ? readRecipeRecord(settingsStorage, recipeDraft.recipeId)
    : null;
  const recipeRecord = normalizeRecipeRecordInput(recipeDraft, existingRecipeRecord);
  const issues = validateRecipeRecord(recipeRecord);

  if (issues.length) {
    return {
      ok: false,
      issues,
      recipeRecord
    };
  }

  const nextRecipeIndex = readRecipeIndex(settingsStorage).filter(
    (recipeSummary) => recipeSummary.recipeId !== recipeRecord.recipeId
  );
  nextRecipeIndex.push(createRecipeSummary(recipeRecord));

  writeSettingsJson(settingsStorage, getPhoneRecipeRecordKey(recipeRecord.recipeId), recipeRecord);
  writeRecipeIndex(settingsStorage, nextRecipeIndex);
  const syncMeta = updatePhoneSyncMeta(settingsStorage, (currentSyncMeta) => ({
    ...currentSyncMeta,
    recipeCatalogRevision: currentSyncMeta.recipeCatalogRevision + 1
  }));

  return {
    ok: true,
    issues: [],
    recipeRecord,
    syncMeta
  };
}

export function duplicateRecipeRecord(settingsStorage, recipeId) {
  const recipeRecord = readRecipeRecord(settingsStorage, recipeId);

  if (!recipeRecord) {
    return {
      ok: false,
      issues: ["Recipe record not found."]
    };
  }

  return saveRecipeRecord(settingsStorage, {
    ...recipeRecord,
    recipeId: "",
    name: `${recipeRecord.name} Copy`,
    source: "user",
    createdAt: undefined,
    updatedAt: undefined,
    steps: recipeRecord.steps.map((step) => ({
      ...step,
      stepId: ""
    }))
  });
}

export function deleteRecipeRecord(settingsStorage, recipeId) {
  const existingRecipeRecord = readRecipeRecord(settingsStorage, recipeId);

  if (!existingRecipeRecord) {
    return false;
  }

  removeSettingsItem(settingsStorage, getPhoneRecipeRecordKey(recipeId));
  writeRecipeIndex(
    settingsStorage,
    readRecipeIndex(settingsStorage).filter((recipeSummary) => recipeSummary.recipeId !== recipeId)
  );
  updatePhoneSyncMeta(settingsStorage, (currentSyncMeta) => ({
    ...currentSyncMeta,
    recipeCatalogRevision: currentSyncMeta.recipeCatalogRevision + 1
  }));

  return true;
}

export function saveHistoryEntry(settingsStorage, historyEntry) {
  const issues = validateHistoryEntry(historyEntry);

  if (issues.length) {
    return {
      ok: false,
      issues,
      historyEntry
    };
  }

  const nextHistoryIndex = readHistoryIndex(settingsStorage).filter(
    (historyIndexEntry) => historyIndexEntry.historyId !== historyEntry.historyId
  );
  nextHistoryIndex.push(createHistoryIndexEntry(historyEntry));

  writeSettingsJson(settingsStorage, getPhoneHistoryRecordKey(historyEntry.historyId), historyEntry);
  writeHistoryIndex(settingsStorage, nextHistoryIndex);
  const syncMeta = updatePhoneSyncMeta(settingsStorage, (currentSyncMeta) => ({
    ...currentSyncMeta,
    historyRevision: currentSyncMeta.historyRevision + 1
  }));

  return {
    ok: true,
    issues: [],
    historyEntry,
    syncMeta
  };
}

export function updateHistoryEntryFeedback(settingsStorage, historyId, patch) {
  const historyEntry = readHistoryEntry(settingsStorage, historyId);

  if (!historyEntry) {
    return {
      ok: false,
      issues: ["History entry not found."]
    };
  }

  const nextHistoryEntry = {
    ...historyEntry,
    userNote: normalizeText(patch.userNote),
    userRating:
      patch.userRating === "" || patch.userRating === null || patch.userRating === undefined
        ? undefined
        : toOptionalNumber(patch.userRating),
    updatedAt: Date.now()
  };

  return saveHistoryEntry(settingsStorage, nextHistoryEntry);
}

export function buildRecipeSnapshotsById(
  settingsStorage,
  recipeIndex = readRecipeIndex(settingsStorage)
) {
  return recipeIndex.reduce((accumulator, recipeSummary) => {
    const recipeRecord = readRecipeRecord(settingsStorage, recipeSummary.recipeId);

    if (recipeRecord) {
      accumulator[recipeSummary.recipeId] = createRecipeSnapshot(recipeRecord);
    }

    return accumulator;
  }, {});
}
