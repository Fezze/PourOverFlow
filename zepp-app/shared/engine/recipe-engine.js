import { getToolById } from "../constants/tool-catalog.js";
import {
  CURRENT_SCHEMA_VERSION,
  createLastResultSummary,
  createGeneratedId,
  createRecipeSnapshot
} from "../domain/schema.js";

function isTimedStep(step) {
  return Boolean(step && (step.kind === "timed_action" || step.kind === "timed_wait"));
}

function deriveInitialStatus(step) {
  return isTimedStep(step) ? "running" : "waiting_for_confirm";
}

export function createActiveBrewSession(recipeDefinition, options = {}) {
  const tool = getToolById(recipeDefinition.toolId);
  const sessionStartedAt = Number.isFinite(options.now) ? options.now : Date.now();
  const recipeSnapshot =
    recipeDefinition.recipeUpdatedAt !== undefined
      ? {
          ...recipeDefinition,
          steps: (recipeDefinition.steps || []).map((step) => ({ ...step }))
        }
      : createRecipeSnapshot(recipeDefinition);
  const firstStep = recipeSnapshot.steps[0] || null;

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    sessionId: createGeneratedId("sess", sessionStartedAt),
    recipeId: recipeSnapshot.recipeId,
    recipeName: recipeSnapshot.name,
    recipeSnapshot,
    toolId: recipeSnapshot.toolId,
    toolLabel: tool ? tool.label : recipeSnapshot.toolId,
    currentStepIndex: 0,
    status: deriveInitialStatus(firstStep),
    sessionStartedAt,
    currentStepStartedAt: sessionStartedAt,
    expectedStepEndAt: isTimedStep(firstStep) ? sessionStartedAt + (firstStep.durationMs || 0) : undefined,
    elapsedSessionMs: 0,
    completedStepIds: [],
    stepRunResults: [],
    lastPersistedAt: sessionStartedAt,
    wakeUpResumeEnabled: false,
    pageBrightModeEnabled: false
  };
}

export function getCurrentSessionStep(activeSession) {
  if (!activeSession || !activeSession.recipeSnapshot || !Array.isArray(activeSession.recipeSnapshot.steps)) {
    return null;
  }

  return activeSession.recipeSnapshot.steps[activeSession.currentStepIndex] || null;
}

export function getCurrentStepRemainingMs(activeSession, now = Date.now()) {
  const currentStep = getCurrentSessionStep(activeSession);

  if (!isTimedStep(currentStep) || !Number.isFinite(activeSession.expectedStepEndAt)) {
    return null;
  }

  return Math.max(0, activeSession.expectedStepEndAt - now);
}

export function getCurrentStepElapsedMs(activeSession, now = Date.now()) {
  if (!activeSession || !Number.isFinite(activeSession.currentStepStartedAt)) {
    return 0;
  }

  return Math.max(0, now - activeSession.currentStepStartedAt);
}

export function getElapsedSessionMs(activeSession, now = Date.now()) {
  if (!activeSession || !Number.isFinite(activeSession.sessionStartedAt)) {
    return 0;
  }

  return Math.max(0, now - activeSession.sessionStartedAt);
}

export function getStepProgressLabel(step) {
  if (!step) {
    return "No step";
  }

  if (step.kind === "timed_action") {
    return "Timed action";
  }

  if (step.kind === "timed_wait") {
    return "Timed wait";
  }

  if (step.kind === "confirm") {
    return "Manual confirm";
  }

  if (step.kind === "finish") {
    return "Finish";
  }

  return "Instruction";
}

export function formatDurationLabel(durationMs) {
  if (!Number.isFinite(durationMs)) {
    return "--:--";
  }

  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function buildHistoryEntryFromSession(activeSession, options = {}) {
  const endedAt = Number.isFinite(options.now) ? options.now : Date.now();

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    historyId: createGeneratedId("hist", endedAt),
    sessionId: activeSession.sessionId,
    recipeId: activeSession.recipeId,
    toolId: activeSession.toolId,
    recipeSnapshot: activeSession.recipeSnapshot,
    status: activeSession.status,
    startedAt: activeSession.sessionStartedAt,
    endedAt,
    elapsedMs: activeSession.elapsedSessionMs,
    stepRunResults: [...activeSession.stepRunResults],
    deviationSummary: {
      totalDeltaMs: 0,
      worstStepDeltaMs: 0,
      completedSteps: activeSession.completedStepIds.length,
      totalSteps: activeSession.recipeSnapshot.steps.length
    },
    syncedFrom: "watch",
    createdAt: endedAt,
    updatedAt: endedAt
  };
}

export function buildScaffoldResult(activeSession, options = {}) {
  const historyEntry = buildHistoryEntryFromSession(activeSession, options);

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    ...createLastResultSummary(historyEntry),
    summary:
      activeSession.status === "aborted"
        ? "Session aborted. Result is stored locally and queued for sync."
        : "Session completed. Result is stored locally and queued for sync."
  };
}
