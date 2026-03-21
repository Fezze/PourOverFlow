import { getSupportedTools } from "../constants/tool-catalog";
import { buildRecipeSnapshotsById } from "../storage/phone-store";

export function buildPhoneToolCatalogSnapshot(phoneSnapshot) {
  return {
    toolCatalogRevision: phoneSnapshot.syncMeta.toolCatalogRevision,
    tools: getSupportedTools()
  };
}

export function buildPhoneCatalogSnapshot(settingsStorage, phoneSnapshot) {
  return {
    recipeCatalogRevision: phoneSnapshot.syncMeta.recipeCatalogRevision,
    recipesByTool: phoneSnapshot.recipesByTool,
    recipeSnapshotsById: buildRecipeSnapshotsById(settingsStorage, phoneSnapshot.recipeIndex)
  };
}

export function buildPhoneHistorySnapshot(phoneSnapshot) {
  return {
    historyRevision: phoneSnapshot.syncMeta.historyRevision,
    latestResult: phoneSnapshot.latestResult || null
  };
}
