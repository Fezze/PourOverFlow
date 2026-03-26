import {
  FEEDBACK_CUES,
  HISTORY_STATUSES,
  RECIPE_COLOR_TOKENS,
  RECIPE_SOURCES,
  RECIPE_STEP_KINDS,
  sumRecipeStepDurations
} from "./schema.js";
import { TOOL_IDS } from "../constants/tool-catalog.js";

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

export function isRecipeSource(value) {
  return RECIPE_SOURCES.includes(value);
}

export function isHistoryStatus(value) {
  return HISTORY_STATUSES.includes(value);
}

export function validateRecipeSummary(recipeSummary) {
  const issues = [];

  if (!recipeSummary || typeof recipeSummary !== "object") {
    issues.push("Recipe summary must be an object.");
    return issues;
  }

  if (!recipeSummary.recipeId || !String(recipeSummary.recipeId).trim()) {
    issues.push("Recipe summary must have a recipeId.");
  }

  if (!isSupportedToolId(recipeSummary.toolId)) {
    issues.push("Recipe summary toolId must point at the supported tool catalog.");
  }

  if (!recipeSummary.name || !String(recipeSummary.name).trim()) {
    issues.push("Recipe summary name cannot be empty.");
  }

  if (!isColorToken(recipeSummary.colorToken)) {
    issues.push("Recipe summary color token must come from the locked palette.");
  }

  if (!isRecipeSource(recipeSummary.source)) {
    issues.push("Recipe summary source must be seed or user.");
  }

  if (typeof recipeSummary.archived !== "boolean") {
    issues.push("Recipe summary archived must be a boolean.");
  }

  if (!Number.isFinite(recipeSummary.updatedAt)) {
    issues.push("Recipe summary updatedAt must be a number.");
  }

  return issues;
}

export function validateRecipeStep(step, index, expectedOrder, totalStepCount) {
  const issues = [];

  if (!step || typeof step !== "object") {
    issues.push(`Step ${index} must be an object.`);
    return issues;
  }

  if (!step.stepId || !String(step.stepId).trim()) {
    issues.push(`Step ${index} must have a stepId.`);
  }

  if (!isRecipeStepKind(step.kind)) {
    issues.push(`Step ${index} has an unsupported kind.`);
  }

  if (step.order !== expectedOrder) {
    issues.push(`Step ${index} must have sequential order ${expectedOrder}.`);
  }

  if (!step.title || !String(step.title).trim()) {
    issues.push(`Step ${index} must have a title.`);
  }

  if (!step.body || !String(step.body).trim()) {
    issues.push(`Step ${index} must have body text.`);
  }

  if (!isFeedbackCue(step.feedbackCue)) {
    issues.push(`Step ${index} has an unsupported feedback cue.`);
  }

  if (typeof step.requiresConfirm !== "boolean") {
    issues.push(`Step ${index} requiresConfirm must be boolean.`);
  }

  if (step.kind === "confirm" && step.requiresConfirm !== true) {
    issues.push(`Step ${index} of kind confirm must require confirmation.`);
  }

  if (step.durationMs !== undefined && (!Number.isFinite(step.durationMs) || step.durationMs < 0)) {
    issues.push(`Step ${index} durationMs must be a non-negative number when present.`);
  }

  if (step.waterMl !== undefined && (!Number.isFinite(step.waterMl) || step.waterMl < 0)) {
    issues.push(`Step ${index} waterMl must be a non-negative number when present.`);
  }

  if (
    step.targetTotalWaterMl !== undefined &&
    (!Number.isFinite(step.targetTotalWaterMl) || step.targetTotalWaterMl < 0)
  ) {
    issues.push(`Step ${index} targetTotalWaterMl must be a non-negative number when present.`);
  }

  if (step.kind === "finish" && step.durationMs !== undefined) {
    issues.push(`Step ${index} finish step cannot define durationMs.`);
  }

  if (index === totalStepCount - 1 && step.kind !== "finish") {
    issues.push("Recipe must end with a finish step.");
  }

  return issues;
}

