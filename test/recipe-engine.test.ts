import { describe, expect, it } from "vitest";

import { getSeedRecipeRecordById } from "../shared/domain/seed-library.js";
import { normalizeRecipeSteps } from "../shared/domain/schema.js";
import {
  buildScaffoldResult,
  createActiveBrewSession,
  formatDurationLabel,
  getCurrentStepElapsedMs,
  getCurrentStepRemainingMs,
  getElapsedSessionMs,
  getStepProgressLabel
} from "../shared/engine/recipe-engine.js";
import { abortSession, advanceSession } from "../shared/engine/session-reducer.js";

describe("recipe engine helpers", () => {
  it("builds a running session from a recipe snapshot and keeps unknown tool labels stable", () => {
    const snapshotRecipe = {
      schemaVersion: 1,
      recipeId: "snapshot_recipe",
      toolId: "tool_unknown",
      name: "Snapshot Recipe",
      colorToken: "amber",
      coffeeDoseG: 15,
      totalWaterMl: 220,
      waterTempC: 93,
      filterLabel: "Paper",
      grindLabel: "Medium",
      estimatedTotalDurationMs: 90_000,
      recipeUpdatedAt: 1_000,
      steps: normalizeRecipeSteps([
        {
          kind: "timed_wait",
          title: "Wait",
          body: "Wait for extraction.",
          durationMs: 30_000,
          feedbackCue: "none"
        },
        {
          kind: "finish",
          title: "Done",
          body: "Serve the brew.",
          feedbackCue: "combo_short"
        }
      ])
    };

    const activeSession = createActiveBrewSession(snapshotRecipe, { now: 5_000 });

    expect(activeSession.toolLabel).toBe("tool_unknown");
    expect(activeSession.status).toBe("running");
    expect(activeSession.expectedStepEndAt).toBe(35_000);
    expect(activeSession.recipeSnapshot).not.toBe(snapshotRecipe);
    expect(activeSession.recipeSnapshot.steps).not.toBe(snapshotRecipe.steps);
  });

  it("computes elapsed and remaining durations for active sessions", () => {
    const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1_000);
    const manualSession = createActiveBrewSession(recipeRecord, { now: 1_000 });
    const timedSession = advanceSession(manualSession, { now: 1_500 });

    expect(getCurrentStepRemainingMs(manualSession, 2_000)).toBeNull();
    expect(getCurrentStepRemainingMs(timedSession, 2_000)).toBe(14_500);
    expect(getCurrentStepRemainingMs(timedSession, 20_000)).toBe(0);
    expect(getCurrentStepElapsedMs(timedSession, 2_500)).toBe(1_000);
    expect(getElapsedSessionMs(timedSession, 4_000)).toBe(3_000);
    expect(getCurrentStepElapsedMs(null, 4_000)).toBe(0);
    expect(getElapsedSessionMs(null, 4_000)).toBe(0);
  });

  it("formats labels for each step kind and duration helper", () => {
    expect(getStepProgressLabel(null)).toBe("No step");
    expect(getStepProgressLabel({ kind: "timed_action" })).toBe("Timed action");
    expect(getStepProgressLabel({ kind: "timed_wait" })).toBe("Timed wait");
    expect(getStepProgressLabel({ kind: "confirm" })).toBe("Manual confirm");
    expect(getStepProgressLabel({ kind: "finish" })).toBe("Finish");
    expect(getStepProgressLabel({ kind: "instruction" })).toBe("Instruction");

    expect(formatDurationLabel(Number.NaN)).toBe("--:--");
    expect(formatDurationLabel(61_000)).toBe("01:01");
    expect(formatDurationLabel(4_000)).toBe("00:04");
  });

  it("builds scaffold summaries for completed and aborted sessions", () => {
    const recipeRecord = getSeedRecipeRecordById("seed_ap_daily_clean", 1_000);
    const startedSession = createActiveBrewSession(recipeRecord, { now: 1_000 });
    const abortedSession = abortSession(startedSession, { now: 5_000 });
    const completedLikeSession = {
      ...startedSession,
      status: "completed",
      elapsedSessionMs: 12_345
    };

    expect(buildScaffoldResult(abortedSession, { now: 5_000 })).toMatchObject({
      status: "aborted",
      summary: "Session aborted. Result is stored locally and queued for sync."
    });
    expect(buildScaffoldResult(completedLikeSession, { now: 15_000 })).toMatchObject({
      status: "completed",
      elapsedMs: 12_345,
      summary: "Session completed. Result is stored locally and queued for sync."
    });
  });
});
