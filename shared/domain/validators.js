import {
  FEEDBACK_CUES,
  RECIPE_COLOR_TOKENS,
  RECIPE_STEP_KINDS
} from "./schema";
import { TOOL_IDS } from "../constants/tool-catalog";

export function isSupportedToolId(toolId) {
  return TOOL_IDS.includes(toolId);
}

export function isRecipeStepKind(value) {
  return RECIPE_STEP_KINDS.includes(value);
}

export function isFeedbackCue(value) {
  return FEEDBACK_CUES.includes(value);
}

export function isColorToken(value) {
  return RECIPE_COLOR_TOKENS.includes(value);
}

export function validateRecipeRecord(recipeRecord) {
  const issues = [];

  if (!recipeRecord || typeof recipeRecord !== "object") {
    issues.push("Recipe record must be an object.");
    return issues;
  }

  if (!isSupportedToolId(recipeRecord.toolId)) {
    issues.push("Recipe toolId must point at the supported tool catalog.");
  }

  if (!recipeRecord.name || !String(recipeRecord.name).trim()) {
    issues.push("Recipe name cannot be empty.");
  }

  if (!isColorToken(recipeRecord.colorToken)) {
    issues.push("Recipe color token must come from the locked palette.");
  }

  if (!Array.isArray(recipeRecord.steps) || recipeRecord.steps.length < 1) {
    issues.push("Recipe must contain at least one step.");
  } else {
    recipeRecord.steps.forEach((step, index) => {
      if (!isRecipeStepKind(step.kind)) {
        issues.push(`Step ${index} has an unsupported kind.`);
      }

      if (!isFeedbackCue(step.feedbackCue)) {
        issues.push(`Step ${index} has an unsupported feedback cue.`);
      }
    });

    const lastStep = recipeRecord.steps[recipeRecord.steps.length - 1];
    if (!lastStep || lastStep.kind !== "finish") {
      issues.push("Recipe must end with a finish step.");
    }
  }

  return issues;
}

export function validateHistoryEntry(historyEntry) {
  const issues = [];

  if (!historyEntry || typeof historyEntry !== "object") {
    issues.push("History entry must be an object.");
    return issues;
  }

  if (!isSupportedToolId(historyEntry.toolId)) {
    issues.push("History entry toolId must belong to the supported catalog.");
  }

  if (!historyEntry.recipeSnapshot || historyEntry.recipeSnapshot.schemaVersion !== 1) {
    issues.push("History entry must carry a schemaVersion 1 recipe snapshot.");
  }

  return issues;
}
