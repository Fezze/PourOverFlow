import { LocalStorage } from "@zos/storage";
import { TOOL_CATALOG } from "../constants/tool-catalog";
import { CURRENT_SCHEMA_VERSION } from "../domain/schema";
import { WATCH_STORAGE_KEYS } from "./keys";
import { emitRuntimeEvent } from "../watch/runtime-events";

const watchStorage = new LocalStorage();
const PENDING_HISTORY_LIMIT = 20;

function safeParseJson(rawValue, fallbackValue) {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return fallbackValue;
  }

  if (typeof rawValue !== "string") {
    return rawValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    console.log("Failed to parse watch storage JSON", error);
    return fallbackValue;
  }
}

function readWatchJson(key, fallbackValue) {
  return safeParseJson(watchStorage.getItem(key), fallbackValue);
}

function writeWatchJson(key, value) {
  watchStorage.setItem(key, JSON.stringify(value));
  return value;
}

function removeWatchKey(key) {
  watchStorage.removeItem(key);
}

function createDefaultCatalogCache() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    toolCatalogRevision: 0,
    recipeCatalogRevision: 0,
    tools: [...TOOL_CATALOG],
    recipesByTool: TOOL_CATALOG.reduce((accumulator, tool) => {
      accumulator[tool.toolId] = [];
      return accumulator;
    }, {}),
    recipeSnapshotsById: {},
    cachedAt: 0
  };
}

function normalizeActiveSession(activeSession) {
  if (!activeSession || typeof activeSession !== "object") {
    return null;
  }

  if (!activeSession.recipeSnapshot || !Array.isArray(activeSession.recipeSnapshot.steps)) {
    return null;
  }

  const steps = activeSession.recipeSnapshot.steps.map((step) => ({ ...step }));

  if (!steps.length) {
    return null;
  }

  const currentStepIndex = Number.isInteger(activeSession.currentStepIndex)
    ? Math.min(Math.max(activeSession.currentStepIndex, 0), steps.length - 1)
    : 0;

  return {
    ...activeSession,
    recipeSnapshot: {
      ...activeSession.recipeSnapshot,
      steps
    },
    currentStepIndex,
    completedStepIds: Array.isArray(activeSession.completedStepIds) ? [...activeSession.completedStepIds] : [],
    stepRunResults: Array.isArray(activeSession.stepRunResults) ? [...activeSession.stepRunResults] : [],
    elapsedSessionMs: Number.isFinite(activeSession.elapsedSessionMs) ? activeSession.elapsedSessionMs : 0,
    wakeUpResumeEnabled: activeSession.wakeUpResumeEnabled === true,
    pageBrightModeEnabled: activeSession.pageBrightModeEnabled === true
  };
}

function normalizeLastResult(lastResult) {
  if (!lastResult || typeof lastResult !== "object") {
    return null;
  }

  if (!lastResult.historyId || !lastResult.recipeName) {
    return null;
  }

  return { ...lastResult };
}

function normalizeCatalogCache(catalogCache = {}) {
  const tools =
    Array.isArray(catalogCache.tools) && catalogCache.tools.length ? catalogCache.tools : [...TOOL_CATALOG];
  const normalizedRecipesByTool = tools.reduce((accumulator, tool) => {
    accumulator[tool.toolId] = Array.isArray(catalogCache.recipesByTool && catalogCache.recipesByTool[tool.toolId])
      ? [...catalogCache.recipesByTool[tool.toolId]]
      : [];
    return accumulator;
  }, {});

  return {
    ...createDefaultCatalogCache(),
    ...catalogCache,
    tools,
    recipesByTool: normalizedRecipesByTool,
    recipeSnapshotsById:
      catalogCache.recipeSnapshotsById && typeof catalogCache.recipeSnapshotsById === "object"
        ? { ...catalogCache.recipeSnapshotsById }
        : {}
  };
}

function createDefaultWatchSyncMeta() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    toolCatalogRevision: 0,
    recipeCatalogRevision: 0,
    historyRevision: 0,
    pendingHistoryQueue: []
  };
}

function normalizeWatchSyncMeta(syncMeta = {}) {
  return {
    ...createDefaultWatchSyncMeta(),
    ...syncMeta,
    pendingHistoryQueue: Array.isArray(syncMeta.pendingHistoryQueue) ? [...syncMeta.pendingHistoryQueue] : []
  };
}

