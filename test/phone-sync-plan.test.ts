import { expect, test } from "vitest";

import { PHONE_STORAGE_KEYS, getPhoneHistoryRecordKey, getPhoneRecipeRecordKey } from "../zepp-app/shared/storage/keys.js";
import {
  getBootstrapResponseSlices,
  getOrderedPhoneSyncSlices,
  getStorageChangeSlices,
  PHONE_SYNC_SLICES
} from "../zepp-app/shared/sync/phone-sync-plan.js";

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

test("publishes changes to committed revisions and ignores journal-only writes", () => {
  const meta = { toolCatalogRevision: 1, recipeCatalogRevision: 2, historyRevision: 3 };
  const prior = JSON.stringify(meta);
  const key = PHONE_STORAGE_KEYS.syncMeta;
  expect(getStorageChangeSlices(key, prior, JSON.stringify({ ...meta, pendingRecipeChange: {} }))).toEqual([]);
  expect(getStorageChangeSlices(key, prior, JSON.stringify({ ...meta, recipeCatalogRevision: 3 })))
    .toEqual([PHONE_SYNC_SLICES.CATALOG]);
  expect(getStorageChangeSlices(key, prior, "not JSON")).toEqual([]);
  expect(getStorageChangeSlices(key, prior, "null")).toEqual([]);
});

test("replays equal revisions when a different phone store owns the data", () => {
  const revisions = { toolCatalogRevision: 1, recipeCatalogRevision: 2, historyRevision: 0 };
  const matching = { knownToolCatalogRevision: 1, knownRecipeCatalogRevision: 2, knownHistoryRevision: 0 };
  const phoneMeta = { ...revisions, phoneStorageId: "new-store" };
  expect(getBootstrapResponseSlices({ ...matching, knownPhoneStorageId: "old-store" }, phoneMeta)).toEqual([
    PHONE_SYNC_SLICES.TOOLS, PHONE_SYNC_SLICES.CATALOG, PHONE_SYNC_SLICES.HISTORY
  ]);
  expect(getBootstrapResponseSlices({ ...matching, knownPhoneStorageId: "new-store" }, phoneMeta)).toEqual([]);
});
