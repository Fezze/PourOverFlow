import { PHONE_STORAGE_KEYS } from "../storage/keys.js";

export const PHONE_SYNC_SLICES = Object.freeze({
  TOOLS: "tools",
  CATALOG: "catalog",
  HISTORY: "history"
});

const PHONE_SYNC_SLICE_ORDER = Object.freeze([
  PHONE_SYNC_SLICES.TOOLS,
  PHONE_SYNC_SLICES.CATALOG,
  PHONE_SYNC_SLICES.HISTORY
]);

const RECIPE_RECORD_KEY_PREFIX = "pof_recipe_";
const HISTORY_RECORD_KEY_PREFIX = "pof_history_";

function toFiniteOrFallback(value, fallbackValue) {
  return Number.isFinite(value) ? value : fallbackValue;
}

export function getOrderedPhoneSyncSlices(slicesLike) {
  const requestedSlices = new Set(Array.isArray(slicesLike) ? slicesLike : Array.from(slicesLike || []));

  return PHONE_SYNC_SLICE_ORDER.filter((slice) => requestedSlices.has(slice));
}

export function getStorageChangeSlices(key) {
  if (!key || key === PHONE_STORAGE_KEYS.syncMeta) {
    return [];
  }

  if (key === PHONE_STORAGE_KEYS.tools) {
    return [PHONE_SYNC_SLICES.TOOLS];
  }

  if (key === PHONE_STORAGE_KEYS.recipeIndex || key.startsWith(RECIPE_RECORD_KEY_PREFIX)) {
    return [PHONE_SYNC_SLICES.CATALOG];
  }

  if (key === PHONE_STORAGE_KEYS.historyIndex || key.startsWith(HISTORY_RECORD_KEY_PREFIX)) {
    return [PHONE_SYNC_SLICES.HISTORY];
  }

  return [];
}

export function getBootstrapResponseSlices(requestPayload, phoneSyncMeta) {
  if (!requestPayload || typeof requestPayload !== "object" || !phoneSyncMeta) {
    return [...PHONE_SYNC_SLICE_ORDER];
  }

  const knownToolCatalogRevision = toFiniteOrFallback(requestPayload.knownToolCatalogRevision, -1);
  const knownRecipeCatalogRevision = toFiniteOrFallback(requestPayload.knownRecipeCatalogRevision, -1);
  const knownHistoryRevision = toFiniteOrFallback(requestPayload.knownHistoryRevision, -1);
  const slices = [];

  if (knownToolCatalogRevision !== toFiniteOrFallback(phoneSyncMeta.toolCatalogRevision, 0)) {
    slices.push(PHONE_SYNC_SLICES.TOOLS);
  }

  if (knownRecipeCatalogRevision !== toFiniteOrFallback(phoneSyncMeta.recipeCatalogRevision, 0)) {
    slices.push(PHONE_SYNC_SLICES.CATALOG);
  }

  if (knownHistoryRevision !== toFiniteOrFallback(phoneSyncMeta.historyRevision, 0)) {
    slices.push(PHONE_SYNC_SLICES.HISTORY);
  }

  return getOrderedPhoneSyncSlices(slices);
}