function getInitialSelectedToolId(catalogCache) {
  const tools = catalogCache && Array.isArray(catalogCache.tools) && catalogCache.tools.length
    ? catalogCache.tools
    : TOOL_CATALOG;

  return tools[0] ? tools[0].toolId : null;
}

function createDefaultRuntimeState() {
  const catalogCache = normalizeCatalogCache(readWatchJson(WATCH_STORAGE_KEYS.catalogCache, createDefaultCatalogCache()));
  const syncMeta = normalizeWatchSyncMeta(readWatchJson(WATCH_STORAGE_KEYS.syncMeta, createDefaultWatchSyncMeta()));
  const activeSession = normalizeActiveSession(readWatchJson(WATCH_STORAGE_KEYS.activeSession, null));
  const lastResult = normalizeLastResult(readWatchJson(WATCH_STORAGE_KEYS.lastResult, null));

  if (!activeSession) {
    removeWatchKey(WATCH_STORAGE_KEYS.activeSession);
  }

  if (!lastResult) {
    removeWatchKey(WATCH_STORAGE_KEYS.lastResult);
  }

  return {
    selectedToolId: getInitialSelectedToolId(catalogCache),
    selectedRecipeId: null,
    activeSession,
    lastResult,
    validationNote: null,
    catalogCache,
    syncMeta,
    catalogReady: Number.isFinite(catalogCache.cachedAt) && catalogCache.cachedAt > 0,
    connected: false
  };
}

export function getRuntimeState() {
  const app = getApp();

  if (!app.globalData.runtimeState) {
    app.globalData.runtimeState = createDefaultRuntimeState();
  }

  return app.globalData.runtimeState;
}

export function readSelectedToolId() {
  return getRuntimeState().selectedToolId;
}

export function writeSelectedToolId(toolId) {
  getRuntimeState().selectedToolId = toolId;
  return toolId;
}

export function readSelectedRecipeId() {
  return getRuntimeState().selectedRecipeId;
}

export function writeSelectedRecipeId(recipeId) {
  getRuntimeState().selectedRecipeId = recipeId;
  return recipeId;
}

export function readActiveSession() {
  return getRuntimeState().activeSession;
}

export function writeActiveSession(activeSession) {
  const nextActiveSession = normalizeActiveSession(activeSession);
  getRuntimeState().activeSession = nextActiveSession;

  if (nextActiveSession) {
    writeWatchJson(WATCH_STORAGE_KEYS.activeSession, nextActiveSession);
  } else {
    removeWatchKey(WATCH_STORAGE_KEYS.activeSession);
  }

  return nextActiveSession;
}

export function clearActiveSession() {
  getRuntimeState().activeSession = null;
  removeWatchKey(WATCH_STORAGE_KEYS.activeSession);
}

export function readLastResult() {
  return getRuntimeState().lastResult;
}

export function writeLastResult(lastResult) {
  const nextLastResult = normalizeLastResult(lastResult);
  getRuntimeState().lastResult = nextLastResult;

  if (nextLastResult) {
    writeWatchJson(WATCH_STORAGE_KEYS.lastResult, nextLastResult);
  } else {
    removeWatchKey(WATCH_STORAGE_KEYS.lastResult);
  }

  emitRuntimeEvent({
    type: "last_result",
    value: nextLastResult
  });

  return nextLastResult;
}

export function readCatalogCache() {
  return getRuntimeState().catalogCache;
}

export function writeCatalogCache(catalogCache) {
  const runtimeState = getRuntimeState();
  const nextCatalogCache = normalizeCatalogCache(catalogCache);
  runtimeState.catalogCache = nextCatalogCache;
  runtimeState.catalogReady = true;
  writeWatchJson(WATCH_STORAGE_KEYS.catalogCache, nextCatalogCache);

  if (!nextCatalogCache.tools.find((tool) => tool.toolId === runtimeState.selectedToolId)) {
    runtimeState.selectedToolId = getInitialSelectedToolId(nextCatalogCache);
    runtimeState.selectedRecipeId = null;
  }

  if (
    runtimeState.selectedRecipeId &&
    !nextCatalogCache.recipeSnapshotsById[runtimeState.selectedRecipeId]
  ) {
    runtimeState.selectedRecipeId = null;
  }

  emitRuntimeEvent({
    type: "catalog",
    value: nextCatalogCache
  });

  return nextCatalogCache;
}

export function readWatchSyncMeta() {
  return getRuntimeState().syncMeta;
}

