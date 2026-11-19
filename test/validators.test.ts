import { expect, test } from "vitest";

import { getSeedRecipeRecordById, getSeedRecipeRecords } from "../zepp-app/shared/domain/seed-library.js";
import { validateHistoryEntry, validateRecipeRecord } from "../zepp-app/shared/domain/validators.js";
import { buildHistoryEntryFromSession, createActiveBrewSession } from "../zepp-app/shared/engine/recipe-engine.js";
import { abortSession } from "../zepp-app/shared/engine/session-reducer.js";

test("all seed recipes pass recipe validation", () => {
  const issues = getSeedRecipeRecords(1711111111111).flatMap((recipeRecord) =>
    validateRecipeRecord(recipeRecord).map((issue) => `${recipeRecord.recipeId}: ${issue}`)
  );

  expect(issues).toEqual([]);
});

test("recipe validation rejects unsupported tool ids", () => {
  const [recipeRecord] = getSeedRecipeRecords(1711111111111);
  const issues = validateRecipeRecord({
    ...recipeRecord,
    toolId: "tool_unknown"
  });

  expect(issues, issues.join("\n")).toContain("Recipe toolId must point at the supported tool catalog.");
});

test("recipe validation rejects recipes without finish step at the end", () => {
  const [recipeRecord] = getSeedRecipeRecords(1711111111111);
  const brokenSteps = recipeRecord.steps.map((step) => ({ ...step }));
  brokenSteps[brokenSteps.length - 1] = {
    ...brokenSteps[brokenSteps.length - 1],
    kind: "confirm",
    requiresConfirm: true
  };

  const issues = validateRecipeRecord({
    ...recipeRecord,
    steps: brokenSteps
  });

  expect(issues, issues.join("\n")).toContain("Recipe must end with a finish step.");
});

test.each([{}, [null]])("recipe validation reports malformed steps %j without throwing", (steps) => {
  const [recipe] = getSeedRecipeRecords(1000);
  expect(validateRecipeRecord({ ...recipe, steps }).length).toBeGreaterThan(0);
});

test("accepts a recipe estimate at the sum of its timed steps and rejects an underestimate", () => {
  const recipe = getSeedRecipeRecordById("seed_ap_daily_clean", 1_000);
  const duration = recipe.steps.reduce((sum, step) => sum + (step.durationMs ?? 0), 0);

  expect(duration).toBeGreaterThan(0);
  expect(validateRecipeRecord({ ...recipe, estimatedTotalDurationMs: duration })).toEqual([]);
  expect(validateRecipeRecord({ ...recipe, estimatedTotalDurationMs: duration - 1 })).toEqual([
    "estimatedTotalDurationMs cannot be smaller than the sum of step durations."
  ]);
});

function buildArchivedBrew() {
  const recipe = getSeedRecipeRecordById("seed_ap_daily_clean", 1_000);
  const run = createActiveBrewSession(recipe, { now: 1_000 });
  return buildHistoryEntryFromSession(abortSession(run, { now: 2_000 }), { now: 2_000 });
}

test("reports invalid fields in the archived snapshot of an otherwise valid brew", () => {
  const history = buildArchivedBrew();
  expect(validateHistoryEntry(history)).toEqual([]);

  const snapshot = { ...history.recipeSnapshot, schemaVersion: 2, recipeId: " ", name: " ", steps: [] };
  expect(validateHistoryEntry({ ...history, recipeSnapshot: snapshot })).toEqual([
    "Recipe snapshot must carry schemaVersion 1.",
    "Recipe snapshot must have a recipeId.",
    "Recipe snapshot must have a recipe name.",
    "Recipe snapshot must contain steps."
  ]);
});

test.each(["totalDeltaMs", "worstStepDeltaMs", "completedSteps", "totalSteps"])(
  "rejects a history timing summary with non-finite %s",
  (field) => {
    const history = buildArchivedBrew();
    expect(validateHistoryEntry({
      ...history,
      deviationSummary: { ...history.deviationSummary, [field]: Infinity }
    })).toEqual(["History entry must include a valid deviationSummary."]);
  }
);
