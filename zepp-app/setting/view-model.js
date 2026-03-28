import { getLocalizedToolLabel } from "../shared/constants/tool-catalog";
import { createTranslator, DEFAULT_LOCALE } from "../shared/i18n/index.js";
import { createPhoneTranslator } from "../shared/i18n/phone-locale.js";
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

function resolveTranslator(localeOrTranslator = null) {
  if (localeOrTranslator && typeof localeOrTranslator.t === "function") {
    return localeOrTranslator;
  }

  if (typeof localeOrTranslator === "string") {
    return createTranslator(localeOrTranslator);
  }

  return createPhoneTranslator(DEFAULT_LOCALE);
}

export function buildLibraryOverview(snapshot, localeOrTranslator, options = {}) {
  const normalizedOptions =
    localeOrTranslator && typeof localeOrTranslator === "object" && !("t" in localeOrTranslator)
      ? localeOrTranslator
      : options;
  const translator = resolveTranslator(
    localeOrTranslator && typeof localeOrTranslator === "object" && !("t" in localeOrTranslator)
      ? null
      : localeOrTranslator
  );
  const counts = getSnapshotCounts(snapshot);
  return translator.t("settings.overview.library", {
    toolCount: counts.toolCount,
    recipeCount: counts.recipeCount,
    historyCount: counts.historyCount,
    includeHistory: Boolean(normalizedOptions.includeHistory)
  });
}

export function buildRecipeShelfCountLabel(recipeCount, localeOrTranslator = null) {
  const translator = resolveTranslator(localeOrTranslator);
  return translator.t("common.counts.recipes", {
    count: Math.max(0, Number(recipeCount) || 0)
  });
}

export function buildToolBadgeLabel(tool, localeOrTranslator = null) {
  const localizedLabel = getLocalizedToolLabel(tool, resolveTranslator(localeOrTranslator));

  if (!tool) {
    return "--";
  }

  return TOOL_BADGE_LABELS[tool.toolId] || localizedLabel.slice(0, 2).toUpperCase();
}

export function buildToolCardLabel(tool, recipeCount, localeOrTranslator = null) {
  return getLocalizedToolLabel(tool, resolveTranslator(localeOrTranslator));
}

export function buildToolCountBadgeLabel(recipeCount) {
  return String(Math.max(0, Number(recipeCount) || 0));
}

export function buildToolSettingsIconPath(tool) {
  return tool ? `../assets/common.s/${tool.iconStem}.png` : "";
}

export function buildHistoryOverview(snapshot, localeOrTranslator = null) {
  const translator = resolveTranslator(localeOrTranslator);
  const counts = getSnapshotCounts(snapshot);
  return translator.t("common.counts.archivedBrews", {
    count: counts.historyCount
  });
}

export function buildSyncOverview(syncMeta, localeOrTranslator = null) {
  const translator = resolveTranslator(localeOrTranslator);
  const meta = syncMeta || {};

  return translator.t("settings.overview.sync", {
    toolRevision: meta.toolCatalogRevision || 0,
    recipeRevision: meta.recipeCatalogRevision || 0,
    historyRevision: meta.historyRevision || 0
  });
}
