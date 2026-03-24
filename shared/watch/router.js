import { push, replace } from "@zos/router";
import { getSupportedTools } from "../constants/tool-catalog";
import {
  buildHistoryEntryFromSession,
  createActiveBrewSession,
  getCurrentSessionStep
} from "../engine/recipe-engine";
import { playFeedbackCue } from "../engine/feedback";
import { advanceSession, abortSession, resumeSession, tickSession } from "../engine/session-reducer";
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
  readRecipeBrowsePageIndex,
  readSelectedToolId,
  readToolBrowsePageIndex,
  readWatchSyncMeta,
  writeActiveSession,
  writeLastResult,
  writeRecipeBrowsePageIndex,
  writeSelectedRecipeId,
  writeSelectedToolId,
  writeToolBrowsePageIndex
} from "../storage/watch-store";
import { disableActiveSessionDisplayGuard } from "./display-guard";
import { flushPendingHistoryQueue, requestBootstrap } from "./sync-bridge";

export const PAGE_URLS = {
  home: "page/home/index",
  toolList: "page/tool-list/index",
  recipeList: "page/recipe-list/index",
  brewActive: "page/brew-active/index",
  resultSummary: "page/result-summary/index"
};

export const WATCH_BROWSE_PAGE_SIZE = 2;

function clampBrowsePageIndex(pageIndex, itemCount, pageSize = WATCH_BROWSE_PAGE_SIZE) {
  if (!itemCount) {
    return 0;
  }

  const totalPages = Math.max(1, Math.ceil(itemCount / pageSize));
  const safePageIndex = Number.isInteger(pageIndex) && pageIndex >= 0 ? pageIndex : 0;
  return Math.min(safePageIndex, totalPages - 1);
}

function buildBrowsePage(items, pageIndex, pageSize = WATCH_BROWSE_PAGE_SIZE) {
  const totalItems = items.length;
  const totalPages = totalItems ? Math.ceil(totalItems / pageSize) : 0;
  const safePageIndex = clampBrowsePageIndex(pageIndex, totalItems, pageSize);
  const sliceStart = safePageIndex * pageSize;

  return {
    items: items.slice(sliceStart, sliceStart + pageSize),
    pageIndex: safePageIndex,
    totalPages,
    totalItems,
    hasPrevious: safePageIndex > 0,
    hasNext: safePageIndex + 1 < totalPages
  };
}

function persistCompletedHistoryEntry(historyEntry) {
  writeLastResult(createLastResultSummary(historyEntry));
  enqueuePendingHistoryEntry(historyEntry);
  flushPendingHistoryQueue();
}

function finalizeFinishedSession(nextSession) {
  const historyEntry = buildHistoryEntryFromSession(nextSession);
  persistCompletedHistoryEntry(historyEntry);
  clearActiveSession();
  disableActiveSessionDisplayGuard();
  replace({ url: PAGE_URLS.resultSummary });
  return { completed: true, historyEntry };
}

function maybePlayCurrentStepCue(previousSession, nextSession) {
  const previousStep = getCurrentSessionStep(previousSession);
  const nextStep = getCurrentSessionStep(nextSession);

  if (!nextStep) {
    return;
  }

  if (!previousStep || previousStep.stepId !== nextStep.stepId) {
    playFeedbackCue(nextStep.feedbackCue);
  }
}

export function getToolList() {
  const syncedTools = getToolCatalog();
  const tools = syncedTools.length ? syncedTools : getSupportedTools();

  return tools.map((tool) => ({
    ...tool,
    recipeCount: getRecipesForTool(tool.toolId).length
  }));
}

export function getToolBrowsePage(pageSize = WATCH_BROWSE_PAGE_SIZE) {
  const browsePage = buildBrowsePage(getToolList(), readToolBrowsePageIndex(), pageSize);

  if (browsePage.pageIndex !== readToolBrowsePageIndex()) {
    writeToolBrowsePageIndex(browsePage.pageIndex);
  }

  return browsePage;
}

export function getSelectedTool() {
  const selectedToolId = readSelectedToolId();
  return getToolList().find((tool) => tool.toolId === selectedToolId) || getToolList()[0] || null;
}

export function getRecipeListForSelectedTool() {
  const selectedTool = getSelectedTool();

  if (!selectedTool) {
    return [];
  }

  return getRecipesForTool(selectedTool.toolId).map((recipeSummary) => {
    const recipeSnapshot = getRecipeSnapshotById(recipeSummary.recipeId);

    return {
      ...recipeSummary,
      recipeSnapshot
    };
  });
}

export function getRecipeBrowsePage(pageSize = WATCH_BROWSE_PAGE_SIZE) {
  const browsePage = buildBrowsePage(getRecipeListForSelectedTool(), readRecipeBrowsePageIndex(), pageSize);

  if (browsePage.pageIndex !== readRecipeBrowsePageIndex()) {
    writeRecipeBrowsePageIndex(browsePage.pageIndex);
  }

  return browsePage;
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
  writeToolBrowsePageIndex(0);
  push({ url: PAGE_URLS.toolList });
}

