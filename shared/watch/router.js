import { push, replace } from "@zos/router";
import { getSupportedTools } from "../constants/tool-catalog";
import {
  buildHistoryEntryFromSession,
  createScaffoldSession
} from "../engine/recipe-engine";
import { advanceSession, abortSession } from "../engine/session-reducer";
import { createLastResultSummary } from "../domain/schema";
import {
  clearActiveSession,
  enqueuePendingHistoryEntry,
  getPendingHistoryQueue,
  getRecipeSnapshotById,
  getRecipesForTool,
  getRuntimeState,
  getToolCatalog,
  isCatalogReady,
  isWatchConnected,
  readActiveSession,
  readLastResult,
  readSelectedToolId,
  readWatchSyncMeta,
  writeActiveSession,
  writeLastResult,
  writeSelectedRecipeId,
  writeSelectedToolId
} from "../storage/watch-store";
import { flushPendingHistoryQueue, requestBootstrap } from "./sync-bridge";

export const PAGE_URLS = {
  home: "page/home/index",
  toolList: "page/tool-list/index",
  recipeList: "page/recipe-list/index",
  brewActive: "page/brew-active/index",
  resultSummary: "page/result-summary/index"
};

export function getToolList() {
  const syncedTools = getToolCatalog();
  return syncedTools.length ? syncedTools : getSupportedTools();
}

export function getSelectedTool() {
  const selectedToolId = readSelectedToolId();
  return getToolList().find((tool) => tool.toolId === selectedToolId) || getToolList()[0] || null;
}

export function getRecipeListForSelectedTool() {
  const selectedTool = getSelectedTool();
  return selectedTool ? getRecipesForTool(selectedTool.toolId) : [];
}

export function refreshPhoneSnapshot() {
  return requestBootstrap();
}

export function retryPendingHistorySync() {
  return flushPendingHistoryQueue();
}

export function goHome() {
  replace({ url: PAGE_URLS.home });
}

export function goToToolList() {
  push({ url: PAGE_URLS.toolList });
}

export function goToResultSummary() {
  push({ url: PAGE_URLS.resultSummary });
}

export function selectTool(toolId) {
  writeSelectedToolId(toolId);
  writeSelectedRecipeId(null);
  push({ url: PAGE_URLS.recipeList });
}

export function startRecipe(recipeSummary) {
  const recipeSnapshot = getRecipeSnapshotById(recipeSummary.recipeId);

  if (!recipeSnapshot) {
    return false;
  }

  writeSelectedToolId(recipeSummary.toolId);
  writeSelectedRecipeId(recipeSummary.recipeId);
  writeActiveSession(createScaffoldSession(recipeSnapshot));
  push({ url: PAGE_URLS.brewActive });
  return true;
}

export function resumeActiveSession() {
  if (!readActiveSession()) {
    return false;
  }

  replace({ url: PAGE_URLS.brewActive });
  return true;
}

function persistCompletedHistoryEntry(historyEntry) {
  writeLastResult(createLastResultSummary(historyEntry));
  enqueuePendingHistoryEntry(historyEntry);
  flushPendingHistoryQueue();
}

export function advanceOrCompleteActiveSession() {
  const activeSession = readActiveSession();
  if (!activeSession) {
    return null;
  }

  const nextSession = advanceSession(activeSession);
  if (nextSession.status === "completed") {
    const historyEntry = buildHistoryEntryFromSession(nextSession);
    persistCompletedHistoryEntry(historyEntry);
    clearActiveSession();
    replace({ url: PAGE_URLS.resultSummary });
    return { completed: true };
  }

  writeActiveSession(nextSession);
  replace({ url: PAGE_URLS.brewActive });
  return { completed: false };
}

export function abortActiveBrew() {
  const activeSession = readActiveSession();
  if (activeSession) {
    const abortedSession = abortSession(activeSession);
    const historyEntry = buildHistoryEntryFromSession(abortedSession);
    persistCompletedHistoryEntry(historyEntry);
    clearActiveSession();
  }

  replace({ url: PAGE_URLS.home });
}

export function getHomeScaffoldState() {
  const runtimeState = getRuntimeState();
  const selectedTool = getSelectedTool();
  const syncMeta = readWatchSyncMeta();
  const recipeCount = selectedTool ? getRecipesForTool(selectedTool.toolId).length : 0;

  return {
    activeSession: runtimeState.activeSession,
    lastResult: readLastResult(),
    selectedTool,
    recipeCount,
    pendingHistoryCount: getPendingHistoryQueue().length,
    syncMeta,
    connected: isWatchConnected(),
    catalogReady: isCatalogReady()
  };
}
