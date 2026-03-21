import test from "node:test";
import assert from "node:assert/strict";

import { createRecipeSnapshot } from "../shared/domain/schema.js";
import { createSyncEnvelope, validateSyncEnvelope } from "../shared/sync/contracts.js";
import { decodeEnvelopeFromPeerSocket, encodeEnvelopeForPeerSocket } from "../shared/sync/side-codec.js";
import { SYNC_MESSAGE_TYPES } from "../shared/sync/message-types.js";
import {
  buildPhoneCatalogSnapshot,
  buildPhoneHistorySnapshot,
  buildPhoneToolCatalogSnapshot
} from "../shared/sync/normalize.js";
import { ensurePhoneStorage, readRecipeRecord, saveHistoryEntry } from "../shared/storage/phone-store.js";

function createMockSettingsStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
    addListener() {}
  };
}

test("sync envelopes encode and decode through peerSocket codec", () => {
  const syncEnvelope = createSyncEnvelope(SYNC_MESSAGE_TYPES.REQUEST_BOOTSTRAP, {
    knownToolCatalogRevision: 1,
    knownRecipeCatalogRevision: 2,
    knownHistoryRevision: 3
  });
  const decodedEnvelope = decodeEnvelopeFromPeerSocket(encodeEnvelopeForPeerSocket(syncEnvelope));

  assert.deepEqual(validateSyncEnvelope(decodedEnvelope), []);
  assert.equal(decodedEnvelope.messageType, SYNC_MESSAGE_TYPES.REQUEST_BOOTSTRAP);
  assert.equal(decodedEnvelope.payload.knownRecipeCatalogRevision, 2);
});

test("normalize builds full phone bootstrap snapshots from seeded storage", () => {
  const settingsStorage = createMockSettingsStorage();
  const phoneSnapshot = ensurePhoneStorage(settingsStorage);

  const toolSnapshot = buildPhoneToolCatalogSnapshot(phoneSnapshot);
  const catalogSnapshot = buildPhoneCatalogSnapshot(settingsStorage, phoneSnapshot);
  const historySnapshot = buildPhoneHistorySnapshot(phoneSnapshot);

  assert.equal(toolSnapshot.tools.length, 6);
  assert.equal(catalogSnapshot.recipeCatalogRevision, 1);
  assert.equal(Object.keys(catalogSnapshot.recipeSnapshotsById).length, 12);
  assert.equal(historySnapshot.latestResult, null);
});

test("history snapshot exposes latest result after phone-side history save", () => {
  const settingsStorage = createMockSettingsStorage();
  ensurePhoneStorage(settingsStorage);

  const recipeRecord = readRecipeRecord(settingsStorage, "seed_ap_daily_clean");
  const historyEntry = {
    schemaVersion: 1,
    historyId: "hist_sync_1711111111111_ab12",
    sessionId: "sess_sync_1711111111111_ab12",
    recipeId: recipeRecord.recipeId,
    toolId: recipeRecord.toolId,
    recipeSnapshot: createRecipeSnapshot(recipeRecord),
    status: "completed",
    startedAt: 1711111111111,
    endedAt: 1711111112222,
    elapsedMs: 1111,
    stepRunResults: [],
    deviationSummary: {
      totalDeltaMs: 0,
      worstStepDeltaMs: 0,
      completedSteps: recipeRecord.steps.length,
      totalSteps: recipeRecord.steps.length
    },
    syncedFrom: "watch",
    createdAt: 1711111112222,
    updatedAt: 1711111112222
  };

  const saveResult = saveHistoryEntry(settingsStorage, historyEntry);
  const historySnapshot = buildPhoneHistorySnapshot(ensurePhoneStorage(settingsStorage));

  assert.equal(saveResult.ok, true);
  assert.equal(historySnapshot.historyRevision, 1);
  assert.equal(historySnapshot.latestResult.historyId, historyEntry.historyId);
  assert.equal(historySnapshot.latestResult.recipeName, recipeRecord.name);
});
