import { expect, test } from "vitest";

import { createRecipeSnapshot } from "../shared/domain/schema.js";
import { createSyncEnvelope, validateSyncEnvelope } from "../shared/sync/contracts.js";
import { buildAppBridgeDataFrame } from "../shared/sync/bridge-frame.js";
import {
  BRIDGE_TRANSPORT_CONFIG,
  buildChunkedBridgeTransportPayloads,
  createBridgeTransportState,
  readBridgeTransportPayload
} from "../shared/sync/bridge-transport.js";
import { decodeEnvelopeFromBlePayload, encodeEnvelopeForBle } from "../shared/sync/device-codec.js";
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

  expect(validateSyncEnvelope(decodedEnvelope)).toEqual([]);
  expect(decodedEnvelope.messageType).toBe(SYNC_MESSAGE_TYPES.REQUEST_BOOTSTRAP);
  expect(decodedEnvelope.payload.knownRecipeCatalogRevision).toBe(2);
});

test("sync envelopes survive app bridge framing on both watch and phone codecs", () => {
  const syncEnvelope = createSyncEnvelope(SYNC_MESSAGE_TYPES.REQUEST_BOOTSTRAP, {
    knownToolCatalogRevision: 4,
    knownRecipeCatalogRevision: 5,
    knownHistoryRevision: 6
  });

  const framedForPhone = buildAppBridgeDataFrame(encodeEnvelopeForPeerSocket(syncEnvelope), {
    port2: 77
  });
  const decodedOnPhone = decodeEnvelopeFromPeerSocket({
    data: framedForPhone.buffer
  });

  expect(validateSyncEnvelope(decodedOnPhone)).toEqual([]);
  expect(decodedOnPhone.payload.knownHistoryRevision).toBe(6);

  const framedForWatch = buildAppBridgeDataFrame(encodeEnvelopeForBle(syncEnvelope).buffer, {
    port2: 77
  });
  const decodedOnWatch = decodeEnvelopeFromBlePayload(framedForWatch.buffer, framedForWatch.size);

  expect(validateSyncEnvelope(decodedOnWatch)).toEqual([]);
  expect(decodedOnWatch.payload.knownToolCatalogRevision).toBe(4);
});

test("bridge transport reassembles large chunked sync envelopes on raw and app-framed paths", () => {
  const syncEnvelope = createSyncEnvelope(SYNC_MESSAGE_TYPES.PUSH_CATALOG_SNAPSHOT, {
    recipeCatalogRevision: 99,
    notes: "x".repeat(BRIDGE_TRANSPORT_CONFIG.maxChunkPayloadSize * 2)
  });
  const rawPayload = encodeEnvelopeForPeerSocket(syncEnvelope);
  const transportFrames = buildChunkedBridgeTransportPayloads(rawPayload, {
    maxChunkPayloadSize: 512
  });

  expect(transportFrames.length).toBeGreaterThan(1);

  const sideTransportState = createBridgeTransportState();
  let sidePayload = null;

  transportFrames.forEach((frameBuffer) => {
    const transportResult = readBridgeTransportPayload(sideTransportState, frameBuffer);
    if (transportResult.status === "complete") {
      sidePayload = transportResult.payload;
    }
  });

  expect(sidePayload instanceof ArrayBuffer).toBe(true);
  const decodedOnPhone = decodeEnvelopeFromPeerSocket(sidePayload);
  expect(validateSyncEnvelope(decodedOnPhone)).toEqual([]);
  expect(decodedOnPhone.payload.recipeCatalogRevision).toBe(99);

  const watchTransportState = createBridgeTransportState();
  let watchPayload = null;

  transportFrames.forEach((frameBuffer) => {
    const wrappedFrame = buildAppBridgeDataFrame(frameBuffer, {
      port2: 0
    });
    const transportResult = readBridgeTransportPayload(watchTransportState, wrappedFrame.buffer, wrappedFrame.size);
    if (transportResult.status === "complete") {
      watchPayload = transportResult.payload;
    }
  });

  expect(watchPayload instanceof ArrayBuffer).toBe(true);
  const decodedOnWatch = decodeEnvelopeFromBlePayload(watchPayload, watchPayload.byteLength);
  expect(validateSyncEnvelope(decodedOnWatch)).toEqual([]);
  expect(decodedOnWatch.payload.recipeCatalogRevision).toBe(99);
});

test("normalize builds full phone bootstrap snapshots from seeded storage", () => {
  const settingsStorage = createMockSettingsStorage();
  const phoneSnapshot = ensurePhoneStorage(settingsStorage);

  const toolSnapshot = buildPhoneToolCatalogSnapshot(phoneSnapshot);
  const catalogSnapshot = buildPhoneCatalogSnapshot(settingsStorage, phoneSnapshot);
  const historySnapshot = buildPhoneHistorySnapshot(phoneSnapshot);

  expect(toolSnapshot.tools).toHaveLength(6);
  expect(catalogSnapshot.recipeCatalogRevision).toBe(1);
  expect(Object.keys(catalogSnapshot.recipeSnapshotsById)).toHaveLength(12);
  expect(historySnapshot.latestResult).toBeNull();
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

  expect(saveResult.ok).toBe(true);
  expect(historySnapshot.historyRevision).toBe(1);
  expect(historySnapshot.latestResult.historyId).toBe(historyEntry.historyId);
  expect(historySnapshot.latestResult.recipeName).toBe(recipeRecord.name);
});
