import { TOOL_CATALOG } from "../constants/tool-catalog";

function createDefaultRuntimeState() {
  return {
    selectedToolId: TOOL_CATALOG[0] ? TOOL_CATALOG[0].toolId : null,
    selectedRecipeId: null,
    activeSession: null,
    lastResult: null,
    catalogReady: false
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
  getRuntimeState().activeSession = activeSession;
  return activeSession;
}

export function clearActiveSession() {
  getRuntimeState().activeSession = null;
}

export function readLastResult() {
  return getRuntimeState().lastResult;
}

export function writeLastResult(lastResult) {
  getRuntimeState().lastResult = lastResult;
  return lastResult;
}

export function markCatalogReady() {
  getRuntimeState().catalogReady = true;
}

export function isCatalogReady() {
  return Boolean(getRuntimeState().catalogReady);
}
