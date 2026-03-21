export const PHONE_STORAGE_KEYS = {
  tools: "pof_tools_v1",
  recipeIndex: "pof_recipe_index_v1",
  historyIndex: "pof_history_index_v1",
  syncMeta: "pof_sync_meta_v1"
};

export const WATCH_STORAGE_KEYS = {
  activeSession: "active_session_v1",
  catalogCache: "catalog_cache_v1",
  lastResult: "last_result_v1",
  syncMeta: "sync_meta_v1"
};

export const SETTINGS_UI_STORAGE_KEY = "pof_settings_ui_state_v1";

export function getPhoneRecipeRecordKey(recipeId) {
  return `pof_recipe_${recipeId}_v1`;
}

export function getPhoneHistoryRecordKey(historyId) {
  return `pof_history_${historyId}_v1`;
}
