import test from "node:test";
import assert from "node:assert/strict";

import { getSeedRecipeRecords } from "../shared/domain/seed-library.js";
import { validateRecipeRecord } from "../shared/domain/validators.js";

test("all seed recipes pass recipe validation", () => {
  const issues = getSeedRecipeRecords(1711111111111).flatMap((recipeRecord) =>
    validateRecipeRecord(recipeRecord).map((issue) => `${recipeRecord.recipeId}: ${issue}`)
  );

  assert.deepEqual(issues, []);
});

test("recipe validation rejects unsupported tool ids", () => {
  const [recipeRecord] = getSeedRecipeRecords(1711111111111);
  const issues = validateRecipeRecord({
    ...recipeRecord,
    toolId: "tool_unknown"
  });

  assert.ok(
    issues.includes("Recipe toolId must point at the supported tool catalog."),
    issues.join("\n")
  );
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

  assert.ok(issues.includes("Recipe must end with a finish step."), issues.join("\n"));
});
