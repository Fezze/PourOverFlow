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
  repairLegacyRecipeSteps,
  normalizeText,
  sumRecipeStepDurations,
  toOptionalNumber
} from "../domain/schema.js";
import {
  SEED_LIBRARY_VERSION,
  getSeedRecipeRecords,
  getSeedRecipeRecordsAddedAfterVersion
} from "../domain/seed-library.js";
import { DEFAULT_LOCALE, resolveSupportedLocale } from "../i18n/index.js";
import { resolvePhoneLocale } from "../i18n/phone-locale.js";
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

function resolveSeedLocale(preferredLocale = null, fallbackLocale = DEFAULT_LOCALE) {
  return resolveSupportedLocale(resolvePhoneLocale(preferredLocale), fallbackLocale);
}

export function createDefaultPhoneSyncMeta(options = {}) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    toolCatalogRevision: 1,
    recipeCatalogRevision: 1,
    historyRevision: 0,
    seedCatalogVersion: 1,
    seedLocale: resolveSeedLocale(options.preferredLocale, options.seedLocale || DEFAULT_LOCALE),
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

function recoverRecipeChange(settingsStorage) {
  const meta = readPhoneSyncMeta(settingsStorage);
  const change = meta.pendingRecipeChange;
  if (typeof change?.operationId !== "string" || typeof change.recipeId !== "string" ||
      (change.record !== null && change.record?.recipeId !== change.recipeId)) {
    return meta;
  }

  const { recipeId, record } = change;
  const index = readRecipeIndex(settingsStorage).filter((entry) => entry.recipeId !== recipeId);
  if (record) {
    writeSettingsJson(settingsStorage, getPhoneRecipeRecordKey(recipeId), record);
    index.push(createRecipeSummary(record));
  } else {
    removeSettingsItem(settingsStorage, getPhoneRecipeRecordKey(recipeId));
  }
  writeRecipeIndex(settingsStorage, index);

  return updatePhoneSyncMeta(settingsStorage, (current) => {
    const { pendingRecipeChange, ...syncMeta } = current;
    if (pendingRecipeChange?.operationId !== change.operationId) {
      return current;
    }
    return { ...syncMeta, recipeCatalogRevision: syncMeta.recipeCatalogRevision + 1 };
  });
}

function commitRecipeChange(settingsStorage, recipeId, record) {
  updatePhoneSyncMeta(settingsStorage, (current) => ({
    ...current,
    pendingRecipeChange: { operationId: createGeneratedId("recipe_change"), recipeId, record }
  }));
  return recoverRecipeChange(settingsStorage);
}

function readSettingsIndex(settingsStorage, key) {
  const entries = readSettingsJson(settingsStorage, key, []);
  return Array.isArray(entries) ? entries.filter((entry) => entry && typeof entry === "object") : [];
}

function writeRecipeRecords(settingsStorage, recipeRecords) {
  recipeRecords.forEach((recipeRecord) => {
    writeSettingsJson(settingsStorage, getPhoneRecipeRecordKey(recipeRecord.recipeId), recipeRecord);
  });
}

export function ensurePhoneStorage(settingsStorage, options = {}) {
  const seedTimestamp = Date.now();
  const preferredLocale = options.preferredLocale || null;
  const hasRecipeIndex = Boolean(settingsStorage.getItem(PHONE_STORAGE_KEYS.recipeIndex));
  const resolvedSeedLocale = resolveSeedLocale(preferredLocale);
  const storedSyncMeta = readSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.syncMeta, null);
  const hasExplicitSeedLocale = Boolean(
    storedSyncMeta && Object.prototype.hasOwnProperty.call(storedSyncMeta, "seedLocale")
  );

  if (!settingsStorage.getItem(PHONE_STORAGE_KEYS.tools)) {
    writeSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.tools, TOOL_CATALOG);
  }

  if (!settingsStorage.getItem(PHONE_STORAGE_KEYS.recipeIndex)) {
    const seedRecipeRecords = getSeedRecipeRecords(seedTimestamp, resolvedSeedLocale);
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
      ...createDefaultPhoneSyncMeta({
        preferredLocale: resolvedSeedLocale,
        seedLocale: resolvedSeedLocale
      }),
      seedCatalogVersion: hasRecipeIndex ? 1 : SEED_LIBRARY_VERSION,
      seededAt: seedTimestamp
    });
  }

  const currentSyncMeta = readPhoneSyncMeta(settingsStorage);
  const nextSeedLocale = hasExplicitSeedLocale
    ? currentSyncMeta.seedLocale
    : (hasRecipeIndex ? DEFAULT_LOCALE : resolvedSeedLocale);

  if (currentSyncMeta.seedLocale !== nextSeedLocale) {
    writeSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.syncMeta, {
      ...currentSyncMeta,
      seedLocale: nextSeedLocale
    });
  }

  recoverRecipeChange(settingsStorage);
  migrateSeedRecipeLibrary(settingsStorage, seedTimestamp, nextSeedLocale);

  return readPhoneSnapshot(settingsStorage);
}

