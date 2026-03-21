import { getToolById } from "../constants/tool-catalog";
import {
  CURRENT_SCHEMA_VERSION,
  createScaffoldRecipeSnapshot
} from "../domain/schema";

export function buildScaffoldSteps(recipeSummary) {
  return [
    {
      stepId: "scaffold_prep",
      order: 0,
      kind: "instruction",
      title: "Prep",
      body: "Stage 2 keeps this session lightweight while real recipe steps land in Stage 5.",
      requiresConfirm: true,
      feedbackCue: "none"
    },
    {
      stepId: "scaffold_brew",
      order: 1,
      kind: "timed_action",
      title: "Main brew",
      body: `Placeholder brew loop for ${recipeSummary.name}.`,
      durationMs: 45000,
      requiresConfirm: true,
      feedbackCue: "vibrate_short"
    },
    {
      stepId: "scaffold_finish",
      order: 2,
      kind: "finish",
      title: "Done",
      body: "Save a placeholder result and route into the summary page.",
      requiresConfirm: false,
      feedbackCue: "combo_short"
    }
  ];
}

export function createScaffoldSession(recipeSummary) {
  const tool = getToolById(recipeSummary.toolId);
  const steps = buildScaffoldSteps(recipeSummary);

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    sessionId: `scaffold_${recipeSummary.recipeId}`,
    recipeId: recipeSummary.recipeId,
    recipeName: recipeSummary.name,
    recipeSnapshot: createScaffoldRecipeSnapshot(recipeSummary),
    toolId: recipeSummary.toolId,
    toolLabel: tool ? tool.label : recipeSummary.toolId,
    status: "running",
    currentStepIndex: 0,
    stepCount: steps.length,
    steps,
    startedAt: Date.now(),
    updatedAt: Date.now(),
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
    historyId: `stage2_${activeSession.recipeId}_${activeSession.startedAt}`,
    recipeId: activeSession.recipeId,
    recipeName: activeSession.recipeName,
    toolId: activeSession.toolId,
    status: activeSession.status,
    endedAt: Date.now(),
    elapsedMs: activeSession.elapsedMs,
    summary:
      activeSession.status === "aborted"
        ? "Scaffold session aborted before persistence and sync land."
        : "Scaffold result ready for the later phone sync pipeline."
  };
}
