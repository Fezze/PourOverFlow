import { getToolById } from "../constants/tool-catalog";
import {
  CURRENT_SCHEMA_VERSION,
  createGeneratedId,
  createRecipeSnapshot
} from "../domain/schema";

export function createScaffoldSession(recipeRecord) {
  const tool = getToolById(recipeRecord.toolId);
  const steps = (recipeRecord.steps || []).map((step) => ({ ...step }));
  const startedAt = Date.now();

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    sessionId: createGeneratedId("sess", startedAt),
    recipeId: recipeRecord.recipeId,
    recipeName: recipeRecord.name,
    recipeSnapshot: createRecipeSnapshot(recipeRecord),
    toolId: recipeRecord.toolId,
    toolLabel: tool ? tool.label : recipeRecord.toolId,
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
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    historyId: createGeneratedId("hist"),
    recipeId: activeSession.recipeId,
    recipeName: activeSession.recipeName,
    toolId: activeSession.toolId,
    colorToken: activeSession.recipeSnapshot.colorToken,
    status: activeSession.status,
    endedAt: Date.now(),
    elapsedMs: activeSession.elapsedMs,
    totalDeltaMs: 0,
    summary:
      activeSession.status === "aborted"
        ? "Seed preview session aborted before phone persistence and sync land."
        : "Seed preview session completed. Full phone history sync lands in the next stage."
  };
}