export function writeWatchSyncMeta(syncMeta) {
  const nextSyncMeta = normalizeWatchSyncMeta(syncMeta);
  getRuntimeState().syncMeta = nextSyncMeta;
  writeWatchJson(WATCH_STORAGE_KEYS.syncMeta, nextSyncMeta);
  emitRuntimeEvent({
    type: "sync_meta",
    value: nextSyncMeta
  });
  return nextSyncMeta;
}

export function getToolCatalog() {
  return readCatalogCache().tools || [];
}

export function getRecipesForTool(toolId) {
  const catalogCache = readCatalogCache();
  return catalogCache.recipesByTool && Array.isArray(catalogCache.recipesByTool[toolId])
    ? [...catalogCache.recipesByTool[toolId]]
    : [];
}

export function getRecipeSnapshotById(recipeId) {
  const catalogCache = readCatalogCache();
  return catalogCache.recipeSnapshotsById ? catalogCache.recipeSnapshotsById[recipeId] || null : null;
}

export function applyToolCatalogSnapshot(payload) {
  const currentCatalogCache = readCatalogCache();
  const nextCatalogCache = {
    ...currentCatalogCache,
    toolCatalogRevision: payload.toolCatalogRevision,
    tools: payload.tools,
    cachedAt: Date.now()
  };

  writeCatalogCache(nextCatalogCache);
  writeWatchSyncMeta({
    ...readWatchSyncMeta(),
    toolCatalogRevision: payload.toolCatalogRevision,
    lastBootstrapAt: Date.now()
  });

  return nextCatalogCache;
}

export function applyCatalogSnapshot(payload) {
  const currentCatalogCache = readCatalogCache();
  const nextCatalogCache = {
    ...currentCatalogCache,
    recipeCatalogRevision: payload.recipeCatalogRevision,
    recipesByTool: payload.recipesByTool,
    recipeSnapshotsById: payload.recipeSnapshotsById,
    cachedAt: Date.now()
  };

  writeCatalogCache(nextCatalogCache);
  writeWatchSyncMeta({
    ...readWatchSyncMeta(),
    recipeCatalogRevision: payload.recipeCatalogRevision,
    lastBootstrapAt: Date.now()
  });

  return nextCatalogCache;
}

export function applyHistorySnapshot(payload) {
  writeLastResult(payload.latestResult || null);
  return writeWatchSyncMeta({
    ...readWatchSyncMeta(),
    historyRevision: payload.historyRevision,
    lastBootstrapAt: Date.now()
  });
}

export function enqueuePendingHistoryEntry(historyEntry) {
  const syncMeta = readWatchSyncMeta();
  const nextQueue = syncMeta.pendingHistoryQueue.filter(
    (pendingEntry) => pendingEntry.historyId !== historyEntry.historyId
  );

  nextQueue.push(historyEntry);

  if (nextQueue.length > PENDING_HISTORY_LIMIT) {
    nextQueue.splice(0, nextQueue.length - PENDING_HISTORY_LIMIT);
  }

  return writeWatchSyncMeta({
    ...syncMeta,
    pendingHistoryQueue: nextQueue
  });
}

export function ackPendingHistoryEntry(historyId, historyRevision) {
  const syncMeta = readWatchSyncMeta();

  return writeWatchSyncMeta({
    ...syncMeta,
    historyRevision: Number.isFinite(historyRevision) ? historyRevision : syncMeta.historyRevision,
    lastAckedHistoryId: historyId,
    pendingHistoryQueue: syncMeta.pendingHistoryQueue.filter(
      (pendingEntry) => pendingEntry.historyId !== historyId
    )
  });
}

export function getPendingHistoryQueue() {
  return [...readWatchSyncMeta().pendingHistoryQueue];
}

export function markCatalogReady() {
  getRuntimeState().catalogReady = true;
}

export function isCatalogReady() {
  return Boolean(getRuntimeState().catalogReady);
}

export function setConnectionStatus(connected) {
  const nextConnected = Boolean(connected);
  getRuntimeState().connected = nextConnected;
  emitRuntimeEvent({
    type: "connection",
    value: nextConnected
  });
}

export function isWatchConnected() {
  return Boolean(getRuntimeState().connected);
}

export function readValidationNote() {
  return getRuntimeState().validationNote || null;
}

export function writeValidationNote(note) {
  const nextNote = typeof note === "string" && note ? note : null;
  getRuntimeState().validationNote = nextNote;
  emitRuntimeEvent({
    type: "validation_note",
    value: nextNote
  });
  return nextNote;
}
