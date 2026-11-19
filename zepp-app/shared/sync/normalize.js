import { buildRecipeSnapshotsById } from "../storage/phone-store.js";

export function buildPhoneToolCatalogSnapshot(phoneSnapshot) {
  return {
    phoneStorageId: phoneSnapshot.syncMeta.phoneStorageId,
    toolCatalogRevision: phoneSnapshot.syncMeta.toolCatalogRevision,
    tools: phoneSnapshot.tools
  };
}

export function buildPhoneCatalogSnapshot(settingsStorage, phoneSnapshot) {
  return {
    phoneStorageId: phoneSnapshot.syncMeta.phoneStorageId,
    recipeCatalogRevision: phoneSnapshot.syncMeta.recipeCatalogRevision,
    recipesByTool: phoneSnapshot.recipesByTool,
    recipeSnapshotsById: buildRecipeSnapshotsById(settingsStorage, phoneSnapshot.recipeIndex)
  };
}

export function buildPhoneHistorySnapshot(phoneSnapshot) {
  return {
    phoneStorageId: phoneSnapshot.syncMeta.phoneStorageId,
    historyRevision: phoneSnapshot.syncMeta.historyRevision,
    latestResult: phoneSnapshot.latestResult || null
  };
}
