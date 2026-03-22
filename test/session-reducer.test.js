import test from "node:test";
import assert from "node:assert/strict";

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

  assert.equal(activeSession.status, "waiting_for_confirm");
  assert.equal(activeSession.currentStepIndex, 0);
  assert.equal(getCurrentSessionStep(activeSession).kind, "instruction");
  assert.equal(activeSession.expectedStepEndAt, undefined);
});

test("advanceSession enters timed steps with countdown metadata", () => {
  const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1711111111111);
  const activeSession = createActiveBrewSession(recipeRecord, { now: 1711111111111 });
  const nextSession = advanceSession(activeSession, { now: 1711111112111 });

  assert.equal(nextSession.currentStepIndex, 1);
  assert.equal(getCurrentSessionStep(nextSession).kind, "timed_action");
  assert.equal(nextSession.status, "running");
  assert.equal(nextSession.expectedStepEndAt, 1711111127111);
  assert.equal(nextSession.stepRunResults.length, 1);
});

test("tickSession auto-advances timed steps without confirmation requirement", () => {
  const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1711111111111);
  const activeSession = createActiveBrewSession(recipeRecord, { now: 1711111111111 });
  const timedSession = advanceSession(activeSession, { now: 1711111112111 });
  const tickedSession = tickSession(timedSession, { now: timedSession.expectedStepEndAt + 1 });

  assert.equal(tickedSession.currentStepIndex, 2);
  assert.equal(getCurrentSessionStep(tickedSession).kind, "timed_wait");
  assert.equal(tickedSession.stepRunResults.length, 2);
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

  assert.equal(tickedSession.currentStepIndex, 1);
  assert.equal(tickedSession.status, "waiting_for_confirm");
  assert.equal(tickedSession.stepRunResults.length, 1);
});

test("resumeSession auto-advances elapsed timed steps after app return", () => {
  const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1711111111111);
  const activeSession = createActiveBrewSession(recipeRecord, { now: 1711111111111 });
  const timedSession = advanceSession(activeSession, { now: 1711111112111 });
  const resumedSession = resumeSession(timedSession, {
    now: timedSession.expectedStepEndAt + 5000
  });

  assert.equal(resumedSession.currentStepIndex, 2);
  assert.equal(getCurrentSessionStep(resumedSession).kind, "timed_wait");
  assert.equal(resumedSession.status, "running");
  assert.equal(resumedSession.stepRunResults.length, 2);
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

  assert.equal(resumedSession.currentStepIndex, 1);
  assert.equal(resumedSession.status, "waiting_for_confirm");
  assert.equal(resumedSession.stepRunResults.length, 1);
});

test("abortSession keeps the in-progress step out of completed metrics", () => {
  const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1711111111111);
  const activeSession = createActiveBrewSession(recipeRecord, { now: 1711111111111 });
  const abortedSession = abortSession(activeSession, { now: 1711111115111 });
  const historyEntry = buildHistoryEntryFromSession(abortedSession, { now: 1711111115111 });

  assert.equal(abortedSession.status, "aborted");
  assert.equal(abortedSession.stepRunResults.length, 0);
  assert.equal(historyEntry.status, "aborted");
  assert.equal(historyEntry.stepRunResults.length, 0);
  assert.equal(historyEntry.deviationSummary.completedSteps, 0);
  assert.equal(historyEntry.recipeSnapshot.name, recipeRecord.name);
});