export function readToolCatalog(settingsStorage) {
  const tools = readSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.tools, TOOL_CATALOG);
  return Array.isArray(tools) && tools.length &&
    tools.every((tool) => typeof tool?.toolId === "string" && typeof tool.label === "string")
    ? tools
    : TOOL_CATALOG;
}

export function readRecipeIndex(settingsStorage) {
  return sortRecipeIndex(readSettingsIndex(settingsStorage, PHONE_STORAGE_KEYS.recipeIndex)
    .filter((entry) => typeof entry.recipeId === "string" && typeof entry.name === "string"));
}

export function readHistoryIndex(settingsStorage) {
  return sortHistoryIndex(readSettingsIndex(settingsStorage, PHONE_STORAGE_KEYS.historyIndex)
    .filter((entry) => typeof entry.historyId === "string"));
}

export function readPhoneSyncMeta(settingsStorage) {
  const syncMeta = readSettingsJson(
    settingsStorage,
    PHONE_STORAGE_KEYS.syncMeta,
    createDefaultPhoneSyncMeta()
  );

  return {
    ...createDefaultPhoneSyncMeta({
      seedLocale: syncMeta?.seedLocale
    }),
    ...syncMeta,
    seedCatalogVersion: Number.isFinite(syncMeta?.seedCatalogVersion)
      ? syncMeta.seedCatalogVersion
      : 1,
    seedLocale: resolveSupportedLocale(syncMeta?.seedLocale, DEFAULT_LOCALE)
  };
}

function migrateSeedRecipeLibrary(settingsStorage, seedTimestamp, preferredLocale = DEFAULT_LOCALE) {
  const currentSyncMeta = readPhoneSyncMeta(settingsStorage);
  const currentSeedCatalogVersion = currentSyncMeta.seedCatalogVersion || 1;
  const seedLocale = resolveSupportedLocale(currentSyncMeta.seedLocale || preferredLocale, DEFAULT_LOCALE);

  if (currentSeedCatalogVersion >= SEED_LIBRARY_VERSION) {
    return currentSyncMeta;
  }

  const recipeIndex = readRecipeIndex(settingsStorage);
  const existingRecipeIds = new Set(recipeIndex.map((recipeSummary) => recipeSummary.recipeId));
  const missingSeedRecipes = getSeedRecipeRecordsAddedAfterVersion(
    currentSeedCatalogVersion,
    seedTimestamp,
    seedLocale
  )
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
    seedLocale,
    recipeCatalogRevision: currentSyncMeta.recipeCatalogRevision + 1
  };

  writeSettingsJson(settingsStorage, PHONE_STORAGE_KEYS.syncMeta, nextSyncMeta);
  return nextSyncMeta;
}

export function readRecipeRecord(settingsStorage, recipeId) {
  if (!recipeId) {
    return null;
  }

  const record = readSettingsJson(settingsStorage, getPhoneRecipeRecordKey(recipeId), null);
  return record?.recipeId === recipeId && typeof record.name === "string" &&
    Array.isArray(record.steps) && record.steps.length &&
    record.steps.every((step) => step && typeof step === "object")
    ? record
    : null;
}