export function goToNextToolBrowsePage() {
  const browsePage = getToolBrowsePage();

  if (!browsePage.hasNext) {
    return false;
  }

  writeToolBrowsePageIndex(browsePage.pageIndex + 1);
  replace({ url: PAGE_URLS.toolList });
  return true;
}

export function goToResultSummary() {
  push({ url: PAGE_URLS.resultSummary });
}

export function selectTool(toolId) {
  writeSelectedToolId(toolId);
  writeSelectedRecipeId(null);
  writeRecipeBrowsePageIndex(0);
  push({ url: PAGE_URLS.recipeList });
}

export function goToNextRecipeBrowsePage() {
  const browsePage = getRecipeBrowsePage();

  if (!browsePage.hasNext) {
    return false;
  }

  writeRecipeBrowsePageIndex(browsePage.pageIndex + 1);
  replace({ url: PAGE_URLS.recipeList });
  return true;
}

export function startRecipe(recipeSummary) {
  const recipeSnapshot = getRecipeSnapshotById(recipeSummary.recipeId);

  if (!recipeSnapshot) {
    return false;
  }

  writeSelectedToolId(recipeSummary.toolId);
  writeSelectedRecipeId(recipeSummary.recipeId);
  const activeSession = createActiveBrewSession(recipeSnapshot);
  writeActiveSession(activeSession);
  playFeedbackCue(getCurrentSessionStep(activeSession).feedbackCue);
  push({ url: PAGE_URLS.brewActive });
  return true;
}

export function resumeActiveSession() {
  const resumeResult = reconcileActiveSessionOnEntry();

  if (resumeResult.finalized || !resumeResult.activeSession) {
    return false;
  }

  replace({ url: PAGE_URLS.brewActive });
  return true;
}

export function discardActiveSessionFromHome() {
  const activeSession = readActiveSession();

  if (!activeSession) {
    return false;
  }

  const abortedSession = abortSession(activeSession);
  const historyEntry = buildHistoryEntryFromSession(abortedSession);
  persistCompletedHistoryEntry(historyEntry);
  clearActiveSession();
  disableActiveSessionDisplayGuard();
  replace({ url: PAGE_URLS.home });
  return true;
}

export function tickActiveSession(now = Date.now()) {
  const activeSession = readActiveSession();

  if (!activeSession) {
    return null;
  }

  const nextSession = tickSession(activeSession, { now });

  if (!nextSession) {
    return null;
  }

  if (nextSession.status === "completed") {
    return finalizeFinishedSession(nextSession);
  }

  if (JSON.stringify(nextSession) !== JSON.stringify(activeSession)) {
    maybePlayCurrentStepCue(activeSession, nextSession);
    writeActiveSession(nextSession);
  }

  return {
    completed: false,
    activeSession: nextSession
  };
}

export function advanceOrCompleteActiveSession() {
  const activeSession = readActiveSession();
  if (!activeSession) {
    return null;
  }

  const nextSession = advanceSession(activeSession);
  if (nextSession.status === "completed") {
    return finalizeFinishedSession(nextSession);
  }

  maybePlayCurrentStepCue(activeSession, nextSession);
  writeActiveSession(nextSession);
  replace({ url: PAGE_URLS.brewActive });
  return { completed: false, activeSession: nextSession };
}

export function abortActiveBrew() {
  const activeSession = readActiveSession();
  if (activeSession) {
    const abortedSession = abortSession(activeSession);
    const historyEntry = buildHistoryEntryFromSession(abortedSession);
    persistCompletedHistoryEntry(historyEntry);
    clearActiveSession();
  }

  disableActiveSessionDisplayGuard();
  replace({ url: PAGE_URLS.home });
}

export function reconcileActiveSessionOnEntry(now = Date.now()) {
  const activeSession = readActiveSession();

  if (!activeSession) {
    return {
      activeSession: null,
      finalized: false
    };
  }

  const resumedSession = resumeSession(activeSession, { now });

  if (!resumedSession) {
    clearActiveSession();
    disableActiveSessionDisplayGuard();
    return {
      activeSession: null,
      finalized: false
    };
  }

  if (resumedSession.status === "completed") {
    finalizeFinishedSession(resumedSession);
    return {
      activeSession: null,
      finalized: true
    };
  }

  if (resumedSession.status === "aborted" || resumedSession.status === "expired") {
    clearActiveSession();
    disableActiveSessionDisplayGuard();
    return {
      activeSession: null,
      finalized: false
    };
  }

  if (JSON.stringify(resumedSession) !== JSON.stringify(activeSession)) {
    writeActiveSession(resumedSession);
  }

  return {
    activeSession: readActiveSession(),
    finalized: false
  };
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
