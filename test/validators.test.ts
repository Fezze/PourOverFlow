import { expect, test } from "vitest";

import { getSeedRecipeRecords } from "../zepp-app/shared/domain/seed-library.js";
import { validateRecipeRecord } from "../zepp-app/shared/domain/validators.js";

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
