import { getSupportedTools } from "../constants/tool-catalog";
import {
  createScaffoldRecipeSnapshot,
  createScaffoldRecipeSummaryList
} from "../domain/schema";

export function buildStageTwoToolCatalogSnapshot() {
  return {
    toolCatalogRevision: 1,
    tools: getSupportedTools()
  };
}

export function buildStageTwoCatalogSnapshot() {
  const recipesByTool = {};
  const recipeSnapshotsById = {};

  getSupportedTools().forEach((tool) => {
    const recipeSummaries = createScaffoldRecipeSummaryList(tool.toolId);
    recipesByTool[tool.toolId] = recipeSummaries;

    recipeSummaries.forEach((recipeSummary) => {
      recipeSnapshotsById[recipeSummary.recipeId] = createScaffoldRecipeSnapshot(recipeSummary);
    });
  });

  return {
    recipeCatalogRevision: 0,
    recipesByTool,
    recipeSnapshotsById
  };
}

export function buildStageTwoHistorySnapshot(lastResult) {
  return {
    historyRevision: lastResult ? 1 : 0,
    latestResult: lastResult || null
  };
}
