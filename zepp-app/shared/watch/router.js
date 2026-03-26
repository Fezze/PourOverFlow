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
import { logValidation } from "./validation-log";

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
  logValidation("history_entry_queued", {
    historyId: historyEntry.historyId,
    status: historyEntry.status,
    pendingHistoryCount: getPendingHistoryQueue().length
  });
  flushPendingHistoryQueue();
}

function finalizeFinishedSession(nextSession) {
  const historyEntry = buildHistoryEntryFromSession(nextSession);
  persistCompletedHistoryEntry(historyEntry);
  clearActiveSession();
  disableActiveSessionDisplayGuard();
  logValidation("session_finalize", {
    recipeId: nextSession.recipeId,
    status: nextSession.status,
    currentStepIndex: nextSession.currentStepIndex,
    historyId: historyEntry.historyId
  });
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
  logValidation("session_start", {
    recipeId: activeSession.recipeId,
    recipeName: recipeSnapshot.name,
    firstStepKind: getCurrentSessionStep(activeSession)?.kind || null,
    expectedStepEndAt: activeSession.expectedStepEndAt || null
  });
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
  logValidation("session_resume_route", {
    recipeId: resumeResult.activeSession.recipeId,
    status: resumeResult.activeSession.status,
    currentStepIndex: resumeResult.activeSession.currentStepIndex
  });
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
  logValidation("session_discard_from_home", {
    recipeId: abortedSession.recipeId,
    historyId: historyEntry.historyId
  });
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
  logValidation("session_advance", {
    recipeId: nextSession.recipeId,
    status: nextSession.status,
    currentStepIndex: nextSession.currentStepIndex,
    stepKind: getCurrentSessionStep(nextSession)?.kind || null
  });
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
    logValidation("session_abort", {
      recipeId: abortedSession.recipeId,
      currentStepIndex: abortedSession.currentStepIndex,
      historyId: historyEntry.historyId
    });
  }

  disableActiveSessionDisplayGuard();
  replace({ url: PAGE_URLS.home });
}

export function reconcileActiveSessionOnEntry(now = Date.now()) {
  const activeSession = readActiveSession();

  if (!activeSession) {
    logValidation("resume_skip", {
      reason: "no_active_session"
    });
    return {
      activeSession: null,
      finalized: false
    };
  }

  logValidation("resume_attempt", {
    recipeId: activeSession.recipeId,
    previousStatus: activeSession.status,
    currentStepIndex: activeSession.currentStepIndex,
    expectedStepEndAt: activeSession.expectedStepEndAt || null,
    now
  });

  const resumedSession = resumeSession(activeSession, { now });

  if (!resumedSession) {
    clearActiveSession();
    disableActiveSessionDisplayGuard();
    logValidation("resume_clear", {
      recipeId: activeSession.recipeId,
      reason: "resume_returned_null"
    });
    return {
      activeSession: null,
      finalized: false
    };
  }

  if (resumedSession.status === "completed") {
    logValidation("resume_finalize_completed", {
      recipeId: resumedSession.recipeId,
      currentStepIndex: resumedSession.currentStepIndex
    });
    finalizeFinishedSession(resumedSession);
    return {
      activeSession: null,
      finalized: true
    };
  }

  if (resumedSession.status === "aborted" || resumedSession.status === "expired") {
    clearActiveSession();
    disableActiveSessionDisplayGuard();
    logValidation("resume_clear", {
      recipeId: resumedSession.recipeId,
      reason: resumedSession.status
    });
    return {
      activeSession: null,
      finalized: false
    };
  }

  if (JSON.stringify(resumedSession) !== JSON.stringify(activeSession)) {
    writeActiveSession(resumedSession);
  }

  logValidation("resume_success", {
    recipeId: resumedSession.recipeId,
    status: resumedSession.status,
    currentStepIndex: resumedSession.currentStepIndex,
    expectedStepEndAt: resumedSession.expectedStepEndAt || null
  });

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
