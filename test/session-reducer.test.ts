import { expect, test } from "vitest";

import { getSeedRecipeRecordById } from "../shared/domain/seed-library.js";
import {
  buildHistoryEntryFromSession,
  createActiveBrewSession,
  getCurrentSessionStep
} from "../shared/engine/recipe-engine.js";
import { advanceSession, abortSession, resumeSession, tickSession } from "../shared/engine/session-reducer.js";

test("createActiveBrewSession starts manual prep steps in waiting_for_confirm", () => {
  const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1711111111111);
  const activeSession = createActiveBrewSession(recipeRecord, { now: 1711111111111 });

  expect(activeSession.status).toBe("waiting_for_confirm");
  expect(activeSession.currentStepIndex).toBe(0);
  expect(getCurrentSessionStep(activeSession).kind).toBe("instruction");
  expect(activeSession.expectedStepEndAt).toBeUndefined();
});

test("advanceSession enters timed steps with countdown metadata", () => {
  const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1711111111111);
  const activeSession = createActiveBrewSession(recipeRecord, { now: 1711111111111 });
  const nextSession = advanceSession(activeSession, { now: 1711111112111 });

  expect(nextSession.currentStepIndex).toBe(1);
  expect(getCurrentSessionStep(nextSession).kind).toBe("timed_action");
  expect(nextSession.status).toBe("running");
  expect(nextSession.expectedStepEndAt).toBe(1711111127111);
  expect(nextSession.stepRunResults).toHaveLength(1);
});

test("tickSession auto-advances timed steps without confirmation requirement", () => {
  const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1711111111111);
  const activeSession = createActiveBrewSession(recipeRecord, { now: 1711111111111 });
  const timedSession = advanceSession(activeSession, { now: 1711111112111 });
  const tickedSession = tickSession(timedSession, { now: timedSession.expectedStepEndAt + 1 });

  expect(tickedSession.currentStepIndex).toBe(2);
  expect(getCurrentSessionStep(tickedSession).kind).toBe("timed_wait");
  expect(tickedSession.stepRunResults).toHaveLength(2);
});

test("tickSession waits for manual confirmation when timed step requires it", () => {
  const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1711111111111);
  const guardedRecipe = {
    ...recipeRecord,
    steps: recipeRecord.steps.map((step) => ({ ...step }))
  };
  guardedRecipe.steps[1] = {
    ...guardedRecipe.steps[1],
    requiresConfirm: true
  };

  const activeSession = createActiveBrewSession(guardedRecipe, { now: 1711111111111 });
  const timedSession = advanceSession(activeSession, { now: 1711111112111 });
  const tickedSession = tickSession(timedSession, { now: timedSession.expectedStepEndAt + 1 });

  expect(tickedSession.currentStepIndex).toBe(1);
  expect(tickedSession.status).toBe("waiting_for_confirm");
  expect(tickedSession.stepRunResults).toHaveLength(1);
});

test("resumeSession auto-advances elapsed timed steps after app return", () => {
  const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1711111111111);
  const activeSession = createActiveBrewSession(recipeRecord, { now: 1711111111111 });
  const timedSession = advanceSession(activeSession, { now: 1711111112111 });
  const resumedSession = resumeSession(timedSession, {
    now: timedSession.expectedStepEndAt + 5000
  });

  expect(resumedSession.currentStepIndex).toBe(2);
  expect(getCurrentSessionStep(resumedSession).kind).toBe("timed_wait");
  expect(resumedSession.status).toBe("running");
  expect(resumedSession.stepRunResults).toHaveLength(2);
});

test("resumeSession pauses on elapsed timed steps that require confirmation", () => {
  const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1711111111111);
  const guardedRecipe = {
    ...recipeRecord,
    steps: recipeRecord.steps.map((step) => ({ ...step }))
  };
  guardedRecipe.steps[1] = {
    ...guardedRecipe.steps[1],
    requiresConfirm: true
  };

  const activeSession = createActiveBrewSession(guardedRecipe, { now: 1711111111111 });
  const timedSession = advanceSession(activeSession, { now: 1711111112111 });
  const resumedSession = resumeSession(timedSession, {
    now: timedSession.expectedStepEndAt + 5000
  });

  expect(resumedSession.currentStepIndex).toBe(1);
  expect(resumedSession.status).toBe("waiting_for_confirm");
  expect(resumedSession.stepRunResults).toHaveLength(1);
});

test("abortSession keeps the in-progress step out of completed metrics", () => {
  const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1711111111111);
  const activeSession = createActiveBrewSession(recipeRecord, { now: 1711111111111 });
  const abortedSession = abortSession(activeSession, { now: 1711111115111 });
  const historyEntry = buildHistoryEntryFromSession(abortedSession, { now: 1711111115111 });

  expect(abortedSession.status).toBe("aborted");
  expect(abortedSession.stepRunResults).toHaveLength(0);
  expect(historyEntry.status).toBe("aborted");
  expect(historyEntry.stepRunResults).toHaveLength(0);
  expect(historyEntry.deviationSummary.completedSteps).toBe(0);
  expect(historyEntry.recipeSnapshot.name).toBe(recipeRecord.name);
});
