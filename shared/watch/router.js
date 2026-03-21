import { push, replace } from "@zos/router";
import { getSupportedTools, getToolById } from "../constants/tool-catalog";
import { buildScaffoldResult, createScaffoldSession } from "../engine/recipe-engine";
import { getSeedRecipeRecordById, getSeedRecipeRecords } from "../domain/seed-library";
import { createRecipeSummary } from "../domain/schema";
import { advanceSession, abortSession } from "../engine/session-reducer";
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
  return selectedTool
    ? getSeedRecipeRecords(0)
        .filter((recipeRecord) => recipeRecord.toolId === selectedTool.toolId && !recipeRecord.archived)
        .map((recipeRecord) => createRecipeSummary(recipeRecord))
    : [];
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
  const recipeRecord = getSeedRecipeRecordById(recipeSummary.recipeId, Date.now());

  if (!recipeRecord) {
    return;
  }

  writeSelectedToolId(recipeSummary.toolId);
  writeSelectedRecipeId(recipeSummary.recipeId);
  writeActiveSession(createScaffoldSession(recipeRecord));
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