export function readHistoryEntry(settingsStorage, historyId) {
  if (!historyId) {
    return null;
  }

  const record = readSettingsJson(settingsStorage, getPhoneHistoryRecordKey(historyId), null);
  return record?.historyId === historyId && typeof record.recipeSnapshot?.name === "string" &&
    Array.isArray(record.recipeSnapshot.steps) && Number.isFinite(record.endedAt)
    ? record
    : null;
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
  const syncMeta = recoverRecipeChange(settingsStorage);
  const tools = readToolCatalog(settingsStorage);
  const recipeIndex = readRecipeIndex(settingsStorage);
  const historyIndex = readHistoryIndex(settingsStorage);
  const recipesByTool = buildRecipesByTool(tools, recipeIndex);
  let latestHistoryEntry = null;
  for (const { historyId } of historyIndex) {
    latestHistoryEntry = readHistoryEntry(settingsStorage, historyId);
    if (latestHistoryEntry) {
      break;
    }
  }

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

function readRecipeNumber(input, fallback) {
  if (typeof input === "string") {
    const value = input.trim();
    if (!value) {
      return fallback;
    }
    return /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/.test(value)
      ? Number(value.replace(",", "."))
      : NaN;
  }
  return input ?? fallback;
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
    coffeeDoseG: readRecipeNumber(
      recipeDraft.coffeeDoseG,
      existingRecipeRecord ? existingRecipeRecord.coffeeDoseG : 0
    ),
    totalWaterMl: readRecipeNumber(
      recipeDraft.totalWaterMl,
      existingRecipeRecord ? existingRecipeRecord.totalWaterMl : 0
    ),
    waterTempC: readRecipeNumber(
      recipeDraft.waterTempC,
      existingRecipeRecord ? existingRecipeRecord.waterTempC : 0
    ),
    filterLabel: normalizeText(recipeDraft.filterLabel),
    grindLabel: normalizeText(recipeDraft.grindLabel),
    estimatedTotalDurationMs: readRecipeNumber(
      recipeDraft.estimatedTotalDurationMs,
      minimumDurationMs
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
  recoverRecipeChange(settingsStorage);
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

  const syncMeta = commitRecipeChange(settingsStorage, recipeRecord.recipeId, recipeRecord);

  return {
    ok: true,
    issues: [],
    recipeRecord,
    syncMeta
  };
}

export function duplicateRecipeRecord(settingsStorage, recipeId) {
  recoverRecipeChange(settingsStorage);
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
    steps: repairLegacyRecipeSteps(recipeRecord.steps).map((step) => ({
      ...step,
      stepId: ""
    }))
  });
}

export function deleteRecipeRecord(settingsStorage, recipeId) {
  recoverRecipeChange(settingsStorage);
  const existingRecipeRecord = readRecipeRecord(settingsStorage, recipeId);

  if (!existingRecipeRecord && !readRecipeIndex(settingsStorage).some((entry) => entry.recipeId === recipeId)) {
    return false;
  }

  commitRecipeChange(settingsStorage, recipeId, null);

  return true;
}

export function saveHistoryEntry(settingsStorage, historyEntry, { watchDelivery = false } = {}) {
  const issues = validateHistoryEntry(historyEntry);

  if (issues.length) {
    return {
      ok: false,
      issues,
      historyEntry
    };
  }

  const { watchDeliveryPending, ...savedEntry } = historyEntry;
  const needsDeliveryMarker = watchDelivery || watchDeliveryPending;
  const recordKey = getPhoneHistoryRecordKey(savedEntry.historyId);
  const nextHistoryIndex = readHistoryIndex(settingsStorage).filter(
    (historyIndexEntry) => historyIndexEntry.historyId !== historyEntry.historyId
  );
  nextHistoryIndex.push(createHistoryIndexEntry(historyEntry));

  // Keep the retry marker on the record until the index and revision are durable.
  writeSettingsJson(settingsStorage, recordKey, needsDeliveryMarker
    ? { ...savedEntry, watchDeliveryPending: true }
    : savedEntry);
  writeHistoryIndex(settingsStorage, nextHistoryIndex);
  const syncMeta = updatePhoneSyncMeta(settingsStorage, (currentSyncMeta) => ({
    ...currentSyncMeta,
    historyRevision: currentSyncMeta.historyRevision + 1
  }));

  if (needsDeliveryMarker) {
    writeSettingsJson(settingsStorage, recordKey, savedEntry);
  }

  return {
    ok: true,
    issues: [],
    historyEntry: savedEntry,
    syncMeta
  };
}

// Watch results are immutable deliveries; phone feedback remains canonical on retries.
export function saveWatchHistoryEntry(settingsStorage, historyEntry) {
  const issues = validateHistoryEntry(historyEntry);

  if (issues.length) {
    return { ok: false, issues, historyEntry };
  }

  const existingEntry = readHistoryEntry(settingsStorage, historyEntry.historyId);

  const indexHasEntry = existingEntry && readHistoryIndex(settingsStorage).some(
    (entry) => entry.historyId === existingEntry.historyId
  );

  if (indexHasEntry && !existingEntry.watchDeliveryPending) {
    return {
      ok: true,
      issues: [],
      historyEntry: existingEntry,
      syncMeta: readPhoneSyncMeta(settingsStorage)
    };
  }

  return saveHistoryEntry(settingsStorage, existingEntry || historyEntry, { watchDelivery: true });
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