export function validateRecipeRecord(recipeRecord) {
  const issues = [];

  if (!recipeRecord || typeof recipeRecord !== "object") {
    issues.push("Recipe record must be an object.");
    return issues;
  }

  if (recipeRecord.schemaVersion !== 1) {
    issues.push("Recipe record must carry schemaVersion 1.");
  }

  if (!recipeRecord.recipeId || !String(recipeRecord.recipeId).trim()) {
    issues.push("Recipe record must have a recipeId.");
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

  if (!isRecipeSource(recipeRecord.source)) {
    issues.push("Recipe source must be seed or user.");
  }

  if (typeof recipeRecord.archived !== "boolean") {
    issues.push("Recipe archived must be a boolean.");
  }

  [
    "coffeeDoseG",
    "totalWaterMl",
    "waterTempC",
    "estimatedTotalDurationMs",
    "createdAt",
    "updatedAt"
  ].forEach((fieldName) => {
    if (!Number.isFinite(recipeRecord[fieldName])) {
      issues.push(`Recipe ${fieldName} must be a number.`);
    }
  });

  if (!Array.isArray(recipeRecord.steps) || recipeRecord.steps.length < 1) {
    issues.push("Recipe must contain at least one step.");
  } else {
    recipeRecord.steps.forEach((step, index) => {
      issues.push(...validateRecipeStep(step, index, index, recipeRecord.steps.length));
    });
  }

  if (
    Number.isFinite(recipeRecord.estimatedTotalDurationMs) &&
    recipeRecord.estimatedTotalDurationMs < sumRecipeStepDurations(recipeRecord.steps || [])
  ) {
    issues.push("estimatedTotalDurationMs cannot be smaller than the sum of step durations.");
  }

  return issues;
}

export function validateRecipeSnapshot(recipeSnapshot) {
  const issues = [];

  if (!recipeSnapshot || typeof recipeSnapshot !== "object") {
    issues.push("Recipe snapshot must be an object.");
    return issues;
  }

  if (recipeSnapshot.schemaVersion !== 1) {
    issues.push("Recipe snapshot must carry schemaVersion 1.");
  }

  if (!recipeSnapshot.recipeId || !String(recipeSnapshot.recipeId).trim()) {
    issues.push("Recipe snapshot must have a recipeId.");
  }

  if (!isSupportedToolId(recipeSnapshot.toolId)) {
    issues.push("Recipe snapshot toolId must belong to the supported catalog.");
  }

  if (!recipeSnapshot.name || !String(recipeSnapshot.name).trim()) {
    issues.push("Recipe snapshot must have a recipe name.");
  }

  if (!isColorToken(recipeSnapshot.colorToken)) {
    issues.push("Recipe snapshot color token must come from the locked palette.");
  }

  if (!Array.isArray(recipeSnapshot.steps) || !recipeSnapshot.steps.length) {
    issues.push("Recipe snapshot must contain steps.");
  } else {
    recipeSnapshot.steps.forEach((step, index) => {
      issues.push(...validateRecipeStep(step, index, index, recipeSnapshot.steps.length));
    });
  }

  return issues;
}

export function validateHistoryIndexEntry(historyIndexEntry) {
  const issues = [];

  if (!historyIndexEntry || typeof historyIndexEntry !== "object") {
    issues.push("History index entry must be an object.");
    return issues;
  }

  if (!historyIndexEntry.historyId || !String(historyIndexEntry.historyId).trim()) {
    issues.push("History index entry must have a historyId.");
  }

  if (!isSupportedToolId(historyIndexEntry.toolId)) {
    issues.push("History index toolId must belong to the supported catalog.");
  }

  if (!historyIndexEntry.recipeName || !String(historyIndexEntry.recipeName).trim()) {
    issues.push("History index entry must have a recipe name.");
  }

  if (!isHistoryStatus(historyIndexEntry.status)) {
    issues.push("History index entry must have a valid status.");
  }

  ["endedAt", "elapsedMs", "updatedAt"].forEach((fieldName) => {
    if (!Number.isFinite(historyIndexEntry[fieldName])) {
      issues.push(`History index ${fieldName} must be a number.`);
    }
  });

  return issues;
}

export function validateHistoryEntry(historyEntry) {
  const issues = [];

  if (!historyEntry || typeof historyEntry !== "object") {
    issues.push("History entry must be an object.");
    return issues;
  }

  if (historyEntry.schemaVersion !== 1) {
    issues.push("History entry must carry schemaVersion 1.");
  }

  if (!historyEntry.historyId || !String(historyEntry.historyId).trim()) {
    issues.push("History entry must have a historyId.");
  }

  if (!historyEntry.sessionId || !String(historyEntry.sessionId).trim()) {
    issues.push("History entry must have a sessionId.");
  }

  if (!isSupportedToolId(historyEntry.toolId)) {
    issues.push("History entry toolId must belong to the supported catalog.");
  }

  if (!isHistoryStatus(historyEntry.status)) {
    issues.push("History entry must have a valid status.");
  }

  if (!historyEntry.recipeSnapshot) {
    issues.push("History entry must carry a recipe snapshot.");
  } else {
    issues.push(...validateRecipeSnapshot(historyEntry.recipeSnapshot));
  }

  ["startedAt", "endedAt", "elapsedMs", "createdAt", "updatedAt"].forEach((fieldName) => {
    if (!Number.isFinite(historyEntry[fieldName])) {
      issues.push(`History entry ${fieldName} must be a number.`);
    }
  });

  if (
    !historyEntry.deviationSummary ||
    !Number.isFinite(historyEntry.deviationSummary.totalDeltaMs) ||
    !Number.isFinite(historyEntry.deviationSummary.worstStepDeltaMs) ||
    !Number.isFinite(historyEntry.deviationSummary.completedSteps) ||
    !Number.isFinite(historyEntry.deviationSummary.totalSteps)
  ) {
    issues.push("History entry must include a valid deviationSummary.");
  }

  return issues;
}
