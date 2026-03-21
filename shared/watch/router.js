import { push, replace } from "@zos/router";
import { getSupportedTools, getToolById } from "../constants/tool-catalog";
import { buildScaffoldResult, createScaffoldSession } from "../engine/recipe-engine";
import { advanceSession, abortSession } from "../engine/session-reducer";
import { createScaffoldRecipeSummaryList } from "../domain/schema";
import {
  clearActiveSession,
  getRuntimeState,
  readActiveSession,
  readLastResult,
  readSelectedToolId,
  writeActiveSession,
  writeLastResult,
  writeSelectedRecipeId,
  writeSelectedToolId
} from "../storage/watch-store";

export const PAGE_URLS = {
  home: "page/home/index",
  toolList: "page/tool-list/index",
  recipeList: "page/recipe-list/index",
  brewActive: "page/brew-active/index",
  resultSummary: "page/result-summary/index"
};

export function getToolList() {
  return getSupportedTools();
}

export function getSelectedTool() {
  const selectedToolId = readSelectedToolId();
  return getToolById(selectedToolId) || getToolList()[0] || null;
}

export function getRecipeListForSelectedTool() {
  const selectedTool = getSelectedTool();
  return selectedTool ? createScaffoldRecipeSummaryList(selectedTool.toolId) : [];
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
  writeSelectedToolId(recipeSummary.toolId);
  writeSelectedRecipeId(recipeSummary.recipeId);
  writeActiveSession(createScaffoldSession(recipeSummary));
  push({ url: PAGE_URLS.brewActive });
}

export function resumeActiveSession() {
  if (!readActiveSession()) {
    return false;
  }

  replace({ url: PAGE_URLS.brewActive });
  return true;
}

export function advanceOrCompleteActiveSession() {
  const activeSession = readActiveSession();
  if (!activeSession) {
    return null;
  }

  const nextSession = advanceSession(activeSession);
  if (nextSession.status === "completed") {
    writeLastResult(buildScaffoldResult(nextSession));
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
    writeLastResult(buildScaffoldResult(abortedSession));
    clearActiveSession();
  }

  replace({ url: PAGE_URLS.home });
}

export function getHomeScaffoldState() {
  const runtimeState = getRuntimeState();
  return {
    activeSession: runtimeState.activeSession,
    lastResult: readLastResult(),
    selectedTool: getSelectedTool()
  };
}
