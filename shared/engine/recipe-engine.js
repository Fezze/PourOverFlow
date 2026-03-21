import { getToolById } from "../constants/tool-catalog";
import {
  CURRENT_SCHEMA_VERSION,
  createLastResultSummary,
  createGeneratedId,
  createRecipeSnapshot
} from "../domain/schema";

export function createScaffoldSession(recipeDefinition) {
  const tool = getToolById(recipeDefinition.toolId);
  const steps = (recipeDefinition.steps || []).map((step) => ({ ...step }));
  const startedAt = Date.now();
  const recipeSnapshot =
    recipeDefinition.recipeUpdatedAt !== undefined
      ? {
          ...recipeDefinition,
          steps
        }
      : createRecipeSnapshot(recipeDefinition);

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    sessionId: createGeneratedId("sess", startedAt),
    recipeId: recipeDefinition.recipeId,
    recipeName: recipeDefinition.name,
    recipeSnapshot,
    toolId: recipeDefinition.toolId,
    toolLabel: tool ? tool.label : recipeDefinition.toolId,
    status: "running",
    currentStepIndex: 0,
    stepCount: steps.length,
    steps,
    startedAt,
    updatedAt: startedAt,
    elapsedMs: 0
  };
}

export function getCurrentScaffoldStep(activeSession) {
  if (!activeSession || !Array.isArray(activeSession.steps)) {
    return null;
  }

  return activeSession.steps[activeSession.currentStepIndex] || null;
}

export function buildScaffoldResult(activeSession) {
  const historyEntry = buildHistoryEntryFromSession(activeSession);

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    ...createLastResultSummary(historyEntry),
    summary:
      activeSession.status === "aborted"
        ? "Session aborted. Watch will sync the result back to the phone when the bridge is connected."
        : "Session completed. Result is ready for phone history sync."
  };
}

export function buildHistoryEntryFromSession(activeSession) {
  const endedAt = Date.now();
  const completedSteps =
    activeSession.status === "completed"
      ? activeSession.stepCount
      : Math.max(0, Math.min(activeSession.currentStepIndex, activeSession.stepCount));

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    historyId: createGeneratedId("hist", endedAt),
    sessionId: activeSession.sessionId,
    recipeId: activeSession.recipeId,
    toolId: activeSession.toolId,
    recipeSnapshot: activeSession.recipeSnapshot,
    status: activeSession.status,
    startedAt: activeSession.startedAt,
    endedAt,
    elapsedMs: activeSession.elapsedMs,
    stepRunResults: [],
    deviationSummary: {
      totalDeltaMs: 0,
      worstStepDeltaMs: 0,
      completedSteps,
      totalSteps: activeSession.stepCount
    },
    syncedFrom: "watch",
    createdAt: endedAt,
    updatedAt: endedAt
  };
}
