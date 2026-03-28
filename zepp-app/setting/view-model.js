import { TOOL_CATALOG } from "../shared/constants/tool-catalog";

const TOOL_BADGE_LABELS = {
  tool_aeropress: "AP",
  tool_v60: "V60",
  tool_kalita_wave: "KW",
  tool_chemex: "CH",
  tool_clever_dripper: "CD",
  tool_french_press: "FP"
};

export function getSnapshotCounts(snapshot) {
  const recipeCount = snapshot && Array.isArray(snapshot.recipeIndex) ? snapshot.recipeIndex.length : 0;
  const historyCount = snapshot && Array.isArray(snapshot.historyIndex) ? snapshot.historyIndex.length : 0;

  return {
    toolCount: TOOL_CATALOG.length,
    recipeCount,
    historyCount
  };
}

export function buildLibraryOverview(snapshot, options = {}) {
  const counts = getSnapshotCounts(snapshot);
  const parts = [`${counts.toolCount} brewers`, `${counts.recipeCount} recipes`];

  if (options.includeHistory) {
    parts.push(`${counts.historyCount} history entries`);
  }

  return parts.join(" - ");
}

export function buildRecipeShelfCountLabel(recipeCount) {
  return recipeCount === 1 ? "1 recipe" : `${recipeCount} recipes`;
}

export function buildToolBadgeLabel(tool) {
  if (!tool) {
    return "--";
  }

  return TOOL_BADGE_LABELS[tool.toolId] || tool.label.slice(0, 2).toUpperCase();
}

export function buildToolCardLabel(tool, recipeCount) {
  return tool.label;
}

export function buildToolCountBadgeLabel(recipeCount) {
  return String(Math.max(0, Number(recipeCount) || 0));
}

export function buildToolSettingsIconPath(tool) {
  return tool ? `../assets/common.s/${tool.iconStem}.png` : "";
}

export function buildHistoryOverview(snapshot) {
  const counts = getSnapshotCounts(snapshot);
  return counts.historyCount === 1
    ? "1 archived brew on the phone."
    : `${counts.historyCount} archived brews on the phone.`;
}

export function buildSyncOverview(syncMeta) {
  const meta = syncMeta || {};

  return `Tools revision: ${meta.toolCatalogRevision || 0}\nRecipes revision: ${
    meta.recipeCatalogRevision || 0
  }\nHistory revision: ${meta.historyRevision || 0}`;
}
