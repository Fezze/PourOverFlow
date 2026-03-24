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
  readSelectedRecipeId,
  readSelectedToolId,
  readWatchSyncMeta,
  writeActiveSession,
  writeLastResult,
  writeSelectedRecipeId,
  writeSelectedToolId
} from "../storage/watch-store";
import { disableActiveSessionDisplayGuard } from "./display-guard";
import { flushPendingHistoryQueue, requestBootstrap } from "./sync-bridge";

export const PAGE_URLS = {
  home: "page/home/index",
  toolList: "page/tool-list/index",
  recipeList: "page/recipe-list/index",
  recipeDetail: "page/recipe-detail/index",
  brewActive: "page/brew-active/index",
  resultSummary: "page/result-summary/index"
};

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

export function getSelectedRecipe() {
  const selectedRecipeId = readSelectedRecipeId();

  if (!selectedRecipeId) {
    return null;
  }

  return getRecipeListForSelectedTool().find((recipe) => recipe.recipeId === selectedRecipeId) || null;
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

export function goToRecipeList() {
  replace({ url: PAGE_URLS.recipeList });
}

export function selectTool(toolId) {
  writeSelectedToolId(toolId);
  writeSelectedRecipeId(null);
  push({ url: PAGE_URLS.recipeList });
}

export function selectRecipe(recipeId) {
  const selectedRecipe = getRecipeListForSelectedTool().find((recipe) => recipe.recipeId === recipeId);

  if (!selectedRecipe || !selectedRecipe.recipeSnapshot) {
    return false;
  }

  writeSelectedRecipeId(recipeId);
  push({ url: PAGE_URLS.recipeDetail });
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

export function startSelectedRecipe() {
  const selectedRecipe = getSelectedRecipe();

  if (!selectedRecipe) {
    return false;
  }

  return startRecipe(selectedRecipe);
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
