import { expect, test } from "vitest";

import { PHONE_STORAGE_KEYS, getPhoneHistoryRecordKey, getPhoneRecipeRecordKey } from "../shared/storage/keys.js";
import {
  getBootstrapResponseSlices,
  getOrderedPhoneSyncSlices,
  getStorageChangeSlices,
  PHONE_SYNC_SLICES
} from "../shared/sync/phone-sync-plan.js";

test("bootstrap response slices only include revisions the watch does not already know", () => {
  const phoneSyncMeta = {
    toolCatalogRevision: 3,
    recipeCatalogRevision: 7,
    historyRevision: 11
  };

  const responseSlices = getBootstrapResponseSlices(
    {
      knownToolCatalogRevision: 3,
      knownRecipeCatalogRevision: 5,
      knownHistoryRevision: 11
    },
    phoneSyncMeta
  );

  expect(responseSlices).toEqual([PHONE_SYNC_SLICES.CATALOG]);
});

test("bootstrap response slices fall back to all slices when the request payload is invalid", () => {
  const phoneSyncMeta = {
    toolCatalogRevision: 1,
    recipeCatalogRevision: 2,
    historyRevision: 3
  };

  const responseSlices = getBootstrapResponseSlices(null, phoneSyncMeta);

  expect(responseSlices).toEqual([
    PHONE_SYNC_SLICES.TOOLS,
    PHONE_SYNC_SLICES.CATALOG,
    PHONE_SYNC_SLICES.HISTORY
  ]);
});

test("storage key classification maps recipe, history, and UI keys to the correct sync slices", () => {
  expect(getStorageChangeSlices(PHONE_STORAGE_KEYS.tools)).toEqual([PHONE_SYNC_SLICES.TOOLS]);
  expect(getStorageChangeSlices(PHONE_STORAGE_KEYS.recipeIndex)).toEqual([PHONE_SYNC_SLICES.CATALOG]);
  expect(getStorageChangeSlices(getPhoneRecipeRecordKey("seed_ap_daily_clean"))).toEqual([PHONE_SYNC_SLICES.CATALOG]);
  expect(getStorageChangeSlices(PHONE_STORAGE_KEYS.historyIndex)).toEqual([PHONE_SYNC_SLICES.HISTORY]);
  expect(getStorageChangeSlices(getPhoneHistoryRecordKey("hist_1234_abcd"))).toEqual([PHONE_SYNC_SLICES.HISTORY]);
  expect(getStorageChangeSlices(PHONE_STORAGE_KEYS.syncMeta)).toEqual([]);
  expect(getStorageChangeSlices("pof_settings_ui_state_v1")).toEqual([]);
});

test("ordered sync slices stay deduplicated and follow the transport order", () => {
  const orderedSlices = getOrderedPhoneSyncSlices([
    PHONE_SYNC_SLICES.HISTORY,
    PHONE_SYNC_SLICES.CATALOG,
    PHONE_SYNC_SLICES.CATALOG,
    PHONE_SYNC_SLICES.TOOLS
  ]);

  expect(orderedSlices).toEqual([
    PHONE_SYNC_SLICES.TOOLS,
    PHONE_SYNC_SLICES.CATALOG,
    PHONE_SYNC_SLICES.HISTORY
  ]);
});
